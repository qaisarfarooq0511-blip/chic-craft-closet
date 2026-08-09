-- Migration: 20260809000004_products_badge_embroidery_care_fk.sql
-- Purpose: add FK columns on products pointing at the new badge_options/
--          embroidery_options/care_options tables, and backfill them from
--          the existing free-text columns via case-insensitive match.
--          badge/embroidery/care (TEXT) are kept — dual-write pattern, see
--          CHANGELOG — ProductForm.tsx will write both the FK and the mirror
--          text column on save so nothing breaks if this needs rolling back.
-- Lane: Full Lane
-- Rollback: ALTER TABLE products DROP COLUMN badge_id, DROP COLUMN embroidery_id, DROP COLUMN care_id;
--           (free-text badge/embroidery/care columns are untouched throughout)

ALTER TABLE products ADD COLUMN badge_id UUID REFERENCES badge_options(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN embroidery_id UUID REFERENCES embroidery_options(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN care_id UUID REFERENCES care_options(id) ON DELETE SET NULL;

UPDATE products p
SET badge_id = bo.id
FROM badge_options bo
WHERE LOWER(TRIM(p.badge)) = LOWER(TRIM(bo.name))
  AND p.deleted_at IS NULL;

UPDATE products p
SET embroidery_id = eo.id
FROM embroidery_options eo
WHERE LOWER(TRIM(p.embroidery)) = LOWER(TRIM(eo.name))
  AND p.deleted_at IS NULL;

UPDATE products p
SET care_id = co.id
FROM care_options co
WHERE LOWER(TRIM(p.care)) = LOWER(TRIM(co.name))
  AND p.deleted_at IS NULL;
