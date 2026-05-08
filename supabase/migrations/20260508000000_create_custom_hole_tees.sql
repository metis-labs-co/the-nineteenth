-- =====================================================
-- CREATE custom_hole_tees
-- Per-user custom tee box positions for a course/hole.
-- Stored separately from hole_coordinates so a course-data
-- refresh (re-import from GolfAPI) doesn't overwrite them.
-- =====================================================

CREATE TABLE custom_hole_tees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL NOT NULL,
  longitude DECIMAL NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('red', 'white', 'blue', 'gold', 'black', 'silver')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_hole_tees_course_hole
  ON custom_hole_tees(course_id, hole_number);

CREATE INDEX idx_custom_hole_tees_user
  ON custom_hole_tees(user_id);

COMMENT ON TABLE custom_hole_tees IS
  'User-defined tee box GPS points for a course/hole. Supplements hole_coordinates (which only stores tee_back and tee_front from GolfAPI).';

-- =====================================================
-- ROW LEVEL SECURITY
-- Each user only sees and modifies their own custom tees.
-- =====================================================

ALTER TABLE custom_hole_tees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom tees"
  ON custom_hole_tees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom tees"
  ON custom_hole_tees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom tees"
  ON custom_hole_tees FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom tees"
  ON custom_hole_tees FOR DELETE
  USING (auth.uid() = user_id);
