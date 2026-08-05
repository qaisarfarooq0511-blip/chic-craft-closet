-- Migration: 20260804000001_admin_user_management.sql
-- Purpose: /admin/users — replaces manual SQL for admin promotions.
-- Lane: Full Lane
-- Rollback:
--   DROP TRIGGER IF EXISTS profiles_role_audit ON profiles;
--   DROP TRIGGER IF EXISTS profiles_block_self_role_change ON profiles;
--   DROP FUNCTION IF EXISTS block_self_role_change();
--   DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
--   DROP FUNCTION IF EXISTS admin_list_users(text, int, int);

-- ── admin_list_users() ───────────────────────────────────────────────────
-- auth.users is never exposed via PostgREST (schema not in the API
-- exposure list), so joining it to profiles for email/last_sign_in_at
-- requires a SECURITY DEFINER function. LANGUAGE plpgsql (not sql) —
-- same margin-of-safety reasoning as the profiles RLS recursion fix:
-- an inlined sql-language function is more likely to get planner-merged
-- into the caller in a way that's harder to reason about; plpgsql forces
-- a fixed boundary.
CREATE OR REPLACE FUNCTION admin_list_users(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 50,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id               UUID,
  email            TEXT,
  full_name        TEXT,
  role             user_role,
  created_at       TIMESTAMPTZ,
  last_sign_in_at  TIMESTAMPTZ,
  total_count      BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::text,
    p.full_name,
    p.role,
    p.created_at,
    u.last_sign_in_at,
    count(*) OVER()::bigint AS total_count
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.deleted_at IS NULL
    AND (
      p_search IS NULL OR trim(p_search) = ''
      OR u.email ILIKE '%' || p_search || '%'
      OR p.full_name ILIKE '%' || p_search || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_list_users(text, int, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION admin_list_users(text, int, int) TO authenticated;

-- ── profiles_update_admin ────────────────────────────────────────────────
-- Admins can update any OTHER profile (role promotions/demotions). The
-- "id != auth.uid()" in WITH CHECK is the requested DB-level self-demotion
-- block for this policy's own path.
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin() AND id != auth.uid());

-- ── block_self_role_change() ─────────────────────────────────────────────
-- Gap this closes: profiles_update_own's WITH CHECK is
-- (id = auth.uid() AND role = 'customer') — written to stop a customer
-- self-promoting to admin, but it does NOT stop an admin from running
-- UPDATE profiles SET role = 'customer' WHERE id = auth.uid() themselves;
-- that satisfies profiles_update_own's own check regardless of which
-- policy the admin_list_users page is meant to use. Permissive RLS
-- policies on the same table are OR'd, so profiles_update_admin alone
-- can't close a hole opened by a different, older policy.
-- This trigger is a table-level backstop that fires no matter which
-- policy authorized the row: it blocks ANY authenticated caller from
-- changing their OWN role, full stop. It does not query profiles (no
-- subquery back into this table), so it carries none of the recursion
-- risk from the earlier profiles_select_admin bug. auth.uid() is NULL
-- for service_role/direct-SQL callers, so seeding and backend scripts
-- are unaffected.
CREATE OR REPLACE FUNCTION block_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.id = auth.uid() AND OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION block_self_role_change() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION block_self_role_change() TO authenticated;

CREATE TRIGGER profiles_block_self_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION block_self_role_change();

-- ── profiles_role_audit ──────────────────────────────────────────────────
-- Reuses the existing generic log_admin_action() trigger function.
-- Scoped to role changes only (WHEN clause) so ordinary self-service
-- profile edits (full_name, phone via profiles_update_own) are not
-- logged as admin actions.
CREATE TRIGGER profiles_role_audit
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION log_admin_action();
