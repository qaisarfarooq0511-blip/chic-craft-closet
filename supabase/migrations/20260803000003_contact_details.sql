-- Migration: 20260803000003_contact_details.sql
-- Purpose: /contact has shown hardcoded "Coming soon" for phone and email
-- since it was built -- the real numbers (help@yaawun.com, +91 99107 84574)
-- have existed in src/lib/seed.ts / the static_pages legal content this
-- whole time, just never surfaced as site_settings keys the way
-- store_whatsapp already is.
-- Lane: Full Lane
-- Rollback: DELETE FROM site_settings WHERE key IN ('store_phone', 'store_email');

INSERT INTO site_settings (key, value, description) VALUES
  ('store_phone', '"919910784574"', 'Store phone number with country code, digits only'),
  ('store_email', '"help@yaawun.com"', 'Store contact email address');
