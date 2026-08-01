-- Migration: 20260801100012_product_variants_colours_sizes_fabrics.sql
-- Purpose: Product variants — colour options, size scales/options, fabric options,
--          and the product_variants table tying them to products.
-- Lane: Full Lane
-- Rollback: ALTER TABLE order_items DROP COLUMN variant_id, DROP COLUMN variant_label;
--           ALTER TABLE cart_items DROP COLUMN variant_id;
--           DROP INDEX idx_cart_items_unique_line;
--           ALTER TABLE cart_items ADD CONSTRAINT cart_items_customer_id_product_id_key UNIQUE (customer_id, product_id);
--           DROP TABLE product_variants CASCADE;
--           ALTER TABLE categories DROP COLUMN default_size_scale_id;
--           ALTER TABLE products DROP COLUMN fabric_id;
--           DROP TABLE size_options, size_scales, colour_options, fabric_options CASCADE;

-- ── Fabric options ──────────────────────────────────────────────────────
CREATE TABLE fabric_options (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE fabric_options ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER fabric_options_updated_at
  BEFORE UPDATE ON fabric_options
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "fabric_options_select_public"
  ON fabric_options FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL AND is_active = TRUE);

CREATE POLICY "fabric_options_write_admin"
  ON fabric_options FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

INSERT INTO fabric_options (name, sort_order) VALUES
  ('Pure Pashmina',     1),
  ('Cotton',            2),
  ('Banarasi Silk',     3),
  ('Chikankari Cotton', 4),
  ('Wool',              5),
  ('Georgette',         6),
  ('Crepe',             7),
  ('Linen',             8),
  ('Chanderi',          9),
  ('Tussar Silk',      10);

-- ── Colour options ──────────────────────────────────────────────────────
CREATE TABLE colour_options (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  hex_code    TEXT        NOT NULL CHECK (hex_code ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE colour_options ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER colour_options_updated_at
  BEFORE UPDATE ON colour_options
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "colour_options_select_public"
  ON colour_options FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL AND is_active = TRUE);

CREATE POLICY "colour_options_write_admin"
  ON colour_options FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

INSERT INTO colour_options (name, hex_code, sort_order) VALUES
  ('Ivory',          '#FFFFF0', 1),
  ('Off White',      '#FAF9F6', 2),
  ('Beige',          '#F5F5DC', 3),
  ('Maroon',         '#800000', 4),
  ('Wine',           '#722F37', 5),
  ('Rust',           '#B7410E', 6),
  ('Mustard Yellow', '#E1AD01', 7),
  ('Peach',          '#FFCBA4', 8),
  ('Coral',          '#FF6F61', 9),
  ('Rani Pink',      '#E6007E', 10),
  ('Navy Blue',      '#000080', 11),
  ('Royal Blue',     '#4169E1', 12),
  ('Turquoise',      '#30D5C8', 13),
  ('Emerald Green',  '#046307', 14),
  ('Olive Green',    '#708238', 15),
  ('Mint Green',     '#98FF98', 16),
  ('Charcoal Grey',  '#36454F', 17),
  ('Black',          '#000000', 18);

-- ── Size scales ─────────────────────────────────────────────────────────
CREATE TABLE size_scales (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,  -- 'age_infant' | 'age_kids' | 'age_teens' | 'free_size' | 'dress_material'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE size_scales ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER size_scales_updated_at
  BEFORE UPDATE ON size_scales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "size_scales_select_public"
  ON size_scales FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "size_scales_write_admin"
  ON size_scales FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

INSERT INTO size_scales (name) VALUES
  ('age_infant'),
  ('age_kids'),
  ('age_teens'),
  ('free_size'),
  ('dress_material');

-- ── Size options ────────────────────────────────────────────────────────
CREATE TABLE size_options (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id    UUID        NOT NULL REFERENCES size_scales(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (scale_id, label)
);

ALTER TABLE size_options ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_size_options_scale ON size_options(scale_id) WHERE deleted_at IS NULL;

CREATE TRIGGER size_options_updated_at
  BEFORE UPDATE ON size_options
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "size_options_select_public"
  ON size_options FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "size_options_write_admin"
  ON size_options FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- age_infant: 0–24 months
INSERT INTO size_options (scale_id, label, sort_order)
SELECT s.id, v.label, v.sort_order
FROM size_scales s, (VALUES
  ('0-3 months', 1), ('3-6 months', 2), ('6-9 months', 3),
  ('9-12 months', 4), ('12-18 months', 5), ('18-24 months', 6)
) AS v(label, sort_order)
WHERE s.name = 'age_infant';

-- age_kids: 2–8 years
INSERT INTO size_options (scale_id, label, sort_order)
SELECT s.id, v.label, v.sort_order
FROM size_scales s, (VALUES
  ('2-3 years', 1), ('3-4 years', 2), ('4-5 years', 3),
  ('5-6 years', 4), ('6-7 years', 5), ('7-8 years', 6)
) AS v(label, sort_order)
WHERE s.name = 'age_kids';

-- age_teens: 8–12 years
INSERT INTO size_options (scale_id, label, sort_order)
SELECT s.id, v.label, v.sort_order
FROM size_scales s, (VALUES
  ('8-9 years', 1), ('9-10 years', 2), ('10-11 years', 3), ('11-12 years', 4)
) AS v(label, sort_order)
WHERE s.name = 'age_teens';

-- free_size: a single selectable option
INSERT INTO size_options (scale_id, label, sort_order)
SELECT id, 'Free Size', 1 FROM size_scales WHERE name = 'free_size';

-- dress_material: deliberately zero options — "no size", per spec

-- ── products.fabric_id (bridge alongside existing free-text fabric column) ──
ALTER TABLE products ADD COLUMN fabric_id UUID REFERENCES fabric_options(id) ON DELETE SET NULL;
CREATE INDEX idx_products_fabric ON products(fabric_id) WHERE deleted_at IS NULL;

-- ── categories.default_size_scale_id ─────────────────────────────────────
ALTER TABLE categories ADD COLUMN default_size_scale_id UUID REFERENCES size_scales(id) ON DELETE SET NULL;

UPDATE categories SET default_size_scale_id = (SELECT id FROM size_scales WHERE name = 'age_kids')
  WHERE slug = 'kidswear';
UPDATE categories SET default_size_scale_id = (SELECT id FROM size_scales WHERE name = 'free_size')
  WHERE slug = 'kashmiri-shawls';
UPDATE categories SET default_size_scale_id = (SELECT id FROM size_scales WHERE name = 'dress_material')
  WHERE slug = 'dress-material';
-- accessories: left NULL — no size selector, confirmed

-- ── Product variants ──────────────────────────────────────────────────────
CREATE TABLE product_variants (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  colour_id      UUID        REFERENCES colour_options(id) ON DELETE RESTRICT,
  size_id        UUID        REFERENCES size_options(id) ON DELETE RESTRICT,
  stock_count    INTEGER     NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  price_override INTEGER     CHECK (price_override > 0 OR price_override IS NULL), -- paise; NULL = use product.price
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_product_variants_product ON product_variants(product_id) WHERE deleted_at IS NULL;

-- colour_id/size_id are nullable (not every product varies by colour or size), and a
-- plain UNIQUE(product_id, colour_id, size_id) would NOT enforce uniqueness — Postgres
-- treats every NULL as distinct in a unique constraint, so two rows for the same
-- product with colour_id NULL could otherwise collide undetected. COALESCE to a
-- sentinel UUID so NULL compares as a real value; scoped to non-deleted rows so a
-- soft-deleted variant can be recreated with the same colour+size later.
CREATE UNIQUE INDEX idx_product_variants_unique_combo
  ON product_variants (
    product_id,
    COALESCE(colour_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(size_id, '00000000-0000-0000-0000-000000000000')
  )
  WHERE deleted_at IS NULL;

CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- products already has a public SELECT policy for status='active' AND deleted_at IS
-- NULL, so this inline EXISTS is visible to the same anon/authenticated querying role
-- without needing a SECURITY DEFINER wrapper.
CREATE POLICY "product_variants_select_public"
  ON product_variants FOR SELECT
  TO anon, authenticated
  USING (
    deleted_at IS NULL
    AND is_active = TRUE
    AND EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_variants.product_id
        AND products.status = 'active'
        AND products.deleted_at IS NULL
    )
  );

CREATE POLICY "product_variants_write_admin"
  ON product_variants FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE TRIGGER audit_product_variants
  AFTER INSERT OR UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- ── cart_items: variant-aware ─────────────────────────────────────────────
ALTER TABLE cart_items ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_customer_id_product_id_key;
CREATE UNIQUE INDEX idx_cart_items_unique_line
  ON cart_items (
    customer_id,
    product_id,
    COALESCE(variant_id, '00000000-0000-0000-0000-000000000000')
  );

-- ── order_items: variant reference + purchase-time snapshot ──────────────
-- variant_label mirrors this table's existing product_name/product_slug snapshot
-- principle — a later colour/size rename or deletion must not alter historical orders.
ALTER TABLE order_items ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN variant_label TEXT;
