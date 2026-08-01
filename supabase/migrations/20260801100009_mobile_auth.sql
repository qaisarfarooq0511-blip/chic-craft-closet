-- Migration: 20260801100009_mobile_auth.sql
-- Purpose: Phone becomes the customer identity. profiles.phone already existed (added
--          20250801/Sprint 0) but had no uniqueness constraint and no verified flag.
-- Lane: Full Lane
-- Rollback: ALTER TABLE profiles DROP CONSTRAINT profiles_phone_unique;
--           ALTER TABLE profiles DROP COLUMN phone_verified;

-- Multiple NULLs are allowed under a UNIQUE constraint, so this is safe for existing
-- rows (admin accounts created via email, or any row without a phone yet).
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);

ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
