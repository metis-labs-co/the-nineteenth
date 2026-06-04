-- Migration: Increase Free tier round limits (June 2026)
--
-- Changes:
--   Free tier:  max_rounds_per_competition 2 -> 3
--               max_rounds_played          5 -> 20

UPDATE tier_limits
SET max_rounds_per_competition = 3,
    max_rounds_played = 20
WHERE tier = 'free';
