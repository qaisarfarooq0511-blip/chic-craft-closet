-- Migration: 20250801000006_notifications_and_seo.sql
-- Purpose: Async notification queue (framework §1 queuing), SEO redirects table
-- Lane: Full Lane
-- Rollback: DROP TABLE notification_queue, redirects CASCADE;

-- ── Notification event types ───────────────────────────────────────────
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp', 'push');
CREATE TYPE notification_status  AS ENUM ('queued', 'sent', 'failed', 'skipped');

-- ── Notification queue ─────────────────────────────────────────────────
-- framework §1: external service calls decoupled via write-then-async-process
-- framework §6: abstracted notification gateway
CREATE TABLE notification_queue (
  id            UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID                 REFERENCES profiles(id),
  channel       notification_channel NOT NULL,
  event_type    TEXT                 NOT NULL,  -- 'order_confirmed', 'order_dispatched', 'review_approved'
  payload       JSONB                NOT NULL DEFAULT '{}',
  status        notification_status  NOT NULL DEFAULT 'queued',
  attempts      INTEGER              NOT NULL DEFAULT 0,
  last_error    TEXT,
  process_after TIMESTAMPTZ          NOT NULL DEFAULT now(),  -- for retry backoff
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ          NOT NULL DEFAULT now()
  -- No deleted_at — queue entries are never soft-deleted, just marked sent/failed
);

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notif_queue_status  ON notification_queue(status, process_after) WHERE status = 'queued';
CREATE INDEX idx_notif_queue_user    ON notification_queue(user_id);

CREATE TRIGGER notification_queue_updated_at
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Only service_role (edge functions) can write/read the queue
CREATE POLICY "notif_queue_service_only"
  ON notification_queue FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Admins can read for monitoring
CREATE POLICY "notif_queue_admin_read"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (is_admin());

-- ── SEO redirects table ────────────────────────────────────────────────
-- Handles slug changes, product URL changes, 301 redirects
CREATE TABLE redirects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path   TEXT        NOT NULL UNIQUE,
  to_path     TEXT        NOT NULL,
  status_code INTEGER     NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302)),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_redirects_from ON redirects(from_path) WHERE is_active = TRUE;

CREATE POLICY "redirects_select_public"
  ON redirects FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY "redirects_write_admin"
  ON redirects FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Site settings (key-value store for admin-configurable values) ───────
CREATE TABLE site_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID        REFERENCES profiles(id)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings (hero text, announcements, free delivery threshold)
CREATE POLICY "settings_select_public"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY "settings_write_admin"
  ON site_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Default settings
INSERT INTO site_settings (key, value, description) VALUES
  ('announcement_bar',     '"✦  Free delivery on orders above ₹999  ·  New Kashmiri shawls now live  ·  COD available  ✦"', 'Top announcement bar text'),
  ('free_delivery_threshold', '99900', 'Free delivery threshold in paise (99900 = ₹999)'),
  ('delivery_charge',      '9900',   'Standard delivery charge in paise (9900 = ₹99)'),
  ('store_whatsapp',       '"919000000000"', 'WhatsApp number with country code'),
  ('seo_site_name',        '"Yaawun"', 'Site name for SEO/Schema.org'),
  ('seo_site_description', '"Kashmiri shawls, unstitched dress materials, kidswear and accessories. Crafted with care, delivered to your door."', 'Default meta description');
