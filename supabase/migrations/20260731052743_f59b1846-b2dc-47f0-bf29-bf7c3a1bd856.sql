-- Core content + commerce tables for Yaawun.
-- Each table keeps identity / sort / filter columns as real columns and the
-- full record payload in `data` jsonb so the app can round-trip objects.

CREATE TABLE public.products (
  id integer PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  price numeric NOT NULL DEFAULT 0,
  listed boolean NOT NULL DEFAULT true,
  stock integer NOT NULL DEFAULT 0,
  created_at bigint NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products open" ON public.products FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.categories (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories open" ON public.categories FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.sections (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO anon, authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections open" ON public.sections FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.pages (
  slug text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO anon, authenticated;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages open" ON public.pages FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.reviews (
  id text PRIMARY KEY,
  product_id integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rating numeric NOT NULL DEFAULT 5,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews open" ON public.reviews FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.coupons (
  id text PRIMARY KEY,
  code text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons open" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.orders (
  id text PRIMARY KEY,
  created_at bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  phone text,
  total numeric NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders open" ON public.orders FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.customers (
  id text PRIMARY KEY,
  mobile text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  email text,
  newsletter_opt_in boolean NOT NULL DEFAULT true,
  created_at bigint NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers open" ON public.customers FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.addresses (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO anon, authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses open" ON public.addresses FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.wishlist (
  user_id text NOT NULL,
  product_id integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist TO anon, authenticated;
GRANT ALL ON public.wishlist TO service_role;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist open" ON public.wishlist FOR ALL USING (true) WITH CHECK (true);

-- Singleton settings rows (hero content, app configuration).
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings open" ON public.settings FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX products_category_idx ON public.products (category);
CREATE INDEX reviews_product_idx ON public.reviews (product_id);
CREATE INDEX orders_phone_idx ON public.orders (phone);
CREATE INDEX addresses_user_idx ON public.addresses (user_id);