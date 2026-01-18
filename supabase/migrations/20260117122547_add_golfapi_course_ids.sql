-- Migration: add_golfapi_course_ids
-- Description: Add GolfAPI.io identifiers and additional columns to courses table.
--              This supports the full GolfAPI.io data model for course information.
-- Date: 2026-01-17
-- Dependencies: 20260117122305_rename_venues_to_clubs.sql (clubs rename)
-- Part of: GolfAPI.io Integration Plan (Step 1.3)

-- =====================================================
-- ADD GOLFAPI.IO COURSE IDENTIFIERS
-- =====================================================

-- Add GolfAPI.io course identifier (CourseID from API)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS golfapi_course_id TEXT;

-- Add GolfAPI.io long course identifier (LongCourseID from API)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS golfapi_long_course_id TEXT;

-- =====================================================
-- ADD MEASUREMENT UNIT COLUMN
-- =====================================================

-- Add measure unit column (meters or yards) - GolfAPI.io uses 'm' or 'y'
ALTER TABLE courses ADD COLUMN IF NOT EXISTS measure_unit TEXT
  CHECK (measure_unit IN ('m', 'y')) DEFAULT 'm';

-- =====================================================
-- ADD WOMEN'S PAR AND HANDICAP DATA
-- =====================================================

-- Add women's par and handicap data per hole (separate from men's in holes JSONB)
-- Structure: [{ holeNumber: 1, parWomen: 4, indexWomen: 9 }, ...]
ALTER TABLE courses ADD COLUMN IF NOT EXISTS holes_women JSONB;

-- =====================================================
-- ADD MATCH PLAY INDEX DATA
-- =====================================================

-- Add match play stroke indexes per hole (different from stroke play indexes)
-- Structure: [{ holeNumber: 1, matchIndex: 5 }, ...]
ALTER TABLE courses ADD COLUMN IF NOT EXISTS match_play_indexes JSONB;

-- =====================================================
-- ADD API SYNC TIMESTAMP
-- =====================================================

-- Add last updated timestamp from GolfAPI.io (TimestampUpdated field)
-- This helps us know when to refresh stale course data
ALTER TABLE courses ADD COLUMN IF NOT EXISTS golfapi_updated_at TIMESTAMPTZ;

-- =====================================================
-- CREATE INDEXES FOR GOLFAPI LOOKUPS
-- =====================================================

-- Index for looking up courses by GolfAPI.io course ID
CREATE INDEX IF NOT EXISTS idx_courses_golfapi_id
  ON courses(golfapi_course_id)
  WHERE golfapi_course_id IS NOT NULL;

-- Index for looking up courses by GolfAPI.io long course ID
CREATE INDEX IF NOT EXISTS idx_courses_golfapi_long_id
  ON courses(golfapi_long_course_id)
  WHERE golfapi_long_course_id IS NOT NULL;

-- =====================================================
-- UPDATE COMMENTS
-- =====================================================

COMMENT ON COLUMN courses.golfapi_course_id IS 'CourseID from GolfAPI.io - unique identifier for this course';
COMMENT ON COLUMN courses.golfapi_long_course_id IS 'LongCourseID from GolfAPI.io - extended identifier including club info';
COMMENT ON COLUMN courses.measure_unit IS 'Distance measurement unit: m (meters) or y (yards) - from GolfAPI.io MeasureMeters field';
COMMENT ON COLUMN courses.holes_women IS 'Women''s par and stroke index data per hole - [{ holeNumber, parWomen, indexWomen }, ...]';
COMMENT ON COLUMN courses.match_play_indexes IS 'Match play stroke indexes per hole (may differ from stroke play) - [{ holeNumber, matchIndex }, ...]';
COMMENT ON COLUMN courses.golfapi_updated_at IS 'Timestamp when GolfAPI.io last updated this course data - used for cache invalidation';

-- =====================================================
-- LOG MIGRATION STATS
-- =====================================================

DO $$
DECLARE
  course_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO course_count FROM courses;
  RAISE NOTICE 'Added GolfAPI.io columns to courses table. % courses ready for API sync.', course_count;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
