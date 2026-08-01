# Yaawun — Changelog

Format: Problem / Root Cause / Fix / Risk / Rollback
Lane: Fast Lane (FL) or Full Lane (FullL)
---

## 2026-08-01 — Sprint 1: Magic-link email auth (bridge), phone OTP dormant

### [FullL] Custom OTP session-minting turned out to be fundamentally incompatible with GoTrue — switched to magic-link email as the live auth path

**Problem:** The custom OTP auth shipped just before this (previous entry below) does
not actually work. Testing it end-to-end (not just unit-testing the Edge Functions)
showed `supabase.auth.setSession()` failing immediately with "Auth session missing!"
on every attempt — not after an hour, on the very first call.

**Root Cause:** A manually-signed JWT is not sufficient to establish a Supabase
session. GoTrue's own `/auth/v1/user` endpoint — which `setSession()` calls internally
to populate/validate the session — checks the JWT's `session_id` claim against a real
row in `auth.sessions` and rejects the request with `session_not_found` if none
exists, regardless of how validly the JWT is signed or how far from expiry it is.
Confirmed directly via `curl` against `/auth/v1/user`, not assumed. Writing matching
rows into `auth.sessions`/`auth.refresh_tokens` would fix it (those are real Postgres
tables GoTrue itself uses, just not exposed through PostgREST — reachable only via a
direct Postgres connection), and was prototyped, but deliberately not shipped: writing
directly into GoTrue's own internal session tables from custom Edge Function code is a
meaningfully more sensitive operation than the rest of this bridge, and not something
to ship without more scrutiny than a stopgap warrants.

**Fix:** Email magic-link auth (`supabase.auth.signInWithOtp({email})` +
`emailRedirectTo`), which Supabase handles entirely natively — real sessions, working
refresh tokens, zero extra configuration, no SMS provider needed. `/login` and
`/admin/login` now show a single email input + "Send magic link" + a "check your
email" confirmation screen (`src/components/MagicLinkForm.tsx`). After first sign-in, a
dismissible, non-blocking prompt (`src/components/AddPhonePrompt.tsx`, mounted
site-wide in `__root.tsx`) offers to save a mobile number to `profiles.phone` for order
updates — a plain profile update, not part of auth, so `phone_verified` correctly stays
`false` until a real OTP flow verifies it later. The `otp-request`/`otp-verify` Edge
Functions stay deployed but dormant — not deleted, not called by any active route.
`otp-verify` no longer attempts to mint a session at all (that code is gone, not just
unused); it still does the part that's genuinely reusable — rate-limited, bcrypt
verified OTP matching against a real phone, with find-or-create on `auth.users`.

**Planned fix:** when an SMS provider (Twilio/MSG91) is onboarded, this becomes a Fast
Lane swap: enable Supabase's native Phone Auth with that provider, remove the magic
link flow, activate phone input on the login page, and either retire or repurpose the
dormant Edge Functions. Zero schema changes needed — `profiles.phone`/`phone_verified`
already exist for exactly this. Native Phone Auth manages `auth.sessions`/
`auth.refresh_tokens` correctly itself, so this whole class of problem goes away.

**Risk:** Low — no real users yet. The cost of this whole detour was engineering time,
not customer-facing breakage (the broken OTP flow was caught before being relied on).

**Rollback:** Revert to the custom OTP flow once Supabase Phone Auth is live and the
Fast Lane swap above is done — not before, since the custom flow's session-minting is
confirmed non-functional as shipped.

---

## 2026-08-01 — Sprint 1: Mobile + OTP replaces email auth

### [FullL] Custom OTP auth (Edge Functions) replaces email/password everywhere

**Problem:** Email/password auth (Sprint 1) required customers to remember a password
and required Supabase's default mailer for signup confirmation and password reset —
neither fits an Indian mobile-first customer base, and email confirmation's default
rate limit had already caused real friction during testing. Phone is the identity Yaawun
actually wants.

**Root Cause:** Not a bug — a product decision to switch identity models. Supabase's
native Phone Auth was considered first, but it has no working "no SMS provider" mode
(GoTrue requires a real provider — Twilio/MessageBird/Vonage/TextLocal — configured
before `signInWithOtp` will issue anything at all; its Test-OTP feature only covers
specific pre-registered numbers, not a universal dev bypass), so it couldn't deliver
the "any phone number works with a fixed code in dev, real SMS later" behavior this
project needs before an SMS provider is chosen.

**Fix:**

- Migration `20260801100009_mobile_auth.sql`: `profiles.phone` gets a UNIQUE constraint
  (was already a column since Sprint 0, just unconstrained); adds `phone_verified boolean
not null default false`.
- Migration `20260801100010_otp_codes.sql`: new `otp_codes` table (bcrypt-hashed codes,
  10-minute expiry, attempt counter) — RLS enabled with zero policies for anon/
  authenticated (service_role bypasses RLS and is the only caller), no soft delete
  (expired rows are purged outright by otp-verify; these are short-lived single-use
  codes, not durable business records).
- Two Edge Functions, both deployed via `supabase functions deploy` (not manually):
  - `otp-request`: validates Indian mobile format, rate-limits to 3 requests per phone
    per 10 minutes, generates a code (fixed `123456` when the `DEV_OTP_BYPASS` Edge
    Function secret is `true`, cryptographically random otherwise), bcrypt-hashes it,
    delivers it via a Deno-side notification helper mirroring
    `src/services/NotificationService.ts`'s single-choke-point rule (dev: console log;
    "prod": logs "SMS provider not configured" — Twilio/MSG91 wiring is a single
    function body change away) and writes a `notification_queue` audit row with the
    raw code deliberately excluded from the persisted payload.
  - `otp-verify`: looks up the most recent unverified/unexpired code for the phone,
    increments `attempts` (locks out and purges at 5), bcrypt-compares, and on match
    finds-or-creates the `auth.users` row for that phone via the service-role Admin API
    (`createUser({phone, phone_confirm:true})`, falling back to a `profiles.phone`
    lookup on "already registered"), then mints a session.
- Session is a real JWT signed with a project secret (Edge Function secret
  `APP_JWT_SECRET` — **not** `SUPABASE_JWT_SECRET`; the Supabase CLI reserves that
  prefix for its own auto-injected vars and rejects custom secrets using it), matching
  GoTrue's claim shape (`sub`, `role: authenticated`, `aud`, `exp`, `session_id`, etc.).
  Valid for RLS/PostgREST purposes for its 1-hour lifetime.
- Single unified `/login` (customer) and `/admin/login` (same flow, additional
  `profiles.role = 'admin'` check post-verify) — no separate signup step, phone+OTP
  covers both. `/signup`, `/forgot-password`, `/reset-password` now redirect to
  `/login` (no password concept left to reset).
- `NotificationService.ts`: dropped `email` from every event's default channels
  (`order_confirmed`/`order_dispatched` → sms+whatsapp, `order_delivered`/
  `review_approved` → whatsapp, rest → sms), dropped the `password_reset` event type,
  added `otp_request`.
- `.env.example`: removed the commented `RESEND_API_KEY` placeholder, added
  `VITE_DEV_OTP_BYPASS` (must match the `DEV_OTP_BYPASS` Edge Function secret).

**Known limitation:** refresh tokens are not functional — the `refresh_token` returned
alongside the access token is a random placeholder, not a real GoTrue session. Sessions
expire after ~1 hour with no silent refresh; the customer re-verifies via OTP to get a
new one. An attempt was made to fix this properly by writing matching rows directly
into `auth.sessions`/`auth.refresh_tokens` (the tables GoTrue itself checks — confirmed
empirically that a JWT alone is rejected with `session_not_found` if no matching
`auth.sessions` row exists, since `auth` schema tables aren't reachable via PostgREST
even with service_role, only via a direct Postgres connection). That approach was
deliberately reverted before deploying: writing straight into GoTrue's own internal
session tables from custom Edge Function code is a meaningfully more sensitive
operation than everything else in this migration, and not something to ship without
more scrutiny than a bridging feature warrants.

**Planned fix:** when an SMS provider (Twilio/MSG91) is onboarded, replace these
custom OTP Edge Functions with Supabase's native Phone Auth, which manages
`auth.sessions`/`auth.refresh_tokens` correctly itself — no custom session-minting
code, no JWT-signing workaround, refresh works normally. This custom OTP setup is a
deliberate bridge to that point, not a permanent architecture.

**Risk:** Low — no real users yet, and re-verifying via OTP is low friction on mobile.
`DEV_OTP_BYPASS=true` must never reach production (a fixed, publicly-known OTP for
every phone number defeats the purpose of OTP auth entirely) — there is no code-level
guard against this today beyond the Edge Function secret and `.env` value both needing
to be flipped to `false` deliberately.

**Rollback:** Migrations' rollback statements are in their own file headers. Reverting
the Edge Functions means `supabase functions delete otp-request otp-verify` plus
restoring email auth UI from git history — not attempted here since the owner made a
clean forward decision, not a rollback-pending one.

---

## 2026-08-01 — Sprint 1: Cloudinary dropped, Supabase Storage instead

### [FullL] Product image uploads moved off Cloudinary

**Problem:** Cloudinary was the planned image host (`VITE_CLOUDINARY_CLOUD_NAME`/
`VITE_CLOUDINARY_UPLOAD_PRESET`, unsigned upload preset `yaawun_products`), but no
Cloudinary account/credentials exist yet, and the owner decided to defer the
auto-enhance feature Cloudinary was chosen for rather than block Sprint 1 on setting
one up.

**Fix:** New migration `20260801100008_product_images_storage_bucket.sql` creates a
public Supabase Storage bucket `product-images` with explicit RLS on `storage.objects`
(public read; insert/update/delete gated on `public.is_admin()`) — `storage.objects`
has RLS enabled with zero policies by default, and a bucket's `public` flag alone only
affects the CDN read path, not writes. `src/lib/product-images.ts` replaces
`src/lib/cloudinary.ts`: plain upload + `getPublicUrl()`, no transformation applied.
`product_images.cloudinary_id` is left in the schema, untouched and unused (nullable) —
re-adding Cloudinary later is a Fast Lane change (new upload path + start populating
that column), not a migration.

**Risk:** No image auto-enhancement until Cloudinary is reintroduced. None to existing
data — no product images had been uploaded yet under the Cloudinary path.

**Rollback:** See the storage-bucket migration's own header for the exact drop
statements.

---

## 2026-08-01 — Sprint 0: Foundation

### [FullL] Initial repository scaffold and database schema

**Problem:** Project previously had no formal schema, CI, or engineering standards. `.env` was committed to the repo with live credentials. The live Supabase project (`fobelduflgnekrlpuznk`) already had a Lovable-generated migration (`20260731052743_...`) creating `products`/`categories`/`orders`/`customers`/`addresses`/`reviews`/`coupons`/`sections`/`pages`/`wishlist`/`settings` — every one with RLS "enabled" but a `USING (true) WITH CHECK (true)` policy granted to `anon` AND `authenticated` for every operation, i.e. a live, world-writable database.

**Root Cause:** Lovable-generated project lacked: migration files with real RLS, CI pipeline, pre-commit hooks, secrets management, soft-delete pattern, audit logging, notification abstraction, or documentation structure. The wide-open RLS policies were Lovable's own scaffold default, not a regression.

**Fix:**

- Confirmed with project owner that the existing live tables held only dummy data (2026-08-01) — authorized dropping them outright rather than migrating in place
- The original project (`fobelduflgnekrlpuznk`) turned out to no longer exist in the owner's Supabase account at all (likely deleted). Provisioned a fresh personal-account project instead — `dqngfawkwvxxbympdqyp` — and pointed `.env`/`supabase/config.toml` at it. The retire-legacy-schema migration below is kept as a harmless no-op safeguard (`DROP TABLE IF EXISTS`) in case it's ever run against a project that does have the old Lovable tables.
- 8 migration files: `20260801100000_retire_legacy_lovable_schema` (drops the old open-RLS tables, if present) + 7 covering extensions, profiles/roles, product catalogue, orders/cart, reviews/audit, notifications/SEO, category seed data — re-timestamped to `2026-08-01` (from a placeholder `2025-08-01`) so they sort after the pre-existing `20260731052743` legacy migration
- The Supabase CLI (`supabase.exe`) is blocked on the owner's machine by Windows 11 Smart App Control (an unsigned-binary policy, not corporate IT) — rather than have the owner disable that OS protection, migrations were applied by pasting the combined SQL directly into the Supabase Dashboard's SQL Editor
- RLS policies on all 15 replacement tables, scoped by ownership/role — no wide-open policies anywhere
- GitHub Actions CI with Fast Lane and Full Lane checks
- CLAUDE.md engineering law file governing all future changes
- `.env.example` added; existing committed `.env` untracked going forward (`git rm --cached`) — it only ever held a public anon/publishable key, not a secret, but is still redundant to track
- `NotificationService` abstraction wrapping all notification delivery
- `docs/blueprint/` with SCHEMA.md, RLS.md
- TypeScript types mirroring DB schema

**Risk:** Dropping the legacy tables is destructive, but confirmed dummy-data-only and explicitly authorized by the project owner before this migration was written. No real customer/order data existed in the pre-existing schema.

**Rollback:** Legacy tables are not recoverable via a rollback migration (dropped outright, no backup taken since disposable by design). The replacement schema can be dropped via each migration's own rollback if ever needed — see individual migration file headers.

---

<!-- Add new entries above this line, newest first -->
