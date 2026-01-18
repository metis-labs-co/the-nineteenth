-- Migration: archive_venues_for_clubs_rename
-- Description: Archive existing venue/course data before the clubs rename migration.
--              These preserve existing data for rollback capability.
-- Date: 2026-01-17

-- =====================================================
-- ARCHIVE TABLES FOR ROLLBACK CAPABILITY
-- =====================================================

-- Archive table for venues (will become clubs)
CREATE TABLE IF NOT EXISTS archived_venues_pre_clubs (
  id UUID PRIMARY KEY,
  source TEXT,
  api_id TEXT,
  name TEXT NOT NULL,
  state TEXT,
  country TEXT DEFAULT 'Australia',
  city TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location GEOGRAPHY(POINT, 4326),
  total_holes INTEGER,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Archive table for courses
CREATE TABLE IF NOT EXISTS archived_courses_pre_clubs (
  id UUID PRIMARY KEY,
  venue_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  holes JSONB,
  tees JSONB,
  slope_rating NUMERIC(4,1),
  course_rating NUMERIC(4,1),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR LOOKUP
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_archived_venues_pre_clubs_id
  ON archived_venues_pre_clubs(id);

CREATE INDEX IF NOT EXISTS idx_archived_courses_pre_clubs_id
  ON archived_courses_pre_clubs(id);

CREATE INDEX IF NOT EXISTS idx_archived_courses_pre_clubs_venue
  ON archived_courses_pre_clubs(venue_id);

-- =====================================================
-- ARCHIVE EXISTING DATA
-- =====================================================

-- Archive all existing venues
-- Extract lat/long from PostGIS geography column
INSERT INTO archived_venues_pre_clubs (
  id, source, api_id, name, state, country, city, address,
  phone, email, website, latitude, longitude, location,
  total_holes, last_synced, created_at, updated_at
)
SELECT
  id,
  source,
  api_id,
  name,
  state,
  'Australia' as country,
  city,
  address,
  phone,
  email,
  website,
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude,
  location,
  total_holes,
  last_synced,
  created_at,
  updated_at
FROM venues
ON CONFLICT (id) DO NOTHING;

-- Archive all existing courses
INSERT INTO archived_courses_pre_clubs (
  id, venue_id, name, description, holes, tees,
  slope_rating, course_rating, created_at, updated_at
)
SELECT
  id,
  venue_id,
  name,
  description,
  holes,
  tees,
  slope_rating,
  course_rating,
  created_at,
  updated_at
FROM courses
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- LOG ARCHIVE COUNTS
-- =====================================================

DO $$
DECLARE
  venue_count INTEGER;
  course_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO venue_count FROM archived_venues_pre_clubs;
  SELECT COUNT(*) INTO course_count FROM archived_courses_pre_clubs;
  RAISE NOTICE 'Archived % venues and % courses for clubs rename migration', venue_count, course_count;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE archived_venues_pre_clubs IS 'Archive of venues table before rename to clubs. For rollback capability.';
COMMENT ON TABLE archived_courses_pre_clubs IS 'Archive of courses table before clubs migration. For rollback capability.';
