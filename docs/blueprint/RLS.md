# Yaawun — RLS Policy Map

Last updated: 2025-08-01

## Principle: Default Deny (framework §2)

Every table has RLS enabled. No row is accessible unless an explicit policy grants it.
The `is_admin()` helper function checks `profiles.role = 'admin'` for the current session.

## Policy matrix

| Table              | anon SELECT | customer SELECT | customer WRITE           | admin SELECT | admin WRITE             |
| ------------------ | ----------- | --------------- | ------------------------ | ------------ | ----------------------- |
| profiles           | ❌          | Own only        | Own (can't self-promote) | All          | ❌                      |
| categories         | ✅ active   | ✅ active       | ❌                       | All          | ✅                      |
| products           | ✅ active   | ✅ active       | ❌                       | All          | ✅                      |
| product_pieces     | ✅          | ✅              | ❌                       | All          | ✅                      |
| product_images     | ✅          | ✅              | ❌                       | All          | ✅                      |
| product_includes   | ✅          | ✅              | ❌                       | All          | ✅                      |
| addresses          | ❌          | Own only        | Own only                 | All          | ❌                      |
| orders             | ❌          | Own only        | Own (INSERT)             | All          | ✅                      |
| order_items        | ❌          | Own orders      | Own orders               | All          | ❌                      |
| cart_items         | ❌          | Own only        | Own only                 | ❌           | ❌                      |
| reviews            | ✅ approved | Own + approved  | Own (before approval)    | All          | ✅                      |
| audit_logs         | ❌          | ❌              | ❌                       | SELECT only  | ❌ (INSERT via trigger) |
| notification_queue | ❌          | ❌              | ❌                       | SELECT only  | service_role only       |
| redirects          | ✅ active   | ✅ active       | ❌                       | All          | ✅                      |
| site_settings      | ✅          | ✅              | ❌                       | All          | ✅                      |

## Critical rules

1. `audit_logs` has NO UPDATE or DELETE policy — immutable by design.
2. `notification_queue` write access is `service_role` only — Edge Functions only.
3. `profiles.role` cannot be changed by the user themselves (UPDATE policy prevents self-promotion).
4. Admin status is always checked server-side via `is_admin()` — never trust `role` passed from client.

## Testing RLS (automated — see CI)

The CI pipeline includes a migration check. For full RLS testing, run:

```bash
supabase test db
```

Test scripts in `supabase/tests/` simulate anon, customer, and admin sessions
and assert correct row visibility for each.
