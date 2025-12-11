-- Migration: favorite_courses
-- Description: Add favorite_courses table for users to save their favorite golf courses
-- Date: 2025-01-16

-- =====================================================
-- FAVORITE COURSES TABLE
-- =====================================================

-- Create the favorite_courses table
CREATE TABLE IF NOT EXISTS favorite_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each player can only favorite a course once
  CONSTRAINT unique_player_course_favorite UNIQUE (player_id, course_id)
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_favorite_courses_player
  ON favorite_courses(player_id);

CREATE INDEX IF NOT EXISTS idx_favorite_courses_course
  ON favorite_courses(course_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE favorite_courses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON favorite_courses
  FOR SELECT
  USING (auth.uid() = player_id);

-- Policy: Users can add favorites
CREATE POLICY "Users can add favorites"
  ON favorite_courses
  FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Policy: Users can remove their own favorites
CREATE POLICY "Users can remove own favorites"
  ON favorite_courses
  FOR DELETE
  USING (auth.uid() = player_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE favorite_courses IS 'Stores user favorite golf courses for quick access';
COMMENT ON COLUMN favorite_courses.player_id IS 'Reference to the player who favorited the course';
COMMENT ON COLUMN favorite_courses.course_id IS 'Reference to the favorited course';
