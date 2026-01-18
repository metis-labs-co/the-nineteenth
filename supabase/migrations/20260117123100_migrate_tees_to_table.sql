-- =====================================================
-- MIGRATE TEES FROM JSONB TO SEPARATE TABLE
-- Step 1.6 of GolfAPI Integration Plan
-- =====================================================

-- Migrate existing tees data from courses.tees JSONB column
-- The JSONB structure is: [{ name, color, totalYardage, courseRating, slopeRating }]

INSERT INTO tees (
  course_id,
  name,
  color,
  slope,
  course_rating,
  measure_unit
)
SELECT
  c.id AS course_id,
  COALESCE(tee->>'name', 'Default')::TEXT AS name,
  (tee->>'color')::TEXT AS color,
  (tee->>'slopeRating')::INTEGER AS slope,
  (tee->>'courseRating')::NUMERIC AS course_rating,
  'y' AS measure_unit  -- Existing data uses yards based on yardages in holes
FROM courses c,
LATERAL jsonb_array_elements(COALESCE(c.tees, '[]'::jsonb)) AS tee
WHERE c.tees IS NOT NULL
  AND jsonb_array_length(c.tees) > 0
ON CONFLICT DO NOTHING;

-- Log migration counts
DO $$
DECLARE
  migrated_count INTEGER;
  courses_with_tees INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM tees;
  SELECT COUNT(DISTINCT course_id) INTO courses_with_tees FROM tees;
  RAISE NOTICE 'Migrated % tees for % courses', migrated_count, courses_with_tees;
END $$;

-- =====================================================
-- KEEP tees COLUMN FOR NOW (will remove in later migration)
-- This allows rollback if needed
-- =====================================================

-- Add column to track if tees were migrated
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tees_migrated BOOLEAN DEFAULT FALSE;

-- Mark courses with migrated tees
UPDATE courses c
SET tees_migrated = TRUE
WHERE EXISTS (SELECT 1 FROM tees t WHERE t.course_id = c.id);

-- Also mark courses that had NULL or empty tees as migrated (nothing to migrate)
UPDATE courses c
SET tees_migrated = TRUE
WHERE c.tees IS NULL OR jsonb_array_length(c.tees) = 0;

COMMENT ON COLUMN courses.tees_migrated IS 'True if tees were migrated to separate tees table (or had no tees to migrate)';

-- =====================================================
-- LOG FINAL STATUS
-- =====================================================

DO $$
DECLARE
  total_courses INTEGER;
  courses_migrated INTEGER;
  courses_pending INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_courses FROM courses;
  SELECT COUNT(*) INTO courses_migrated FROM courses WHERE tees_migrated = TRUE;
  SELECT COUNT(*) INTO courses_pending FROM courses WHERE tees_migrated = FALSE;

  RAISE NOTICE 'Migration complete: % total courses, % migrated, % pending',
    total_courses, courses_migrated, courses_pending;
END $$;
