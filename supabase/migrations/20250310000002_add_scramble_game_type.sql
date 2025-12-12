-- Migration: Add 'scramble' to game_type check constraint
-- The rounds table's game_type column was missing 'scramble' as a valid option
-- This caused errors when creating rounds with the Scramble format

-- Drop the existing constraint and add a new one with 'scramble' included
ALTER TABLE rounds
DROP CONSTRAINT IF EXISTS rounds_game_type_check;

ALTER TABLE rounds
ADD CONSTRAINT rounds_game_type_check
CHECK (game_type IN ('stroke', 'stableford', 'match-play', 'ambrose', 'best-ball', 'scramble'));

-- Also update tier_limits if it has a game_types constraint
-- First check and update the allowed_game_types in tier_limits to include scramble for premium tier
UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'scramble')
WHERE tier = 'premium'
  AND NOT ('scramble' = ANY(allowed_game_types));

UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'scramble')
WHERE tier = 'super_admin'
  AND NOT ('scramble' = ANY(allowed_game_types));
