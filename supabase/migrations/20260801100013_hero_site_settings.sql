-- Migration: 20260801100013_hero_site_settings.sql
-- Purpose: Seed homepage hero copy into site_settings so the homepage can read it
--          from Supabase instead of localStorage (blocks SSR — see Sprint 2A Item 1).
-- Lane: Full Lane
-- Rollback: DELETE FROM site_settings WHERE key LIKE 'hero_%';

-- Values match the existing hardcoded seedHero content exactly, so the homepage's
-- visual output does not change when index.tsx switches its data source.
INSERT INTO site_settings (key, value, description) VALUES
  ('hero_eyebrow', '"New collection · Summer 2025"', 'Homepage hero eyebrow text'),
  ('hero_headline', '"Where every\nthread carries\na story"', 'Homepage hero headline — \n renders as a line break'),
  ('hero_subheadline', '"Unstitched dress materials, Kashmiri shawls, kidswear & handpicked accessories — curated with care for the modern Indian woman."', 'Homepage hero subheadline'),
  ('hero_cta_primary_label', '"Shop now"', 'Homepage hero primary CTA button label'),
  ('hero_cta_primary_href', '"/shop"', 'Homepage hero primary CTA button link'),
  ('hero_cta_secondary_label', '"Explore shawls"', 'Homepage hero secondary CTA button label'),
  ('hero_cta_secondary_href', '"/shop/kashmiri-shawls"', 'Homepage hero secondary CTA button link');
