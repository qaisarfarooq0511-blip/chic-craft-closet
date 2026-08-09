-- Migration: 20260810000004_fix_admin_list_customers_ambiguous_column.sql
-- Purpose: Fix admin_list_customers() — plpgsql RETURNS TABLE implicitly
--          declares OUT parameters named created_at/order_count/total_spent/
--          last_order_at, which collided with the unqualified orders.created_at
--          reference inside the aggregate subquery ("column reference
--          created_at is ambiguous", caught during post-deploy verification).
--          Fully qualifying every column in the inner subquery with the
--          orders table alias removes the ambiguity.
-- Lane: Full Lane
-- Rollback: revert to the version in 20260810000003 (same bug reintroduced —
--   not recommended; instead re-run this file's CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION admin_list_customers(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 50,
  p_offset int  DEFAULT 0
)
RETURNS TABLE (
  id              UUID,
  email           TEXT,
  full_name       TEXT,
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
