-- =====================================================
-- VERIFY FAVORITE_COURSES TABLE
-- The FK to courses should still work since we only renamed
-- courses.venue_id to courses.club_id, not courses.id
-- =====================================================

-- Verify FK is intact and log warning if missing
DO $$
DECLARE
  fk_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'favorite_courses'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.column_name = 'course_id'
  ) INTO fk_exists;

  IF NOT fk_exists THEN
    RAISE WARNING 'favorite_courses FK to courses may need to be recreated';
  ELSE
    RAISE NOTICE 'favorite_courses FK to courses verified intact';
  END IF;
END $$;

-- Add index if missing (idempotent - IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_favorite_courses_course
  ON favorite_courses(course_id);

CREATE INDEX IF NOT EXISTS idx_favorite_courses_player
  ON favorite_courses(player_id);

-- Clean up orphaned favorites (courses that no longer exist)
DELETE FROM favorite_courses
WHERE course_id NOT IN (SELECT id FROM courses);

-- Log remaining favorites count
DO $$
DECLARE
  fav_count INTEGER;
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fav_count FROM favorite_courses;
  RAISE NOTICE 'favorite_courses table has % entries after cleanup', fav_count;
END $$;

-- =====================================================
-- VERIFICATION COMPLETE
-- =====================================================
COMMENT ON TABLE favorite_courses IS 'Stores user favorite golf courses for quick access - verified post-clubs-rename';
