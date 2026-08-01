-- Migration: 20250801000004_orders.sql
-- Purpose: Orders, order items, addresses, cart
-- Lane: Full Lane
-- Rollback: DROP TABLE order_items, orders, addresses, cart_items CASCADE;

-- ── Order status state machine (framework §8.2) ────────────────────────
CREATE TYPE order_status AS ENUM (
  'pending',      -- order placed, payment not confirmed
  'confirmed',    -- payment confirmed
  'dispatched',   -- shipped, tracking added
  'delivered',    -- customer received
  'cancelled',    -- cancelled before dispatch
  'refunded'      -- refund processed
);

CREATE TYPE payment_method AS ENUM ('razorpay', 'cod', 'upi');

-- ── Addresses ──────────────────────────────────────────────────────────
CREATE TABLE addresses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name     TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  line1         TEXT        NOT NULL,
  line2         TEXT,
  city          TEXT        NOT NULL,
  state         TEXT        NOT NULL DEFAULT 'Jammu & Kashmir',
  pincode       TEXT        NOT NULL,
  is_default    BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Scale hooks
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "addresses_own"
  ON addresses FOR ALL
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "addresses_admin"
  ON addresses FOR SELECT
  TO authenticated
  USING (is_admin());

-- ── Orders ─────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        TEXT           NOT NULL UNIQUE,  -- human-readable YAW-20250801-0001
  customer_id         UUID           NOT NULL REFERENCES profiles(id),
  shipping_address_id UUID           REFERENCES addresses(id),

  status              order_status   NOT NULL DEFAULT 'pending',
  payment_method      payment_method,
  payment_id          TEXT,          -- Razorpay payment_id
  idempotency_key     TEXT           UNIQUE,  -- framework §8 idempotency

  subtotal            INTEGER        NOT NULL,  -- paise
  delivery_charge     INTEGER        NOT NULL DEFAULT 0,
  discount            INTEGER        NOT NULL DEFAULT 0,
  total               INTEGER        NOT NULL,

  notes               TEXT,
  tracking_number     TEXT,
  tracking_url        TEXT,
  dispatched_at       TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,

  -- Scale hooks
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ    DEFAULT NULL
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_customer  ON orders(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status    ON orders(status)      WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_number    ON orders(order_number);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- RLS: customers see own orders, admins see all
CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "orders_select_admin"
  ON orders FOR SELECT
  TO authenticated
  USING (is_admin() AND deleted_at IS NULL);

CREATE POLICY "orders_insert_authenticated"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "orders_update_admin"
  ON orders FOR UPDATE
  TO authenticated
  USING (is_admin());

-- ── Order items ────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID        NOT NULL REFERENCES products(id),
  product_name TEXT        NOT NULL,  -- snapshot at time of order
  product_slug TEXT        NOT NULL,
  quantity     INTEGER     NOT NULL CHECK (quantity > 0),
  unit_price   INTEGER     NOT NULL,  -- paise, snapshot at time of order
  total_price  INTEGER     NOT NULL,
  -- Scale hooks
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TRIGGER order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "order_items_select_own"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

CREATE POLICY "order_items_select_admin"
  ON order_items FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "order_items_insert_authenticated"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- ── Cart (server-side, persists across devices) ────────────────────────
CREATE TABLE cart_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE POLICY "cart_items_own"
  ON cart_items FOR ALL
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ── Order number generator ─────────────────────────────────────────────
CREATE SEQUENCE order_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'YAW-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(nextval('order_number_seq')::text, 4, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_order_number() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION generate_order_number() TO authenticated;
GRANT  EXECUTE ON FUNCTION generate_order_number() TO service_role;
