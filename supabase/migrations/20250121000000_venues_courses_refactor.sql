-- =====================================================
-- Migration: venues_courses_refactor
-- Description: Add venues table and refactor courses to support
--              multiple course configurations at a single venue
--              (e.g., 27-hole clubs with 3 different 18-hole combinations)
-- Date: 2025-01-21
-- =====================================================

-- =====================================================
-- STEP 1: CREATE VENUES TABLE
-- =====================================================

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('api', 'manual')),
  api_id TEXT, -- External API identifier

  -- Basic Info
  name TEXT NOT NULL,
  state TEXT CHECK (state IN ('NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Location (PostGIS geography type for accurate distance calculations)
  location GEOGRAPHY(POINT, 4326), -- WGS84 coordinate system

  -- Venue Details
  total_holes INTEGER, -- 18, 27, 36, etc.

  -- Metadata
  last_synced TIMESTAMPTZ, -- When venue data was last updated from API
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE venues IS 'Physical golf club locations. A venue can have one or more playable courses.';

-- =====================================================
-- STEP 2: CREATE INDEXES FOR VENUES
-- =====================================================

CREATE INDEX idx_venues_name ON venues(name);
CREATE INDEX idx_venues_state ON venues(state);
CREATE INDEX idx_venues_source ON venues(source);
CREATE INDEX idx_venues_location ON venues USING GIST(location);

-- =====================================================
-- STEP 3: ADD UPDATED_AT TRIGGER FOR VENUES
-- =====================================================

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 4: ENABLE RLS AND ADD POLICIES FOR VENUES
-- =====================================================

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view venues
CREATE POLICY "Anyone can view venues"
  ON venues FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create venues (manual entry)
CREATE POLICY "Authenticated users can create venues"
  ON venues FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update venues
CREATE POLICY "Authenticated users can update venues"
  ON venues FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- STEP 5: MIGRATE EXISTING COURSES TO VENUES
-- =====================================================

-- Create a venue for each existing course
INSERT INTO venues (
  id,
  source,
  api_id,
  name,
  state,
  city,
  address,
  phone,
  email,
  website,
  location,
  total_holes,
  last_synced,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  source,
  api_id,
  name,
  state,
  city,
  address,
  phone,
  email,
  website,
  location,
  18, -- Assume 18 holes for existing courses
  last_synced,
  created_at,
  updated_at
FROM courses;

-- =====================================================
-- STEP 6: ADD VENUE_ID TO COURSES TABLE
-- =====================================================

-- Add venue_id column (nullable initially for migration)
ALTER TABLE courses ADD COLUMN venue_id UUID REFERENCES venues(id) ON DELETE CASCADE;

-- Add description column for course configurations
ALTER TABLE courses ADD COLUMN description TEXT;

-- =====================================================
-- STEP 7: POPULATE VENUE_ID FOR EXISTING COURSES
-- =====================================================

-- Match courses to venues by name (since we just created venues from courses)
UPDATE courses c
SET venue_id = v.id
FROM venues v
WHERE c.name = v.name
  AND COALESCE(c.state, '') = COALESCE(v.state, '')
  AND COALESCE(c.city, '') = COALESCE(v.city, '');

-- =====================================================
-- STEP 8: MAKE VENUE_ID NOT NULL
-- =====================================================

-- Verify all courses have a venue_id before making NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM courses WHERE venue_id IS NULL) THEN
    RAISE EXCEPTION 'Some courses do not have a venue_id. Manual intervention required.';
  END IF;
END $$;

-- Make venue_id NOT NULL
ALTER TABLE courses ALTER COLUMN venue_id SET NOT NULL;

-- =====================================================
-- STEP 9: REMOVE REDUNDANT COLUMNS FROM COURSES
-- =====================================================

-- These fields now live on the venue
ALTER TABLE courses DROP COLUMN IF EXISTS source;
ALTER TABLE courses DROP COLUMN IF EXISTS api_id;
ALTER TABLE courses DROP COLUMN IF EXISTS state;
ALTER TABLE courses DROP COLUMN IF EXISTS city;
ALTER TABLE courses DROP COLUMN IF EXISTS address;
ALTER TABLE courses DROP COLUMN IF EXISTS phone;
ALTER TABLE courses DROP COLUMN IF EXISTS email;
ALTER TABLE courses DROP COLUMN IF EXISTS website;
ALTER TABLE courses DROP COLUMN IF EXISTS location;
ALTER TABLE courses DROP COLUMN IF EXISTS last_synced;

-- =====================================================
-- STEP 10: UPDATE COURSES INDEXES
-- =====================================================

-- Drop old indexes that referenced removed columns
DROP INDEX IF EXISTS idx_courses_state;
DROP INDEX IF EXISTS idx_courses_source;
DROP INDEX IF EXISTS idx_courses_location;

-- Add new index for venue lookups
CREATE INDEX idx_courses_venue ON courses(venue_id);

-- Add unique constraint for course name per venue
ALTER TABLE courses ADD CONSTRAINT unique_course_name_per_venue UNIQUE (venue_id, name);

-- =====================================================
-- STEP 11: MAKE HOLES NOT NULL (was nullable before)
-- =====================================================

-- Ensure holes has a default empty array for any NULL values
UPDATE courses SET holes = '[]'::jsonb WHERE holes IS NULL;

-- Make holes NOT NULL
ALTER TABLE courses ALTER COLUMN holes SET NOT NULL;
ALTER TABLE courses ALTER COLUMN holes SET DEFAULT '[]'::jsonb;

-- =====================================================
-- STEP 12: ADD HELPER FUNCTION FOR COURSE SELECTION UI
-- =====================================================

-- Get venues with their courses for the selection UI
CREATE OR REPLACE FUNCTION get_venues_with_courses(
  search_query TEXT DEFAULT NULL,
  state_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  venue_id UUID,
  venue_name TEXT,
  city TEXT,
  state TEXT,
  total_holes INTEGER,
  course_count BIGINT,
  courses JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS venue_id,
    v.name AS venue_name,
    v.city,
    v.state,
    v.total_holes,
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
  FROM venues v
  LEFT JOIN courses c ON c.venue_id = v.id
  WHERE
    (search_query IS NULL OR v.name ILIKE '%' || search_query || '%')
    AND (state_filter IS NULL OR v.state = state_filter)
  GROUP BY v.id, v.name, v.city, v.state, v.total_holes
  ORDER BY v.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_venues_with_courses IS 'Get venues with their courses for the course selection UI. Supports search and state filtering.';

-- =====================================================
-- STEP 13: UPDATE TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE courses IS 'Playable 18-hole course configurations at a venue. A venue with 27 holes would have 3 course records.';
COMMENT ON COLUMN courses.venue_id IS 'Reference to the parent venue (physical golf club)';
COMMENT ON COLUMN courses.name IS 'Course name (e.g., "East/West Course" or "Championship")';
COMMENT ON COLUMN courses.description IS 'Optional description of this course configuration';
COMMENT ON COLUMN courses.holes IS 'Array of 18 hole objects with par, strokeIndex, yardages';
COMMENT ON COLUMN courses.tees IS 'Array of tee box objects with ratings for this specific course';

COMMENT ON COLUMN venues.name IS 'Venue/club name (e.g., "The Eastern Golf Club")';
COMMENT ON COLUMN venues.total_holes IS 'Total holes at venue (18, 27, 36, etc.)';
COMMENT ON COLUMN venues.location IS 'GPS coordinates (PostGIS POINT)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
