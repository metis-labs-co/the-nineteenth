-- Migration: add_num_holes_to_courses
-- Description: Add num_holes column to courses table.
--              This column tracks whether a course is 9 or 18 holes.
-- Date: 2026-01-17
-- Dependencies: 20260117122547_add_golfapi_course_ids.sql

-- =====================================================
-- ADD NUM_HOLES COLUMN
-- =====================================================

-- Add num_holes column with default of 18 (most common)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS num_holes INTEGER DEFAULT 18;

-- Add constraint to ensure valid values (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'courses_num_holes_valid'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_num_holes_valid
      CHECK (num_holes IN (9, 18));
  END IF;
END $$;

-- =====================================================
-- UPDATE COMMENT
-- =====================================================

COMMENT ON COLUMN courses.num_holes IS 'Number of holes on this course (9 or 18)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
DECLARE
  course_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO course_count FROM courses;
  RAISE NOTICE 'Added num_holes column to courses table. % courses updated with default of 18.', course_count;
END $$;
