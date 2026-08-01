import { createClient } from "npm:@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";
import { corsHeaders } from "../_shared/cors.ts";
import { normalizeIndianMobile } from "../_shared/phone.ts";

// DORMANT — kept deployed for the Fast Lane swap to native Supabase Phone Auth once
// an SMS provider is onboarded (see docs/CHANGELOG.md). Not called by any active
// frontend route right now; magic-link email auth is the live path.
//
// This function used to also mint a session (a manually-signed JWT). That's removed:
// confirmed empirically that GoTrue's own /auth/v1/user rejects a validly-signed JWT
// with "session_not_found" unless a matching row exists in auth.sessions — a table
// only reachable via a direct Postgres connection, not PostgREST, even with
// service_role. Writing directly into GoTrue's own session tables from custom Edge
// Function code was prototyped and deliberately not shipped (more sensitive than this
// bridge warrants). What's left here — rate-limited, bcrypt-hashed OTP request/verify
// against a real phone, with find-or-create on auth.users — is the reusable part for
// whenever this gets wired back up under native Phone Auth.

const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { phone: rawPhone, code } = await req.json();
    const phone = typeof rawPhone === "string" ? normalizeIndianMobile(rawPhone) : null;
    if (!phone || typeof code !== "string") {
      return json({ error: "Phone and code are required." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: findError } = await admin
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findError) throw findError;

    if (!row) {
      return json({ error: "Invalid or expired code." }, 401);
    }

    const nextAttempts = row.attempts + 1;
    await admin.from("otp_codes").update({ attempts: nextAttempts }).eq("id", row.id);

    if (nextAttempts >= MAX_ATTEMPTS) {
      // Lock this code out — force a fresh otp-request rather than letting it keep being guessed.
      await admin
        .from("otp_codes")
        .update({ expires_at: new Date().toISOString() })
        .eq("id", row.id);
      return json({ error: "Too many incorrect attempts. Request a new code." }, 429);
    }

    const codeMatches = await bcrypt.compare(code, row.code_hash);
    if (!codeMatches) {
      return json({ error: "Incorrect code." }, 401);
    }

    await admin
      .from("otp_codes")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", row.id);
    // Purge expired rows for this phone — keeps the table from growing unbounded.
    await admin
      .from("otp_codes")
      .delete()
      .eq("phone", phone)
      .lt("expires_at", new Date().toISOString());

    // Find or create the auth.users row for this phone.
    let userId: string;
    let isNewUser = false;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      phone,
      phone_confirm: true,
    });
    if (created?.user) {
      userId = created.user.id;
      isNewUser = true;
    } else {
      // Most likely "phone number already registered" — look up the existing profile.
      const { data: existing, error: lookupError } = await admin
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) {
        console.error("[otp-verify] createUser failed and no existing profile found", createError);
        return json({ error: "Could not sign you in. Please try again." }, 500);
      }
      userId = existing.id;
    }

    await admin.from("profiles").update({ phone, phone_verified: true }).eq("id", userId);

    // No session is minted here anymore — see the dormancy note at the top of this
    // file. Callers get confirmation that the code was correct and who the user is;
    // establishing a real session is native Phone Auth's job once that's wired up.
    return json({
      verified: true,
      user_id: userId,
      is_new_user: isNewUser,
    });
  } catch (err) {
    console.error("[otp-verify] error", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
