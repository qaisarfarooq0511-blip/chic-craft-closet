-- Migration: 20260809000003_badge_embroidery_care_options.sql
-- Purpose: real DB-backed picklists for badges/embroideries/care instructions,
--          replacing the dead localStorage-only admin.config.tsx lists (and,
--          for badges, a hardcoded array in ProductForm.tsx). Same shape as
--          fabric_options/colour_options. Seeded with the union of the
--          previous config defaults and every distinct value already live on
--          non-deleted products, so no existing product's value goes missing
--          from the new dropdown.
-- Lane: Full Lane
-- Rollback: DROP TABLE badge_options, embroidery_options, care_options;

CREATE TABLE badge_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE embroidery_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE care_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE badge_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE embroidery_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badge_options_select_public" ON badge_options
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "badge_options_write_admin" ON badge_options
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "embroidery_options_select_public" ON embroidery_options
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "embroidery_options_write_admin" ON embroidery_options
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "care_options_select_public" ON care_options
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);
CREATE POLICY "care_options_write_admin" ON care_options
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Seed: badges — matches live data exactly, no additions needed.
INSERT INTO badge_options (name, sort_order) VALUES
  ('New in', 0),
  ('Bestseller', 1),
  ('Sale', 2),
  ('Limited', 3);

-- Seed: embroideries — literal-list entries first (live casing where they
-- overlap), then live-only values not in the literal list.
INSERT INTO embroidery_options (name, sort_order) VALUES
  ('Sozni hand-done', 0),
  ('Hand chikankari', 1),
  ('Kundan setting', 2),
  ('Machine floral', 3),
  ('Zardozi', 4),
  ('Aari', 5),
  ('Hand-wrapped', 6),
  ('Zari weaving', 7),
  ('Floral Embroidery', 8),
  ('Gold trim', 9),
  ('Sozni needle embroidery', 10);

-- Seed: care instructions — literal-list entries first (live casing where
-- they overlap), then live-only values not in the literal list.
INSERT INTO care_options (name, sort_order) VALUES
  ('Dry clean only', 0),
  ('Hand wash cold', 1),
  ('Machine wash 30°C', 2),
  ('Avoid moisture', 3),
  ('Iron On Low', 4),
  ('Hand Wash', 5),
  ('Handle with care', 6),
  ('Keep dry', 7);
