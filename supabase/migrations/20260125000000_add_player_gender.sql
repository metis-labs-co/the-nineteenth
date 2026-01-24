-- Migration: add_player_gender
-- Description: Add gender column to players table for GA Daily Handicap consistency factor
-- Date: 2026-01-25

-- =====================================================
-- ADD GENDER COLUMN TO PLAYERS TABLE
-- =====================================================

-- Add gender column with CHECK constraint
-- NULL is allowed (defaults to male consistency factor in application logic)
ALTER TABLE players
ADD COLUMN gender TEXT
CHECK (gender IN ('male', 'female'));

-- Add comment for documentation
COMMENT ON COLUMN players.gender IS 'Player gender for GA Daily Handicap consistency factor. Male uses 0.9986, female uses 1.0483. NULL defaults to male factor.';
