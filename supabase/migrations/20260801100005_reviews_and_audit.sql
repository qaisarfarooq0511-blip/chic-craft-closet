-- Migration: 20250801000005_reviews_and_audit.sql
-- Purpose: Customer reviews, audit log table, and audit triggers on operational tables
-- Lane: Full Lane
-- Rollback: DROP TABLE audit_logs, reviews CASCADE;

-- ── Reviews ────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id    UUID        REFERENCES orders(id),  -- only verified purchasers
  rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  is_verified BOOLEAN     NOT NULL DEFAULT FALSE,  -- true = purchased via Yaawun
  is_approved BOOLEAN     NOT NULL DEFAULT FALSE,  -- admin moderates before display
  -- Scale hooks
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL,
  UNIQUE (product_id, customer_id)  -- one review per customer per product
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_reviews_product  ON reviews(product_id) WHERE deleted_at IS NULL AND is_approved = TRUE;
CREATE INDEX idx_reviews_customer ON reviews(customer_id);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- RLS: public sees approved reviews, customers manage own, admins see all
CREATE POLICY "reviews_select_public"
  ON reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = TRUE AND deleted_at IS NULL);

CREATE POLICY "reviews_select_own"
  ON reviews FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "reviews_insert_authenticated"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() AND is_approved = FALSE);  -- can't edit after approval

CREATE POLICY "reviews_admin"
  ON reviews FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Auto-update product rating_avg and rating_count ────────────────────
CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET
    rating_avg   = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND is_approved = TRUE
        AND deleted_at IS NULL
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
        AND is_approved = TRUE
        AND deleted_at IS NULL
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION refresh_product_rating() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION refresh_product_rating() TO service_role;

CREATE TRIGGER reviews_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();

-- ── Audit log table (append-only, no UPDATE/DELETE policies) ───────────
-- framework §2: exports trigger high-priority audit entries
CREATE TABLE audit_logs (
  id          BIGSERIAL   PRIMARY KEY,
  table_name  TEXT        NOT NULL,
  record_id   TEXT        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  actor_id    UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at, deleted_at — audit logs are immutable (framework §2 WORM)
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_table   ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record  ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_actor   ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Only admins can read audit logs
CREATE POLICY "audit_logs_select_admin"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_admin());

-- INSERT allowed for authenticated (trigger fires as service_role but via authenticated session)
CREATE POLICY "audit_logs_insert_system"
  ON audit_logs FOR INSERT
  TO authenticated, service_role
  WITH CHECK (TRUE);

-- NO UPDATE or DELETE policies — immutable by design

-- ── Wire audit triggers on operational tables ──────────────────────────
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

CREATE TRIGGER audit_categories
  AFTER INSERT OR UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

CREATE TRIGGER audit_order_items
  AFTER INSERT OR UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();

CREATE TRIGGER audit_reviews
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION log_admin_action();
