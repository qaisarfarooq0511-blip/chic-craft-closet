-- Migration: 20260810000003_admin_customers_commerce_view.sql
-- Purpose: /admin/customers rebuild — real commerce-focused customer view,
--          distinct from /admin/users (access-control view).
-- Lane: Full Lane
-- Rollback:
--   DROP FUNCTION IF EXISTS admin_get_customer(uuid);
--   DROP FUNCTION IF EXISTS admin_list_customers(text, int, int);

-- ── admin_list_customers() ──────────────────────────────────────────────
-- Same shape/pattern as admin_list_users() (20260804000001): auth.users is
-- never PostgREST-exposed, so email/last_sign_in_at need a SECURITY DEFINER
-- function. plpgsql for the same fixed-boundary reasoning as that function.
-- Scoped to role='customer' only (admin_list_users lists everyone) and adds
-- commerce aggregates from orders.
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
      customer_id,
      count(*)       AS order_count,
      sum(total)     AS total_spent,
      max(created_at) AS last_order_at
    FROM orders
    WHERE deleted_at IS NULL
      AND status NOT IN ('cancelled', 'refunded')
    GROUP BY customer_id
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

-- ── admin_get_customer() ────────────────────────────────────────────────
-- Single-customer detail for the slide-in panel. Returns one JSONB blob:
-- {profile: {...}, stats: {total_orders, total_spent}, orders: [...]}.
-- stats use the same cancelled/refunded exclusion as the list RPC; the
-- orders array (last 20) is ANY status — history shouldn't hide a
-- cancelled order, the UI shows its status badge instead.
CREATE OR REPLACE FUNCTION admin_get_customer(
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'id', p.id,
      'email', u.email,
      'full_name', p.full_name,
      'phone', p.phone,
      'created_at', p.created_at,
      'last_sign_in_at', u.last_sign_in_at
    ),
    'stats', jsonb_build_object(
      'total_orders', COALESCE(stats.order_count, 0),
      'total_spent', COALESCE(stats.total_spent, 0)
    ),
    'orders', COALESCE(recent.orders, '[]'::jsonb)
  ) INTO v_result
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN (
    SELECT
      customer_id,
      count(*)   AS order_count,
      sum(total) AS total_spent
    FROM orders
    WHERE customer_id = p_customer_id
      AND deleted_at IS NULL
      AND status NOT IN ('cancelled', 'refunded')
    GROUP BY customer_id
  ) stats ON stats.customer_id = p.id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'order_number', ord.order_number,
        'status', ord.status,
        'total', ord.total,
        'created_at', ord.created_at,
        'item_count', ord.item_count
      )
      ORDER BY ord.created_at DESC
    ) AS orders
    FROM (
      SELECT
        o.order_number, o.status, o.total, o.created_at,
        (SELECT count(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o
      WHERE o.customer_id = p.id AND o.deleted_at IS NULL
      ORDER BY o.created_at DESC
      LIMIT 20
    ) ord
  ) recent ON true
  WHERE p.id = p_customer_id
    AND p.deleted_at IS NULL
    AND p.role = 'customer';

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_get_customer(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION admin_get_customer(uuid) TO authenticated;
