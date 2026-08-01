-- Migration: 20260801100010_otp_codes.sql
-- Purpose: Server-side OTP storage for the custom mobile-auth flow (otp-request /
--          otp-verify Edge Functions). Codes are bcrypt-hashed, never stored plain.
--          No client (anon/authenticated) ever touches this table — only the Edge
--          Functions, via the service_role key, which bypasses RLS entirely.
-- Lane: Full Lane
-- Rollback: DROP TABLE otp_codes;

CREATE TABLE otp_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT        NOT NULL,
  code_hash   TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No deleted_at / soft delete — expired rows are purged outright by otp-verify.
  -- These are short-lived, single-use verification codes, not durable business records.
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
-- Intentionally zero policies for anon/authenticated — default-deny. service_role
-- bypasses RLS and is the only caller (both Edge Functions use the service_role key).

REVOKE ALL ON otp_codes FROM anon, authenticated;

CREATE INDEX idx_otp_codes_phone_created ON otp_codes(phone, created_at DESC);
