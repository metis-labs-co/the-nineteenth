-- =====================================================
-- REMOVE SKINS GAME PLAYER LIMIT
-- =====================================================
-- Migration: 20260120000000_remove_skins_player_limit.sql
-- Description: Remove the arbitrary 4-player limit on skins games.
--              Skins can be played with any number of players (2+).
-- =====================================================

-- Drop the existing constraint
ALTER TABLE skins_games
DROP CONSTRAINT IF EXISTS skins_participant_count;

-- Add a new constraint that only requires minimum 2 players (no max)
ALTER TABLE skins_games
ADD CONSTRAINT skins_participant_count CHECK (
  array_length(participant_ids, 1) >= 2
);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT skins_participant_count ON skins_games IS
  'Skins games require at least 2 participants. No maximum limit.';
