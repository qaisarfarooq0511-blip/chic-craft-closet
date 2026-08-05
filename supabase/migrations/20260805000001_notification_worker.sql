-- Migration: 20260805000001_notification_worker.sql
-- Purpose: Sprint 2D — notification_queue processor (pg_cron + Edge Function)
-- Lane: Full Lane
-- Rollback:
--   SELECT cron.unschedule('process-notifications-every-5-min');
--   DROP FUNCTION IF EXISTS claim_notification_batch(int);
--   DROP POLICY IF EXISTS "notif_queue_admin_retry" ON notification_queue;
--   -- pg_cron/pg_net left enabled — other jobs may come to depend on them.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── notif_queue_admin_retry ──────────────────────────────────────────────
-- Admins previously had SELECT only on notification_queue (notif_queue_admin_read,
-- migration 20260801100006) — full FOR ALL stayed service_role-only, reserved for
-- the worker itself. The admin dashboard's retry button needs its own narrow UPDATE
-- policy. WITH CHECK deliberately restricts the *resulting* row to exactly
-- status='queued' AND attempts=0 — an admin can reset a failed row back into the
-- queue, but cannot use this policy to fake a row as 'sent', forge attempts counts,
-- or otherwise arbitrarily edit a notification.
CREATE POLICY "notif_queue_admin_retry"
  ON notification_queue FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin() AND status = 'queued' AND attempts = 0);

-- ── claim_notification_batch() ───────────────────────────────────────────
-- PostgREST has no way to express `SELECT ... FOR UPDATE SKIP LOCKED` through the
-- normal supabase-js query builder, so the atomic claim step has to be a Postgres
-- function the worker calls via .rpc(). A single UPDATE ... FROM (SELECT ... FOR
-- UPDATE SKIP LOCKED) is one atomic statement: Postgres locks/skips already-locked
-- candidate rows, then immediately marks exactly those rows claimed, in the same
-- transaction. The "claim marker" is a `process_after` lease (now() + 10 minutes),
-- NOT a new status value -- notification_status has no 'processing' state, and
-- adding one would need a cleanup job for crashed workers. Leaving `status='queued'`
-- and only bumping `process_after` means a crashed worker's claimed rows silently
-- become eligible again after the lease expires -- self-healing, no separate sweep
-- needed. The real worker always overwrites this lease with the true terminal
-- state (sent/failed/skipped) or backoff value once it finishes each row.
CREATE OR REPLACE FUNCTION claim_notification_batch(p_limit INT DEFAULT 50)
RETURNS SETOF notification_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE notification_queue q
  SET process_after = now() + interval '10 minutes'
  FROM (
    SELECT id FROM notification_queue
    WHERE status = 'queued' AND process_after <= now() AND attempts < 5
    ORDER BY created_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ) claimed
  WHERE q.id = claimed.id
  RETURNING q.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION claim_notification_batch(int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION claim_notification_batch(int) TO service_role;

-- ── Cron schedule ─────────────────────────────────────────────────────────
-- The Bearer token is read from Vault by NAME at run time -- it is never written
-- into this file. Before this job's first run can succeed, run the following
-- directly in the Supabase Dashboard SQL Editor (NOT via a committed migration,
-- so the real service_role key never enters git history):
--
--   select vault.create_secret(
--     '<paste the real service_role key from Project Settings > API>',
--     'process_notifications_service_role_key'
--   );
--
-- The project URL below is not sensitive (same as VITE_SUPABASE_URL) and is fine
-- as a literal.
SELECT cron.schedule(
  'process-notifications-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dqngfawkwvxxbympdqyp.supabase.co/functions/v1/process-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'process_notifications_service_role_key'
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
