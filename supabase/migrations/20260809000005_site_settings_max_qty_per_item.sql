-- Migration: 20260809000005_site_settings_max_qty_per_item.sql
-- Purpose: add the max_qty_per_item key to site_settings so cart-context.tsx
--          can read it from the real DB instead of localStorage-only
--          getConfig().maxQtyPerItem (which never reached a live table —
--          see CHANGELOG for the dead store-sync.ts finding).
-- Lane: Full Lane
-- Rollback: DELETE FROM site_settings WHERE key = 'max_qty_per_item';

INSERT INTO site_settings (key, value, description)
VALUES ('max_qty_per_item', '10'::jsonb, 'Maximum quantity of a single product per cart')
ON CONFLICT (key) DO NOTHING;
