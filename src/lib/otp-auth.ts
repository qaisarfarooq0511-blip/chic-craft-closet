/**
 * DORMANT — otp-request/otp-verify are deployed but not wired into any active route.
 * Magic-link email auth (src/lib/magic-link-auth.ts) is the live path until an SMS
 * provider is onboarded and this swaps over to native Supabase Phone Auth. Kept
 * (not deleted) for that Fast Lane swap — see docs/CHANGELOG.md.
 *
 * verifyOtp() no longer mints a session: confirmed empirically that a manually-signed
 * JWT is rejected by GoTrue ("session_not_found") without a matching auth.sessions
 * row, which isn't reachable from an Edge Function without a direct Postgres
 * connection — writing there was prototyped and deliberately not shipped.
 */
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { normalizeMobile, validateMobile } from "@/lib/user-auth";

const DEV_BYPASS = import.meta.env.VITE_DEV_OTP_BYPASS === "true";

export { DEV_BYPASS };

interface OtpVerifyResponse {
  verified: true;
  user_id: string;
  is_new_user: boolean;
}

export function normalizeAndValidatePhone(
  input: string,
): { ok: true; value: string } | { ok: false; error: string } {
  return validateMobile(input);
}

/** supabase-js only populates `error` (with a generic message) for non-2xx Edge Function
 * responses — the actual `{error: "..."}` body we crafted server-side lives on
 * FunctionsHttpError.context, which is the raw Response. */
async function describeFunctionError(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // fall through to generic message below
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export async function requestOtp(phone: string): Promise<{ error?: string }> {
  const { data, error } = await supabase.functions.invoke("otp-request", {
    body: { phone: normalizeMobile(phone) },
  });
  if (error) return { error: await describeFunctionError(error, "Failed to send OTP.") };
  if (data?.error) return { error: data.error };
  return {};
}

/** Confirms the code was correct and identifies/creates the user — does NOT establish
 * a session (see file header). Not called by any active route today. */
export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ error?: string; isNewUser?: boolean; userId?: string }> {
  const { data, error } = await supabase.functions.invoke<OtpVerifyResponse & { error?: string }>(
    "otp-verify",
    {
      body: { phone: normalizeMobile(phone), code },
    },
  );
  if (error) return { error: await describeFunctionError(error, "Verification failed.") };
  if (!data || data.error) return { error: data?.error ?? "Verification failed." };

  return { isNewUser: data.is_new_user, userId: data.user_id };
}
