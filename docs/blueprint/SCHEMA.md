# Yaawun — Database Schema Blueprint

Last updated: 2026-08-07
Migration count: 12 (includes 20260801100000_retire_legacy_lovable_schema.sql, which drops the
original Lovable-scaffolded products/categories/orders/customers/addresses/reviews/coupons/
sections/pages/wishlist/settings tables — dummy data only, confirmed disposable by the project
owner before this migration was written)

## Tables

| Table                | Purpose                                                                                         | RLS | Soft Delete | Audit |
| -------------------- | ----------------------------------------------------------------------------------------------- | --- | ----------- | ----- |
| `profiles`           | Extends `auth.users` — customer and admin profiles                                              | ✅  | ✅          | Role¹ |
| `categories`         | Product categories (Kashmiri Shawls, Dress Material, Kidswear, Accessories)                     | ✅  | ✅          | ✅    |
| `products`           | Product catalogue — all items for sale                                                          | ✅  | ✅          | ✅    |
| `product_pieces`     | Per-piece dimension specs (length, width, weight) for 1–3 piece sets                            | ✅  | ✅          | —     |
| `product_images`     | Product photos — Supabase Storage public URLs + sort order                                      | ✅  | ✅          | —     |
| `product_includes`   | "What's in the package" list items                                                              | ✅  | ✅          | —     |
| `product_variants`   | Colour/size combinations per product — own stock + optional price override                      | ✅  | ✅          | ✅    |
| `fabric_options`     | Admin-managed fabric picklist (Pure Pashmina, Cotton, Banarasi Silk, …)                         | ✅  | ✅          | —     |
| `colour_options`     | Admin-managed colour picklist, shown as text chips (hex_code optional, unused in UI)            | ✅  | ✅          | —     |
| `size_scales`        | Named size systems (age_infant, age_kids, age_teens, adult_clothing, free_size, dress_material) | ✅  | ✅          | —     |
| `size_options`       | Size labels belonging to a scale (e.g. "3-4 years" under age_kids)                              | ✅  | ✅          | —     |
| `category_sizes`     | Junction: which size_options a category offers, independent of scale                            | ✅  | ❌ hard¹¹   | —     |
| `addresses`          | Customer shipping addresses                                                                     | ✅  | ✅          | —     |
| `orders`             | Order records with state machine status                                                         | ✅  | ✅          | ✅    |
| `order_items`        | Line items per order — price/name/variant snapshotted at purchase time                          | ✅  | ✅          | ✅    |
| `cart_items`         | Server-side cart (persists across devices)                                                      | ✅  | —           | —     |
| `reviews`            | Customer reviews — admin-moderated before display                                               | ✅  | ✅          | ✅    |
| `audit_logs`         | Immutable append-only log of all admin mutations                                                | ✅  | ❌ NEVER    | —     |
| `notification_queue` | Async outbox for email/SMS/WhatsApp delivery                                                    | ✅  | —           | —     |
| `redirects`          | SEO 301/302 redirect rules                                                                      | ✅  | —           | —     |
| `site_settings`      | Admin-configurable key-value store (announcement bar, thresholds)                               | ✅  | —           | —     |
| `static_pages`       | Legal/informational pages (About, Terms, Privacy, Returns, FAQs) — 5 fixed rows                 | ✅  | ✅          | ✅    |
| `editorial_reviews`  | Curated showcase reviews — no auth dependency, admin-managed                                    | ✅  | ✅          | —     |

¹ `profiles` audit is scoped to `role` changes only (`profiles_role_audit` trigger, `WHEN (OLD.role
IS DISTINCT FROM NEW.role)`) — full_name/phone self-edits are not logged. See "Admin user
management" below.

¹¹ `category_sizes` is a pure many-to-many association (which sizes a category offers) with no
business history of its own — same reasoning as `cart_items` having no `deleted_at`. Checking a
size in `/admin/categories` inserts a row; unchecking hard-deletes it. `ON DELETE CASCADE` on both
FKs means deleting a category or a size_option cleans up its associations automatically.

## Categories admin fixes + adult clothing size scale (added 2026-08-07)

No new tables. Two independent fixes bundled into one migration since both surfaced from the
same admin-categories bug report:

- **RLS fix**: `categories_update_admin`, `products_update_admin`, `orders_update_admin` all
  gained an explicit `WITH CHECK (is_admin())` — previously admins could not soft-delete a
  category (and, by the same latent bug, likely not a product either) via the admin UI. See
  RLS.md Critical rule 10 for the full root-cause writeup — the actual mechanism was more
  surprising than "the check is missing."
- **`adult_clothing` size scale**: a 6th `size_scales` row (`XS, S, M, L, XL, XXL` as
  `size_options`) for ready-to-wear adult garments — the existing scales were all either
  age-based (kids/infant/teens), one-size (`free_size`), or explicitly for unstitched fabric
  (`dress_material`), none of which fit a fitted stitched garment for adult women.
- `admin.categories.tsx` gained a "Default size scale" dropdown (human-readable labels, "No
  size options" as the null default) — `categories.default_size_scale_id` itself already
  existed (Sprint 2C, product variants migration) but had no admin UI to set it.

## Razorpay integration (added 2026-08-05)

No new table — one new nullable column on `orders`:

- **`orders.razorpay_order_id TEXT UNIQUE`** — the Razorpay _order_ id (distinct from
  `payment_id`, the Razorpay _payment_ id set post-capture). Created up-front by
  `create-razorpay-order` and used as its own idempotency check: a retried call with the same
  internal `order_id` returns the existing Razorpay order instead of creating a second one.
- **`supabase/functions/create-razorpay-order/`** — runs as the caller (their own JWT), so
  `orders_select_own` RLS naturally scopes the ownership check to the caller's own orders; the
  one write (`razorpay_order_id`) uses a service-role client internally, since `orders` has no
  customer UPDATE policy at all (`orders_update_admin` is admin-only — see RLS.md).
- **`supabase/functions/razorpay-webhook/`** — verifies `X-Razorpay-Signature` via
  `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` before touching anything; always returns 200
  after that (Razorpay retries on non-200, and re-processing an already-`confirmed` order must
  not double-notify — guarded by checking `order.status === 'pending'` before acting). On
  `payment.captured`: `status → 'confirmed'`, `payment_id`, `payment_method = 'razorpay'`, then
  inserts 3 `notification_queue` rows directly (`sms`/`whatsapp`/`email`) — mirrors
  `NotificationService.getDefaultChannels("order_confirmed")` exactly, since this runs as
  `service_role` and can't import the frontend class. `payment.failed`: logged only, order stays
  `pending`.
- `checkout.tsx` sends `order_confirmed` immediately only for COD, exactly as before Razorpay
  existed; for the Razorpay path the notification is deferred entirely to the webhook, since
  `pending` isn't a real payment confirmation. If the customer dismisses the Razorpay modal, the
  order is left `pending` by design — no auto-retry/resume flow this sprint, matching the
  product decision that an admin follow-up on stale pending orders is acceptable for now.
- Feature-flagged in the UI by `VITE_RAZORPAY_KEY_ID` (hidden if unset or the placeholder value)
  — the entire integration ships dark until a real key is added.

## Notification worker (Sprint 2D, added 2026-08-05)

No new table — `notification_queue` (migration `20260801100006`) already had everything the
worker needs. What's new:

- **`claim_notification_batch(p_limit)`** — `SECURITY DEFINER` `plpgsql`, `service_role`-only.
  Atomically claims up to `p_limit` queued/due/under-attempt-cap rows via a single
  `UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED)` statement — see RLS.md rule 9 for why
  the claim marker is a `process_after` lease, not a new status value.
- **`notif_queue_admin_retry`** RLS policy — narrow admin `UPDATE`, see RLS.md rule/footnote 5.
- **`pg_cron` + `pg_net`** extensions enabled (were available but not installed). A `cron.schedule`
  job calls the `process-notifications` Edge Function every 5 minutes via `net.http_post`; the
  Bearer token is read from Supabase Vault by name at run time, never written into the migration
  file (see the migration's own comment for the one-time Vault population step, run directly in
  the Dashboard SQL Editor — the real service_role key never enters git).
- **`supabase/functions/process-notifications/`** — the worker itself. Dispatches by channel:
  `sms`/`email` look up the destination (`profiles.phone`, or the caller's email via the GoTrue
  Admin API) and call the relevant provider; `whatsapp` and `push` are always skipped this sprint
  (no provider integration yet). Order-lifecycle events (`order_confirmed`,
  `order_dispatched`, etc.) re-fetch the order/items/address fresh at send time by
  `payload.order_number` rather than requiring every `NotificationService.send()` call site to
  embed a full snapshot — `otp_request` is the one exception, since its `code` only ever exists in
  the payload (only a bcrypt hash is stored in `otp_codes`).
- **`supabase/functions/_shared/notification-service.ts`** — extended with `sendEmail()` (Resend)
  and a `sendSmsRaw()` extracted from the existing `sendSms()` used by `otp-request`. Both throw
  `ProviderNotConfiguredError` when their secret is unset, which the worker catches specifically to
  mark a row `skipped` (not `failed`). Note: `otp-request`'s OTP SMS now actually attempts real
  Twilio delivery if `TWILIO_*` secrets are ever set — previously that path always stub-failed
  regardless of configuration; this was necessary to keep one Twilio integration point rather than
  two, per the NotificationService law.
- **`src/services/NotificationService.ts`** — `email` added to the default channel list for the 5
  order-lifecycle events (wherever a real email template exists). `otp_request`/`review_approved`/
  `welcome` are unchanged.

## Admin user management (added 2026-08-04)

`/admin/users` replaces manual SQL for admin promotions. No new table — two new pieces on top of
`profiles`:

- **`admin_list_users(p_search, p_limit, p_offset)`** — `SECURITY DEFINER` `plpgsql` function
  (not `sql`, to keep a hard function-call boundary rather than a planner-inlineable one). It's
  the only way this app reads `auth.users`: PostgREST never exposes the `auth` schema directly, so
  joining `profiles.id = auth.users.id` for `email`/`last_sign_in_at` has to happen server-side.
  Raises if the caller isn't `is_admin()`. `REVOKE ... FROM PUBLIC` / `GRANT ... TO authenticated`,
  same pattern as `is_admin()` itself.
- **Role changes** go through a normal `profiles` UPDATE (`profiles_update_admin` policy) rather
  than a second RPC — see RLS.md rule 8 for why a policy alone wasn't enough and what
  `block_self_role_change` adds.

`products.rating_avg`/`rating_count` and every other table are untouched by this — this section is
purely about reading/writing the `profiles.role` column safely.

## Editorial reviews (added 2026-08-03)

`editorial_reviews` exists because the 18 mock reviews in `src/lib/seed.ts`
could never be migrated into the real `reviews` table: `reviews.customer_id`
requires a real `profiles`/`auth.users` row, and `reviews` carries a
`UNIQUE (product_id, customer_id)` constraint that would reject a shared
placeholder account for any product with more than one review (5 of the 8
products have 2+). `editorial_reviews` has no `customer_id` and no
uniqueness constraint at all — it's purely admin-curated showcase content,
not a real customer-submission record, so neither restriction applies or is
wanted.

`products.rating_avg`/`rating_count` are **not** touched by this table —
they remain auto-computed from `reviews` only, via the existing
`refresh_product_rating()` trigger (unchanged). Blending in editorial
reviews for display (PDP rating summary, product card stars) happens
entirely in application code (`useProduct.ts`, `useProducts.ts`), and only
as a fallback when the real `rating_count` is `0` — real reviews always take
full precedence when any exist.

## Product variants (added 2026-08-01, Sprint 2C)

`product_variants` rows are keyed by `(product_id, colour_id, size_id)` — both `colour_id` and
`size_id` are nullable (a plain shawl may have neither). Because Postgres treats every `NULL` as
distinct in a normal unique constraint, uniqueness is enforced via a `COALESCE`-to-sentinel-UUID
partial unique index (`WHERE deleted_at IS NULL`) instead of a bare `UNIQUE(...)` — see the
migration file for the exact expression. A product with zero variant rows is managed at the
product level exactly as before (`products.stock_count`/`products.price`); this is an app-layer
rule enforced by the PDP and admin form, not a DB constraint.

`categories.default_size_scale_id` tells the admin form which size scale to offer for that
category's products: kidswear → `age_kids`, shawls → `free_size`, dress material →
`dress_material` (deliberately zero `size_options` — "no size" for unstitched fabric).
Accessories is left `NULL` (no size selector).

`products.fabric_id` is a new FK to `fabric_options`, added alongside the pre-existing free-text
`fabric` column rather than replacing it — the admin form dual-writes both (sets `fabric_id` and
mirrors the chosen name into `fabric`) so the PDP, which still reads the text column directly,
needs no change yet. Migrating the PDP to read via the FK join is a deferred follow-up.

`colour_options.hex_code` was made nullable (migration `20260809000001`, colour/package sprint) —
colours are shown everywhere as text-label chips (`.colour-chip`), not swatches, so a hex value is
no longer required to create a colour. Existing rows keep their stored hex; new colours added via
`/admin/colours` never set one. The `ColourOption.hex_code` TypeScript type was updated to
`string | null` to match; no code reads `hex_code` for rendering anywhere in the app.

`product_includes` writes changed (no schema change — same table/columns): the admin form no
longer index-matches individual rows to update/insert/delete. It now soft-deletes every existing
include for the product and inserts fresh rows from a single textarea (one item per line,
`sort_order` = line index) on every save. The "What's in the package" section was also gated
behind `showUnstitched && isUnstitched` in the admin form (unstitched Dress Material only) — that
gate was removed for the includes editor specifically (kept for the Pieces/dimensions section),
so any category can now carry a package-includes list.

`category_sizes` (migration `20260809000002`) replaces `categories.default_size_scale_id` as the
source of truth for which sizes a category's product form offers — a category can now mix sizes
across scales (e.g. a "Kids Winterwear" category could offer both `age_kids` and `free_size`
options together) instead of being locked to exactly one scale. `default_size_scale_id` itself is
untouched by this migration (still a valid column, still backfilled data) but is no longer read by
the admin product form or the admin categories page — it's vestigial unless something else starts
reading it again. Backfilled at migration time: every category with a `default_size_scale_id` got
its scale's current `size_options` copied into `category_sizes` (Kidswear → 6, Stitched Suits → 6,
Kashmiri Shawls → 1, Dress Material → 0 since `dress_material` has no `size_options`, Accessories →
0 since it had no scale assigned). `admin.categories.tsx`'s per-category "Default size scale"
dropdown was replaced with a "Manage sizes" button opening `CategorySizesModal`, which lists every
size across every scale as a checkbox for that category — checking/unchecking writes directly to
`category_sizes` (insert/hard-delete), no batch save step. `ProductForm.tsx`'s size axis is now
purely data-driven: it shows if `useCategorySizes(categoryId)` returns any rows, replacing the
hardcoded `showSizeVariants` flag in `CATEGORY_CONFIG` (removed entirely).

`order_items.variant_id` + `order_items.variant_label` follow this table's existing
snapshot-at-purchase-time principle (same as `product_name`/`product_slug`/`unit_price`) — a later
colour/size rename or deletion must not alter historical orders.

## Static pages (added 2026-08-02, Static Pages sprint)

`static_pages` holds exactly 5 fixed rows — `about`, `terms`, `privacy-policy`,
`returns-policy`, `faqs` — seeded directly in the migration from the legacy
`src/lib/seed.ts` mock content (which previously lived only in localStorage,
with no server rendering and no real database backing). `content` is raw HTML
(the same shape the mock data already used — `<p>`, `<h2>`, `<ul>/<li>`,
`<a href>`, `<table>` for the privacy policy's cookie section), rendered via
`dangerouslySetInnerHTML`, not markdown — there is no markdown renderer in
this project and converting five real legal-content bodies to markdown by
hand was judged not worth the risk of dropping content versus keeping the
exact existing HTML.

There is deliberately no `INSERT` RLS policy — the 5 rows are fixed by
product decision (no add/delete in the admin UI); the seed rows are inserted
directly by the migration under the privileged migration role, not through
the app. Same reasoning for no `DELETE` policy beyond the standard soft-delete
convention.

`/contact` was explicitly excluded from this table — unlike the other 5 pages
it's not prose, it's a small tiles component with one live data source
(`site_settings.store_whatsapp`) mixed with hardcoded placeholders. Folding
it into a generic content model would mean losing the dynamic WhatsApp tile.
Left as its own component; scoped as a smaller future Fast Lane pass instead.

## Key design decisions

**Prices stored in paise** — all `price`, `total`, `subtotal` columns are integers in paise (₹1 = 100 paise). Never floats for money. Use `formatPrice()` utility in `src/types/database.ts` for display.

**Soft delete everywhere** — `deleted_at TIMESTAMPTZ` on all operational tables. Hard DELETE is forbidden on these tables. A record with `deleted_at IS NOT NULL` is invisible to all public RLS policies.

**Order item price snapshot** — `order_items.unit_price` copies the product price at time of order. Product price changes never affect historical orders.

**Rating auto-computed** — `products.rating_avg` and `products.rating_count` are maintained by the `refresh_product_rating()` trigger on `reviews`. Never write these fields directly.

**Notification queue** — all external notifications (email, SMS, WhatsApp) are written to `notification_queue` first and processed asynchronously by a Supabase Edge Function worker. This prevents payment/order flows from blocking on slow email providers.

## RLS summary

- **Public (anon):** Read active products, categories, approved reviews, site settings, redirects
- **Authenticated (customer):** Above + own profile, own orders, own cart, own addresses, own reviews
- **Authenticated (admin):** Full read on all tables + write on products, categories, orders, reviews, settings
- **Service role:** Full access (used only by Edge Functions)

## State machines

**Products:** `draft → active → archived` (no direct draft→archived skip in UI, but technically valid)

**Orders:** `pending → confirmed → dispatched → delivered`
`pending → cancelled`
`confirmed → cancelled`
`delivered → refunded`
