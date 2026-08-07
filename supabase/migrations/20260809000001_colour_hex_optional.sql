-- Migration: 20260809000001_colour_hex_optional.sql
-- Purpose: colours move from hex-swatch display to text chips — hex_code is no
--          longer required to create a colour option.
-- Lane: Full Lane
-- Rollback: ALTER TABLE colour_options ALTER COLUMN hex_code SET NOT NULL;
--           (only safe if every existing row still has a non-null hex_code)

ALTER TABLE colour_options ALTER COLUMN hex_code DROP NOT NULL;
