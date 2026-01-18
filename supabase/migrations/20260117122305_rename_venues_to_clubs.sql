-- Migration: rename_venues_to_clubs
-- Description: Rename venues table to clubs and update all references to match GolfAPI.io terminology.
--              This is part of the GolfAPI.io integration plan (Step 1.2)
-- Date: 2026-01-17
-- Dependencies: 20260117121535_archive_venues_for_clubs_rename.sql (archives existing data)

-- =====================================================
-- STEP 1: RENAME venues TABLE TO clubs
-- =====================================================

-- Rename the table
ALTER TABLE venues RENAME TO clubs;

-- Rename api_id column to match GolfAPI.io naming
ALTER TABLE clubs RENAME COLUMN api_id TO golfapi_club_id;

-- Add new columns from GolfAPI.io (country already exists with default, add others)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Australia';
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS continent TEXT;

-- Update source check constraint to allow 'legacy' value
ALTER TABLE clubs DROP CONSTRAINT IF EXISTS venues_source_check;
ALTER TABLE clubs ADD CONSTRAINT clubs_source_check CHECK (source IN ('api', 'manual', 'legacy'));

-- =====================================================
-- STEP 2: UPDATE FOREIGN KEY REFERENCES
-- =====================================================

-- Rename FK column in courses table
-- First drop the constraint, then rename, then re-add
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_venue_id_fkey;
ALTER TABLE courses RENAME COLUMN venue_id TO club_id;
ALTER TABLE courses ADD CONSTRAINT courses_club_id_fkey
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;

-- Rename FK column in players table (home_venue_id → home_club_id)
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_home_venue_id_fkey;
ALTER TABLE players RENAME COLUMN home_venue_id TO home_club_id;
ALTER TABLE players ADD CONSTRAINT players_home_club_id_fkey
  FOREIGN KEY (home_club_id) REFERENCES clubs(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 3: RENAME INDEXES
-- =====================================================

-- Clubs table indexes (renamed from venues)
ALTER INDEX IF EXISTS idx_venues_name RENAME TO idx_clubs_name;
ALTER INDEX IF EXISTS idx_venues_state RENAME TO idx_clubs_state;
ALTER INDEX IF EXISTS idx_venues_source RENAME TO idx_clubs_source;
ALTER INDEX IF EXISTS idx_venues_location RENAME TO idx_clubs_location;

-- Courses table indexes
ALTER INDEX IF EXISTS idx_courses_venue RENAME TO idx_courses_club;

-- Players table indexes
ALTER INDEX IF EXISTS idx_players_home_venue RENAME TO idx_players_home_club;

-- Create new index for GolfAPI lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_clubs_golfapi_id ON clubs(golfapi_club_id) WHERE golfapi_club_id IS NOT NULL;

-- =====================================================
-- STEP 4: UPDATE UNIQUE CONSTRAINT ON COURSES
-- =====================================================

-- Rename unique constraint on courses table (venue_id, name) → (club_id, name)
ALTER TABLE courses DROP CONSTRAINT IF EXISTS unique_course_name_per_venue;
ALTER TABLE courses ADD CONSTRAINT unique_course_name_per_club UNIQUE (club_id, name);

-- =====================================================
-- STEP 5: RENAME UPDATE TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS update_venues_updated_at ON clubs;
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 6: UPDATE RLS POLICIES
-- =====================================================

-- Drop old policies on clubs (formerly venues)
DROP POLICY IF EXISTS "Anyone can view venues" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can view venues" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can create venues" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can update venues" ON clubs;
DROP POLICY IF EXISTS "Super admins can manage venues" ON clubs;

-- Create new policies with correct names
CREATE POLICY "Anyone can view clubs" ON clubs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create clubs" ON clubs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clubs" ON clubs
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage clubs" ON clubs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions us
      WHERE us.user_id = auth.uid()
      AND us.tier = 'super_admin'
    )
  );

-- =====================================================
-- STEP 7: UPDATE OR REPLACE HELPER FUNCTIONS
-- =====================================================

-- Drop old function and create renamed version
DROP FUNCTION IF EXISTS get_venues_with_courses(TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_clubs_with_courses(
  search_query TEXT DEFAULT NULL,
  state_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  club_id UUID,
  club_name TEXT,
  city TEXT,
  state TEXT,
  total_holes INTEGER,
  course_count BIGINT,
  courses JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cl.id AS club_id,
    cl.name AS club_name,
    cl.city,
    cl.state,
    cl.total_holes,
    COUNT(c.id) AS course_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slope_rating', c.slope_rating,
          'course_rating', c.course_rating
        )
        ORDER BY c.name
      ) FILTER (WHERE c.id IS NOT NULL),
      '[]'::jsonb
    ) AS courses
  FROM clubs cl
  LEFT JOIN courses c ON c.club_id = cl.id
  WHERE
    (search_query IS NULL OR cl.name ILIKE '%' || search_query || '%')
    AND (state_filter IS NULL OR cl.state = state_filter)
  GROUP BY cl.id, cl.name, cl.city, cl.state, cl.total_holes
  ORDER BY cl.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_clubs_with_courses IS 'Get clubs with their courses for the course selection UI. Supports search and state filtering.';

-- =====================================================
-- STEP 8: UPDATE COMMENTS
-- =====================================================

COMMENT ON TABLE clubs IS 'Golf clubs - physical golf club locations. A club can have one or more playable courses. Renamed from venues to match GolfAPI.io terminology.';
COMMENT ON COLUMN clubs.golfapi_club_id IS 'Unique identifier from GolfAPI.io (ClubID). Renamed from api_id.';
COMMENT ON COLUMN clubs.source IS 'Data source: api (from GolfAPI.io), manual (user entered), or legacy (pre-migration)';
COMMENT ON COLUMN clubs.name IS 'Club name (e.g., "The Eastern Golf Club")';
COMMENT ON COLUMN clubs.total_holes IS 'Total holes at club (18, 27, 36, etc.)';
COMMENT ON COLUMN clubs.location IS 'GPS coordinates (PostGIS POINT)';
COMMENT ON COLUMN clubs.postal_code IS 'Postal/ZIP code from GolfAPI.io';
COMMENT ON COLUMN clubs.continent IS 'Continent name from GolfAPI.io';
COMMENT ON COLUMN clubs.country IS 'Country (defaults to Australia)';

COMMENT ON COLUMN courses.club_id IS 'Reference to the parent club. Renamed from venue_id.';

COMMENT ON COLUMN players.home_club_id IS 'Reference to the player''s designated home golf club. Renamed from home_venue_id.';

-- =====================================================
-- STEP 9: LOG MIGRATION STATS
-- =====================================================

DO $$
DECLARE
  club_count INTEGER;
  course_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO club_count FROM clubs;
  SELECT COUNT(*) INTO course_count FROM courses;
  RAISE NOTICE 'Migration complete: % clubs, % courses. venues table renamed to clubs.', club_count, course_count;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
