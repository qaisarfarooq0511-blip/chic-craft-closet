-- Migration: 20260810000002_homepage_sections.sql
-- Purpose: real, admin-configurable homepage product strips, replacing the
--          single hardcoded "Featured pieces" strip in index.tsx and the
--          fully mock/orphaned admin.sections.tsx editor (see CHANGELOG for
--          the investigation — that page had zero storefront consumers).
-- Lane: Full Lane
-- Rollback: DROP TABLE section_products; DROP TABLE sections;

CREATE TABLE sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (mode IN ('manual', 'category', 'badge')),
  -- manual: admin hand-picks products (see section_products)
  -- category: auto-fills from a category (rule_value = category slug)
  -- badge: auto-fills by badge value (rule_value = badge_options.name)
  rule_value TEXT,
  max_products INTEGER NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sections_select_public" ON sections
  FOR SELECT USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "sections_write_admin" ON sections
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Junction table for manual-mode product picks. Hard delete (no deleted_at) —
-- same reasoning as category_sizes: pure many-to-many association, no
-- business history of its own.
CREATE TABLE section_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_id, product_id)
);

ALTER TABLE section_products ENABLE ROW LEVEL SECURITY;

-- Public SELECT is unconditional here — actual product visibility is
-- enforced by products' own RLS (status='active' AND deleted_at IS NULL)
-- when the join is resolved client-side.
CREATE POLICY "section_products_select_public" ON section_products
  FOR SELECT USING (true);

CREATE POLICY "section_products_write_admin" ON section_products
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Seed: one default section replacing today's hardcoded "Featured pieces"
-- strip (products.slice(0, 8)) — badge-mode against the existing
-- "Bestseller" badge_options value.
INSERT INTO sections (title, mode, rule_value, max_products, sort_order)
VALUES ('Featured pieces', 'badge', 'Bestseller', 8, 1);
