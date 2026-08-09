-- Migration: 20260810000006_add_phone_to_admin_list_customers.sql
-- Purpose: admin_list_customers() was missing profiles.phone, but the
--          Customers list table has a required Phone column — caught while
--          wiring the CustomerListRow type against the RPC contract.
-- Lane: Full Lane
-- Rollback: revert to the version in 20260810000004 (drops the phone field
--   — not recommended, breaks the list table's Phone column).

-- Postgres won't let CREATE OR REPLACE change a RETURNS TABLE function's
-- OUT-parameter row type (adding `phone`) — DROP then CREATE is required.
DROP FUNCTION IF EXISTS admin_list_customers(text, int, int);

CREATE OR REPLACE FUNCTION admin_list_customers(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 50,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  email           TEXT,
  full_name       TEXT,
  phone           TEXT,
  created_at      TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  order_count     BIGINT,
  total_spent     BIGINT,
  last_order_at   TIMESTAMPTZ,
  total_count     BIGINT
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
    p.phone,
    p.created_at,
    u.last_sign_in_at,
    COALESCE(o.order_count, 0)::bigint,
    COALESCE(o.total_spent, 0)::bigint,
    o.last_order_at,
    count(*) OVER()::bigint AS total_count
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN (
    SELECT
      ord.customer_id       AS customer_id,
      count(*)              AS order_count,
      sum(ord.total)         AS total_spent,
      max(ord.created_at)    AS last_order_at
    FROM orders ord
    WHERE ord.deleted_at IS NULL
      AND ord.status NOT IN ('cancelled', 'refunded')
    GROUP BY ord.customer_id
  ) o ON o.customer_id = p.id
  WHERE p.deleted_at IS NULL
    AND p.role = 'customer'
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

REVOKE EXECUTE ON FUNCTION admin_list_customers(text, int, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION admin_list_customers(text, int, int) TO authenticated;
