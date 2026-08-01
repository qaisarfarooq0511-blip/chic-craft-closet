-- Migration: 20260801100000_retire_legacy_lovable_schema.sql
-- Purpose: Drop the original Lovable-scaffolded tables (dummy data only, confirmed
--          disposable by project owner 2026-08-01) before the real, normalized schema
--          takes over. Those tables had RLS "enabled" but with USING(true)/WITH CHECK(true)
--          policies granted to anon+authenticated for every operation — an open read/write
--          hole, not just a superseded shape.
-- Lane: Full Lane
-- Rollback: None — the dropped tables' replacement is created by the migrations that follow
--           in this same batch (20260801100001 onward). Re-seed from docs/blueprint/SCHEMA.md
--           if ever needed.

DROP TABLE IF EXISTS public.wishlist    CASCADE;
DROP TABLE IF EXISTS public.addresses   CASCADE;
DROP TABLE IF EXISTS public.customers   CASCADE;
DROP TABLE IF EXISTS public.orders      CASCADE;
DROP TABLE IF EXISTS public.coupons     CASCADE;
DROP TABLE IF EXISTS public.reviews     CASCADE;
DROP TABLE IF EXISTS public.pages       CASCADE;
DROP TABLE IF EXISTS public.sections    CASCADE;
DROP TABLE IF EXISTS public.categories  CASCADE;
DROP TABLE IF EXISTS public.products    CASCADE;
DROP TABLE IF EXISTS public.settings    CASCADE;
