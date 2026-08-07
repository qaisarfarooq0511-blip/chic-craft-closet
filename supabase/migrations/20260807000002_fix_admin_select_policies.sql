-- Migration: 20260807000002_fix_admin_select_policies.sql
-- Purpose: Corrective fix for 20260807000001 — that migration's WITH CHECK
--          fix on categories/products/orders_update_admin was necessary but
--          not sufficient. Soft-deleting a row still failed with 42501.
-- Lane: Full Lane
-- Rollback:
--   DROP POLICY IF EXISTS "categories_select_admin" ON categories;
--   DROP POLICY IF EXISTS "products_select_admin" ON products;
--   CREATE POLICY "products_select_admin" ON products FOR SELECT
--     TO authenticated USING (is_admin() AND deleted_at IS NULL);
--   DROP POLICY IF EXISTS "orders_select_admin" ON orders;
--   CREATE POLICY "orders_select_admin" ON orders FOR SELECT
--     TO authenticated USING (is_admin() AND deleted_at IS NULL);

-- ── Root cause ────────────────────────────────────────────────────────────
-- Verified empirically (rolled-back transactions, including on a throwaway
-- scratch table unrelated to categories, to rule out anything table-specific):
-- for an UPDATE, Postgres requires the NEW row to satisfy at least one
-- applicable SELECT policy, independent of whatever the UPDATE policy's own
-- WITH CHECK says. This held even with WITH CHECK (true) on the UPDATE
-- policy -- adding a permissive SELECT policy was the only thing that made
-- the identical UPDATE succeed. So 20260807000001's WITH CHECK (is_admin())
-- fix was real and necessary (see its own comment for that root cause) but
-- incomplete on its own:
--   - categories had NO admin SELECT policy at all -- RLS.md's policy matrix
--     claimed "admin SELECT: All" for it, but that was never actually
--     implemented in any migration.
--   - products_select_admin and orders_select_admin DO exist, but both are
--     `is_admin() AND deleted_at IS NULL` -- so even an admin's own SELECT
--     policy excludes the very row a soft-delete is trying to produce,
--     hitting the exact same wall.
-- Public/customer SELECT policies are untouched -- they correctly keep
-- filtering deleted_at IS NULL / status = 'active'. Only admins need to see
-- soft-deleted rows (to restore them).

CREATE POLICY "categories_select_admin"
  ON categories FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "products_select_admin" ON products;
CREATE POLICY "products_select_admin"
  ON products FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "orders_select_admin" ON orders;
CREATE POLICY "orders_select_admin"
  ON orders FOR SELECT
  TO authenticated
  USING (is_admin());
