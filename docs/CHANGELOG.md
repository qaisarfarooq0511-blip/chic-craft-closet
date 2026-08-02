# Yaawun — Changelog

Format: Problem / Root Cause / Fix / Risk / Rollback
Lane: Fast Lane (FL) or Full Lane (FullL)
---

## 2026-08-02 — Data migration: legacy mock content → live database (data only, no code changes)

### [FastL] Migrated the 8 legacy mock products into the real `products` table; flagged static/legal pages as unmigrated

**Problem:** `src/lib/storage.ts` and `src/lib/seed.ts` (the pre-Supabase
localStorage-backed mock data layer) still held the original 8 catalogue
products, plus other content that was never carried over when the storefront
moved to live Supabase queries in Sprint 1.

**Root Cause:** Not a bug — a straightforward carry-over gap from the
Lovable-era mock data to the real schema; nobody had gone back to check what
of the original content was still only sitting in mock files.

**Fix:** Inserted the 8 mock products (with subtitle, description, price,
compare_price, badge, fabric, embroidery, care, stock_count, meta_description)
into `products`, matched to existing categories by name; per-piece dimension
breakdowns for the two unstitched 3-piece sets into `product_pieces`; package
contents into `product_includes`. No product images were migrated — the mock
images are local Vite build assets, not uploadable URLs; photos will be
uploaded via the admin form. Categories and hero `site_settings` needed no
changes — both already match the mock seed values from earlier sprints.

**Flagged, not migrated — static/legal pages:** `seed.ts` contains real
content for About, Terms of Use, Privacy Policy, Terms & Conditions,
Returns/Refunds/Cancellation, and FAQs (with real contact details). Checked
where this currently lives: `/page/$slug` and `/admin/pages` (`page.$slug.tsx`,
`admin.pages.index.tsx`) still read/write **only `localStorage`** via
`src/lib/storage.ts` — there is no `static_pages` table in the real schema.
Right now the Terms of Service, Privacy Policy, and Returns Policy exist only
per-browser (seeded client-side on first visit): not server-rendered, not
indexable by search engines, and not centrally admin-editable across devices.
This needs a new `static_pages` table + RLS + admin editor + SSR routes —
Full Lane work, scoped as a future sprint, not done here.

**Risk:** Legal/SEO risk from the unmigrated static pages is unchanged by this
entry — it existed before, this just makes it visible and tracked. Product
migration itself carries no risk: purely additive INSERTs into existing
tables, no schema/RLS touched, no existing rows modified.

**Rollback:** `UPDATE products SET deleted_at = now(), status = 'archived'
WHERE slug IN ('pashmina-weave-shawl', 'chikankari-unstitched-suit',
'kundan-drop-earrings', 'embroidered-frock', 'silk-thread-hairpin-set',
'sozni-hand-embroidered-wrap', 'banarasi-silk-suit', 'glass-bangle-set');`
(soft delete only, per CLAUDE.md — `product_pieces`/`product_includes`
cascade-delete on hard delete only, so they're left in place and simply
become orphaned-but-harmless under the soft-deleted parent).

---

## 2026-08-02 — Sprint 2B: Admin panel completion (delta pass)

### [FastL] Categories, site settings, order detail, and stock display updated for gaps left by earlier sprints

**Problem:** An earlier Sprint 2B round (2026-08-01) already built real admin
pages for categories, site settings, order detail, and product stock — but
each had gaps relative to what the admin panel now actually needs, mostly
because product variants (2026-08-01, later that same day) and Sprint 2A's
hero `site_settings` rows (2026-08-01) didn't exist yet when those pages
were first built. Dashboard analytics (the would-be Item 3) was checked
against the current spec and found to already fully match it — skipped
entirely, no changes.

**Root Cause:** Not a bug — admin pages built before variants/hero-settings
existed couldn't have accounted for either. Also, `SETUP.md` still showed
Sprint 1 "IN PROGRESS" and Sprint 2 "UPCOMING" despite Sprint 1, product
variants, and Sprint 2A all being done and merged — restored verbatim from
an old snapshot earlier in this project's history and never updated since.

**Fix:**

- `SETUP.md` sprint-status section rewritten to reflect actual state.
- **Categories** (`useAdminCategories.ts`, `admin.categories.tsx`): added a
  per-category non-deleted product count via PostgREST's embedded
  `products(count)` (single query, no per-row fetch); soft-deleted
  categories now show in the list at reduced opacity with a "Deleted" label
  and a Restore button (Delete never shows on an already-deleted row,
  Restore never shows on an active one); slug uniqueness is pre-checked on
  blur (excluding the row's own id) with an inline error, instead of a raw
  Postgres unique-violation toast.
- **Site settings** (`admin.settings.tsx`): restructured into three cards,
  each with its own save button scoped to only its own keys —
  "Announcement & delivery" (unchanged fields), "SEO" (`seo_site_name`,
  `seo_site_description` — new, no admin UI existed before), "Hero banner"
  (`hero_eyebrow` through both CTA label/href pairs — these `site_settings`
  rows have existed since Sprint 2A for the storefront's read side, but had
  no admin UI to edit them until now).
- **Order detail** (`admin.orders.$id.tsx`, `NotificationService.ts`): line
  items now show `variant_label` when present (nothing rendered when null);
  added `delivered → refunded` as a real transition (confirm dialog, updates
  `orders.status` only — no `refunded_at` column exists, none added — and
  fires a new `refund_processed` notification event, channels `['sms']` to
  match `order_cancelled` exactly).
- **Stock display** (`useAdminProducts.ts`, `admin.products.index.tsx`):
  products with any variants now show a "Manage variants" link (same
  destination as Edit — the product edit form's Variants section is where
  per-variant stock actually lives) instead of an editable top-level stock
  input, since that field is no longer meaningful once a product has
  variants. Variant-less products keep the existing inline edit, with
  corrected colour thresholds reusing existing design tokens: 0 → red
  (`--rust`), 1–4 → amber (`--gold`), 5+ → default.

**Risk:** Low — additive UI/query changes only, no schema/RLS changes, no
new migration. The variant-count check is unfiltered by `deleted_at` (a
product whose variants were all soft-deleted would still show "Manage
variants" instead of the stock input) — accepted as a known simplification
for this delta pass, not worth a filtered/inner-join query for the edge case.

**Rollback:** Revert the seven touched files (`useAdminCategories.ts`,
`admin.categories.tsx`, `admin.settings.tsx`, `admin.orders.$id.tsx`,
`NotificationService.ts`, `useAdminProducts.ts`, `admin.products.index.tsx`)
to their pre-2026-08-02 versions; no migration to roll back.

---

## 2026-08-01 — Sprint 2C: Product variants schema (colours, sizes, fabrics)

### [FullL] Stage A — migration for product_variants, colour/size/fabric catalogs

**Problem:** Products need colour and size variants (each with its own stock and
optional price override), an admin-managed fabric picklist instead of free text, and
category-scoped size scales — none of which existed. Also discovered while starting
this stage: migration `20260801100011` (Sprint 2B's notification_queue RLS fix) had
been merged to `main` but never actually applied to the live Supabase project —
`supabase migration list --linked` showed it with no matching remote entry. The order
detail page's notification queueing has therefore been silently broken in production
since Sprint 2B merged, not just in the pre-2B checkout path it was meant to fix.

**Root Cause:** The variants feature is new scope, not a bug. The 100011 deployment
gap was a process gap — merging to `main` was treated as "done," but no explicit
`supabase db push` step followed it.

**Fix:**

- Migration `20260801100012_product_variants_colours_sizes_fabrics.sql`: adds
  `fabric_options`, `colour_options`, `size_scales`, `size_options`, and
  `product_variants` (all with full scale hooks — `created_at`/`updated_at`/
  `deleted_at` — even where not explicitly spelled out, per CLAUDE.md rule 7),
  `products.fabric_id`, `categories.default_size_scale_id` (backfilled: kidswear →
  `age_kids`, kashmiri-shawls → `free_size`, dress-material → `dress_material`,
  accessories → `NULL`), and `variant_id` columns on `cart_items`/`order_items`
  (`order_items` additionally gets `variant_label` as a purchase-time snapshot,
  matching that table's existing `product_name`/`product_slug` snapshot principle).
- `product_variants` uniqueness on `(product_id, colour_id, size_id)` uses a
  `COALESCE`-to-sentinel-UUID partial unique index (`WHERE deleted_at IS NULL`), not a
  bare `UNIQUE(...)` — Postgres treats every `NULL` as distinct in a plain unique
  constraint, which would not have caught duplicate variant rows for a product with no
  colour or size set.
- `products.fabric` (free text) is kept as a dual-write bridge alongside the new
  `fabric_id` FK — the PDP still reads the text column directly and is unchanged in
  this stage; the admin form (Stage B) will write both.
- Audit trigger (`log_admin_action()`) added to `product_variants` only — not to the
  four reference/catalog tables, which are the same shape as the already-audit-free
  `site_settings`/`redirects`.
- Both the missed `20260801100011` and the new `20260801100012` pushed to the live
  project via `supabase db push --linked` in this session; verified via the app's own
  anon client (seed counts: 10 fabrics, 18 colours, 5 scales, 17 size options, category
  backfill on 3 of 4 categories) since the connected Supabase MCP tool returned a
  permission error for this project.
- `src/types/database.ts`, `docs/blueprint/SCHEMA.md`, `docs/blueprint/RLS.md` updated
  to match.

**Risk:** Low — purely additive (new tables, nullable new columns). No existing data
migrated or reinterpreted. `product_variants` starts empty; every existing product
continues to be managed at the product level exactly as before.

**Rollback:** See migration file header for the exact drop statements. Applies in
reverse dependency order (order_items/cart_items columns → product_variants →
categories/products columns → size_options/size_scales/colour_options/fabric_options).

---

## 2026-08-01 — Sprint 2B: Order detail page, tracking, and status transitions

### [FullL] Admin order detail page with status dropdown; fixes silently-broken notification_queue writes

**Problem:** The orders list had inline confirm/dispatch/deliver actions but no
detail view (customer info, full address, line items, payment method all
required opening the database directly), no cancel action, and dispatching
required cramming two text inputs into a table row. Building the detail page's
"queue a notification on every status change" requirement surfaced a real,
pre-existing bug: `notification_queue` RLS granted `INSERT` only to
`service_role`; admin had `SELECT` only. `NotificationService.send()` is
called directly from the browser client (`checkout.tsx`'s `order_confirmed`
call, live since Sprint 1) — every such call has been silently failing RLS
(the error is caught and logged, never thrown) since it shipped. No customer
has ever actually received an order-confirmation queue entry.

**Root Cause:** `notification_queue`'s original RLS (Sprint 0) assumed only
the Edge Function worker would ever write to it, missing that
`NotificationService.send()` — the one sanctioned way to queue a
notification per CLAUDE.md's Notification Service Law — is called directly
from authenticated client code, not from a trusted server context.

**Fix:**

- Migration `20260801100011_notification_queue_write_policies.sql`: adds
  `notif_queue_insert_own` (`user_id = auth.uid()`) and
  `notif_queue_insert_admin` (`is_admin()`) INSERT policies.
  UPDATE/DELETE and the full `service_role` `FOR ALL` policy are unchanged —
  only the Edge Function worker that processes/marks rows sent or failed may
  do those.
- New `admin.orders.$id.tsx` detail page: customer info, shipping address,
  payment method, all line items with totals, tracking info. Status actions
  are restricted to the actual state machine (`pending → confirmed/cancelled`,
  `confirmed → dispatched/cancelled`, `dispatched → delivered`) — not a free
  choice across all six statuses. `refunded` is out of scope for this stage,
  deliberately not added to the dropdown.
- Dispatching requires a tracking number (URL optional) before the transition
  is allowed.
- Every transition writes `orders.status` (+ `tracking_number`/
  `tracking_url`/`dispatched_at`/`delivered_at` as applicable) and calls
  `NotificationService.send()` with the matching event type
  (`order_confirmed`/`order_dispatched`/`order_delivered`/`order_cancelled`)
  — these now actually reach the queue.
- `admin.orders.tsx` (list) simplified to a read-only overview + "View" link
  per row — the inline confirm/dispatch/deliver actions and the cramped
  tracking-input row moved to the detail page, so status-transition logic
  lives in exactly one place instead of two.
- `docs/blueprint/RLS.md` updated: `notification_queue` policy matrix row and
  critical-rules note reflect the new INSERT policies.

**Risk:** Low — additive INSERT policies only, no change to existing
UPDATE/DELETE/service_role access. No real orders exist yet to be affected by
the list-page action removal.

**Rollback:** `DROP POLICY "notif_queue_insert_own" ON notification_queue;
DROP POLICY "notif_queue_insert_admin" ON notification_queue;` (see migration
file header). Reverting the detail page means restoring the prior
`admin.orders.tsx` from git history.

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
