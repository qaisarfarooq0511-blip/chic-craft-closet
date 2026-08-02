-- Migration: 20260803000001_fix_profiles_rls_recursion.sql
-- Purpose: Fix infinite recursion in profiles_select_admin RLS policy
-- Root cause: the original policy used an inline
-- EXISTS (SELECT 1 FROM profiles ...) subquery,
-- creating a self-referential recursion when any
-- query joined other users' profile rows.
-- Fix: replace with is_admin() which is SECURITY
-- DEFINER and already used correctly by all other
-- tables without recursion.
-- Lane: Full Lane
-- Rollback: DROP POLICY "profiles_select_admin" ON profiles;
--           CREATE POLICY "profiles_select_admin"
--             ON profiles FOR SELECT TO authenticated
--             USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- Verify is_admin() exists and is SECURITY DEFINER
-- (it does — confirmed in investigation)
