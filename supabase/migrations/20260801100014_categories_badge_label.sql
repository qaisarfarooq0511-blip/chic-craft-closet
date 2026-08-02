-- Migration: 20260801100014_categories_badge_label.sql
-- Purpose: Homepage category tile strip shows a small eyebrow badge per category
--          ("New in", "Trending", ...) — currently hardcoded client-side, with no
--          column on the real categories table to source it from. Adding one so
--          index.tsx's tile strip can read real data (Sprint 2A Item 1) without
--          losing the badges (visual output must not change).
-- Lane: Full Lane
-- Rollback: ALTER TABLE categories DROP COLUMN badge_label;

ALTER TABLE categories ADD COLUMN badge_label TEXT;

UPDATE categories SET badge_label = 'New in'      WHERE slug = 'kashmiri-shawls';
UPDATE categories SET badge_label = 'Trending'     WHERE slug = 'dress-material';
UPDATE categories SET badge_label = 'Popular'       WHERE slug = 'kidswear';
UPDATE categories SET badge_label = 'Handpicked'    WHERE slug = 'accessories';
