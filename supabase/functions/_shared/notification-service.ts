/**
 * Deno-side counterpart to src/services/NotificationService.ts — Edge Functions run
 * in a separate runtime and can't import the frontend class directly, but the rule
 * is the same: this is the ONLY place an SMS/email provider gets called from.
 * otp-request/otp-verify and process-notifications both go through the raw senders
 * below — one Twilio integration, one Resend integration, not two.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Thrown by the raw senders when the relevant provider secret isn't set — callers
 * (the worker) catch this specifically to mark a row 'skipped' rather than 'failed'. */
export class ProviderNotConfiguredError extends Error {}

/** Sends one SMS via Twilio. Throws ProviderNotConfiguredError if TWILIO_* secrets
 * are unset, or a plain Error on an actual Twilio API failure. */
export async function sendSmsRaw(phone: string, body: string): Promise<void> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!sid || !token || !from) {
    throw new ProviderNotConfiguredError("SMS provider not configured");
  }
  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: `+${phone}`, From: from, Body: body }),
  });
  if (!resp.ok) {
    throw new Error(`Twilio error ${resp.status}: ${await resp.text()}`);
  }
}

/** Sends one email via Resend. Throws ProviderNotConfiguredError if RESEND_API_KEY
 * is unset, or a plain Error on an actual Resend API failure. */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    throw new ProviderNotConfiguredError("Email provider not configured");
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Yaawun <orders@yaawun.com>", to, subject, html }),
  });
  if (!resp.ok) {
    throw new Error(`Resend error ${resp.status}: ${await resp.text()}`);
  }
}

/** otp-request's existing immediate-send-and-record path — unchanged in shape,
 * now delegates the actual SMS call to sendSmsRaw() instead of an always-stub log.
 * If TWILIO_* secrets are ever set, real OTP SMS delivery turns on automatically;
 * until then this still records a 'failed' row exactly as before. */
export async function sendSms(
  admin: SupabaseClient,
  phone: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const devBypass = Deno.env.get("DEV_OTP_BYPASS") === "true";
  let status: "sent" | "failed" = "sent";
  let lastError: string | null = null;

  if (devBypass) {
    // Dev-only: safe to log the code since no real SMS provider is wired up yet.
    console.log(`[OTP][dev-bypass] ${phone}`, payload);
  } else {
    try {
      const code = typeof payload.code === "string" ? payload.code : "";
      await sendSmsRaw(
        phone,
        `Your Yaawun sign-in code: ${code}. Valid for 10 minutes. Do not share.`,
      );
    } catch (err) {
      status = "failed";
      lastError = err instanceof Error ? err.message : String(err);
      // Deliberately not logging `payload` here — it may contain the raw OTP code.
      console.log(
        `[NotificationService] SMS send failed for "${eventType}" to ${phone}: ${lastError}`,
      );
    }
  }

  // Audit row deliberately excludes `code` — otp_codes already holds the (hashed) code;
  // no reason to also keep it in plaintext in a general-purpose notification log.
  const { code: _code, ...auditPayload } = payload;
  const { error } = await admin.from("notification_queue").insert({
    channel: "sms",
    event_type: eventType,
    payload: auditPayload,
    status,
    last_error: lastError,
    processed_at: new Date().toISOString(),
  });
  if (error) console.error("[notification-service] failed to record notification_queue row", error);
}
