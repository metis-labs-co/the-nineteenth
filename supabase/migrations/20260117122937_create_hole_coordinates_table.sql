-- =====================================================
-- CREATE HOLE_COORDINATES TABLE
-- GPS coordinates for tee boxes and greens per hole
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

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_hole_coords_course ON hole_coordinates(course_id);
CREATE INDEX idx_hole_coords_hole ON hole_coordinates(course_id, hole_number);
CREATE INDEX idx_hole_coords_location ON hole_coordinates USING GIST(location);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

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

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE hole_coordinates IS 'GPS coordinates for tee boxes and greens per hole';
COMMENT ON COLUMN hole_coordinates.course_id IS 'FK to courses table';
COMMENT ON COLUMN hole_coordinates.hole_number IS 'Hole number (1-18)';
COMMENT ON COLUMN hole_coordinates.poi_type IS 'Point of interest: tee_front, tee_back, green_front, green_center, green_back';
COMMENT ON COLUMN hole_coordinates.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN hole_coordinates.longitude IS 'GPS longitude coordinate';
COMMENT ON COLUMN hole_coordinates.location IS 'PostGIS geography point for spatial queries';
COMMENT ON COLUMN hole_coordinates.side_of_fairway IS 'Side indicator from GolfAPI.io SideOfFairway field';

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

-- =====================================================
-- HELPER FUNCTION: Get all coordinates for a course
-- =====================================================

CREATE OR REPLACE FUNCTION get_course_coordinates(p_course_id UUID)
RETURNS TABLE (
  hole_number INTEGER,
  poi_type TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  side_of_fairway TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hc.hole_number,
    hc.poi_type,
    hc.latitude,
    hc.longitude,
    hc.side_of_fairway
  FROM hole_coordinates hc
  WHERE hc.course_id = p_course_id
  ORDER BY hc.hole_number, hc.poi_type;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_course_coordinates IS 'Get all GPS coordinates for a course, ordered by hole number';

-- =====================================================
-- HELPER FUNCTION: Calculate all hole distances for a course
-- =====================================================

CREATE OR REPLACE FUNCTION get_course_hole_distances(
  p_course_id UUID,
  p_from_poi TEXT DEFAULT 'tee_back',
  p_to_poi TEXT DEFAULT 'green_center'
)
RETURNS TABLE (
  hole_number INTEGER,
  distance_meters NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.hole_number,
    calculate_hole_distance(p_course_id, h.hole_number, p_from_poi, p_to_poi) AS distance_meters
  FROM generate_series(1, 18) AS h(hole_number)
  ORDER BY h.hole_number;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_course_hole_distances IS 'Calculate GPS distances for all 18 holes from tee to green';
