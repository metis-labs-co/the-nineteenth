-- Migration: Add 'par' to game_type check constraint
-- Par game type: Win/lose each hole based on net score vs par
-- Scoring: +1 (win), 0 (square), -1 (loss) per hole
-- Subscription tier: social (same as stroke play)

-- Drop the existing constraint and add a new one with 'par' included
ALTER TABLE rounds
DROP CONSTRAINT IF EXISTS rounds_game_type_check;

ALTER TABLE rounds
ADD CONSTRAINT rounds_game_type_check
CHECK (game_type IN ('stroke', 'stableford', 'par', 'match-play', 'best-ball', 'scramble', 'shamble'));

-- Add 'par' to tier_limits for social tier
UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'par')
WHERE tier = 'social'
  AND NOT ('par' = ANY(allowed_game_types));

-- Add 'par' for premium tier
UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'par')
WHERE tier = 'premium'
  AND NOT ('par' = ANY(allowed_game_types));

-- Add 'par' for super_admin tier
UPDATE tier_limits
SET allowed_game_types = array_append(allowed_game_types, 'par')
WHERE tier = 'super_admin'
  AND NOT ('par' = ANY(allowed_game_types));
