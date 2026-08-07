-- Migration: 20260807000001_fix_categories_rls_and_size_scale.sql
-- Purpose: Fix admin soft-delete RLS bug on categories/products/orders;
--          add an adult_clothing size scale for Stitched Suits.
-- Lane: Full Lane
-- Rollback:
--   DROP POLICY IF EXISTS "categories_update_admin" ON categories;
--   CREATE POLICY "categories_update_admin" ON categories FOR UPDATE
--     TO authenticated USING (is_admin());
--   DROP POLICY IF EXISTS "products_update_admin" ON products;
--   CREATE POLICY "products_update_admin" ON products FOR UPDATE
--     TO authenticated USING (is_admin());
--   DROP POLICY IF EXISTS "orders_update_admin" ON orders;
--   CREATE POLICY "orders_update_admin" ON orders FOR UPDATE
--     TO authenticated USING (is_admin());
--   DELETE FROM size_options WHERE scale_id IN
--     (SELECT id FROM size_scales WHERE name = 'adult_clothing');
--   DELETE FROM size_scales WHERE name = 'adult_clothing';

-- ── Part 1: RLS WITH CHECK fix ───────────────────────────────────────────
-- Root cause (verified empirically via rolled-back transactions, not just
-- read from pg_policies): each of these three UPDATE policies had USING
-- (is_admin()) but no explicit WITH CHECK. is_admin() is true and USING
-- passes fine, but the *effective* check Postgres was applying to the new
-- row was NOT "is_admin() again" — updates that left deleted_at NULL (or
-- set it back to NULL) succeeded, while updates setting deleted_at to a
-- real timestamp failed with 42501. That's exactly the shape of the
-- table's own public SELECT policy (deleted_at IS NULL), not the UPDATE
-- policy's own USING clause, being used as the fallback check when WITH
-- CHECK is omitted. An explicit WITH CHECK (is_admin()) removes the
-- ambiguity entirely -- admins can set deleted_at to anything.
DROP POLICY IF EXISTS "categories_update_admin" ON categories;
CREATE POLICY "categories_update_admin"
  ON categories FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "products_update_admin" ON products;
CREATE POLICY "products_update_admin"
  ON products FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin"
  ON orders FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Part 2: adult_clothing size scale ────────────────────────────────────
-- For Stitched Suits (ready-to-wear women's wear) -- distinct from the
-- age-based kids/infant/teens scales, free_size (one-size), and
-- dress_material (unstitched fabric, the opposite of "stitched").
INSERT INTO size_scales (id, name, created_at, updated_at, deleted_at)
VALUES (gen_random_uuid(), 'adult_clothing', now(), now(), NULL);

INSERT INTO size_options (id, scale_id, label, sort_order, created_at, updated_at, deleted_at)
SELECT
  gen_random_uuid(),
  s.id,
  sizes.label,
  sizes.sort_order,
  now(), now(), NULL
FROM size_scales s,
  (VALUES
    ('XS', 1), ('S', 2), ('M', 3),
    ('L', 4), ('XL', 5), ('XXL', 6)
  ) AS sizes(label, sort_order)
WHERE s.name = 'adult_clothing';
