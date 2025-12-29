-- Migration: home_course_to_venue
-- Description: Refactor home_course_id to home_venue_id - users save their home golf club (venue), not a specific course
-- Date: 2025-12-27

-- =====================================================
-- MIGRATE HOME COURSE TO HOME VENUE
-- =====================================================

-- Step 1: Add the new home_venue_id column
ALTER TABLE players
ADD COLUMN home_venue_id UUID REFERENCES venues(id) ON DELETE SET NULL;

-- Step 2: Migrate existing data - set home_venue_id based on the venue of the current home_course
UPDATE players p
SET home_venue_id = c.venue_id
FROM courses c
WHERE p.home_course_id = c.id
  AND p.home_course_id IS NOT NULL;

-- Step 3: Drop the old home_course_id column and its index
DROP INDEX IF EXISTS idx_players_home_course;
ALTER TABLE players DROP COLUMN IF EXISTS home_course_id;

-- Step 4: Add index for the new column
CREATE INDEX idx_players_home_venue ON players(home_venue_id);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN players.home_venue_id IS 'Reference to the player''s designated home golf club (venue). Only one home venue per player.';
