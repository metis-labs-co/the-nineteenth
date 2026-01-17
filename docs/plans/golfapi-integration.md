# Plan: GolfAPI.io Integration with Clubs Rename

## Overview

Integrate GolfAPI.io as the primary source for golf course data, replacing the current venue/course structure with a cleaner clubs-based model that matches the GolfAPI.io data architecture.

**Major Changes:**
1. **Rename `venues` → `clubs`** throughout the entire codebase
2. **New `tees` table** - Separate from courses (matching GolfAPI.io normalized structure)
3. **New `hole_coordinates` table** - GPS coordinates for tees and greens per hole
4. **Updated API client** - Match GolfAPI.io REST endpoints
5. **Updated data transformers** - Convert API responses to app types

**Affected Areas:**
- Database schema (tables, columns, indexes, RLS policies)
- TypeScript types and interfaces
- All hooks referencing venues → clubs
- All UI components and screens
- Course discovery and search
- Favorite courses and home club functionality
- Tee selection during round creation
- Caching layer
- Offline course support
- Documentation

## GolfAPI.io Data Model

Based on CSV export analysis, GolfAPI.io uses this normalized structure:

### clubs (from clubs.csv)
| Field | Type | Description |
|-------|------|-------------|
| ClubID | string | Unique identifier (numeric string) |
| ClubName | string | Club name |
| Address | string | Street address |
| City | string | City |
| PostalCode | string | Postal/ZIP code |
| State | string | State/province (full name or abbreviation) |
| Country | string | Country code (AUS, USA, etc.) |
| Latitude | number | Club latitude |
| Longitude | number | Club longitude |
| Website | string | Website URL |
| Email | string | Contact email |
| Telephone | string | Phone number |
| Continent | string | Continent name |

### courses (from courses.csv)
| Field | Type | Description |
|-------|------|-------------|
| ClubID | string | FK to clubs |
| CourseID | string | Unique course identifier |
| LongCourseID | string | Extended course identifier |
| CourseName | string | Course name (empty for single-course clubs) |
| NumHoles | number | 9 or 18 |
| MeasureMeters | number | 1=meters, 0=yards |
| Par1-Par18 | number | Par for each hole |
| Hcp1-Hcp18 | number | Stroke index (handicap) for men per hole |
| ParW1-ParW18 | number | Women's par (usually same as men's) |
| HcpW1-HcpW18 | number | Women's stroke index per hole |
| MatchIndex1-MatchIndex18 | number | Match play stroke index |
| TimestampUpdated | number | Unix timestamp of last update |

### tees (from tees.csv)
| Field | Type | Description |
|-------|------|-------------|
| CourseID | string | FK to courses |
| TeeID | string | Unique tee identifier |
| TeeName | string | Tee name (e.g., "Blue", "White", "68") |
| TeeColor | string | Hex color (e.g., "#FFFFFF", "#00CCFF") |
| Slope | number | Slope rating (men) |
| SlopeFront9 | number | Front 9 slope |
| SlopeBack9 | number | Back 9 slope |
| CR | number | Course rating (men) |
| CRFront9 | number | Front 9 course rating |
| CRBack9 | number | Back 9 course rating |
| SlopeWomen | number | Slope rating (women) |
| CRWomen | number | Course rating (women) |
| MeasureUnit | string | "m" or "y" |
| Length1-Length18 | number | Distance per hole from this tee |

### coordinates (from coordinates.csv)
| Field | Type | Description |
|-------|------|-------------|
| CourseID | string | FK to courses |
| Hole | number | Hole number (1-18) |
| POI | string | Point of interest: "Green", "Tee Front", "Tee Back" |
| Location | string | F=front, C=center, B=back (for greens) |
| SideOfFairway | string | Side indicator |
| Latitude | number | GPS latitude |
| Longitude | number | GPS longitude |

## Approach

1. **Create archive tables** for existing venue/course data (rollback safety)
2. **Run database migrations** to rename venues→clubs, create tees/coordinates tables
3. **Update TypeScript types** to match new schema
4. **Rename files** (useVenues.ts → useClubs.ts, VenueCard.tsx → ClubCard.tsx, etc.)
5. **Update all code references** from venue to club
6. **Update GolfAPI client** to match actual API endpoints
7. **Create new services** for tees and coordinates
8. **Update UI screens** to use new data model
9. **Update documentation** to reflect changes

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Source | GolfAPI.io REST API | Clean data, unique IDs, 42k courses, caching allowed |
| Data Model | Normalized (clubs, courses, tees, coordinates) | Matches API structure, more flexible |
| Tee Storage | Separate table (not JSONB) | Better querying, proper FK relationships |
| Coordinates | New table with PostGIS | Enables GPS features, distance calculations |
| Rename | Full venues→clubs rename | Better terminology, matches industry standard |
| Caching | PostgreSQL with 30-day TTL | Explicitly allowed by GolfAPI.io |

## Prerequisites

- [ ] GolfAPI.io subscription active (15-day free trial available)
- [ ] API key obtained and added to `.env` as `EXPO_PUBLIC_GOLFAPI_IO_KEY`
- [ ] Base URL configured as `EXPO_PUBLIC_GOLFAPI_IO_URL`

---

## Phase 0: API Verification

> **Rationale**: Current types in `golfApiTypes.ts` are marked as "based on expected API responses" - we need to verify the actual API structure before building on assumptions.

### Step 0.1: Verify GolfAPI.io Subscription and API Key
**Status:** ✅ Complete
**Type:** Manual
**Command:** N/A

**Prompt:**
```
Verify GolfAPI.io subscription is active and API key works.

STEPS:

1. Log in to GolfAPI.io dashboard
2. Verify subscription status (active trial or paid)
3. Copy API key from dashboard
4. Test API key with curl:

curl -X GET "https://www.golfapi.io/api/v2.3/clubs/141520610397251566" \
  -H "Authorization: Bearer YOUR_API_KEY"

EXPECTED RESULT:
- HTTP 200 response
- JSON object with club data

IF ERRORS:
- 401: API key invalid or expired
- 403: Subscription not active
- 429: Rate limit exceeded
```

**Deliverables:**
- [x] Subscription verified as active (Trial until 01-Feb-2026, 20 calls)
- [x] API key tested successfully
- [x] API key added to `.env`

**Dependencies:** None
**Notes:** Completed - API key is `bde8587f-b9b7-499e-8763-103cd1e17d0f`

---

### Step 0.2: Document Actual API Response Structure
**Status:** ✅ Complete
**Type:** Manual
**Command:** N/A

**Prompt:**
```
Make test API calls to document actual response structure.

TEST CALLS MADE (using free test endpoints):

1. Club Details:
   GET https://www.golfapi.io/api/v2.3/clubs/141520610397251566
   - Returns club info WITH nested courses array

2. Course Details:
   GET https://www.golfapi.io/api/v2.3/courses/012141520658891108829
   - Returns course WITH nested tees array and par/index arrays

3. Coordinates:
   GET https://www.golfapi.io/api/v2.3/coordinates/012141520658891108829
   - Returns coordinates array with numeric POI codes
```

**Deliverables:**
- [x] Club endpoint documented (includes nested courses)
- [x] Course endpoint documented (includes nested tees, par/index arrays)
- [x] Coordinates endpoint documented (numeric POI codes)
- [x] Field names and types noted (see Step 2.2 for actual types)

**Dependencies:** Step 0.1
**Notes:** API structure is different from CSV export - uses camelCase, nested data, arrays for pars/indexes

---

### Step 0.3: Compare API Responses with Expected Types
**Status:** ✅ Complete
**Type:** Manual
**Command:** N/A

**Prompt:**
```
Compare actual API responses with expected types in golfApiTypes.ts.

SIGNIFICANT DIFFERENCES FOUND:

1. API URL: www.golfapi.io/api/v2.3 (not api.golfapi.io/v1)
2. Field names: camelCase (clubID) not PascalCase (ClubID)
3. Club lat/long: strings, need parsing to numbers
4. Courses: NESTED in club response (not separate endpoint)
5. Tees: NESTED in course response (not separate endpoint)
6. Par/Index: Arrays (parsMen[]) not individual fields (Par1, Par2...)
7. Coordinates POI: Numeric codes (1,2,11,12) not strings ("Green", "Tee")
8. Empty values: Empty string "" not null
9. numHoles: String "18" not number 18
```

**Deliverables:**
- [x] All interfaces compared with actual responses
- [x] Differences documented (see above)
- [x] Step 2.2 updated with correct types
- [x] Step 2.3 updated with correct transformers

**Dependencies:** Step 0.2
**Notes:** Types need significant rewrite - see updated Step 2.2

---

## Phase 1: Database Schema Changes

### Step 1.1: Create Archive Tables Migration
**Status:** ⏳ Pending
**Type:** Migration
**Command:** N/A

**Prompt:**
```
Create a Supabase migration to archive existing venue/course data before the clubs rename.

Create file: supabase/migrations/[timestamp]_archive_venues_for_clubs_rename.sql

SQL CONTENT:

-- Archive tables for rollback capability
-- These preserve existing data before the venues→clubs migration

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

CREATE TABLE IF NOT EXISTS archived_courses_pre_clubs (
  id UUID PRIMARY KEY,
  venue_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  num_holes INTEGER DEFAULT 18,
  holes JSONB,
  tees JSONB,
  slope_rating NUMERIC(4,1),
  course_rating NUMERIC(4,1),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for lookup
CREATE INDEX idx_archived_venues_pre_clubs_id ON archived_venues_pre_clubs(id);
CREATE INDEX idx_archived_courses_pre_clubs_id ON archived_courses_pre_clubs(id);
CREATE INDEX idx_archived_courses_pre_clubs_venue ON archived_courses_pre_clubs(venue_id);

-- Archive all existing venues
INSERT INTO archived_venues_pre_clubs (
  id, source, api_id, name, state, country, city, address,
  phone, email, website, latitude, longitude, location,
  total_holes, last_synced, created_at, updated_at
)
SELECT
  id, source, api_id, name, state, country, city, address,
  phone, email, website, latitude, longitude, location,
  total_holes, last_synced, created_at, updated_at
FROM venues;

-- Archive all existing courses
INSERT INTO archived_courses_pre_clubs (
  id, venue_id, name, description, num_holes, holes, tees,
  slope_rating, course_rating, created_at, updated_at
)
SELECT
  id, venue_id, name, description, num_holes, holes, tees,
  slope_rating, course_rating, created_at, updated_at
FROM courses;

-- Log the archive counts
DO $$
DECLARE
  venue_count INTEGER;
  course_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO venue_count FROM archived_venues_pre_clubs;
  SELECT COUNT(*) INTO course_count FROM archived_courses_pre_clubs;
  RAISE NOTICE 'Archived % venues and % courses for clubs rename migration', venue_count, course_count;
END $$;
```

**Deliverables:**
- [ ] Migration file created
- [ ] Archive tables with all necessary columns
- [ ] Indexes for efficient lookup
- [ ] All existing data archived

**Dependencies:** None
**Notes:** This migration only archives data, does not modify original tables. Run this first as a safety net.

---

### Step 1.2: Rename venues → clubs Migration
**Status:** ⏳ Pending
**Type:** Migration
**Command:** N/A

**Prompt:**
```
Create a Supabase migration to rename venues table to clubs and update all references.

Create file: supabase/migrations/[timestamp]_rename_venues_to_clubs.sql

SQL CONTENT:

-- =====================================================
-- RENAME venues TABLE TO clubs
-- =====================================================

-- Rename the table
ALTER TABLE venues RENAME TO clubs;

-- Rename columns to match GolfAPI.io naming
ALTER TABLE clubs RENAME COLUMN api_id TO golfapi_club_id;

-- Add new columns from GolfAPI.io
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS continent TEXT;

-- =====================================================
-- UPDATE FOREIGN KEY REFERENCES
-- =====================================================

-- Rename FK column in courses table
ALTER TABLE courses RENAME COLUMN venue_id TO club_id;

-- Rename FK column in players table (home venue → home club)
ALTER TABLE players RENAME COLUMN home_venue_id TO home_club_id;

-- =====================================================
-- RENAME INDEXES
-- =====================================================

-- Clubs table indexes
ALTER INDEX IF EXISTS idx_venues_name RENAME TO idx_clubs_name;
ALTER INDEX IF EXISTS idx_venues_state RENAME TO idx_clubs_state;
ALTER INDEX IF EXISTS idx_venues_source RENAME TO idx_clubs_source;
ALTER INDEX IF EXISTS idx_venues_location RENAME TO idx_clubs_location;
ALTER INDEX IF EXISTS idx_venues_api_id RENAME TO idx_clubs_golfapi_id;

-- Courses table indexes
ALTER INDEX IF EXISTS idx_courses_venue RENAME TO idx_courses_club;
ALTER INDEX IF EXISTS idx_courses_venue_id RENAME TO idx_courses_club_id;

-- Players table indexes
ALTER INDEX IF EXISTS idx_players_home_venue RENAME TO idx_players_home_club;
ALTER INDEX IF EXISTS idx_players_home_venue_id RENAME TO idx_players_home_club_id;

-- =====================================================
-- UPDATE RLS POLICIES
-- =====================================================

-- Drop old policies on clubs (formerly venues)
DROP POLICY IF EXISTS "Anyone can view venues" ON clubs;
DROP POLICY IF EXISTS "Authenticated users can view venues" ON clubs;
DROP POLICY IF EXISTS "Super admins can manage venues" ON clubs;
DROP POLICY IF EXISTS "Users can create venues" ON clubs;

-- Create new policies with correct names
CREATE POLICY "Anyone can view clubs" ON clubs
  FOR SELECT TO authenticated USING (true);

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
-- UPDATE COMMENTS
-- =====================================================

COMMENT ON TABLE clubs IS 'Golf clubs/venues - renamed from venues to match GolfAPI.io terminology';
COMMENT ON COLUMN clubs.golfapi_club_id IS 'Unique identifier from GolfAPI.io (ClubID)';
COMMENT ON COLUMN clubs.source IS 'Data source: api (from GolfAPI.io), manual, or legacy';
COMMENT ON COLUMN courses.club_id IS 'FK to clubs table (renamed from venue_id)';
COMMENT ON COLUMN players.home_club_id IS 'Player home club (renamed from home_venue_id)';
```

**Deliverables:**
- [ ] venues table renamed to clubs
- [ ] api_id renamed to golfapi_club_id
- [ ] New columns added (postal_code, continent)
- [ ] courses.venue_id renamed to club_id
- [ ] players.home_venue_id renamed to home_club_id
- [ ] All indexes renamed
- [ ] RLS policies updated

**Dependencies:** Step 1.1
**Notes:** This is a significant schema change. Ensure all archives are complete before running.

---

### Step 1.3: Add GolfAPI IDs to Courses
**Status:** ⏳ Pending
**Type:** Migration
**Command:** N/A

**Prompt:**
```
Create a migration to add GolfAPI.io identifiers to courses table.

Create file: supabase/migrations/[timestamp]_add_golfapi_course_ids.sql

SQL CONTENT:

-- Add GolfAPI.io course identifier
ALTER TABLE courses ADD COLUMN IF NOT EXISTS golfapi_course_id TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS golfapi_long_course_id TEXT;

-- Add measure unit column (meters or yards)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS measure_unit TEXT
  CHECK (measure_unit IN ('m', 'y')) DEFAULT 'm';

-- Add women's par and handicap data (separate from men's)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS holes_women JSONB;

-- Add match play index data
ALTER TABLE courses ADD COLUMN IF NOT EXISTS match_play_indexes JSONB;

-- Add last updated timestamp from API
ALTER TABLE courses ADD COLUMN IF NOT EXISTS golfapi_updated_at TIMESTAMPTZ;

-- Create index for GolfAPI lookups
CREATE INDEX IF NOT EXISTS idx_courses_golfapi_id
  ON courses(golfapi_course_id)
  WHERE golfapi_course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_golfapi_long_id
  ON courses(golfapi_long_course_id)
  WHERE golfapi_long_course_id IS NOT NULL;

-- Update comments
COMMENT ON COLUMN courses.golfapi_course_id IS 'CourseID from GolfAPI.io';
COMMENT ON COLUMN courses.golfapi_long_course_id IS 'LongCourseID from GolfAPI.io';
COMMENT ON COLUMN courses.measure_unit IS 'Distance unit: m (meters) or y (yards)';
COMMENT ON COLUMN courses.holes_women IS 'Women par and handicap data per hole';
COMMENT ON COLUMN courses.match_play_indexes IS 'Match play stroke indexes per hole';
```

**Deliverables:**
- [ ] golfapi_course_id column added
- [ ] golfapi_long_course_id column added
- [ ] measure_unit column added
- [ ] holes_women JSONB column added
- [ ] match_play_indexes JSONB column added
- [ ] Indexes created

**Dependencies:** Step 1.2
**Notes:** These columns support the full GolfAPI.io data model

---

### Step 1.4: Create Separate Tees Table
**Status:** ⏳ Pending
**Type:** Migration
**Command:** N/A

**Prompt:**
```
Create a migration for the new normalized tees table.

Create file: supabase/migrations/[timestamp]_create_tees_table.sql

SQL CONTENT:

-- =====================================================
-- CREATE TEES TABLE
-- Normalized tee data matching GolfAPI.io structure
-- =====================================================

CREATE TABLE tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  golfapi_tee_id TEXT,

  -- Tee identification
  name TEXT NOT NULL,
  color TEXT,  -- Hex color e.g., "#FFFFFF", "#00CCFF"

  -- Men's ratings
  slope INTEGER,
  slope_front9 INTEGER,
  slope_back9 INTEGER,
  course_rating NUMERIC(4,1),
  course_rating_front9 NUMERIC(3,1),
  course_rating_back9 NUMERIC(3,1),

  -- Women's ratings
  slope_women INTEGER,
  slope_women_front9 INTEGER,
  slope_women_back9 INTEGER,
  course_rating_women NUMERIC(4,1),
  course_rating_women_front9 NUMERIC(3,1),
  course_rating_women_back9 NUMERIC(3,1),

  -- Distance unit
  measure_unit TEXT CHECK (measure_unit IN ('m', 'y')) DEFAULT 'm',

  -- Per-hole distances (Length1-Length18 from GolfAPI.io)
  length_hole_1 INTEGER,
  length_hole_2 INTEGER,
  length_hole_3 INTEGER,
  length_hole_4 INTEGER,
  length_hole_5 INTEGER,
  length_hole_6 INTEGER,
  length_hole_7 INTEGER,
  length_hole_8 INTEGER,
  length_hole_9 INTEGER,
  length_hole_10 INTEGER,
  length_hole_11 INTEGER,
  length_hole_12 INTEGER,
  length_hole_13 INTEGER,
  length_hole_14 INTEGER,
  length_hole_15 INTEGER,
  length_hole_16 INTEGER,
  length_hole_17 INTEGER,
  length_hole_18 INTEGER,

  -- Computed totals
  total_length INTEGER GENERATED ALWAYS AS (
    COALESCE(length_hole_1, 0) + COALESCE(length_hole_2, 0) + COALESCE(length_hole_3, 0) +
    COALESCE(length_hole_4, 0) + COALESCE(length_hole_5, 0) + COALESCE(length_hole_6, 0) +
    COALESCE(length_hole_7, 0) + COALESCE(length_hole_8, 0) + COALESCE(length_hole_9, 0) +
    COALESCE(length_hole_10, 0) + COALESCE(length_hole_11, 0) + COALESCE(length_hole_12, 0) +
    COALESCE(length_hole_13, 0) + COALESCE(length_hole_14, 0) + COALESCE(length_hole_15, 0) +
    COALESCE(length_hole_16, 0) + COALESCE(length_hole_17, 0) + COALESCE(length_hole_18, 0)
  ) STORED,

  front9_length INTEGER GENERATED ALWAYS AS (
    COALESCE(length_hole_1, 0) + COALESCE(length_hole_2, 0) + COALESCE(length_hole_3, 0) +
    COALESCE(length_hole_4, 0) + COALESCE(length_hole_5, 0) + COALESCE(length_hole_6, 0) +
    COALESCE(length_hole_7, 0) + COALESCE(length_hole_8, 0) + COALESCE(length_hole_9, 0)
  ) STORED,

  back9_length INTEGER GENERATED ALWAYS AS (
    COALESCE(length_hole_10, 0) + COALESCE(length_hole_11, 0) + COALESCE(length_hole_12, 0) +
    COALESCE(length_hole_13, 0) + COALESCE(length_hole_14, 0) + COALESCE(length_hole_15, 0) +
    COALESCE(length_hole_16, 0) + COALESCE(length_hole_17, 0) + COALESCE(length_hole_18, 0)
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tees_course ON tees(course_id);
CREATE INDEX idx_tees_golfapi_id ON tees(golfapi_tee_id) WHERE golfapi_tee_id IS NOT NULL;
CREATE INDEX idx_tees_name ON tees(name);

-- RLS Policies
ALTER TABLE tees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tees" ON tees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage tees" ON tees
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions us
      WHERE us.user_id = auth.uid()
      AND us.tier = 'super_admin'
    )
  );

-- Comments
COMMENT ON TABLE tees IS 'Golf course tees with ratings and per-hole distances';
COMMENT ON COLUMN tees.golfapi_tee_id IS 'TeeID from GolfAPI.io';
COMMENT ON COLUMN tees.color IS 'Hex color code e.g., #FFFFFF for white';
COMMENT ON COLUMN tees.total_length IS 'Computed total of all hole lengths';
```

**Deliverables:**
- [ ] tees table created with all columns
- [ ] Per-hole length columns (length_hole_1 through length_hole_18)
- [ ] Computed total_length, front9_length, back9_length columns
- [ ] Men's and women's ratings
- [ ] Indexes created
- [ ] RLS policies added

**Dependencies:** Step 1.3
**Notes:** This replaces the JSONB tees column in courses table

---

### Step 1.5: Create Hole Coordinates Table
**Status:** ⏳ Pending
**Type:** Migration
**Command:** N/A

**Prompt:**
```
Create a migration for GPS coordinates table.

Create file: supabase/migrations/[timestamp]_create_hole_coordinates_table.sql

SQL CONTENT:

-- =====================================================
-- CREATE HOLE_COORDINATES TABLE
-- GPS coordinates for tees and greens per hole
-- Enables distance-to-pin, course flyovers, shot tracking
-- =====================================================

CREATE TABLE hole_coordinates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),

  -- Point of interest type (matching GolfAPI.io POI values)
  poi_type TEXT NOT NULL CHECK (poi_type IN (
    'tee_front',    -- Front of tee box
    'tee_back',     -- Back of tee box
    'green_front',  -- Front of green
    'green_center', -- Center of green
    'green_back'    -- Back of green
  )),

  -- GPS coordinates
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,

  -- PostGIS geography point (computed)
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,

  -- Metadata
  side_of_fairway TEXT,  -- From GolfAPI.io SideOfFairway field

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique coordinate per hole/POI combination
  UNIQUE(course_id, hole_number, poi_type)
);

-- Indexes
CREATE INDEX idx_hole_coords_course ON hole_coordinates(course_id);
CREATE INDEX idx_hole_coords_hole ON hole_coordinates(course_id, hole_number);
CREATE INDEX idx_hole_coords_location ON hole_coordinates USING GIST(location);

-- RLS Policies
ALTER TABLE hole_coordinates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hole coordinates" ON hole_coordinates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage hole coordinates" ON hole_coordinates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions us
      WHERE us.user_id = auth.uid()
      AND us.tier = 'super_admin'
    )
  );

-- Comments
COMMENT ON TABLE hole_coordinates IS 'GPS coordinates for tee boxes and greens per hole';
COMMENT ON COLUMN hole_coordinates.poi_type IS 'Point of interest: tee_front, tee_back, green_front, green_center, green_back';
COMMENT ON COLUMN hole_coordinates.location IS 'PostGIS geography point for spatial queries';

-- =====================================================
-- HELPER FUNCTION: Calculate distance between two points
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_hole_distance(
  p_course_id UUID,
  p_hole_number INTEGER,
  p_from_poi TEXT DEFAULT 'tee_back',
  p_to_poi TEXT DEFAULT 'green_center'
)
RETURNS NUMERIC AS $$
DECLARE
  v_from_location GEOGRAPHY;
  v_to_location GEOGRAPHY;
BEGIN
  SELECT location INTO v_from_location
  FROM hole_coordinates
  WHERE course_id = p_course_id
    AND hole_number = p_hole_number
    AND poi_type = p_from_poi;

  SELECT location INTO v_to_location
  FROM hole_coordinates
  WHERE course_id = p_course_id
    AND hole_number = p_hole_number
    AND poi_type = p_to_poi;

  IF v_from_location IS NULL OR v_to_location IS NULL THEN
    RETURN NULL;
  END IF;

  -- ST_Distance returns meters
  RETURN ROUND(ST_Distance(v_from_location, v_to_location)::NUMERIC, 1);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_hole_distance IS 'Calculate distance in meters between two POIs on a hole';
```

**Deliverables:**
- [ ] hole_coordinates table created
- [ ] POI types for tee and green positions
- [ ] PostGIS location column with GIST index
- [ ] Unique constraint per course/hole/POI
- [ ] RLS policies added
- [ ] Helper function for distance calculation

**Dependencies:** Step 1.4
**Notes:** Enables future GPS features like distance-to-pin, shot tracking

---

### Step 1.6: Migrate Existing Tees Data
**Status:** ⏳ Pending
**Type:** Migration
**Command:** N/A

**Prompt:**
```
Create a migration to migrate existing tees JSONB data to the new tees table.

Create file: supabase/migrations/[timestamp]_migrate_tees_to_table.sql

SQL CONTENT:

-- =====================================================
-- MIGRATE TEES FROM JSONB TO SEPARATE TABLE
-- =====================================================

-- Migrate existing tees data from courses.tees JSONB column
INSERT INTO tees (
  course_id,
  name,
  color,
  slope,
  course_rating,
  measure_unit,
  length_hole_1, length_hole_2, length_hole_3,
  length_hole_4, length_hole_5, length_hole_6,
  length_hole_7, length_hole_8, length_hole_9,
  length_hole_10, length_hole_11, length_hole_12,
  length_hole_13, length_hole_14, length_hole_15,
  length_hole_16, length_hole_17, length_hole_18
)
SELECT
  c.id AS course_id,
  COALESCE(tee->>'name', 'Default')::TEXT AS name,
  (tee->>'color')::TEXT AS color,
  (tee->>'slopeRating')::INTEGER AS slope,
  (tee->>'courseRating')::NUMERIC AS course_rating,
  'm' AS measure_unit,
  -- Extract per-hole yardages if available (from totalYardage breakdown)
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
FROM courses c,
LATERAL jsonb_array_elements(COALESCE(c.tees, '[]'::jsonb)) AS tee
WHERE c.tees IS NOT NULL
  AND jsonb_array_length(c.tees) > 0;

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

COMMENT ON COLUMN courses.tees_migrated IS 'True if tees were migrated to separate tees table';
```

**Deliverables:**
- [ ] Existing tees JSONB data migrated to tees table
- [ ] Migration count logged
- [ ] tees_migrated flag added to courses
- [ ] Original tees column preserved for rollback

**Dependencies:** Step 1.4
**Notes:** Keep original tees column until migration verified successful

---

### Step 1.7: Update Favorite Courses FK
**Status:** ⏳ Pending
**Type:** Migration
**Command:** N/A

**Prompt:**
```
Verify and update favorite_courses table if needed.

Create file: supabase/migrations/[timestamp]_verify_favorite_courses.sql

SQL CONTENT:

-- =====================================================
-- VERIFY FAVORITE_COURSES TABLE
-- The FK to courses should still work since we only renamed
-- courses.venue_id to courses.club_id, not courses.id
-- =====================================================

-- Verify FK is intact
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%favorite_courses%course_id%'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE WARNING 'favorite_courses FK to courses may need to be recreated';
  END IF;
END $$;

-- Add index if missing
CREATE INDEX IF NOT EXISTS idx_favorite_courses_course
  ON favorite_courses(course_id);

CREATE INDEX IF NOT EXISTS idx_favorite_courses_player
  ON favorite_courses(player_id);

-- Verify no orphaned favorites
DELETE FROM favorite_courses
WHERE course_id NOT IN (SELECT id FROM courses);

-- Log remaining favorites
DO $$
DECLARE
  fav_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fav_count FROM favorite_courses;
  RAISE NOTICE 'favorite_courses table has % entries', fav_count;
END $$;
```

**Deliverables:**
- [ ] FK integrity verified
- [ ] Indexes added if missing
- [ ] Orphaned favorites cleaned up

**Dependencies:** Step 1.2
**Notes:** This is primarily a verification step

---

### Step 1.8: Regenerate TypeScript Types
**Status:** ⏳ Pending
**Type:** Command
**Command:** `pnpm supabase gen types typescript --local > src/types/supabase.ts`

**Prompt:**
```
After running all database migrations, regenerate the Supabase TypeScript types.

Run: pnpm supabase gen types typescript --local > src/types/supabase.ts

Or if using a script: pnpm supabase:types

This will update the Database type to include:
- clubs table (renamed from venues)
- Updated courses table with new columns
- New tees table
- New hole_coordinates table
- Archive tables

Verify the generated types include:
- Tables.clubs (not Tables.venues)
- Tables.tees
- Tables.hole_coordinates
- courses.club_id (not venue_id)
- players.home_club_id (not home_venue_id)
```

**Deliverables:**
- [ ] TypeScript types regenerated
- [ ] clubs table type present
- [ ] tees table type present
- [ ] hole_coordinates table type present
- [ ] All column renames reflected

**Dependencies:** Steps 1.1-1.7
**Notes:** Run `pnpm supabase db reset` first if needed to apply migrations locally

---

## Phase 2: TypeScript Type Updates

### Step 2.1: Update Database Types
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the manual database types to match the new schema.

Modify file: src/types/database.types.ts

CHANGES:

1. RENAME Venue → Club:

export interface Club {
  id: string;
  source: 'api' | 'manual' | 'legacy';
  golfapi_club_id?: string;

  name: string;
  address?: string;
  city?: string;
  postal_code?: string;
  state?: AustralianState;
  country: string;
  continent?: string;

  latitude?: number;
  longitude?: number;
  location?: unknown; // PostGIS GEOGRAPHY

  phone?: string;
  email?: string;
  website?: string;

  total_holes?: number;
  last_synced?: string;
  created_at: string;
  updated_at: string;
}

2. ADD NEW Tee TYPE (separate from Course):

export interface Tee {
  id: string;
  course_id: string;
  golfapi_tee_id?: string;

  name: string;
  color?: string; // Hex color e.g., "#FFFFFF"

  // Men's ratings
  slope?: number;
  slope_front9?: number;
  slope_back9?: number;
  course_rating?: number;
  course_rating_front9?: number;
  course_rating_back9?: number;

  // Women's ratings
  slope_women?: number;
  course_rating_women?: number;

  // Distance unit
  measure_unit: 'm' | 'y';

  // Per-hole lengths
  length_hole_1?: number;
  length_hole_2?: number;
  // ... through length_hole_18
  length_hole_18?: number;

  // Computed
  total_length?: number;
  front9_length?: number;
  back9_length?: number;

  created_at: string;
  updated_at: string;
}

3. UPDATE Course TYPE:

export interface Course {
  id: string;
  club_id: string; // Changed from venue_id
  golfapi_course_id?: string;
  golfapi_long_course_id?: string;

  name: string;
  description?: string;
  num_holes: number;
  measure_unit?: 'm' | 'y';

  holes: Hole[]; // Still JSONB for hole par/strokeIndex
  holes_women?: Hole[];
  match_play_indexes?: number[];

  // Legacy - will be removed after tees migration verified
  tees?: TeeBox[];
  tees_migrated?: boolean;

  slope_rating?: number;
  course_rating?: number;

  golfapi_updated_at?: string;
  created_at: string;
  updated_at: string;
}

4. ADD HoleCoordinate TYPE:

export type PoiType = 'tee_front' | 'tee_back' | 'green_front' | 'green_center' | 'green_back';

export interface HoleCoordinate {
  id: string;
  course_id: string;
  hole_number: number;
  poi_type: PoiType;
  latitude: number;
  longitude: number;
  side_of_fairway?: string;
  created_at: string;
}

5. UPDATE Player TYPE:

export interface Player {
  // ...existing fields...
  home_club_id?: string; // Changed from home_venue_id
}

6. ADD COMPOSITE TYPES:

export interface ClubWithCourses extends Club {
  courses: Course[];
}

export interface CourseWithTees extends Course {
  tees: Tee[];
  club?: Club;
}

export interface CourseWithCoordinates extends Course {
  coordinates: HoleCoordinate[];
}

7. REMOVE/DEPRECATE:
- Remove Venue type (use Club)
- Remove VenueWithCourses (use ClubWithCourses)
- Keep TeeBox for backwards compatibility but mark deprecated

// @deprecated Use Tee type instead
export type TeeBox = {...};

// @deprecated Use Club type instead
export type Venue = Club;

// @deprecated Use ClubWithCourses type instead
export type VenueWithCourses = ClubWithCourses;
```

**Deliverables:**
- [ ] Club type created (replaces Venue)
- [ ] Tee type created (new)
- [ ] HoleCoordinate type created (new)
- [ ] Course type updated with club_id
- [ ] Player type updated with home_club_id
- [ ] Composite types updated
- [ ] Deprecated aliases added for backwards compatibility

**Dependencies:** Step 1.8
**Notes:** Keep deprecated aliases during transition period

---

### Step 2.2: Update GolfAPI.io Types
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the GolfAPI.io types to match the ACTUAL API response structure.

Modify file: src/services/api/golfApiTypes.ts

IMPORTANT: These types are based on ACTUAL API responses from v2.3, not CSV exports.
API URL: https://www.golfapi.io/api/v2.3

CHANGES:

1. API CONFIGURATION:

export const GOLFAPI_BASE_URL = 'https://www.golfapi.io/api/v2.3';
export const DEFAULT_COUNTRY = 'AUS';

2. CLUB RESPONSE (from GET /clubs/{clubId}):

// Nested course summary in club response
export interface GolfApiCourseSummary {
  courseID: string;
  courseName: string;
  numHoles: number;
  timestampUpdated: string;
  hasGPS: number; // 0 or 1
}

export interface GolfApiClubResponse {
  clubID: string;
  clubName: string;
  address?: string;
  city?: string;
  postalCode?: string;
  state?: string;
  country: string;
  latitude: string;  // NOTE: String, needs parseFloat()
  longitude: string; // NOTE: String, needs parseFloat()
  website?: string;
  telephone?: string;
  timestampUpdated: string;
  distance?: string; // Empty for non-geo searches
  courses: GolfApiCourseSummary[]; // Nested courses!
  apiRequestsLeft: string;
}

3. COURSE RESPONSE (from GET /courses/{courseId}):
   NOTE: Includes club info, tees array, and par/index arrays

export interface GolfApiTee {
  teeID: string;
  teeName: string;
  teeColor: string; // Hex color e.g., "#00CCFF"

  // Per-hole lengths (yards or meters based on course.measure)
  length1: number; length2: number; length3: number;
  length4: number; length5: number; length6: number;
  length7: number; length8: number; length9: number;
  length10: number; length11: number; length12: number;
  length13: number; length14: number; length15: number;
  length16: number; length17: number; length18: number;

  // Men's ratings
  courseRatingMen: number | string;  // Empty string "" if N/A
  slopeMen: number | string;
  courseRatingMenFront9: number | string;
  courseRatingMenBack9: number | string;
  slopeMenFront9: number | string;
  slopeMenBack9: number | string;

  // Women's ratings
  courseRatingWomen: number | string; // Empty string "" if N/A
  slopeWomen: number | string;
  courseRatingWomenFront9: number | string;
  courseRatingWomenBack9: number | string;
  slopeWomenFront9: number | string;
  slopeWomenBack9: number | string;
}

export interface GolfApiCourseResponse {
  // Club info (included in response)
  clubID: string;
  clubName: string;
  address?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country: string;
  latitude: string;
  longitude: string;
  website?: string;
  telephone?: string;

  // Course info
  courseID: string;
  courseName: string;
  numHoles: string;  // NOTE: String "18", needs parseInt()
  timestampUpdated: string;
  hasGPS: string;    // NOTE: String "1" or "0"
  measure: 'y' | 'm'; // yards or meters

  // Par and stroke index as ARRAYS (not individual fields!)
  parsMen: number[];      // [4, 5, 4, 4, 3, 5, 3, 4, 4, ...]
  indexesMen: number[];   // [6, 10, 12, 16, 14, 2, 18, 4, 8, ...]
  parsWomen: number[];
  indexesWomen: number[];

  // Tees (nested array!)
  numTees: number;
  tees: GolfApiTee[];

  // Coordinates info
  numCoordinates: number;
  oldCourseIDs?: string[];

  apiRequestsLeft: string;
}

4. COORDINATE RESPONSE (from GET /coordinates/{courseId}):
   NOTE: Uses NUMERIC codes for POI types, not strings!

// POI type codes (decoded from API patterns)
export enum GolfApiPoiType {
  Tee = 1,           // Tee box positions
  FairwayLeft = 2,   // Left side markers
  FairwayRight = 3,  // Right side markers
  Hazard = 4,        // Hazards/bunkers
  Layup = 5,         // Layup points
  Crossing = 6,      // Fairway crossing
  DoglegAim = 9,     // Dogleg aiming points
  GreenFront = 11,   // Front of green
  GreenCenter = 12,  // Center of green / pin
}

// Location codes
export enum GolfApiLocation {
  Front = 1,
  Center = 2,
  Back = 3,
}

// Side of fairway codes
export enum GolfApiSideFW {
  Left = 1,
  Center = 2,
  Right = 3,
}

export interface GolfApiCoordinate {
  poi: number;       // See GolfApiPoiType enum
  location: number;  // See GolfApiLocation enum
  sideFW: number;    // See GolfApiSideFW enum
  hole: number;      // 1-18
  latitude: number;  // NOTE: Number (unlike club lat/long!)
  longitude: number;
}

export interface GolfApiCoordinatesResponse {
  courseID: string;
  numCoordinates: number;
  coordinates: GolfApiCoordinate[];
  apiRequestsLeft: string;
}

5. SEARCH PARAMS (for club search):

export interface GolfApiSearchParams {
  query?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // km
}

6. HELPER TYPES:

// Parsed/normalized types for internal use
export interface ParsedClubLatLong {
  latitude: number;
  longitude: number;
}

// Type guard for empty string ratings
export function isValidRating(value: number | string): value is number {
  return typeof value === 'number' || (typeof value === 'string' && value !== '');
}
```

**Deliverables:**
- [ ] GolfApiClubResponse matches actual /clubs/{id} response (camelCase, nested courses)
- [ ] GolfApiCourseResponse matches actual /courses/{id} response (nested tees, par arrays)
- [ ] GolfApiTee matches nested tee structure
- [ ] GolfApiCoordinate uses numeric POI/location codes
- [ ] All field names use camelCase (matching actual API)
- [ ] String vs number types correctly specified

**Dependencies:** Step 1.8
**Notes:** Types based on actual API testing, not CSV exports. API uses camelCase not PascalCase.

---

### Step 2.3: Create GolfAPI.io Transformers
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the GolfAPI.io transformers to convert ACTUAL API responses to app types.

Modify file: src/services/api/golfApiTransformers.ts

IMPORTANT: These transformers match the ACTUAL v2.3 API structure (camelCase, arrays, nested data).

TRANSFORMERS TO CREATE/UPDATE:

1. transformApiClubResponse(apiClub: GolfApiClubResponse): Partial<Club>
   - Map clubID → golfapi_club_id
   - Map clubName → name
   - Map address → address
   - Map city → city
   - Map postalCode → postal_code
   - Map state → state (normalize to code if needed)
   - Map country → country
   - PARSE latitude/longitude strings → numbers (parseFloat)
   - Map website → website
   - Map telephone → phone
   - Set source: 'api'
   - NOTE: courses array handled separately

   Example:
   ```typescript
   export function transformApiClubResponse(apiClub: GolfApiClubResponse): Partial<Club> {
     return {
       golfapi_club_id: apiClub.clubID,
       name: apiClub.clubName,
       address: apiClub.address || undefined,
       city: apiClub.city || undefined,
       postal_code: apiClub.postalCode || undefined,
       state: normalizeAustralianState(apiClub.state || ''),
       country: apiClub.country,
       latitude: apiClub.latitude ? parseFloat(apiClub.latitude) : undefined,
       longitude: apiClub.longitude ? parseFloat(apiClub.longitude) : undefined,
       website: apiClub.website || undefined,
       phone: apiClub.telephone || undefined,
       source: 'api',
     };
   }
   ```

2. transformApiCourseResponse(apiCourse: GolfApiCourseResponse): { course: Partial<Course>; tees: Partial<Tee>[]; club: Partial<Club> }
   - Extract club info from response (it's included!)
   - Map courseID → golfapi_course_id
   - Map courseName → name (use "Main Course" if empty)
   - PARSE numHoles string → number (parseInt)
   - Map measure → measure_unit ('y' or 'm')
   - Transform parsMen[] + indexesMen[] arrays → holes JSONB
   - Transform parsWomen[] + indexesWomen[] arrays → holes_women JSONB
   - Extract nested tees[] array
   - Map timestampUpdated → golfapi_updated_at

   Example:
   ```typescript
   export function transformApiCourseResponse(apiCourse: GolfApiCourseResponse) {
     // Transform holes from arrays
     const holes = transformHolesFromArrays(
       apiCourse.parsMen,
       apiCourse.indexesMen,
       parseInt(apiCourse.numHoles)
     );
     const holesWomen = transformHolesFromArrays(
       apiCourse.parsWomen,
       apiCourse.indexesWomen,
       parseInt(apiCourse.numHoles)
     );

     // Transform club (included in course response)
     const club: Partial<Club> = {
       golfapi_club_id: apiCourse.clubID,
       name: apiCourse.clubName,
       // ... other club fields
     };

     // Transform course
     const course: Partial<Course> = {
       golfapi_course_id: apiCourse.courseID,
       name: apiCourse.courseName || 'Main Course',
       num_holes: parseInt(apiCourse.numHoles),
       measure_unit: apiCourse.measure,
       holes,
       holes_women: holesWomen,
     };

     // Transform tees
     const tees = apiCourse.tees.map(transformApiTee);

     return { course, tees, club };
   }
   ```

3. transformHolesFromArrays(pars: number[], indexes: number[], numHoles: number): Hole[]
   - Convert parsMen[]/indexesMen[] arrays to hole objects
   - Handle 9-hole courses (array length = 9)
   - Return array of: { number, par, strokeIndex }

   Example:
   ```typescript
   export function transformHolesFromArrays(
     pars: number[],
     indexes: number[],
     numHoles: number
   ): Hole[] {
     const holes: Hole[] = [];
     for (let i = 0; i < numHoles; i++) {
       holes.push({
         number: i + 1,
         par: pars[i] ?? 4,
         strokeIndex: indexes[i] ?? (i + 1),
       });
     }
     return holes;
   }
   ```

4. transformApiTee(apiTee: GolfApiTee): Partial<Tee>
   - Map teeID → golfapi_tee_id
   - Map teeName → name
   - Map teeColor → color
   - HANDLE empty string "" as undefined for ratings
   - Map slopeMen → slope (if not empty string)
   - Map courseRatingMen → course_rating (if not empty string)
   - Map length1-length18 → length_hole_1 through length_hole_18

   Example:
   ```typescript
   export function transformApiTee(apiTee: GolfApiTee): Partial<Tee> {
     const parseRating = (val: number | string): number | undefined =>
       typeof val === 'number' ? val : (val !== '' ? parseFloat(val) : undefined);

     return {
       golfapi_tee_id: apiTee.teeID,
       name: apiTee.teeName,
       color: apiTee.teeColor,
       slope: parseRating(apiTee.slopeMen),
       course_rating: parseRating(apiTee.courseRatingMen),
       slope_women: parseRating(apiTee.slopeWomen),
       course_rating_women: parseRating(apiTee.courseRatingWomen),
       // Per-hole lengths
       length_hole_1: apiTee.length1,
       length_hole_2: apiTee.length2,
       // ... through length_hole_18
       length_hole_18: apiTee.length18,
     };
   }
   ```

5. transformApiCoordinate(apiCoord: GolfApiCoordinate): Partial<HoleCoordinate> | null
   - Map hole → hole_number
   - Transform NUMERIC poi code → poi_type string:
     - 1 (Tee) + location 1 (Front) → 'tee_front'
     - 1 (Tee) + location 3 (Back) → 'tee_back'
     - 11 (GreenFront) → 'green_front'
     - 12 (GreenCenter) → 'green_center'
   - Map latitude, longitude (already numbers!)
   - Return null for non-essential POI types (fairway markers, hazards)

   Example:
   ```typescript
   export function transformApiCoordinate(apiCoord: GolfApiCoordinate): Partial<HoleCoordinate> | null {
     // Map numeric POI to our poi_type
     let poi_type: PoiType | null = null;

     if (apiCoord.poi === 1) { // Tee
       poi_type = apiCoord.location === 1 ? 'tee_front' :
                  apiCoord.location === 3 ? 'tee_back' : null;
     } else if (apiCoord.poi === 11) {
       poi_type = 'green_front';
     } else if (apiCoord.poi === 12) {
       poi_type = 'green_center';
     }

     if (!poi_type) return null; // Skip non-essential coordinates

     return {
       hole_number: apiCoord.hole,
       poi_type,
       latitude: apiCoord.latitude,
       longitude: apiCoord.longitude,
     };
   }
   ```

6. normalizeAustralianState(state: string): string
   - 'Victoria' → 'VIC'
   - 'New South Wales' → 'NSW'
   - 'Queensland' → 'QLD'
   - 'South Australia' → 'SA'
   - 'Western Australia' → 'WA'
   - 'Tasmania' → 'TAS'
   - 'Northern Territory' → 'NT'
   - 'Australian Capital Territory' → 'ACT'
   - Already code (2-3 chars) → return as-is
   - US states (CA, NY, etc.) → return as-is
   - Unknown → return as-is

HELPER FUNCTIONS:

7. parseApiTimestamp(timestamp: string): Date
   - Convert Unix timestamp string to Date

8. hasValidHoleData(holes: Hole[]): boolean
   - Return true if holes array has valid entries with par values

9. filterEssentialCoordinates(coords: GolfApiCoordinate[]): GolfApiCoordinate[]
   - Filter to only tee and green coordinates (poi 1, 11, 12)
```

**Deliverables:**
- [ ] transformApiClubResponse function (handles string lat/long)
- [ ] transformApiCourseResponse function (handles nested tees, par arrays)
- [ ] transformHolesFromArrays function (converts arrays to hole objects)
- [ ] transformApiTee function (handles empty string ratings)
- [ ] transformApiCoordinate function (handles numeric POI codes)
- [ ] normalizeAustralianState function
- [ ] Helper functions for timestamps and validation

**Dependencies:** Step 2.2
**Notes:** Key differences from plan: camelCase fields, nested data, arrays instead of individual fields, numeric POI codes

---

### Step 2.4: Add Transformer Unit Tests
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create comprehensive unit tests for GolfAPI.io transformers.

Create/Update file: src/services/api/__tests__/golfApiTransformers.test.ts

TEST CASES (updated for actual API structure):

1. transformApiClubResponse:
   - Maps camelCase fields correctly (clubID, clubName, etc.)
   - Parses string latitude/longitude to numbers
   - Handles missing optional fields
   - Sets source to 'api'
   - Normalizes state code ('CA' stays 'CA', 'Victoria' → 'VIC')

2. transformApiCourseResponse:
   - Returns { course, tees, club } object
   - Maps courseID to golfapi_course_id
   - Parses string numHoles to number
   - Maps measure ('y'/'m') to measure_unit
   - Extracts club info from response

3. transformHolesFromArrays:
   - Transforms parsMen[] array to holes with par values
   - Transforms indexesMen[] array to holes with strokeIndex
   - Handles 18-hole courses correctly
   - Handles 9-hole courses (shorter arrays)
   - Uses default par=4 for missing values

4. transformApiTee:
   - Maps teeID to golfapi_tee_id
   - Handles empty string "" ratings (converts to undefined)
   - Handles numeric ratings (preserves value)
   - Maps length1-length18 to length_hole_1-18
   - Preserves hex color value (#00CCFF)

5. transformApiCoordinate:
   - Transforms poi=1, location=1 to 'tee_front'
   - Transforms poi=1, location=3 to 'tee_back'
   - Transforms poi=11 to 'green_front'
   - Transforms poi=12 to 'green_center'
   - Returns null for poi=2,3,4,5,6,9 (non-essential)
   - Maps latitude/longitude (already numbers)

6. normalizeAustralianState:
   - 'Victoria' → 'VIC'
   - 'New South Wales' → 'NSW'
   - 'Queensland' → 'QLD'
   - 'South Australia' → 'SA'
   - 'Western Australia' → 'WA'
   - 'Tasmania' → 'TAS'
   - 'Northern Territory' → 'NT'
   - 'Australian Capital Territory' → 'ACT'
   - Case insensitive: 'victoria' → 'VIC'
   - Already code: 'VIC' → 'VIC'
   - Unknown: 'Unknown State' → 'Unknown State'

7. Validation helpers:
   - hasHoleData returns true for 18 valid holes
   - hasHoleData returns false for empty/incomplete
   - hasTeeData returns true for non-empty tees
   - hasCoordinateData returns true for non-empty coords
```

**Deliverables:**
- [ ] Test file created/updated
- [ ] All transformer functions tested
- [ ] Edge cases covered
- [ ] Tests passing

**Dependencies:** Step 2.3
**Notes:** Run with `pnpm test golfApiTransformers`

---

## Phase 3: Rename Files and Update Imports

### Step 3.1: Rename Hook Files
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Rename venue-related hook files to club-related.

FILES TO RENAME:

1. src/hooks/useVenues.ts → src/hooks/useClubs.ts
2. src/hooks/useVenueDetails.ts → src/hooks/useClubDetails.ts
3. src/hooks/useHomeVenue.ts → src/hooks/useHomeClub.ts

For each file:
1. Rename the file using git mv (preserves history)
2. Update all internal references from venue → club
3. Rename exported functions:
   - useVenuesWithCourses → useClubsWithCourses
   - useSearchVenues → useSearchClubs
   - useVenueCourseDisplayItems → useClubCourseDisplayItems
   - useFavoriteCoursesWithVenues → useFavoriteCoursesWithClubs
   - useCreateVenue → useCreateClub
   - useCreateVenueWithCourse → useCreateClubWithCourse
   - useVenueDetails → useClubDetails
   - useHomeVenue → useHomeClub
   - useSetHomeVenue → useSetHomeClub
   - useClearHomeVenue → useClearHomeClub
4. Update Supabase queries to use 'clubs' table
5. Update query keys to reference 'clubs'

ALSO UPDATE:
- src/hooks/index.ts - Update exports
- src/hooks/queryKeys.ts - Rename venueKeys → clubKeys
```

**Deliverables:**
- [ ] useVenues.ts renamed to useClubs.ts
- [ ] useVenueDetails.ts renamed to useClubDetails.ts
- [ ] useHomeVenue.ts renamed to useHomeClub.ts
- [ ] All function names updated
- [ ] All Supabase queries updated
- [ ] Query keys updated
- [ ] Index exports updated

**Dependencies:** Step 2.1
**Notes:** Use `git mv` to preserve file history

---

### Step 3.2: Rename Component Files
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Rename venue-related component files to club-related.

FILES TO RENAME:

1. src/components/courses/VenueCard.tsx → src/components/courses/ClubCard.tsx
2. src/components/courses/VenueCard.test.tsx → src/components/courses/ClubCard.test.tsx
3. src/components/courses/VenueCard.stories.tsx → src/components/courses/ClubCard.stories.tsx

For each file:
1. Rename the file using git mv
2. Rename component: VenueCard → ClubCard
3. Rename props interface: VenueCardProps → ClubCardProps
4. Update internal venue → club references
5. Update imports in consuming files

ALSO CHECK FOR:
- Any VenueList components
- Any VenueSearch components
- Update component index exports
```

**Deliverables:**
- [ ] VenueCard.tsx renamed to ClubCard.tsx
- [ ] Test and stories files renamed
- [ ] Component name updated throughout
- [ ] Props interface renamed
- [ ] All imports updated

**Dependencies:** Step 3.1
**Notes:** Search for all VenueCard imports and update

---

### Step 3.3: Rename Screen Files
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Rename venue-related screen files to club-related.

FILES TO RENAME:

1. src/screens/courses/VenueScreen.tsx → src/screens/courses/ClubScreen.tsx

IF THEY EXIST, ALSO RENAME:
- VenueListScreen.tsx → ClubListScreen.tsx
- VenueDetailScreen.tsx → ClubDetailScreen.tsx

For each file:
1. Rename the file using git mv
2. Update component name
3. Update navigation route name if registered
4. Update internal venue → club references

UPDATE NAVIGATION:
- Check src/navigation/ for route registrations
- Update route names: 'Venue' → 'Club', 'VenueDetail' → 'ClubDetail'
- Update screen component references

UPDATE NAVIGATION TYPES:
- src/navigation/types.ts:
  - 'Venue: { venueId: string }' → 'Club: { clubId: string }'
  - 'Course: { courseId: string; venueId?: string }' → 'Course: { courseId: string; clubId?: string }'
```

**Deliverables:**
- [ ] VenueScreen.tsx renamed to ClubScreen.tsx
- [ ] Navigation routes updated
- [ ] Screen component names updated
- [ ] All navigation references updated

**Dependencies:** Step 3.2
**Notes:** Navigation changes may require testing

---

### Step 3.4: Rename Profile/Onboarding Components
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Rename home venue components to home club.

FILES TO RENAME:

1. src/screens/profile/components/HomeVenueSection.tsx → HomeClubSection.tsx
2. src/screens/profile/components/HomeVenueModal.tsx → HomeClubModal.tsx
3. src/screens/onboarding/components/HomeVenueStep.tsx → HomeClubStep.tsx

For each file:
1. Rename the file using git mv
2. Update component name
3. Update props interfaces
4. Update internal venue → club references
5. Update hook imports (useHomeVenue → useHomeClub)

ALSO UPDATE:
- Parent components that import these
- ProfileScreen.tsx
- Onboarding flow files
```

**Deliverables:**
- [ ] HomeVenueSection.tsx renamed to HomeClubSection.tsx
- [ ] HomeVenueModal.tsx renamed to HomeClubModal.tsx
- [ ] HomeVenueStep.tsx renamed to HomeClubStep.tsx
- [ ] All component names updated
- [ ] All imports updated in parent components

**Dependencies:** Step 3.1
**Notes:** These are user-facing components - verify UI text also updated

---

### Step 3.5: Update Query Keys
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update all query keys from venue to club terminology.

Modify file: src/hooks/queryKeys.ts

CHANGES:

1. Rename venueKeys object:

// Before
export const venueKeys = {
  all: ['venues'] as const,
  lists: () => [...venueKeys.all, 'list'] as const,
  // etc
};

// After
export const clubKeys = {
  all: ['clubs'] as const,
  lists: () => [...clubKeys.all, 'list'] as const,
  list: (filters: ClubFilters) => [...clubKeys.lists(), filters] as const,
  details: () => [...clubKeys.all, 'detail'] as const,
  detail: (id: string) => [...clubKeys.details(), id] as const,
  search: (query: string) => [...clubKeys.all, 'search', query] as const,
  withCourses: () => [...clubKeys.all, 'with-courses'] as const,
  homeClub: (playerId: string) => [...clubKeys.all, 'home', playerId] as const,
};

2. Add deprecated alias:
// @deprecated Use clubKeys instead
export const venueKeys = clubKeys;

3. Update any other query key references:
- courseKeys references to venues → clubs
- favoriteKeys if they reference venues
```

**Deliverables:**
- [ ] venueKeys renamed to clubKeys
- [ ] All key strings updated ('venues' → 'clubs')
- [ ] Deprecated alias added
- [ ] All consuming hooks updated

**Dependencies:** Step 3.1
**Notes:** Query key changes will invalidate existing cache

---

### Step 3.6: Global Search and Replace
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Perform global search and replace for remaining venue references.

SEARCH PATTERNS (case-sensitive):

1. Type references:
   - 'Venue' → 'Club' (in type names)
   - 'VenueWithCourses' → 'ClubWithCourses'
   - 'HomeVenueWithCourses' → 'HomeClubWithCourses'
   - 'VenueCourseDisplayItem' → 'ClubCourseDisplayItem'
   - 'CreateVenueInput' → 'CreateClubInput'

2. Variable names:
   - 'venue' → 'club' (variable names)
   - 'venues' → 'clubs' (arrays)
   - 'venueId' → 'clubId'
   - 'venueIds' → 'clubIds'
   - 'homeVenue' → 'homeClub'
   - 'selectedVenue' → 'selectedClub'

3. Database columns:
   - 'venue_id' → 'club_id'
   - 'home_venue_id' → 'home_club_id'

4. UI strings (in JSX):
   - 'venue' → 'club'
   - 'Venue' → 'Club'
   - 'Home Venue' → 'Home Club'
   - 'Select Venue' → 'Select Club'

5. Comments and documentation:
   - Update any comments referencing venues

FILES TO CHECK:
- All .ts and .tsx files in src/
- All .md files in docs/
- README.md
- CLAUDE.md

TYPE FILES (Critical - define interfaces):
- src/types/database/course.types.ts - Venue interface, CourseWithVenue
- src/types/supabase/roundQueries.ts - venue_id references
- src/navigation/types.ts - Venue route params (venueId)

HOOKS (Additional):
- src/hooks/useGenerateAICompetition.ts - venue references
- src/hooks/useCourseDetails.ts - venue references

SERVICES:
- src/services/achievements/achievementChecker.ts - home_venue references

TEST FILES:
- src/__tests__/utils/testFixtures.ts - homeVenue mock data

EXCLUDE:
- node_modules/
- Archive tables (keep venue references for historical clarity)
- Git history
```

**Deliverables:**
- [ ] All type references updated
- [ ] All variable names updated
- [ ] All database column references updated
- [ ] All UI strings updated
- [ ] Documentation updated

**Dependencies:** Steps 3.1-3.5
**Notes:** Review each change carefully - some "venue" references may be intentional

---

## Phase 4: Update Service Layer

### Step 4.1: Create Tees Service
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a service for managing tee data from the new tees table.

Create file: src/services/courses/teesService.ts

SERVICE METHODS:

1. getTeesByCourse(courseId: string): Promise<Tee[]>
   - Query tees table by course_id
   - Order by slope descending (longer tees first)
   - Return array of Tee objects

2. getTeeById(teeId: string): Promise<Tee | null>
   - Query single tee by id
   - Return Tee or null

3. getTeeByGolfApiId(golfapiTeeId: string): Promise<Tee | null>
   - Query by golfapi_tee_id
   - For deduplication during import

4. cacheTees(courseId: string, tees: Partial<Tee>[]): Promise<Tee[]>
   - Upsert tees for a course
   - Match by golfapi_tee_id if present
   - Return cached tees with IDs

5. deleteTeesByCourse(courseId: string): Promise<void>
   - Delete all tees for a course
   - Used when refreshing course data

HELPER METHODS:

6. calculateTotalLength(tee: Partial<Tee>): number
   - Sum length_hole_1 through length_hole_18
   - Handle nulls as 0

7. getTeeColor(teeName: string): string
   - Map common tee names to hex colors
   - 'Blue' → '#0066CC'
   - 'White' → '#FFFFFF'
   - 'Red' → '#CC0000'
   - 'Yellow' → '#FFCC00'
   - 'Black' → '#000000'
   - 'Gold' → '#FFD700'
   - Default → '#808080'

Export singleton: export const teesService = new TeesService();
```

**Deliverables:**
- [ ] teesService.ts created
- [ ] All CRUD methods implemented
- [ ] Upsert logic for caching
- [ ] Helper methods for calculations
- [ ] Proper error handling

**Dependencies:** Step 1.4, Step 2.1
**Notes:** This replaces the embedded tees JSONB handling

---

### Step 4.2: Create Coordinates Service
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a service for managing hole coordinate data.

Create file: src/services/courses/coordinatesService.ts

SERVICE METHODS:

1. getCoordinatesByCourse(courseId: string): Promise<HoleCoordinate[]>
   - Query hole_coordinates by course_id
   - Order by hole_number, poi_type
   - Return array of HoleCoordinate

2. getCoordinatesByHole(courseId: string, holeNumber: number): Promise<HoleCoordinate[]>
   - Query coordinates for specific hole
   - Returns all POIs for that hole (tee front/back, green front/center/back)

3. getGreenCenter(courseId: string, holeNumber: number): Promise<HoleCoordinate | null>
   - Get green center coordinate for a hole
   - Used for distance-to-pin calculations

4. getTeeBack(courseId: string, holeNumber: number): Promise<HoleCoordinate | null>
   - Get back tee coordinate for a hole
   - Used for hole length calculations

5. cacheCoordinates(courseId: string, coordinates: Partial<HoleCoordinate>[]): Promise<void>
   - Upsert coordinates for a course
   - Match by (course_id, hole_number, poi_type) unique constraint
   - Use ON CONFLICT DO UPDATE

6. deleteCoordinatesByCourse(courseId: string): Promise<void>
   - Delete all coordinates for a course
   - Used when refreshing course data

HELPER METHODS:

7. calculateDistance(from: HoleCoordinate, to: HoleCoordinate): number
   - Calculate distance in meters between two points
   - Use Haversine formula or PostGIS ST_Distance

8. hasCompleteCoordinates(courseId: string): Promise<boolean>
   - Check if course has coordinates for all holes
   - At minimum: tee_back and green_center for each hole

Export singleton: export const coordinatesService = new CoordinatesService();
```

**Deliverables:**
- [ ] coordinatesService.ts created
- [ ] All query methods implemented
- [ ] Upsert with conflict handling
- [ ] Distance calculation helper
- [ ] Completeness check method

**Dependencies:** Step 1.5, Step 2.1
**Notes:** GPS coordinates enable future features like shot tracking

---

### Step 4.3: Update Cache Service
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the cache service for the clubs rename and new structure.

Modify file: src/services/courses/cacheService.ts

RENAME METHODS:
- Any venue references → club references

ADD NEW METHODS:

1. cacheClub(club: Partial<Club>): Promise<Club>
   - Upsert club by golfapi_club_id or id
   - Set source to 'api' if from GolfAPI.io
   - Set last_synced to current timestamp
   - Return cached club with ID

2. getCachedClubByGolfApiId(golfapiId: string): Promise<Club | null>
   - Query clubs by golfapi_club_id
   - Return null if not found

3. getCachedClubById(id: string): Promise<Club | null>
   - Query clubs by id
   - Include courses relation

4. searchCachedClubs(params: ClubSearchParams): Promise<ClubSearchResult>
   - Search clubs by name, state, city
   - Support pagination
   - Return with total count

UPDATE EXISTING METHODS:

5. cacheCourse() - Update to:
   - Accept club_id (not venue_id)
   - NOT cache tees (use teesService instead)
   - Update last_synced on parent club

6. getCachedCourse() - Update to:
   - Join with clubs table (not venues)
   - Optionally include tees from tees table

7. getCachedCourseByApiId() - Update to:
   - Check golfapi_course_id column
   - Join with clubs

REMOVE:
- Any deprecated venue-specific methods
- Old tees JSONB handling (moved to teesService)

UPDATE TYPES:
- VenueSearchParams → ClubSearchParams
- VenueSearchResult → ClubSearchResult
```

**Deliverables:**
- [ ] All venue references renamed to club
- [ ] cacheClub() method added
- [ ] getCachedClubByGolfApiId() method added
- [ ] cacheCourse() updated for club_id
- [ ] Tees handling delegated to teesService
- [ ] Search methods updated

**Dependencies:** Step 4.1, Step 4.2
**Notes:** This is a significant refactor of the cache layer

---

### Step 4.4: Update Course Service
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the course service for the new data model.

Modify file: src/services/courses/courseService.ts

IMPORT UPDATES:
- Update type imports (Club, Tee, HoleCoordinate)
- Import teesService, coordinatesService

UPDATE searchCourses():
- Rename venue references to club
- Search clubs table instead of venues
- Return ClubSearchResult

UPDATE importCourse():
- Accept GolfAPI club and course data
- Create/update club using cacheService.cacheClub()
- Create/update course using cacheService.cacheCourse()
- Create/update tees using teesService.cacheTees()
- Optionally cache coordinates

NEW METHOD: importClubWithCourses():
- Import a club with all its courses
- For each course, import tees
- Return { club, courses, tees }

UPDATE getCourseWithDetails():
- Fetch tees from tees table (not JSONB)
- Optionally fetch coordinates
- Return CourseWithTees

UPDATE refreshCourseData():
- Refresh from GolfAPI.io
- Update club, course, tees
- Optionally update coordinates

RENAME:
- Any venue parameter names → club
- Return types using Venue → Club

TYPES:

interface ImportClubResult {
  club: Club;
  courses: Course[];
  tees: Tee[];
  created: boolean;
}

interface CourseWithDetails extends Course {
  club: Club;
  tees: Tee[];
  coordinates?: HoleCoordinate[];
}
```

**Deliverables:**
- [ ] All venue references renamed to club
- [ ] searchCourses() returns clubs
- [ ] importCourse() creates club, course, tees separately
- [ ] importClubWithCourses() method added
- [ ] getCourseWithDetails() fetches from tees table
- [ ] All types updated

**Dependencies:** Step 4.1, Step 4.2, Step 4.3
**Notes:** This orchestrates the new separated data model

---

### Step 4.5: Update GolfAPI Client
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the GolfAPI.io client for ACTUAL v2.3 API endpoints.

Modify file: src/services/api/golfApiClient.ts

IMPORTANT: API URL is https://www.golfapi.io/api/v2.3 (not api.golfapi.io/v1)
Auth: Bearer token in Authorization header

VERIFIED ENDPOINTS (from actual testing):

1. GET /clubs/{clubId}
   - Returns: GolfApiClubResponse
   - INCLUDES nested courses[] array (no separate endpoint needed!)

2. GET /courses/{courseId}
   - Returns: GolfApiCourseResponse
   - INCLUDES club info, parsMen[], indexesMen[], tees[] (no separate endpoints!)

3. GET /coordinates/{courseId}
   - Returns: GolfApiCoordinatesResponse
   - Coordinates with numeric POI codes

4. Search endpoint - TBD (need to verify)

UPDATE METHODS:

1. getClub(clubId: string): Promise<GolfApiClubResponse>
   - Endpoint: /clubs/{clubId}
   - Response includes nested courses array
   - No need for separate getClubCourses() method!

2. getCourse(courseId: string): Promise<GolfApiCourseResponse>
   - Endpoint: /courses/{courseId}
   - Response includes:
     - Club info (clubID, clubName, etc.)
     - Course info (par arrays, stroke index arrays)
     - Nested tees[] array with ratings and lengths
   - No need for separate getCourseTees() method!

3. getCoordinates(courseId: string): Promise<GolfApiCoordinatesResponse>
   - Endpoint: /coordinates/{courseId}
   - Response: coordinates array with numeric POI codes

4. searchClubs(params: GolfApiSearchParams): Promise<GolfApiClubResponse[]>
   - Endpoint: TBD - verify search endpoint structure

UPDATE CLIENT CONFIG:

const GOLFAPI_BASE_URL = process.env.EXPO_PUBLIC_GOLFAPI_IO_URL;
// Should be: https://www.golfapi.io/api/v2.3

const getAuthHeaders = () => ({
  'Authorization': \`Bearer \${process.env.EXPO_PUBLIC_GOLFAPI_IO_KEY}\`,
  'Content-Type': 'application/json',
});

ADD ERROR HANDLING:
- Handle 404 for missing resources
- Handle rate limiting (429)
- Handle authentication errors (401, 403)
- Track apiRequestsLeft from responses
```

**Deliverables:**
- [ ] Base URL updated to v2.3
- [ ] getClub() returns nested courses
- [ ] getCourse() returns nested tees and par arrays
- [ ] getCoordinates() handles numeric POI codes
- [ ] Bearer token auth configured
- [ ] Error handling for all endpoints

**Dependencies:** Step 2.2
**Notes:** Nested responses mean fewer API calls needed - courses in club, tees in course

---

## Phase 5: Update React Query Hooks

### Step 5.1: Update useClubs Hook
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the renamed useClubs hook (formerly useVenues).

Modify file: src/hooks/useClubs.ts

RENAME ALL FUNCTIONS:
- useVenuesWithCourses → useClubsWithCourses
- useSearchVenues → useSearchClubs
- useVenueCourseDisplayItems → useClubCourseDisplayItems
- useFavoriteCoursesWithVenues → useFavoriteCoursesWithClubs
- useCreateVenue → useCreateClub
- useCreateVenueWithCourse → useCreateClubWithCourse

UPDATE QUERIES:
- .from('venues') → .from('clubs')
- .select('*, courses(*)') - verify join works
- Query key: clubKeys.* instead of venueKeys.*

UPDATE TYPES:
- Return type: Club instead of Venue
- ClubWithCourses instead of VenueWithCourses
- Update all parameter and return types

UPDATE useClubsWithCourses():
```typescript
export function useClubsWithCourses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clubKeys.withCourses(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select(`
          *,
          courses (
            id, name, num_holes, golfapi_course_id
          )
        `)
        .order('name');

      if (error) throw error;
      return data as ClubWithCourses[];
    },
    enabled: options?.enabled ?? true,
  });
}
```

ALSO UPDATE:
- useSearchClubs - search clubs table
- useCreateClub - insert into clubs table
- useCreateClubWithCourse - create club then course
```

**Deliverables:**
- [ ] All functions renamed
- [ ] All queries updated for clubs table
- [ ] All types updated
- [ ] Query keys using clubKeys
- [ ] Tests updated

**Dependencies:** Step 3.1, Step 3.5
**Notes:** This is the main clubs data hook

---

### Step 5.2: Create useTees Hook
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a hook for fetching tee data from the new tees table.

Create file: src/hooks/useTees.ts

HOOKS TO CREATE:

1. useTeesByCourse(courseId: string, options?):
```typescript
export function useTeesByCourse(
  courseId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: teeKeys.byCourse(courseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tees')
        .select('*')
        .eq('course_id', courseId)
        .order('slope', { ascending: false });

      if (error) throw error;
      return data as Tee[];
    },
    enabled: options?.enabled ?? !!courseId,
  });
}
```

2. useTeeById(teeId: string):
   - Query single tee by id
   - Return Tee | null

3. useTeesWithCourse(courseId: string):
   - Fetch tees with parent course info
   - Useful for tee selection UI

4. useCreateTee():
   - Mutation to create a new tee
   - Invalidate teeKeys.byCourse

5. useUpdateTee():
   - Mutation to update a tee
   - Invalidate teeKeys.byCourse and teeKeys.detail

6. useDeleteTee():
   - Mutation to delete a tee
   - Invalidate teeKeys.byCourse

QUERY KEYS (add to queryKeys.ts):
```typescript
export const teeKeys = {
  all: ['tees'] as const,
  byCourse: (courseId: string) => [...teeKeys.all, 'course', courseId] as const,
  detail: (id: string) => [...teeKeys.all, 'detail', id] as const,
};
```
```

**Deliverables:**
- [ ] useTees.ts created
- [ ] useTeesByCourse hook
- [ ] useTeeById hook
- [ ] Mutation hooks for CRUD
- [ ] Query keys added
- [ ] Proper query invalidation

**Dependencies:** Step 4.1
**Notes:** Export all hooks from src/hooks/index.ts

---

### Step 5.3: Create useHoleCoordinates Hook
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Create a hook for fetching hole coordinate data.

Create file: src/hooks/useHoleCoordinates.ts

HOOKS TO CREATE:

1. useHoleCoordinates(courseId: string):
   - Fetch all coordinates for a course
   - Group by hole_number for easy access
   - Return HoleCoordinate[]

2. useHoleCoordinatesByHole(courseId: string, holeNumber: number):
   - Fetch coordinates for a specific hole
   - Return { teeFront, teeBack, greenFront, greenCenter, greenBack }

3. useGreenCoordinate(courseId: string, holeNumber: number):
   - Fetch just green center coordinate
   - For distance-to-pin display

4. useTeeCoordinate(courseId: string, holeNumber: number):
   - Fetch tee back coordinate
   - For hole distance display

5. useDistanceToGreen(courseId: string, holeNumber: number, userLocation?: { lat: number, lng: number }):
   - Calculate distance from user location to green center
   - Return distance in meters/yards

QUERY KEYS:
```typescript
export const coordinateKeys = {
  all: ['coordinates'] as const,
  byCourse: (courseId: string) => [...coordinateKeys.all, 'course', courseId] as const,
  byHole: (courseId: string, hole: number) => [...coordinateKeys.byCourse(courseId), 'hole', hole] as const,
};
```

HELPER TYPE:
```typescript
interface HoleCoordinateSet {
  tee_front?: HoleCoordinate;
  tee_back?: HoleCoordinate;
  green_front?: HoleCoordinate;
  green_center?: HoleCoordinate;
  green_back?: HoleCoordinate;
}
```
```

**Deliverables:**
- [ ] useHoleCoordinates.ts created
- [ ] All coordinate hooks implemented
- [ ] Distance calculation hook
- [ ] Query keys added
- [ ] Helper types defined

**Dependencies:** Step 4.2
**Notes:** GPS features are optional - hooks should handle missing data gracefully

---

### Step 5.4: Update useHomeClub Hook
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the renamed useHomeClub hook (formerly useHomeVenue).

Modify file: src/hooks/useHomeClub.ts

RENAME FUNCTIONS:
- useHomeVenue → useHomeClub
- useSetHomeVenue → useSetHomeClub
- useClearHomeVenue → useClearHomeClub

UPDATE QUERIES:
- Column: home_venue_id → home_club_id
- Table joins: venues → clubs
- Query keys: clubKeys.homeClub

UPDATE useHomeClub():
```typescript
export function useHomeClub(playerId?: string) {
  const { user } = useAuth();
  const effectivePlayerId = playerId || user?.id;

  return useQuery({
    queryKey: clubKeys.homeClub(effectivePlayerId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select(`
          home_club_id,
          home_club:clubs!home_club_id (
            id, name, city, state,
            courses (id, name, num_holes)
          )
        `)
        .eq('id', effectivePlayerId)
        .single();

      if (error) throw error;
      return data?.home_club as ClubWithCourses | null;
    },
    enabled: !!effectivePlayerId,
  });
}
```

UPDATE useSetHomeClub():
```typescript
export function useSetHomeClub() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (clubId: string) => {
      const { error } = await supabase
        .from('players')
        .update({ home_club_id: clubId })
        .eq('id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clubKeys.homeClub(user!.id) });
    },
  });
}
```
```

**Deliverables:**
- [ ] All functions renamed
- [ ] Queries use home_club_id column
- [ ] Joins use clubs table
- [ ] Query keys updated
- [ ] Mutations invalidate correct keys

**Dependencies:** Step 3.1, Step 5.1
**Notes:** Home club is a personalization feature

---

### Step 5.5: Update useCourseDetails Hook
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update useCourseDetails to fetch tees from the new table.

Modify file: src/hooks/useCourseDetails.ts

UPDATE useCourseDetails():
- Fetch club (not venue) relationship
- Fetch tees from tees table (not JSONB)
- Return CourseWithDetails type

```typescript
export function useCourseDetails(courseId: string, options?: { includeTees?: boolean }) {
  const { includeTees = true } = options ?? {};

  return useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: async () => {
      // Fetch course with club
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          club:clubs!club_id (*)
        `)
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Fetch tees separately if requested
      let tees: Tee[] = [];
      if (includeTees) {
        const { data: teesData, error: teesError } = await supabase
          .from('tees')
          .select('*')
          .eq('course_id', courseId)
          .order('slope', { ascending: false });

        if (teesError) throw teesError;
        tees = teesData ?? [];
      }

      return {
        ...course,
        tees,
      } as CourseWithDetails;
    },
    enabled: !!courseId,
  });
}

interface CourseWithDetails extends Course {
  club: Club;
  tees: Tee[];
}
```

ALSO UPDATE:
- Any venue references → club
- Return type includes Tee[] from table
- Optional coordinates fetching
```

**Deliverables:**
- [ ] club relationship (not venue)
- [ ] Tees fetched from tees table
- [ ] CourseWithDetails type updated
- [ ] Optional coordinates support

**Dependencies:** Step 5.2
**Notes:** Tees are now a separate query/table

---

### Step 5.6: Update useFavoriteCourses Hook
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update useFavoriteCourses to use clubs instead of venues.

Modify file: src/hooks/useFavoriteCourses.ts

UPDATE QUERIES:
- Join with clubs table (not venues)
- Select club info with courses

```typescript
export function useFavoriteCourses(playerId?: string) {
  const { user } = useAuth();
  const effectivePlayerId = playerId || user?.id;

  return useQuery({
    queryKey: favoriteKeys.list(effectivePlayerId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorite_courses')
        .select(`
          id,
          course_id,
          course:courses!course_id (
            id,
            name,
            num_holes,
            club:clubs!club_id (
              id,
              name,
              city,
              state
            )
          )
        `)
        .eq('player_id', effectivePlayerId);

      if (error) throw error;
      return data;
    },
    enabled: !!effectivePlayerId,
  });
}
```

RENAME FUNCTION (if exists):
- useFavoriteCoursesWithVenues → useFavoriteCoursesWithClubs
```

**Deliverables:**
- [ ] Queries join with clubs (not venues)
- [ ] Function names updated
- [ ] Return types include club info

**Dependencies:** Step 5.1
**Notes:** Favorites are course-level, but include club info for display

---

## Phase 6: Update UI Components

### Step 6.1: Update ClubCard Component
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the renamed ClubCard component (formerly VenueCard).

Modify file: src/components/courses/ClubCard.tsx

RENAME:
- VenueCard → ClubCard
- VenueCardProps → ClubCardProps
- venue prop → club prop

UPDATE PROPS:
```typescript
interface ClubCardProps {
  club: Club | ClubWithCourses;
  onPress?: (club: Club) => void;
  showCourseCount?: boolean;
  showSource?: boolean;  // NEW: show API/Manual badge
}
```

UPDATE CONTENT:
- Display club.name (was venue.name)
- Display club.city, club.state
- Show course count if ClubWithCourses
- NEW: Show source badge (API/Manual/Legacy)
- NEW: Show golfapi_club_id indicator for debugging

SOURCE BADGE:
```typescript
{showSource && (
  <Badge
    size="sm"
    variant={club.source === 'api' ? 'success' : 'default'}
  >
    {club.source === 'api' ? 'API' : club.source === 'legacy' ? 'Legacy' : 'Manual'}
  </Badge>
)}
```

UPDATE STYLES:
- No major style changes needed
- Ensure badge fits in card layout
```

**Deliverables:**
- [ ] Component renamed to ClubCard
- [ ] Props interface updated
- [ ] Source badge added
- [ ] All venue references → club
- [ ] Tests updated

**Dependencies:** Step 3.2
**Notes:** This is the main club display component

---

### Step 6.2: Update ClubScreen
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the renamed ClubScreen (formerly VenueScreen).

Modify file: src/screens/courses/ClubScreen.tsx

RENAME:
- VenueScreen → ClubScreen
- All venue references → club

UPDATE HOOKS:
- useVenueDetails → useClubDetails
- Import from useClubs

UPDATE CONTENT:
- Display club details (name, address, city, state)
- List courses at the club
- For each course, show tee count

ADD NEW SECTIONS:

1. Data Source Section:
```typescript
<Section title="Data Source">
  <Text>Source: {club.source === 'api' ? 'GolfAPI.io' : 'Manual'}</Text>
  {club.last_synced && (
    <Text>Last updated: {formatDate(club.last_synced)}</Text>
  )}
  {club.source === 'api' && (
    <Button onPress={handleRefresh}>Refresh from API</Button>
  )}
</Section>
```

2. Courses List:
```typescript
<Section title="Courses">
  {courses.map(course => (
    <CourseListItem
      key={course.id}
      course={course}
      teeCount={course.tees?.length ?? 0}
      onPress={() => navigateToCourse(course.id)}
    />
  ))}
</Section>
```

UPDATE NAVIGATION:
- Route params: clubId (was venueId)
- Navigate to CourseDetailScreen with courseId
```

**Deliverables:**
- [ ] Screen renamed and updated
- [ ] Data source section added
- [ ] Courses list with tee counts
- [ ] Refresh from API functionality
- [ ] Navigation updated

**Dependencies:** Step 3.3, Step 5.1
**Notes:** ClubScreen is the detail view for a single club

---

### Step 6.3: Update CourseDetailScreen
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update CourseDetailScreen to use tees from the new table.

Modify file: src/screens/courses/CourseDetailScreen/index.tsx

UPDATE HOOKS:
- Use useCourseDetails with { includeTees: true }
- Use useHoleCoordinates for GPS data (optional)
- Import from useClubs for club info

UPDATE DATA FETCHING:
```typescript
const { data: course, isLoading } = useCourseDetails(courseId, {
  includeTees: true,
});
const { data: coordinates } = useHoleCoordinates(courseId);
```

UPDATE DISPLAY:

1. Club Info (was Venue Info):
```typescript
<Section title="Club">
  <Text>{course.club.name}</Text>
  <Text>{course.club.city}, {course.club.state}</Text>
</Section>
```

2. Tees Section (from tees table):
```typescript
<Section title="Tees">
  {course.tees.map(tee => (
    <TeeRow
      key={tee.id}
      tee={tee}
      showLength={true}
      showRatings={true}
    />
  ))}
  {course.tees.length === 0 && (
    <Text>No tee information available</Text>
  )}
</Section>
```

3. Hole Data Section:
```typescript
<Section title="Scorecard">
  {course.holes.length === 18 ? (
    <ScorecardTable holes={course.holes} />
  ) : (
    <Text>Hole data not available for this course</Text>
  )}
</Section>
```

4. Coordinates Section (optional):
```typescript
{coordinates && coordinates.length > 0 && (
  <Section title="GPS Data">
    <Text>{coordinates.length} coordinate points available</Text>
  </Section>
)}
```
```

**Deliverables:**
- [ ] Tees fetched from tees table
- [ ] Club info displayed (not venue)
- [ ] Coordinates section (optional)
- [ ] Handle missing data gracefully
- [ ] TeeRow component for tee display

**Dependencies:** Step 5.5, Step 5.3
**Notes:** This is the main course detail view

---

### Step 6.4: Update CourseListScreen
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update CourseListScreen for clubs rename.

Modify file: src/screens/courses/CourseListScreen.tsx

UPDATE HOOKS:
- useVenuesWithCourses → useClubsWithCourses
- useSearchVenues → useSearchClubs
- Import from useClubs

UPDATE DISPLAY:
- Map over clubs (not venues)
- Use ClubCard component
- Show course count per club

ADD FEATURES:

1. Source Filter (optional):
```typescript
const [sourceFilter, setSourceFilter] = useState<'all' | 'api' | 'manual'>('all');

const filteredClubs = useMemo(() => {
  if (sourceFilter === 'all') return clubs;
  return clubs.filter(c => c.source === sourceFilter);
}, [clubs, sourceFilter]);
```

2. API Search Integration:
```typescript
// When search query is 3+ characters, also search API
const { data: apiResults } = useApiClubSearch(searchQuery, {
  enabled: searchQuery.length >= 3 && showApiSearch,
});
```

3. Import Button on API Results:
```typescript
{apiResults?.map(apiClub => (
  <ClubCard
    key={apiClub.clubID}
    club={transformApiClubResponse(apiClub)}
    onPress={() => handleImportClub(apiClub)}
    showImportButton
  />
))}
```

UPDATE NAVIGATION:
- Navigate to ClubScreen (was VenueScreen)
- Pass clubId (was venueId)
```

**Deliverables:**
- [ ] All venue references → club
- [ ] Hooks updated
- [ ] Source filter (optional)
- [ ] API search integration
- [ ] Import flow for API results
- [ ] Navigation updated

**Dependencies:** Step 6.1, Step 5.1
**Notes:** This is the main clubs list screen

---

### Step 6.5: Update HomeClubSection
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the renamed HomeClubSection (formerly HomeVenueSection).

Modify file: src/screens/profile/components/HomeClubSection.tsx

RENAME:
- HomeVenueSection → HomeClubSection
- All venue references → club

UPDATE HOOKS:
- useHomeVenue → useHomeClub
- Import from useHomeClub

UPDATE DISPLAY:
```typescript
export function HomeClubSection() {
  const { data: homeClub, isLoading } = useHomeClub();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!homeClub) {
    return (
      <Section title="Home Club">
        <Text>No home club set</Text>
        <Button onPress={openHomeClubModal}>
          Select Home Club
        </Button>
      </Section>
    );
  }

  return (
    <Section title="Home Club">
      <ClubCard
        club={homeClub}
        showCourseCount
        showSource
      />
      <Button variant="outline" onPress={openHomeClubModal}>
        Change Home Club
      </Button>
    </Section>
  );
}
```

UPDATE TEXT:
- "Home Venue" → "Home Club" in all UI strings
- "Select Venue" → "Select Club"
- "No home venue set" → "No home club set"
```

**Deliverables:**
- [ ] Component renamed
- [ ] All text updated to "club"
- [ ] useHomeClub hook used
- [ ] Null state handled
- [ ] Change button working

**Dependencies:** Step 3.4, Step 5.4
**Notes:** Part of profile screen

---

### Step 6.6: Update HomeClubModal
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update the renamed HomeClubModal (formerly HomeVenueModal).

Modify file: src/screens/profile/components/HomeClubModal.tsx

RENAME:
- HomeVenueModal → HomeClubModal
- All venue references → club

UPDATE HOOKS:
- useVenuesWithCourses → useClubsWithCourses
- useSetHomeVenue → useSetHomeClub
- useSearchVenues → useSearchClubs

UPDATE DISPLAY:
```typescript
export function HomeClubModal({ visible, onClose }) {
  const { data: clubs } = useClubsWithCourses();
  const { mutate: setHomeClub } = useSetHomeClub();
  const [search, setSearch] = useState('');

  const filteredClubs = useMemo(() => {
    if (!search) return clubs;
    return clubs?.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [clubs, search]);

  const handleSelect = (clubId: string) => {
    setHomeClub(clubId, {
      onSuccess: () => {
        onClose();
        showToast('Home club updated');
      },
    });
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <ModalHeader title="Select Home Club" />
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search clubs..."
      />
      <FlatList
        data={filteredClubs}
        renderItem={({ item }) => (
          <ClubCard
            club={item}
            onPress={() => handleSelect(item.id)}
            showSource
          />
        )}
        keyExtractor={item => item.id}
      />
    </Modal>
  );
}
```

ADD API SEARCH:
- When search is 3+ characters, show API results
- Import button for API clubs
```

**Deliverables:**
- [ ] Component renamed
- [ ] All hooks updated
- [ ] Search functionality working
- [ ] Club selection working
- [ ] API search (optional)
- [ ] Source badges showing

**Dependencies:** Step 6.5, Step 5.1
**Notes:** Modal for selecting home club

---

### Step 6.7: Update Competition Wizard
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update competition wizard components for clubs rename.

FILES TO UPDATE:

1. src/components/competitionWizard/create/RoundDetailsStep/index.tsx
   - useVenuesWithCourses → useClubsWithCourses
   - venue references → club

2. src/components/competitionWizard/create/RoundDetailsStep/components/CourseSelectionModal.tsx
   - Rename venue → club in all references
   - Use ClubCard for display
   - Add source badges
   - Add API search functionality

3. src/components/competitionWizard/create/RoundDetailsStep/components/TeeSelectionModal.tsx
   - Fetch tees from tees table (not JSONB)
   - Use useTeesByCourse hook
   - Update tee display for new format

4. src/components/competitionWizard/create/RoundDetailsStep/hooks/useRoundDetailsForm.ts
   - venue_id → club_id references
   - Update form state types

TEES SELECTION UPDATE:
```typescript
export function TeeSelectionModal({ courseId, visible, onClose, onSelect }) {
  const { data: tees } = useTeesByCourse(courseId);

  return (
    <Modal visible={visible} onClose={onClose}>
      <ModalHeader title="Select Tees" />
      {tees?.map(tee => (
        <TeeRow
          key={tee.id}
          tee={tee}
          onPress={() => onSelect(tee)}
          showLength
          showRatings
        />
      ))}
      {(!tees || tees.length === 0) && (
        <Text>No tee information available for this course</Text>
      )}
    </Modal>
  );
}
```
```

**Deliverables:**
- [ ] RoundDetailsStep updated
- [ ] CourseSelectionModal updated with club references
- [ ] TeeSelectionModal fetches from tees table
- [ ] Form hooks updated
- [ ] API search in course selection

**Dependencies:** Step 5.1, Step 5.2, Step 6.4
**Notes:** Competition wizard is a critical flow - test thoroughly

---

### Step 6.8: Update Round Creation Screens
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update round creation and editing screens for clubs rename.

FILES TO UPDATE:

1. src/screens/rounds/CreateRoundBottomSheet/index.tsx
   - venue references → club
   - Use useClubsWithCourses

2. src/screens/rounds/CreateRoundBottomSheet/TeeSelectionStep.tsx
   - Fetch tees from tees table
   - Handle missing tees gracefully

3. src/screens/admin/AddRoundScreen/index.tsx
   - venue references → club
   - Update form state

4. src/screens/admin/AddRoundScreen/components/CourseSelectionModal.tsx
   - Rename venue → club
   - Use ClubCard
   - Add source badges
   - Add API search

5. src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts
   - Update types for club_id
   - Update validation

COMMON PATTERN FOR TEE SELECTION:
```typescript
function TeeSelectionStep({ courseId, selectedTeeId, onSelect }) {
  const { data: tees, isLoading } = useTeesByCourse(courseId);

  if (isLoading) return <LoadingSpinner />;

  if (!tees || tees.length === 0) {
    return (
      <EmptyState
        title="No Tees Available"
        message="Tee information is not available for this course. You can proceed without selecting a tee."
      />
    );
  }

  return (
    <RadioGroup value={selectedTeeId} onChange={onSelect}>
      {tees.map(tee => (
        <RadioOption key={tee.id} value={tee.id}>
          <TeeRow tee={tee} showLength showRatings />
        </RadioOption>
      ))}
    </RadioGroup>
  );
}
```
```

**Deliverables:**
- [ ] CreateRoundBottomSheet updated
- [ ] TeeSelectionStep fetches from tees table
- [ ] AddRoundScreen updated
- [ ] Admin CourseSelectionModal updated
- [ ] Form hooks updated
- [ ] Missing tees handled gracefully

**Dependencies:** Step 6.7, Step 5.2
**Notes:** Round creation is a critical flow

---

## Phase 7: Update Documentation

### Step 7.1: Update CLAUDE.md
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update CLAUDE.md for the clubs rename and GolfAPI.io integration.

Modify file: CLAUDE.md

SECTIONS TO UPDATE:

1. Data Model section:
   - Rename "Venue" → "Club" in entity list
   - Update description: "Club - Golf club information (name, location, coordinates)"
   - Add "Tee" entity: "Tee - Tee box information with ratings and distances"
   - Add "HoleCoordinate" entity (if GPS features documented)

2. API Integration Strategy section:
   - Update to reference GolfAPI.io
   - Note: "42,000 courses worldwide including Australia"
   - Note: "Complete data: clubs, courses, tees, hole coordinates"
   - Note: "Caching explicitly allowed"

3. Environment Variables section:
   - Replace:
     EXPO_PUBLIC_AUSTRALIA_GOLF_API_KEY → EXPO_PUBLIC_GOLFAPI_IO_KEY
     EXPO_PUBLIC_AUSTRALIA_GOLF_API_URL → EXPO_PUBLIC_GOLFAPI_IO_URL

4. Tech Stack section (if venues mentioned):
   - Any venue references → club

5. Core Entities list:
   - Update entity descriptions
   - Add new entities if not listed
```

**Deliverables:**
- [ ] Data Model section updated
- [ ] API Integration section updated
- [ ] Environment variables updated
- [ ] All venue → club references updated

**Dependencies:** All previous steps
**Notes:** CLAUDE.md is the main project documentation

---

### Step 7.2: Update DATABASE_SCHEMA.md
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update DATABASE_SCHEMA.md for the new schema.

Modify file: docs/database/DATABASE_SCHEMA.md

SECTIONS TO UPDATE:

1. Rename venues table documentation → clubs:
   - Table name: clubs (was venues)
   - Column: golfapi_club_id (was api_id)
   - New columns: postal_code, continent

2. Update courses table:
   - Column: club_id (was venue_id)
   - New columns: golfapi_course_id, golfapi_long_course_id, measure_unit

3. Add tees table documentation:
   - Full column list
   - Indexes
   - RLS policies
   - Example queries

4. Add hole_coordinates table documentation:
   - Full column list
   - POI types explanation
   - PostGIS usage
   - Example queries

5. Update players table:
   - Column: home_club_id (was home_venue_id)

6. Update relationships diagram (if exists):
   - clubs → courses (was venues → courses)
   - courses → tees (new)
   - courses → hole_coordinates (new)

7. Add archive tables documentation:
   - archived_venues_pre_clubs
   - archived_courses_pre_clubs
```

**Deliverables:**
- [ ] clubs table documented
- [ ] tees table documented
- [ ] hole_coordinates table documented
- [ ] All FK relationships updated
- [ ] Archive tables documented

**Dependencies:** Phase 1
**Notes:** Keep documentation in sync with actual schema

---

### Step 7.3: Update API_INTEGRATION.md
**Status:** ⏳ Pending
**Type:** Custom
**Command:** N/A

**Prompt:**
```
Update API_INTEGRATION.md for GolfAPI.io.

Modify file: docs/guides/API_INTEGRATION.md

MAJOR REWRITE:

1. Overview:
   - Primary API: GolfAPI.io
   - 42,000 courses worldwide
   - Complete data: clubs, courses, tees, coordinates
   - Pricing: €29-399/month subscription
   - Caching: Explicitly allowed

2. Data Coverage:
   - Clubs: Name, address, contact, coordinates
   - Courses: Par, stroke index, women's data, match play
   - Tees: Ratings (slope/CR), per-hole distances
   - Coordinates: GPS for tees and greens

3. API Endpoints:
   - GET /clubs/search
   - GET /clubs/{clubId}
   - GET /clubs/{clubId}/courses
   - GET /courses/{courseId}
   - GET /courses/{courseId}/tees
   - GET /courses/{courseId}/coordinates

4. Authentication:
   - Bearer token
   - API key in Authorization header

5. Rate Limits:
   - Based on subscription tier
   - Handle 429 responses

6. Caching Strategy:
   - Cache to PostgreSQL
   - 30-day TTL
   - Refresh on demand

7. Code Examples:
   - Update all code examples for GolfAPI.io
   - Show transformer usage
   - Show caching flow

8. Remove/Archive:
   - Zyla Labs documentation
   - GolfAPI.io legacy references (if different)
```

**Deliverables:**
- [ ] GolfAPI.io fully documented
- [ ] All endpoints documented
- [ ] Code examples updated
- [ ] Caching strategy documented
- [ ] Old API references removed

**Dependencies:** Phase 4, Phase 5
**Notes:** This is the main API documentation

---

### Step 7.4: Delete Old Zyla Labs Plan
**Status:** ⏳ Pending
**Type:** Command
**Command:** `rm docs/plans/zyla-labs-integration.md`

**Prompt:**
```
Delete the old Zyla Labs integration plan since it's been replaced.

Run: rm docs/plans/zyla-labs-integration.md

Or if using git: git rm docs/plans/zyla-labs-integration.md

This file has been superseded by docs/plans/golfapi-integration.md (this file).
```

**Deliverables:**
- [ ] zyla-labs-integration.md deleted

**Dependencies:** This plan file created
**Notes:** Can keep in git history for reference

---

## Phase 8: Rollback Preparation

### Step 8.1: Create Rollback Migration Script
**Status:** ⏳ Pending
**Type:** Migration
**Command:** N/A

**Prompt:**
```
Create a rollback migration script in case the clubs rename needs to be reverted.

Create file: supabase/migrations/[timestamp]_rollback_clubs_to_venues.sql

SQL CONTENT:

-- =====================================================
-- ROLLBACK SCRIPT - Only run if migration needs to be reverted
-- This script reverses the venues→clubs rename
-- =====================================================

-- WARNING: Only use this if the clubs migration needs to be rolled back
-- This should NOT be part of the normal migration sequence

-- Rename clubs back to venues
ALTER TABLE clubs RENAME TO venues;
ALTER TABLE venues RENAME COLUMN golfapi_club_id TO api_id;

-- Rename FK columns back
ALTER TABLE courses RENAME COLUMN club_id TO venue_id;
ALTER TABLE players RENAME COLUMN home_club_id TO home_venue_id;

-- Rename indexes back
ALTER INDEX IF EXISTS idx_clubs_name RENAME TO idx_venues_name;
ALTER INDEX IF EXISTS idx_clubs_state RENAME TO idx_venues_state;
ALTER INDEX IF EXISTS idx_clubs_source RENAME TO idx_venues_source;
ALTER INDEX IF EXISTS idx_clubs_location RENAME TO idx_venues_location;
ALTER INDEX IF EXISTS idx_clubs_golfapi_id RENAME TO idx_venues_api_id;
ALTER INDEX IF EXISTS idx_courses_club RENAME TO idx_courses_venue;
ALTER INDEX IF EXISTS idx_courses_club_id RENAME TO idx_courses_venue_id;
ALTER INDEX IF EXISTS idx_players_home_club RENAME TO idx_players_home_venue;
ALTER INDEX IF EXISTS idx_players_home_club_id RENAME TO idx_players_home_venue_id;

-- Drop new RLS policies and recreate old ones
DROP POLICY IF EXISTS "Anyone can view clubs" ON venues;
DROP POLICY IF EXISTS "Super admins can manage clubs" ON venues;

CREATE POLICY "Anyone can view venues" ON venues
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage venues" ON venues
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

-- Note: Archive tables (archived_venues_pre_clubs, archived_courses_pre_clubs)
-- are kept intact for data recovery if needed
```

**Deliverables:**
- [ ] Rollback migration script created
- [ ] Script tested on local database
- [ ] Script documented but NOT added to migration sequence

**Dependencies:** Phase 1 complete
**Notes:** This script should be kept separate - only run manually if rollback is needed

---

### Step 8.2: Document Rollback Procedure
**Status:** ⏳ Pending
**Type:** Documentation
**Command:** N/A

**Prompt:**
```
Document the rollback procedure in case the clubs rename needs to be reverted.

Add to this file (or create separate ROLLBACK.md):

## Rollback Procedure

### When to Rollback
- Critical bug discovered in clubs rename that cannot be fixed forward
- Data integrity issues found after migration
- Business decision to revert terminology change

### Rollback Checklist

**Before Rollback:**
- [ ] Confirm rollback is necessary (try fixing forward first)
- [ ] Notify team of planned rollback
- [ ] Take database backup: `pg_dump -Fc > backup_pre_rollback.dump`
- [ ] Note any data created after migration that needs preserving

**Database Rollback:**
- [ ] Run rollback migration script manually
- [ ] Verify venues table exists and clubs table is gone
- [ ] Verify FK columns renamed back (venue_id, home_venue_id)
- [ ] Test queries against venues table

**Code Rollback:**
- [ ] Revert code changes: `git revert <commit-range>`
- [ ] Or restore from branch: `git checkout pre-clubs-branch`
- [ ] Regenerate Supabase types: `pnpm supabase gen types typescript --local`
- [ ] Run type-check: `pnpm type-check`
- [ ] Run tests: `pnpm test`

**Verification:**
- [ ] App builds successfully
- [ ] App runs without errors
- [ ] Database queries work
- [ ] No "clubs" references remain in active code

### Recovery from Archive Tables
If original venue data needs to be restored:
\`\`\`sql
-- Restore venues from archive
INSERT INTO venues (id, source, api_id, name, ...)
SELECT id, source, api_id, name, ...
FROM archived_venues_pre_clubs
WHERE id NOT IN (SELECT id FROM venues);
\`\`\`
```

**Deliverables:**
- [ ] Rollback procedure documented
- [ ] Checklist created
- [ ] Recovery queries documented

**Dependencies:** Step 8.1
**Notes:** Better to have and not need than need and not have

---

## Critical Files Summary

### To Create (Migrations)
- `supabase/migrations/[ts]_archive_venues_for_clubs_rename.sql`
- `supabase/migrations/[ts]_rename_venues_to_clubs.sql`
- `supabase/migrations/[ts]_add_golfapi_course_ids.sql`
- `supabase/migrations/[ts]_create_tees_table.sql`
- `supabase/migrations/[ts]_create_hole_coordinates_table.sql`
- `supabase/migrations/[ts]_migrate_tees_to_table.sql`
- `supabase/migrations/[ts]_verify_favorite_courses.sql`

### To Create (Services)
- `src/services/courses/teesService.ts`
- `src/services/courses/coordinatesService.ts`

### To Create (Hooks)
- `src/hooks/useTees.ts`
- `src/hooks/useHoleCoordinates.ts`

### To Rename
| Old Path | New Path |
|----------|----------|
| `src/hooks/useVenues.ts` | `src/hooks/useClubs.ts` |
| `src/hooks/useVenueDetails.ts` | `src/hooks/useClubDetails.ts` |
| `src/hooks/useHomeVenue.ts` | `src/hooks/useHomeClub.ts` |
| `src/screens/courses/VenueScreen.tsx` | `src/screens/courses/ClubScreen.tsx` |
| `src/components/courses/VenueCard.tsx` | `src/components/courses/ClubCard.tsx` |
| `src/components/courses/VenueCard.test.tsx` | `src/components/courses/ClubCard.test.tsx` |
| `src/components/courses/VenueCard.stories.tsx` | `src/components/courses/ClubCard.stories.tsx` |
| `src/screens/profile/components/HomeVenueSection.tsx` | `src/screens/profile/components/HomeClubSection.tsx` |
| `src/screens/profile/components/HomeVenueModal.tsx` | `src/screens/profile/components/HomeClubModal.tsx` |
| `src/screens/onboarding/components/HomeVenueStep.tsx` | `src/screens/onboarding/components/HomeClubStep.tsx` |

### To Modify (Major)
- `src/types/database.types.ts` - Add Club, Tee, HoleCoordinate types
- `src/types/database/course.types.ts` - Venue→Club interface rename
- `src/types/supabase/roundQueries.ts` - venue_id→club_id
- `src/navigation/types.ts` - Route param types (venueId→clubId)
- `src/services/api/golfApiTypes.ts` - Update for actual API structure
- `src/services/api/golfApiTransformers.ts` - Rewrite transformers
- `src/services/api/golfApiClient.ts` - Verify/update endpoints
- `src/services/courses/cacheService.ts` - Add club caching
- `src/services/courses/courseService.ts` - Use new data model
- `src/services/achievements/achievementChecker.ts` - home_venue→home_club
- `src/hooks/queryKeys.ts` - Rename venueKeys → clubKeys
- `src/hooks/index.ts` - Update exports
- ~50+ files with venue → club string replacements

### To Delete
- `docs/plans/zyla-labs-integration.md` (replaced by this file)

---

## Verification

### Database Verification
```bash
# Reset and apply migrations
pnpm supabase db reset

# Verify tables renamed
pnpm supabase db execute "SELECT * FROM clubs LIMIT 1"
pnpm supabase db execute "SELECT * FROM courses WHERE club_id IS NOT NULL LIMIT 1"
pnpm supabase db execute "SELECT * FROM tees LIMIT 1"
pnpm supabase db execute "SELECT * FROM hole_coordinates LIMIT 1"

# Verify old tables don't exist
pnpm supabase db execute "SELECT * FROM venues LIMIT 1" # Should error

# Verify archive tables
pnpm supabase db execute "SELECT COUNT(*) FROM archived_venues_pre_clubs"
pnpm supabase db execute "SELECT COUNT(*) FROM archived_courses_pre_clubs"
```

### TypeScript Verification
```bash
# Regenerate types
pnpm supabase gen types typescript --local > src/types/supabase.ts

# Check for type errors
pnpm type-check

# Check for lint errors
pnpm lint

# Verify no remaining venue references in types
grep -r "venue" src/types/ --include="*.ts" | grep -v "// @deprecated"
# Should return empty or only deprecated aliases
```

### Test Verification
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test ClubCard
pnpm test useClubs
pnpm test golfApiTransformers
pnpm test useTees
```

### Manual Testing Checklist

**Club Management:**
- [ ] Club list displays correctly
- [ ] Club detail screen shows club info
- [ ] Club detail shows courses with tee counts
- [ ] Source badges display (API/Manual/Legacy)
- [ ] API search returns results
- [ ] Import club from API works

**Course Management:**
- [ ] Course detail fetches tees from tees table
- [ ] Tees display with ratings and lengths
- [ ] Missing tees handled gracefully
- [ ] Hole data displays in scorecard format

**Home Club:**
- [ ] Home club displays on profile
- [ ] Can set home club
- [ ] Can change home club
- [ ] Can clear home club
- [ ] Null home club handled gracefully

**Round Creation:**
- [ ] Course selection shows clubs
- [ ] Tee selection fetches from tees table
- [ ] Missing tees allow proceeding
- [ ] Round created with club_id reference

**Competition Wizard:**
- [ ] Course selection works
- [ ] Tee selection works
- [ ] Form submits correctly

**Favorites:**
- [ ] Can add course to favorites
- [ ] Favorites display club info

**Navigation:**
- [ ] Navigate to Club screen from course list
- [ ] Club screen route params work (clubId)
- [ ] Deep linking to club/course screens works

---

## Notes

### GolfAPI.io vs Zyla Labs

| Feature | GolfAPI.io | Zyla Labs |
|---------|------------|-----------|
| Data quality | High - clean, normalized | Poor - garbage data, wrong countries |
| Coverage | 42,000 courses worldwide | Unknown, missing major courses |
| Unique IDs | Yes (ClubID, CourseID, TeeID) | No (only course name) |
| Coordinates | Full (tee + green per hole) | None |
| Tee data | Comprehensive (slope, rating, lengths) | Basic, inconsistent |
| Pricing | €29-399/month | Unknown |
| Caching | Explicitly allowed | TOS unclear |
| Data model | Clean normalized CSV structure | Weird row-based scorecard |

### Data Model Changes

1. **venues → clubs**: Better terminology matching industry standard
2. **Tees in separate table**: More flexible, proper FK relationships, matches GolfAPI.io
3. **Hole coordinates**: Enables GPS features (distance-to-pin, flyovers)
4. **GolfAPI IDs stored**: ClubID, CourseID, TeeID for deduplication

### Backwards Compatibility

- Archive tables preserve all existing data
- Deprecated type aliases (Venue = Club) for transition period
- Deprecated query key aliases (venueKeys = clubKeys)
- Existing courses preserved - only table/column renamed

### Migration Safety

- All data archived before any changes
- Archive tables allow full rollback if needed
- Migrations are idempotent where possible
- No data deleted, only renamed/restructured

### Offline Database Impact

The SQLite offline database (`src/services/offline/`) stores:
- Scorecards, hole_scores, holes (course data), pending_syncs

The `holes` table stores `round_id` as FK, not venue/club references.
**No SQLite schema changes required** for the venues→clubs rename.

If future offline caching of clubs/courses is added, ensure:
- Table names use 'clubs' not 'venues'
- FK columns use 'club_id' not 'venue_id'
