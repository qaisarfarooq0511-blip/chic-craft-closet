-- Migration: 20250801000002_profiles_and_roles.sql
-- Purpose: User profiles extending Supabase auth.users, RBAC roles
-- Lane: Full Lane
-- Rollback: DROP TABLE profiles; DROP TYPE user_role;

-- ── Role enum ──────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('customer', 'admin');

-- ── Profiles ───────────────────────────────────────────────────────────
-- Extends auth.users — one row per authenticated user
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role        NOT NULL DEFAULT 'customer',
  full_name     TEXT,
  phone         TEXT,
  -- Scale hooks (framework §8.2)
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ      DEFAULT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── RLS policies ───────────────────────────────────────────────────────
-- Customers can read and update their own profile only
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = 'customer'); -- prevent self-promotion to admin

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── Auto-create profile on signup ──────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'customer',
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION handle_new_user() TO service_role;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Helper: is caller an admin? (used in other policies) ───────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION is_admin() TO authenticated;
