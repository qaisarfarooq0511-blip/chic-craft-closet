# Yaawun — RLS Policy Map

Last updated: 2026-08-10

## Principle: Default Deny (framework §2)

Every table has RLS enabled. No row is accessible unless an explicit policy grants it.
The `is_admin()` helper function checks `profiles.role = 'admin'` for the current session.

## Policy matrix

| Table              | anon SELECT   | customer SELECT | customer WRITE           | admin SELECT | admin WRITE                 |
| ------------------ | ------------- | --------------- | ------------------------ | ------------ | --------------------------- |
| profiles           | ❌            | Own only        | Own (can't self-promote) | All          | Role only⁴                  |
| categories         | ✅ active     | ✅ active       | ❌                       | All⁶         | ✅⁶                         |
| products           | ✅ active     | ✅ active       | ❌                       | All⁶         | ✅⁶                         |
| product_pieces     | ✅            | ✅              | ❌                       | All          | ✅                          |
| product_images     | ✅            | ✅              | ❌                       | All          | ✅                          |
| product_includes   | ✅            | ✅              | ❌                       | All          | ✅                          |
| product_variants   | ✅ active¹    | ✅ active¹      | ❌                       | All          | ✅                          |
| fabric_options     | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| badge_options      | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| embroidery_options | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| care_options       | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| colour_options     | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| size_scales        | ✅            | ✅              | ❌                       | All          | ✅                          |
| size_options       | ✅            | ✅              | ❌                       | All          | ✅                          |
| category_sizes     | ✅            | ✅              | ❌                       | All          | ✅                          |
| addresses          | ❌            | Own only        | Own only                 | All          | ❌                          |
| orders             | ❌            | Own only        | Own (INSERT)             | All⁶         | ✅⁶                         |
| order_items        | ❌            | Own orders      | Own orders               | All          | ❌                          |
| cart_items         | ❌            | Own only        | Own only                 | ❌           | ❌                          |
| reviews            | ✅ approved   | Own + approved  | Own (before approval)    | All          | ✅                          |
| audit_logs         | ❌            | ❌              | ❌                       | SELECT only  | ❌ (INSERT via trigger)     |
| notification_queue | ❌            | ❌              | Own (INSERT)             | Retry only⁵  | Any (INSERT) + service_role |
| redirects          | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| site_settings      | ✅            | ✅              | ❌                       | All          | ✅                          |
| static_pages       | ✅ published² | ✅ published²   | ❌                       | All          | UPDATE only²                |
| editorial_reviews  | ✅ approved³  | ✅ approved³    | ❌                       | All          | ✅                          |
| sections           | ✅ active     | ✅ active       | ❌                       | All          | ✅                          |
| section_products   | ✅            | ✅              | ❌                       | All          | ✅                          |

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
⁶ `categories`/`products`/`orders` admin WRITE — as of 2026-08-07 (migrations `20260807000001`
and `20260807000002`) these three `*_update_admin` policies carry an explicit `WITH CHECK
(is_admin())`, **and** each table now has an admin SELECT policy with no `deleted_at` filter
(`categories_select_admin` is new; `products_select_admin`/`orders_select_admin` had their
`AND deleted_at IS NULL` removed). Both pieces were required — see Critical rule 10.

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
10. **A soft-delete UPDATE needs BOTH an explicit `WITH CHECK` on the UPDATE policy AND an
    admin SELECT policy with no `deleted_at` filter — either one alone is not enough.**
    (Found and fixed 2026-08-07 across two migrations, `20260807000001` and `20260807000002`,
    admin categories soft-delete bug.) The symptom: an admin could rename a category, and
    could restore one (`deleted_at` → `NULL`), but soft-_deleting_ one (`deleted_at` → a real
    timestamp) failed with `42501: new row violates row-level security policy`, even though
    `is_admin()` verifiably returned `true` in that exact session.
    - **Half 1** (`20260807000001`): `categories_update_admin`, `products_update_admin`, and
      `orders_update_admin` all had `USING (is_admin())` and no `WITH CHECK`. Adding an
      explicit `WITH CHECK (is_admin())` looked sufficient — `pg_policies` even confirmed it
      was applied — but the soft-delete UPDATE **still failed identically afterward**.
    - **Half 2** (`20260807000002`, the actual complete fix): verified via rolled-back
      transactions, including on a throwaway scratch table with no relation to `categories`,
      that Postgres requires the **new row** to satisfy at least one applicable **SELECT**
      policy for an UPDATE to succeed — completely independent of what the UPDATE policy's
      own `WITH CHECK` says. This held true even with `WITH CHECK (true)` (unconditional
      pass) on the UPDATE policy itself; only adding a permissive SELECT policy fixed it.
      `categories` had **no admin SELECT policy at all** (RLS.md's own policy matrix claimed
      "admin SELECT: All" for it — that was aspirational documentation, never actually
      implemented in any migration). `products_select_admin`/`orders_select_admin` did exist,
      but both were `is_admin() AND deleted_at IS NULL` — excluding the very row a
      soft-delete produces. Fixed: new `categories_select_admin` (`USING (is_admin())`, no
      `deleted_at` filter); `products_select_admin`/`orders_select_admin` had their
      `deleted_at IS NULL` clause dropped. Public/customer SELECT policies on all three were
      untouched and still correctly filter `deleted_at IS NULL`/`status = 'active'` — only
      admins can now see soft-deleted rows (necessary to restore them).
    - **Takeaway**: an UPDATE policy's `WITH CHECK` and the table's SELECT policies are two
      independent gates that both apply to every UPDATE. Fixing one and confirming it via
      `pg_policies` is not evidence the write actually works — re-test the real operation
      after each change, not just the policy definition.

## Admin read-only functions (no RLS changes)

`admin_list_users`, `admin_list_customers`, and `admin_get_customer` (added 2026-08-04 and
2026-08-10) all read `profiles`/`auth.users`/`orders`/`order_items` through a `SECURITY DEFINER`
function with its own `is_admin()` gate at the top, rather than through a table policy. This is
intentional, not a gap: `auth.users` is never PostgREST-exposed regardless of policy, and the
commerce aggregates in `admin_list_customers`/`admin_get_customer` need a cross-table join that a
row-level policy can't express. No table's RLS policies changed to support them — `REVOKE ...
FROM PUBLIC` / `GRANT ... TO authenticated` on the function itself is the only access control,
same as `admin_list_users`.

## Testing RLS (automated — see CI)

The CI pipeline includes a migration check. For full RLS testing, run:

```bash
supabase test db
```

Test scripts in `supabase/tests/` simulate anon, customer, and admin sessions
and assert correct row visibility for each.
