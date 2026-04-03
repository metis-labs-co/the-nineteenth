-- Migration: Update subscription tier limits (April 2026)
--
-- Changes:
--   Free tier:    max_rounds_played 20 -> 5, max_friends 10 -> 5
--   Social tier:  max_friends 25 -> 15
--   Premium tier: max_competitions_owned unlimited -> 50, max_leagues_owned unlimited -> 50

-- Free tier: tighten social rounds and friends
UPDATE tier_limits
SET max_rounds_played = 5,
    max_friends = 5
WHERE tier = 'free';

-- Social tier: reduce friends limit
UPDATE tier_limits
SET max_friends = 15
WHERE tier = 'social';

-- Premium tier: cap competitions and leagues
UPDATE tier_limits
SET max_competitions_owned = 50,
    max_leagues_owned = 50
WHERE tier = 'premium';
