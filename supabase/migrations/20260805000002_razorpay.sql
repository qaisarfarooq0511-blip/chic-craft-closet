-- Migration: 20260805000002_razorpay.sql
-- Purpose: Razorpay order creation — orders.razorpay_order_id for idempotent order creation
-- Lane: Full Lane
-- Rollback: ALTER TABLE orders DROP COLUMN razorpay_order_id;

-- Nullable, unique — existing orders (all COD so far) are unaffected. Distinct from
-- payment_id (the Razorpay *payment* id, set post-capture by the webhook): this column
-- holds the Razorpay *order* id, created up-front by create-razorpay-order and used as
-- the idempotency key so a retried create-order call doesn't hit Razorpay's API twice
-- for the same internal order.
ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT UNIQUE;
