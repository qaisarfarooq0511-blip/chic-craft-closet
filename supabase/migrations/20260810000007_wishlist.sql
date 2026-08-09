-- Migration: 20260810000007_wishlist.sql
-- Purpose: Wishlist — customers can save products; /account/wishlist page,
--          heart icon on product cards, PDP, and navbar.
-- Lane: Full Lane
-- Rollback:
--   DROP TABLE IF EXISTS wishlist_items;

CREATE TABLE wishlist_items (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, product_id)
  -- No updated_at/deleted_at — pure many-to-many junction with no business
  -- history of its own, same reasoning already used for category_sizes and
  -- section_products (see SCHEMA.md). Toggling the heart hard-deletes the
  -- row; there's nothing to soft-delete or restore.
);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist_items_select_own"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "wishlist_items_insert_own"
  ON wishlist_items FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "wishlist_items_delete_own"
  ON wishlist_items FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid());

-- Admin visibility only — no admin INSERT/UPDATE/DELETE policy. Wishlists
-- are a customer's own signal; nothing in the plan calls for an admin to
-- edit one on their behalf.
CREATE POLICY "wishlist_items_select_admin"
  ON wishlist_items FOR SELECT
  TO authenticated
  USING (is_admin());

-- No anon policy at all — wishlist requires login, by design (see plan).
-- No audit trigger — log_admin_action() covers admin mutations on
-- products/orders/categories/reviews; this is a customer self-service
-- action on their own row, not an admin action.
