/**
 * Sprint 2D — notification_queue worker.
 * Triggered every 5 minutes by pg_cron (see migration 20260805000001). Claims up
 * to BATCH_SIZE queued rows atomically (claim_notification_batch, FOR UPDATE SKIP
 * LOCKED under the hood — see that function's comment for why a second overlapping
 * invocation can't double-process the same row), dispatches each by channel, and
 * always writes a terminal or backed-off state back — a claimed row is never left
 * sitting in its transient claim-lease state.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  sendSmsRaw,
  sendEmail,
  ProviderNotConfiguredError,
} from "../_shared/notification-service.ts";
import { getEmailTemplate, getSmsTemplate, type OrderContext } from "../_shared/templates.ts";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

type Row = {
  id: string;
  user_id: string | null;
  channel: "email" | "sms" | "whatsapp" | "push";
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
};

type Outcome =
  { kind: "sent" } | { kind: "skipped"; reason: string } | { kind: "failed"; reason: string };

async function fetchOrderContext(
  admin: ReturnType<typeof createClient>,
  orderNumber: unknown,
): Promise<OrderContext | null> {
  if (typeof orderNumber !== "string" || !orderNumber) return null;
  const { data, error } = await admin
    .from("orders")
    .select(
      "order_number, total, tracking_number, tracking_url, shipping_address:addresses(full_name, line1, line2, city, state, pincode), items:order_items(product_name, quantity, total_price)",
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error || !data) return null;
  return {
    order_number: data.order_number,
    customer_name: null, // filled in from payload.customer_name by the caller
    total: data.total,
    items: (data.items ?? []) as OrderContext["items"],
    address: (data.shipping_address as OrderContext["address"]) ?? null,
    tracking_number: data.tracking_number,
    tracking_url: data.tracking_url,
  };
}

async function processRow(admin: ReturnType<typeof createClient>, row: Row): Promise<Outcome> {
  if (row.channel === "whatsapp") {
    console.log(`[process-notifications] whatsapp not integrated yet — skipping ${row.id}`);
    return { kind: "skipped", reason: "WhatsApp provider not integrated yet" };
  }
  if (row.channel === "push") {
    return { kind: "skipped", reason: "Push channel not supported yet" };
  }

  const orderContext =
    row.event_type === "otp_request"
      ? null
      : await fetchOrderContext(admin, row.payload.order_number);
  const templatePayload = {
    ...row.payload,
    ...(orderContext ?? {}),
    customer_name: row.payload.customer_name ?? null,
  };

  if (row.channel === "sms") {
    const body = getSmsTemplate(row.event_type, templatePayload);
    if (!body) return { kind: "skipped", reason: `No SMS template for "${row.event_type}"` };
    if (!row.user_id) return { kind: "skipped", reason: "No user_id on this notification" };

    const { data: profile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", row.user_id)
      .maybeSingle();
    if (!profile?.phone) return { kind: "skipped", reason: "No phone number on file" };

    try {
      await sendSmsRaw(profile.phone, body);
      return { kind: "sent" };
    } catch (err) {
      if (err instanceof ProviderNotConfiguredError) {
        return { kind: "skipped", reason: "SMS provider not configured" };
      }
      return { kind: "failed", reason: err instanceof Error ? err.message : String(err) };
    }
  }

  if (row.channel === "email") {
    const tmpl = getEmailTemplate(row.event_type, templatePayload);
    if (!tmpl) return { kind: "skipped", reason: `No email template for "${row.event_type}"` };
    if (!row.user_id) return { kind: "skipped", reason: "No user_id on this notification" };

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(row.user_id);
    const email = userRes?.user?.email;
    if (userErr || !email) return { kind: "skipped", reason: "No email address on file" };

    try {
      await sendEmail(email, tmpl.subject, tmpl.html);
      return { kind: "sent" };
    } catch (err) {
      if (err instanceof ProviderNotConfiguredError) {
        return { kind: "skipped", reason: "Email provider not configured" };
      }
      return { kind: "failed", reason: err instanceof Error ? err.message : String(err) };
    }
  }

  return { kind: "skipped", reason: `Unhandled channel "${row.channel}"` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary = { sent: 0, skipped: 0, failed: 0 };

  try {
    const { data: claimed, error: claimError } = await admin.rpc("claim_notification_batch", {
      p_limit: BATCH_SIZE,
    });
    if (claimError) throw claimError;

    for (const row of (claimed ?? []) as Row[]) {
      const outcome = await processRow(admin, row);
      const now = new Date().toISOString();

      if (outcome.kind === "sent") {
        summary.sent++;
        await admin
          .from("notification_queue")
          .update({ status: "sent", processed_at: now, last_error: null })
          .eq("id", row.id);
      } else if (outcome.kind === "skipped") {
        summary.skipped++;
        await admin
          .from("notification_queue")
          .update({ status: "skipped", processed_at: now, last_error: outcome.reason })
          .eq("id", row.id);
      } else {
        const attempts = row.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          summary.failed++;
          await admin
            .from("notification_queue")
            .update({ status: "failed", attempts, processed_at: now, last_error: outcome.reason })
            .eq("id", row.id);
        } else {
          // Still retryable — stays 'queued', backed off exponentially. Not counted
          // in `failed` (that's reserved for terminal failures) or `skipped`.
          const backoffMinutes = Math.pow(2, attempts);
          await admin
            .from("notification_queue")
            .update({
              status: "queued",
              attempts,
              process_after: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
              last_error: outcome.reason,
            })
            .eq("id", row.id);
        }
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[process-notifications] error", err);
    return new Response(JSON.stringify({ error: "Worker failed", ...summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
