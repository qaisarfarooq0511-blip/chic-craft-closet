-- Migration: 20260803000002_editorial_reviews.sql
-- Purpose: Curated showcase reviews with no auth dependency.
-- Root cause this replaces: the 18 mock reviews in src/lib/seed.ts were never
-- migrated during the product data migration, because the real `reviews`
-- table requires customer_id -> profiles(id) -> auth.users(id), plus a
-- UNIQUE(product_id, customer_id) constraint that would reject a shared
-- placeholder account for products with more than one review. This table
-- sidesteps both: no customer_id at all, no uniqueness constraint.
-- Lane: Full Lane
-- Rollback: DROP TABLE editorial_reviews;

CREATE TABLE editorial_reviews (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reviewer_name      TEXT        NOT NULL,
  reviewer_location  TEXT,
  rating             INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body               TEXT        NOT NULL,
  is_approved        BOOLEAN     NOT NULL DEFAULT true,
  sort_order         INTEGER     NOT NULL DEFAULT 0,
  -- Scale hooks
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE editorial_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_editorial_reviews_product ON editorial_reviews(product_id)
  WHERE deleted_at IS NULL AND is_approved = TRUE;

CREATE TRIGGER editorial_reviews_updated_at
  BEFORE UPDATE ON editorial_reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- No audit trigger -- editorial content, not operational data (matches
-- site_settings/redirects, which are also audit-free).

CREATE POLICY "editorial_reviews_select_public"
  ON editorial_reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = TRUE AND deleted_at IS NULL);

CREATE POLICY "editorial_reviews_admin_all"
  ON editorial_reviews FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── Seed the 18 mock reviews from src/lib/seed.ts, matched to real products
-- by name. is_approved mirrors each mock review's original status field --
-- 17 were "approved", 1 ("Anonymous Visitor") was "pending".
INSERT INTO editorial_reviews (product_id, reviewer_name, reviewer_location, rating, body, is_approved, sort_order, created_at)
SELECT p.id, v.reviewer_name, v.reviewer_location, v.rating, v.body, v.is_approved, v.sort_order, v.created_at::timestamptz
FROM (VALUES
  ('Pashmina Weave Shawl', 'Aisha K.', 'Delhi', 5, 'Absolutely beautiful quality. The embroidery is so delicate and the fabric is incredibly soft. Gifted this to my mother — she was overjoyed.', true, 0, '2025-06-12'),
  ('Pashmina Weave Shawl', 'Sana M.', 'Mumbai', 4, 'Lovely shawl, very well packaged. The gift box was a nice touch. Fabric feels premium.', true, 1, '2025-06-03'),
  ('Pashmina Weave Shawl', 'Noor F.', 'Lucknow', 5, 'Ordered for Eid and it arrived beautifully wrapped. The ivory and gold combination is very elegant.', true, 2, '2025-05-28'),
  ('Pashmina Weave Shawl', 'Razia B.', 'Hyderabad', 4, 'Good quality shawl. The dimensions are accurate — 200×75 is a generous size. My only suggestion would be more colour options.', true, 3, '2025-05-15'),
  ('Pashmina Weave Shawl', 'Anonymous Visitor', '—', 5, 'Just received my shawl and it''s gorgeous! Will write a longer review soon.', false, 4, now()),

  ('Chikankari Unstitched Suit', 'Fatima S.', 'Lucknow', 5, 'Perfect fabric for summer. The chikankari work is intricate and the colour is exactly as shown. Very happy.', true, 0, '2025-06-08'),
  ('Chikankari Unstitched Suit', 'Amina R.', 'Delhi', 5, 'Got it stitched at my local tailor — turned out gorgeous. The 3 metres for the top is very generous.', true, 1, '2025-06-01'),
  ('Chikankari Unstitched Suit', 'Shabana K.', 'Kanpur', 4, 'Good quality fabric. Delivery was prompt. Would recommend for anyone who loves chikankari.', true, 2, '2025-05-20'),
  ('Chikankari Unstitched Suit', 'Hina M.', 'Lucknow', 5, 'This is my second order. The quality is consistently excellent and the packaging is always neat.', true, 3, '2025-05-10'),

  ('Kundan Drop Earrings', 'Zara N.', 'Ghaziabad', 4, 'Very pretty earrings. Lightweight so comfortable to wear all day. The gold finish is rich-looking.', true, 0, '2025-06-05'),
  ('Kundan Drop Earrings', 'Mehak J.', 'Noida', 5, 'Perfect for my niece''s wedding. They complement ethnic wear beautifully and the packaging was lovely.', true, 1, '2025-05-28'),

  ('Embroidered Frock', 'Priya K.', 'Delhi', 5, 'My daughter refuses to take it off! Beautiful embroidery and the fabric is really soft. Will order more sizes.', true, 0, '2025-06-10'),
  ('Embroidered Frock', 'Naila H.', 'Lucknow', 5, 'Perfect for Eid. The frock is exactly as pictured and the quality is great for the price.', true, 1, '2025-06-02'),

  ('Silk Thread Hairpin Set', 'Layla M.', 'Delhi', 4, 'Very pretty set. The colours are vibrant and the thread work is neat. Great value.', true, 0, '2025-06-08'),

  ('Sozni Hand-embroidered Wrap', 'Yasmin A.', 'Srinagar', 5, 'This is the most beautiful piece I own. The embroidery is extraordinary — you can see the hours of work in every stitch.', true, 0, '2025-06-14'),
  ('Sozni Hand-embroidered Wrap', 'Bushra R.', 'Delhi', 5, 'Worth every rupee. Gifted to my mother for her anniversary and she was in tears. A true heirloom.', true, 1, '2025-06-05'),

  ('Banarasi Silk Suit', 'Sobia N.', 'Varanasi', 5, 'Got this stitched for my cousin''s wedding. The silk quality is superb and the zari work is absolutely gorgeous.', true, 0, '2025-06-11'),

  ('Glass Bangle Set', 'Maryam S.', 'Mumbai', 4, 'Beautiful colour. The glass quality is good and none arrived broken thanks to the cotton packaging.', true, 0, '2025-06-09')
) AS v(product_name, reviewer_name, reviewer_location, rating, body, is_approved, sort_order, created_at)
JOIN products p ON p.name = v.product_name AND p.deleted_at IS NULL;
