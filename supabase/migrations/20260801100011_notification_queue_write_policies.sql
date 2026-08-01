-- Migration: 20260801100011_notification_queue_write_policies.sql
-- Purpose: Allow authenticated callers to enqueue notifications for themselves,
--          and admins to enqueue on behalf of any user (e.g. order status changes).
-- Lane: Full Lane
-- Rollback: DROP POLICY "notif_queue_insert_own" ON notification_queue;
--           DROP POLICY "notif_queue_insert_admin" ON notification_queue;
--
-- Bug found while building the Sprint 2B order-detail admin page: notification_queue
-- had INSERT granted only to service_role (via the FOR ALL policy), with admin limited
-- to SELECT. NotificationService.send() is called directly from the browser client
-- (checkout.tsx's order_confirmed call, and this migration's own admin order-status
-- use case) — every such call has been silently failing RLS since Sprint 1
-- (NotificationService.send swallows the error via console.error, never throws).
-- These two policies close the gap without touching the existing service_role-only
-- UPDATE/DELETE/full-ALL surface, which stays reserved for the edge function worker
-- that actually processes and marks rows sent/failed.

CREATE POLICY "notif_queue_insert_own"
  ON notification_queue FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_queue_insert_admin"
  ON notification_queue FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());
