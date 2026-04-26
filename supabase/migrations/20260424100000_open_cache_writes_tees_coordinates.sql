-- =====================================================
-- Open write access on course cache tables (tees, hole_coordinates)
--
-- These tables mirror public golf course data from GolfAPI.io. Previously
-- only super admins could write, which blocked regular users from
-- triggering imports (GolfAPI-only search results, stale refresh, etc.):
--   - INSERT on hole_coordinates failed with "new row violates RLS policy"
--   - UPDATE on tees silently affected 0 rows, producing PGRST116 errors
--
-- Align with clubs/courses, which already allow authenticated users to
-- create and update rows (see 20260117122305_rename_venues_to_clubs.sql
-- and 20250109000000_mvp_phase_1_schema.sql).
-- =====================================================

-- -------------------- tees --------------------

CREATE POLICY "Authenticated users can insert tees" ON tees
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tees" ON tees
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tees" ON tees
  FOR DELETE TO authenticated
  USING (true);

-- -------------------- hole_coordinates --------------------

CREATE POLICY "Authenticated users can insert hole coordinates" ON hole_coordinates
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update hole coordinates" ON hole_coordinates
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete hole coordinates" ON hole_coordinates
  FOR DELETE TO authenticated
  USING (true);
