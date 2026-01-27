-- Migration: Add 'shamble' to game_type check constraint and remove 'ambrose'
-- Shamble is both a GameType (for round creation/MATCH_TYPES) and TeamFormat (for scoring)
-- Format: Best drive selected, then each player plays their own ball
-- Scoring: Sum of all individual Stableford points
-- Note: 'ambrose' is removed - use 'scramble' instead

-- Drop the existing constraint and add a new one with 'shamble' included (no 'ambrose')
ALTER TABLE rounds
DROP CONSTRAINT IF EXISTS rounds_game_type_check;

ALTER TABLE rounds
ADD CONSTRAINT rounds_game_type_check
CHECK (game_type IN ('stroke', 'stableford', 'match-play', 'best-ball', 'scramble', 'shamble'));

-- Update tier_limits: remove 'ambrose' and add 'shamble'
-- First remove 'ambrose' from all tiers (it's replaced by 'scramble')
UPDATE tier_limits
SET allowed_game_types = array_remove(allowed_game_types, 'ambrose')
WHERE 'ambrose' = ANY(allowed_game_types);

-- Add 'shamble' for premium tier
UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'shamble')
WHERE tier = 'premium'
  AND NOT ('shamble' = ANY(allowed_game_types));

-- Add 'shamble' for super_admin tier
UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'shamble')
WHERE tier = 'super_admin'
  AND NOT ('shamble' = ANY(allowed_game_types));
