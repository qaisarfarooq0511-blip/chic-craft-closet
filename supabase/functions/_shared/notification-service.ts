/**
 * Deno-side counterpart to src/services/NotificationService.ts — Edge Functions run
 * in a separate runtime and can't import the frontend class directly, but the rule
 * is the same: this is the ONLY place an SMS provider gets called from. Swapping in
 * Twilio/MSG91 later is a change to this one file, not to otp-request/otp-verify.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

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
    // Twilio/MSG91 wiring goes here later — TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
    // TWILIO_FROM_NUMBER as Edge Function secrets, one API call replacing this branch.
    // Deliberately NOT logging `payload` here — it may contain the raw OTP code, and
    // this branch runs whenever DEV_OTP_BYPASS is unset, not only in real production.
    console.log(
      `[NotificationService] SMS provider not yet configured — would send "${eventType}" to ${phone}`,
    );
    status = "failed";
    lastError = "SMS provider not configured";
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
