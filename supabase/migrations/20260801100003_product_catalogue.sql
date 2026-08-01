-- Migration: 20250801000003_product_catalogue.sql
-- Purpose: Categories, products, product pieces (multi-item dimension specs), product images
-- Lane: Full Lane
-- Rollback: DROP TABLE product_images, product_pieces, products, categories CASCADE;

-- ── Product status enum ────────────────────────────────────────────────
CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');

-- ── Categories ─────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  -- Scale hooks
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- RLS: public can read active categories, only admins can write
CREATE POLICY "categories_select_public"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "categories_insert_admin"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "categories_update_admin"
  ON categories FOR UPDATE
  TO authenticated
  USING (is_admin());

-- No DELETE policy — soft delete only

-- ── Products ───────────────────────────────────────────────────────────
CREATE TABLE products (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID           NOT NULL REFERENCES categories(id),
  name            TEXT           NOT NULL,
  subtitle        TEXT,
  slug            TEXT           NOT NULL UNIQUE,
  description     TEXT,
  price           INTEGER        NOT NULL CHECK (price > 0),  -- stored in paise (₹ * 100)
  compare_price   INTEGER        CHECK (compare_price > price OR compare_price IS NULL),
  badge           TEXT,          -- 'New in' | 'Bestseller' | 'Sale' | 'Limited' | NULL
  status          product_status NOT NULL DEFAULT 'draft',
  is_unstitched   BOOLEAN        NOT NULL DEFAULT FALSE,
  fabric          TEXT,
  embroidery      TEXT,
  care            TEXT,
  stock_count     INTEGER        NOT NULL DEFAULT 0 CHECK (stock_count >= 0),
  rating_avg      NUMERIC(3,2)   NOT NULL DEFAULT 0,
  rating_count    INTEGER        NOT NULL DEFAULT 0,
  -- SEO / AEO fields (framework §5)
  meta_title      TEXT,
  meta_description TEXT,
  -- Scale hooks
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ    DEFAULT NULL
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Indexes for performance (framework §3)
CREATE INDEX idx_products_category    ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_status      ON products(status)      WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug        ON products(slug);
CREATE INDEX idx_products_name_trgm   ON products USING gin(name gin_trgm_ops);  -- text search

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- RLS
CREATE POLICY "products_select_public"
  ON products FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND deleted_at IS NULL);

CREATE POLICY "products_select_admin"
  ON products FOR SELECT
  TO authenticated
  USING (is_admin() AND deleted_at IS NULL);

CREATE POLICY "products_insert_admin"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "products_update_admin"
  ON products FOR UPDATE
  TO authenticated
  USING (is_admin());

-- ── Product pieces — per-item dimension specs ──────────────────────────
-- Handles 1-piece (shawl) through 3-piece sets (top + bottom + dupatta)
CREATE TABLE product_pieces (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  piece_order INTEGER     NOT NULL DEFAULT 1,  -- 1=top, 2=bottom, 3=dupatta etc.
  piece_name  TEXT        NOT NULL,            -- 'Top (Kameez fabric)', 'Dupatta', 'Shawl'
  length      TEXT,                            -- '3.0 m', '200 cm' — text to allow any unit
  width       TEXT,
  weight      TEXT,                            -- '80 gsm', '180 g'
  -- Scale hooks
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (product_id, piece_order)
);

ALTER TABLE product_pieces ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER product_pieces_updated_at
  BEFORE UPDATE ON product_pieces
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "product_pieces_select_public"
  ON product_pieces FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "product_pieces_write_admin"
  ON product_pieces FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Product images ─────────────────────────────────────────────────────
CREATE TABLE product_images (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path    TEXT        NOT NULL,  -- Supabase Storage / Cloudinary URL
  cloudinary_id   TEXT,                 -- Cloudinary public_id for transforms
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  is_primary      BOOLEAN     NOT NULL DEFAULT FALSE,
  alt_text        TEXT,
  -- Scale hooks
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_product_images_product ON product_images(product_id) WHERE deleted_at IS NULL;

CREATE TRIGGER product_images_updated_at
  BEFORE UPDATE ON product_images
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "product_images_select_public"
  ON product_images FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "product_images_write_admin"
  ON product_images FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Package includes ───────────────────────────────────────────────────
CREATE TABLE product_includes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  description TEXT        NOT NULL,  -- 'Top fabric — 3 m × 1 m'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE product_includes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_includes_select_public"
  ON product_includes FOR SELECT
  TO anon, authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "product_includes_write_admin"
  ON product_includes FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
