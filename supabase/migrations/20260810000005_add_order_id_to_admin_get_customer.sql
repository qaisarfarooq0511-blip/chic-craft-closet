-- Migration: 20260810000005_add_order_id_to_admin_get_customer.sql
-- Purpose: admin_get_customer()'s orders array only carried order_number,
--          but the customer-detail panel needs to link each order to
--          /admin/orders/$id (route param is the order's UUID, not its
--          human-readable order_number) — caught while building the panel
--          against the RPC contract from 20260810000003.
-- Lane: Full Lane
-- Rollback: revert to the version in 20260810000003 (drops the id field —
--   not recommended, breaks the panel's order links).

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
      ord.customer_id    AS customer_id,
      count(*)           AS order_count,
      sum(ord.total)      AS total_spent
    FROM orders ord
    WHERE ord.customer_id = p_customer_id
      AND ord.deleted_at IS NULL
      AND ord.status NOT IN ('cancelled', 'refunded')
    GROUP BY ord.customer_id
  ) stats ON stats.customer_id = p.id
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', ord.id,
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
        o.id, o.order_number, o.status, o.total, o.created_at,
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
