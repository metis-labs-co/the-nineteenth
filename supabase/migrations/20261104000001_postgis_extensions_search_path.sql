-- Migration: postgis_extensions_search_path
-- Description: Prepare for moving PostGIS from public to the extensions schema
--   (clears Security Advisor rls_disabled_in_public on spatial_ref_sys). The
--   move itself is done in place by Supabase support. This migration makes sure
--   nothing breaks once it happens.
--
-- shot_log_detect_bunker() (20260505000000) is a SECURITY DEFINER trigger
-- with search_path pinned to public, pg_catalog. Once PostGIS is in extensions,
-- ST_Covers / ST_SetSRID / ST_MakePoint / geography would stop resolving and
-- every shot_log INSERT would fail. Add extensions to its search_path; this
-- works both before and after the move.
--
-- Audit 2026-11-04: no other non-extension function referencing PostGIS pins
-- its search_path (calculate_hole_distance is unpinned and inherits the
-- caller's path; postgres and PostgREST both include extensions).
--
-- Guarded: staging is missing 20260505000000, so the function may not exist.
-- Date: 2026-11-04

DO $$
BEGIN
  IF to_regprocedure('public.shot_log_detect_bunker()') IS NOT NULL THEN
    ALTER FUNCTION public.shot_log_detect_bunker()
      SET search_path = public, extensions, pg_catalog;
  END IF;
END $$;
