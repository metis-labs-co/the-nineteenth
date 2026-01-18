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

-- Update trigger
CREATE TRIGGER set_tees_updated_at
  BEFORE UPDATE ON tees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE tees IS 'Golf course tees with ratings and per-hole distances';
COMMENT ON COLUMN tees.golfapi_tee_id IS 'TeeID from GolfAPI.io';
COMMENT ON COLUMN tees.color IS 'Hex color code e.g., #FFFFFF for white';
COMMENT ON COLUMN tees.slope IS 'Slope rating for men (full 18 holes)';
COMMENT ON COLUMN tees.course_rating IS 'Course rating for men (full 18 holes)';
COMMENT ON COLUMN tees.slope_women IS 'Slope rating for women (full 18 holes)';
COMMENT ON COLUMN tees.course_rating_women IS 'Course rating for women (full 18 holes)';
COMMENT ON COLUMN tees.measure_unit IS 'Distance unit: m (meters) or y (yards)';
COMMENT ON COLUMN tees.total_length IS 'Computed total of all hole lengths';
COMMENT ON COLUMN tees.front9_length IS 'Computed total of front 9 hole lengths';
COMMENT ON COLUMN tees.back9_length IS 'Computed total of back 9 hole lengths';
