/**
 * Razorpay server-to-server webhook. Verifies the HMAC signature, then always
 * returns 200 — Razorpay retries on any non-200 response, and re-processing an
 * already-handled event must never double-charge or double-notify a customer.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isValidSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = toHex(mac);
  if (expected.length !== signature.length) return false;
  // Constant-time-ish compare — avoids a naive === short-circuit leaking timing info.
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/** Mirrors NotificationService.getDefaultChannels("order_confirmed") — this webhook runs
 * as service_role and inserts directly rather than importing the frontend class, but the
 * channel fan-out must stay identical or Razorpay customers get less notification
 * coverage than COD customers for the same event. */
const ORDER_CONFIRMED_CHANNELS = ["sms", "whatsapp", "email"] as const;

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const signature = req.headers.get("X-Razorpay-Signature");
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not configured");
    return new Response("Webhook not configured", { status: 500 });
  }
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }
  if (!(await isValidSignature(rawBody, signature, webhookSecret))) {
    console.error("[razorpay-webhook] invalid signature");
    return new Response("Invalid signature", { status: 400 });
  }

  // Signature verified — every path below returns 200, even on internal errors.
  try {
    const event = JSON.parse(rawBody);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      const razorpayOrderId: string | undefined = payment?.order_id;
      const paymentId: string | undefined = payment?.id;

      if (!razorpayOrderId || !paymentId) {
        console.error("[razorpay-webhook] payment.captured missing order_id/payment_id", event);
      } else {
        const { data: order, error: findError } = await admin
          .from("orders")
          .select("id, order_number, customer_id, status, customer:profiles(full_name)")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        if (findError) {
          console.error("[razorpay-webhook] order lookup failed", findError);
        } else if (!order) {
          console.error(
            `[razorpay-webhook] no order found for razorpay_order_id ${razorpayOrderId}`,
          );
        } else if (order.status !== "pending") {
          // Already processed (Razorpay retry, or duplicate webhook delivery) — no-op.
          console.log(
            `[razorpay-webhook] order ${order.order_number} already ${order.status}, skipping`,
          );
        } else {
          const { error: updateError } = await admin
            .from("orders")
            .update({ status: "confirmed", payment_id: paymentId, payment_method: "razorpay" })
            .eq("id", order.id);

          if (updateError) {
            console.error("[razorpay-webhook] order update failed", updateError);
          } else {
            const customerName =
              (order.customer as unknown as { full_name: string | null } | null)?.full_name ?? null;
            const inserts = ORDER_CONFIRMED_CHANNELS.map((channel) => ({
              user_id: order.customer_id,
              channel,
              event_type: "order_confirmed",
              payload: { order_number: order.order_number, customer_name: customerName },
            }));
            const { error: notifError } = await admin.from("notification_queue").insert(inserts);
            if (notifError) {
              console.error("[razorpay-webhook] notification enqueue failed", notifError);
            }
          }
        }
      }
    } else if (event.event === "payment.failed") {
      // Log only — order status intentionally stays 'pending', no DB write.
      console.log(
        `[razorpay-webhook] payment.failed for razorpay order ${event.payload?.payment?.entity?.order_id}`,
      );
    }
    // Any other event type: ignore.

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[razorpay-webhook] processing error", err);
    return new Response("ok", { status: 200 });
  }
});
