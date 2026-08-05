# Yaawun — RLS Policy Map

Last updated: 2026-08-05

## Principle: Default Deny (framework §2)

Every table has RLS enabled. No row is accessible unless an explicit policy grants it.
The `is_admin()` helper function checks `profiles.role = 'admin'` for the current session.

## Policy matrix

| Table              | anon SELECT   | customer SELECT | customer WRITE           | admin SELECT | admin WRITE                 |
| ------------------ | ------------- | --------------- | ------------------------ | ------------ | --------------------------- |
| profiles           | ❌            | Own only        | Own (can't self-promote) | All          | Role only⁴                  |
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
| notification_queue | ❌            | ❌              | Own (INSERT)             | Retry only⁵  | Any (INSERT) + service_role |
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
⁴ `profiles` admin WRITE — `profiles_update_admin` policy (added 2026-08-04, `/admin/users`) lets
an admin UPDATE any OTHER profile row; `WITH CHECK (is_admin() AND id != auth.uid())` blocks the
policy's own path to self-demotion. A separate `block_self_role_change` BEFORE UPDATE trigger
additionally blocks ANY authenticated caller — via this policy, `profiles_update_own`, or any
future policy — from changing their own `role` column, since permissive policies on the same table
OR together and a hole opened by one policy isn't closed by adding another. See Critical rule 8.
⁵ `notification_queue` admin — previously SELECT only. Added 2026-08-05 (Sprint 2D, migration
`20260805000001`): `notif_queue_admin_retry`, `FOR UPDATE`, `WITH CHECK (is_admin() AND
status = 'queued' AND attempts = 0)` — the admin dashboard's retry button can reset a failed row
back into the queue, but the `WITH CHECK` shape means it cannot be used to fake a row as `sent`,
forge an `attempts` count, or edit any other column combination. Full `FOR ALL` remains
`service_role`-only (the worker itself).

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
7. **`profiles_select_admin` must call `is_admin()` — never inline its own admin check.**
   (Fixed 2026-08-03, migration `20260803000001`.) The original policy used its own
   `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')`
   directly in the `USING` clause instead of calling the existing `is_admin()` helper.
   Because that subquery targets `profiles` from within a policy _on_ `profiles`, with
   no `SECURITY DEFINER` function-call boundary in between, Postgres's RLS recursion
   guard fires (`42P17: infinite recursion detected in policy for relation "profiles"`)
   any time the policy is evaluated for a row other than the caller's own — i.e. any
   embedded `customer:profiles(...)` join (order detail, order list, review
   moderation), for any authenticated user, admin or not. A plain own-row lookup
   (`.eq("id", authUserId)`, as `auth-store.ts` does) never triggered it, because
   `profiles_select_own` short-circuits the OR'd policy set before the broken branch
   is reached — which is why this went unnoticed all the way until an actual
   cross-user profile read happened. `is_admin()` itself was never the problem: it's
   `SECURITY DEFINER` and already used correctly, with no recursion, by every other
   table's admin policy (categories, products, orders, static_pages, etc.) — the fix
   was routing `profiles_select_admin` through that same existing helper instead of
   duplicating its logic inline.
8. **Self-demotion is blocked at two independent layers, not one.** (Added 2026-08-04,
   migration `20260804000001`, `/admin/users`.) `profiles_update_admin`'s
   `WITH CHECK (is_admin() AND id != auth.uid())` stops that policy's own path, but
   `profiles_update_own` (rule 3) was written only to block self-_promotion_
   (`WITH CHECK` requires the new `role` to be `'customer'`) — it does **not** block an
   admin from running `UPDATE profiles SET role = 'customer' WHERE id = auth.uid()`
   themselves, since that update trivially satisfies `profiles_update_own`'s own check.
   Because permissive RLS policies on one table are OR'd, adding `profiles_update_admin`
   cannot close a hole already open in a different, older policy. The real backstop is
   `block_self_role_change`, a `BEFORE UPDATE` trigger that raises whenever
   `OLD.id = auth.uid() AND OLD.role IS DISTINCT FROM NEW.role` — it fires regardless of
   which policy authorized the row, and (unlike the bug in rule 7) it queries no table at
   all, so it carries no recursion risk. `auth.uid()` is `NULL` for `service_role`/direct
   SQL, so seeding scripts are unaffected. Role changes are audited via `profiles_role_audit`
   (`AFTER UPDATE ... WHEN (OLD.role IS DISTINCT FROM NEW.role)`, reusing `log_admin_action()`)
   so ordinary self-service edits (full_name, phone) are never logged as admin actions.
9. **`claim_notification_batch()` is `service_role`-only, and its lock is a lease, not a
   status.** (Added 2026-08-05, Sprint 2D.) PostgREST can't express `SELECT ... FOR UPDATE
SKIP LOCKED` through the normal query builder, so the atomic claim step is a
   `SECURITY DEFINER` function the worker calls via `.rpc()`. It marks claimed rows by
   pushing `process_after` out 10 minutes rather than introducing a `'processing'` status
   value — `notification_status` has no such value, and one would need its own cleanup
   job for a crashed worker's stuck rows. Leaving `status='queued'` means a crashed
   worker's claimed rows simply become eligible again once the lease expires — no separate
   sweep required. `REVOKE ... FROM PUBLIC` / `GRANT ... TO service_role` only; this must
   never be callable by `authenticated`.

## Testing RLS (automated — see CI)

The CI pipeline includes a migration check. For full RLS testing, run:

```bash
supabase test db
```

Test scripts in `supabase/tests/` simulate anon, customer, and admin sessions
and assert correct row visibility for each.
