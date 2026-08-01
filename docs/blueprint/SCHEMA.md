# Yaawun — Database Schema Blueprint

Last updated: 2026-08-01
Migration count: 12 (includes 20260801100000_retire_legacy_lovable_schema.sql, which drops the
original Lovable-scaffolded products/categories/orders/customers/addresses/reviews/coupons/
sections/pages/wishlist/settings tables — dummy data only, confirmed disposable by the project
owner before this migration was written)

## Tables

| Table                | Purpose                                                                         | RLS | Soft Delete | Audit |
| -------------------- | ------------------------------------------------------------------------------- | --- | ----------- | ----- |
| `profiles`           | Extends `auth.users` — customer and admin profiles                              | ✅  | ✅          | —     |
| `categories`         | Product categories (Kashmiri Shawls, Dress Material, Kidswear, Accessories)     | ✅  | ✅          | ✅    |
| `products`           | Product catalogue — all items for sale                                          | ✅  | ✅          | ✅    |
| `product_pieces`     | Per-piece dimension specs (length, width, weight) for 1–3 piece sets            | ✅  | ✅          | —     |
| `product_images`     | Product photos — Supabase Storage public URLs + sort order                      | ✅  | ✅          | —     |
| `product_includes`   | "What's in the package" list items                                              | ✅  | ✅          | —     |
| `product_variants`   | Colour/size combinations per product — own stock + optional price override      | ✅  | ✅          | ✅    |
| `fabric_options`     | Admin-managed fabric picklist (Pure Pashmina, Cotton, Banarasi Silk, …)         | ✅  | ✅          | —     |
| `colour_options`     | Admin-managed colour picklist with hex swatch                                   | ✅  | ✅          | —     |
| `size_scales`        | Named size systems (age_infant, age_kids, age_teens, free_size, dress_material) | ✅  | ✅          | —     |
| `size_options`       | Size labels belonging to a scale (e.g. "3-4 years" under age_kids)              | ✅  | ✅          | —     |
| `addresses`          | Customer shipping addresses                                                     | ✅  | ✅          | —     |
| `orders`             | Order records with state machine status                                         | ✅  | ✅          | ✅    |
| `order_items`        | Line items per order — price/name/variant snapshotted at purchase time          | ✅  | ✅          | ✅    |
| `cart_items`         | Server-side cart (persists across devices)                                      | ✅  | —           | —     |
| `reviews`            | Customer reviews — admin-moderated before display                               | ✅  | ✅          | ✅    |
| `audit_logs`         | Immutable append-only log of all admin mutations                                | ✅  | ❌ NEVER    | —     |
| `notification_queue` | Async outbox for email/SMS/WhatsApp delivery                                    | ✅  | —           | —     |
| `redirects`          | SEO 301/302 redirect rules                                                      | ✅  | —           | —     |
| `site_settings`      | Admin-configurable key-value store (announcement bar, thresholds)               | ✅  | —           | —     |

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

`order_items.variant_id` + `order_items.variant_label` follow this table's existing
snapshot-at-purchase-time principle (same as `product_name`/`product_slug`/`unit_price`) — a later
colour/size rename or deletion must not alter historical orders.

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
