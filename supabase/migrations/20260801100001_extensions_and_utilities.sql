-- Migration: 20250801000001_extensions_and_utilities.sql
-- Purpose: Enable required Postgres extensions and create shared utility functions
-- Lane: Full Lane
-- Rollback: DROP FUNCTION updated_at_trigger(); DROP EXTENSION IF EXISTS ...

-- ── Extensions ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- trigram index for text search
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- accent-insensitive search (e.g. Urdu transliteration)

-- ── Shared: auto-update updated_at on every row mutation ───────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION trigger_set_updated_at() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION trigger_set_updated_at() TO authenticated;
GRANT  EXECUTE ON FUNCTION trigger_set_updated_at() TO service_role;

-- ── Shared: audit log writer ────────────────────────────────────────────
-- Called by per-table audit triggers (defined in migration 005)
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    actor_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION log_admin_action() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION log_admin_action() TO authenticated;
GRANT  EXECUTE ON FUNCTION log_admin_action() TO service_role;
