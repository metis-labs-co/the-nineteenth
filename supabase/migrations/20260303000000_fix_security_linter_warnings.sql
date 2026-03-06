-- Migration: fix_security_linter_warnings
-- Description: Fix 4 Supabase database linter security warnings:
--   1. achievement_leaderboard view using SECURITY DEFINER (set security_invoker = true)
--   2. spatial_ref_sys (PostGIS system table) missing RLS
--   3. archived_venues_pre_clubs missing RLS
--   4. archived_courses_pre_clubs missing RLS
-- Date: 2026-03-03

-- =====================================================
-- FIX: achievement_leaderboard SECURITY DEFINER view
-- =====================================================
-- Set security_invoker = true so the view respects the
-- querying user's RLS policies instead of the view owner's.
ALTER VIEW achievement_leaderboard SET (security_invoker = true);

-- =====================================================
-- FIX: Enable RLS on tables exposed without it
-- =====================================================
-- No policies added — these tables should not be accessible via the API.

-- PostGIS system table (coordinate reference definitions)
-- Cannot ALTER directly (owned by supabase_admin), so revoke API access instead.
REVOKE ALL ON spatial_ref_sys FROM anon, authenticated;

-- Archive/rollback tables from clubs rename migration
ALTER TABLE archived_venues_pre_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_courses_pre_clubs ENABLE ROW LEVEL SECURITY;
