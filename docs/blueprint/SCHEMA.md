# Yaawun — Database Schema Blueprint

Last updated: 2026-08-01
Migration count: 8 (includes 20260801100000_retire_legacy_lovable_schema.sql, which drops the
original Lovable-scaffolded products/categories/orders/customers/addresses/reviews/coupons/
sections/pages/wishlist/settings tables — dummy data only, confirmed disposable by the project
owner before this migration was written)

## Tables

| Table                | Purpose                                                                     | RLS | Soft Delete | Audit |
| -------------------- | --------------------------------------------------------------------------- | --- | ----------- | ----- |
| `profiles`           | Extends `auth.users` — customer and admin profiles                          | ✅  | ✅          | —     |
| `categories`         | Product categories (Kashmiri Shawls, Dress Material, Kidswear, Accessories) | ✅  | ✅          | ✅    |
| `products`           | Product catalogue — all items for sale                                      | ✅  | ✅          | ✅    |
| `product_pieces`     | Per-piece dimension specs (length, width, weight) for 1–3 piece sets        | ✅  | ✅          | —     |
| `product_images`     | Product photos — Cloudinary URLs + sort order                               | ✅  | ✅          | —     |
| `product_includes`   | "What's in the package" list items                                          | ✅  | ✅          | —     |
| `addresses`          | Customer shipping addresses                                                 | ✅  | ✅          | —     |
| `orders`             | Order records with state machine status                                     | ✅  | ✅          | ✅    |
| `order_items`        | Line items per order — price/name snapshotted at purchase time              | ✅  | ✅          | ✅    |
| `cart_items`         | Server-side cart (persists across devices)                                  | ✅  | —           | —     |
| `reviews`            | Customer reviews — admin-moderated before display                           | ✅  | ✅          | ✅    |
| `audit_logs`         | Immutable append-only log of all admin mutations                            | ✅  | ❌ NEVER    | —     |
| `notification_queue` | Async outbox for email/SMS/WhatsApp delivery                                | ✅  | —           | —     |
| `redirects`          | SEO 301/302 redirect rules                                                  | ✅  | —           | —     |
| `site_settings`      | Admin-configurable key-value store (announcement bar, thresholds)           | ✅  | —           | —     |

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
