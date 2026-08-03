# Yaawun — RLS Policy Map

Last updated: 2025-08-01

## Principle: Default Deny (framework §2)

Every table has RLS enabled. No row is accessible unless an explicit policy grants it.
The `is_admin()` helper function checks `profiles.role = 'admin'` for the current session.

## Policy matrix

| Table              | anon SELECT   | customer SELECT | customer WRITE           | admin SELECT | admin WRITE                 |
| ------------------ | ------------- | --------------- | ------------------------ | ------------ | --------------------------- |
| profiles           | ❌            | Own only        | Own (can't self-promote) | All          | ❌                          |
| categories         | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| products           | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| product_pieces     | ✅            | ✅              | ❌                       | All          | ✅                          |
| product_images     | ✅            | ✅              | ❌                       | All          | ✅                          |
| product_includes   | ✅            | ✅              | ❌                       | All          | ✅                          |
| product_variants   | ✅ active¹    | ✅ active¹      | ❌                       | All          | ✅                          |
| fabric_options     | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| colour_options     | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| size_scales        | ✅            | ✅              | ❌                       | All          | ✅                          |
| size_options       | ✅            | ✅              | ❌                       | All          | ✅                          |
| addresses          | ❌            | Own only        | Own only                 | All          | ❌                          |
| orders             | ❌            | Own only        | Own (INSERT)             | All          | ✅                          |
| order_items        | ❌            | Own orders      | Own orders               | All          | ❌                          |
| cart_items         | ❌            | Own only        | Own only                 | ❌           | ❌                          |
| reviews            | ✅ approved   | Own + approved  | Own (before approval)    | All          | ✅                          |
| audit_logs         | ❌            | ❌              | ❌                       | SELECT only  | ❌ (INSERT via trigger)     |
| notification_queue | ❌            | ❌              | Own (INSERT)             | SELECT only  | Any (INSERT) + service_role |
| redirects          | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| site_settings      | ✅            | ✅              | ❌                       | All          | ✅                          |
| static_pages       | ✅ published² | ✅ published²   | ❌                       | All          | UPDATE only²                |
| editorial_reviews  | ✅ approved³  | ✅ approved³    | ❌                       | All          | ✅                          |

² `static_pages` — public/customer SELECT requires `is_published = true`; admins can SELECT every
non-deleted row (including unpublished drafts) but there is no admin INSERT or DELETE policy at
all — the 5 rows (`about`, `terms`, `privacy-policy`, `returns-policy`, `faqs`) are fixed by
product decision and seeded directly by the migration, not through the app.
³ `editorial_reviews` — public/customer SELECT requires `is_approved = true AND deleted_at IS
NULL`; admins get full `FOR ALL` (`is_admin()`) covering SELECT/INSERT/UPDATE/soft-DELETE. No
`customer_id` column at all, so no self-referential/own-row policy exists here — unlike `reviews`,
there's no "own" concept for this table.

## Critical rules

1. `audit_logs` has NO UPDATE or DELETE policy — immutable by design.
2. `notification_queue` INSERT is allowed for a user enqueuing their own notification
   (`user_id = auth.uid()`) or an admin enqueuing on behalf of any user (order status
   changes, etc.) — added in Sprint 2B to fix `NotificationService.send()`, which was
   silently failing RLS since Sprint 1. UPDATE/DELETE and the full `FOR ALL` surface
   stay `service_role` only — only the Edge Function worker that processes and marks
   rows sent/failed may do those.
3. `profiles.role` cannot be changed by the user themselves (UPDATE policy prevents self-promotion).
4. Admin status is always checked server-side via `is_admin()` — never trust `role` passed from client.
5. ¹ `product_variants` public SELECT additionally requires the parent product to be
   `status = 'active' AND deleted_at IS NULL` (an inline `EXISTS` against `products`) —
   safe without a `SECURITY DEFINER` wrapper because `products` already grants the
   anon/authenticated querying role SELECT on exactly those rows via its own
   `products_select_public` policy.
6. `product_variants` uniqueness on `(product_id, colour_id, size_id)` is enforced by a
   `COALESCE`-to-sentinel-UUID partial unique index, not a bare `UNIQUE` constraint —
   Postgres treats every `NULL` as distinct, so a plain constraint would not have
   caught duplicate colour/size-less variant rows for the same product.

## Testing RLS (automated — see CI)

The CI pipeline includes a migration check. For full RLS testing, run:

```bash
supabase test db
```

Test scripts in `supabase/tests/` simulate anon, customer, and admin sessions
and assert correct row visibility for each.
