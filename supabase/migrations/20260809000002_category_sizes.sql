-- Migration: 20260809000002_category_sizes.sql
-- Purpose: replace the one-scale-per-category model (categories.default_size_scale_id)
--          with a flexible per-category size picklist, so a category can offer any
--          mix of sizes across scales rather than being locked to a single scale.
-- Lane: Full Lane
-- Rollback: DROP TABLE category_sizes;
--           (categories.default_size_scale_id is untouched by this migration and can
--           still be read as a fallback if this table is ever dropped)

CREATE TABLE category_sizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  size_option_id UUID NOT NULL REFERENCES size_options(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, size_option_id)
);

ALTER TABLE category_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_sizes_select_public" ON category_sizes
  FOR SELECT USING (true);

CREATE POLICY "category_sizes_write_admin" ON category_sizes
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Backfill: for every category with a default_size_scale_id, carry its scale's
-- current size_options into category_sizes, preserving size_options.sort_order.
INSERT INTO category_sizes (category_id, size_option_id, sort_order)
SELECT c.id, so.id, so.sort_order
FROM categories c
JOIN size_options so ON so.scale_id = c.default_size_scale_id
WHERE c.deleted_at IS NULL
  AND c.default_size_scale_id IS NOT NULL
  AND so.deleted_at IS NULL;
