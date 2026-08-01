-- Migration: 20250801000007_seed_categories.sql
-- Purpose: Seed the four core product categories
-- Lane: Full Lane
-- Rollback: DELETE FROM categories WHERE slug IN ('kashmiri-shawls','dress-material','kidswear','accessories');

INSERT INTO categories (id, name, slug, description, sort_order) VALUES
  (gen_random_uuid(), 'Kashmiri Shawls',  'kashmiri-shawls',  'Hand-embroidered pashmina, sozni, and printed shawls from the Kashmir Valley', 1),
  (gen_random_uuid(), 'Dress Material',   'dress-material',   'Unstitched suit sets and fabric material — cotton, silk, chikankari, and more',  2),
  (gen_random_uuid(), 'Kidswear',         'kidswear',         'Frocks, suits, and ethnic wear for girls aged 2–12',                              3),
  (gen_random_uuid(), 'Accessories',      'accessories',      'Bangles, earrings, hairpins, and handpicked ladies accessories',                  4);
