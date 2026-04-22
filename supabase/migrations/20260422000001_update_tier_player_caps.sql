-- Migration: Tighten social tier player cap; confirm premium + enterprise caps.
-- Social: 16 -> 12 (drops typical league size below foursomes-of-three threshold,
--                   nudges larger groups to Premium).
-- Premium and Enterprise UPDATEs are intentional no-ops that pin the expected
-- values in migration history alongside the change.

UPDATE tier_limits
SET max_players_per_competition = 12,
    updated_at = NOW()
WHERE tier = 'social';

UPDATE tier_limits
SET max_players_per_competition = 40,
    updated_at = NOW()
WHERE tier = 'premium';

UPDATE tier_limits
SET max_players_per_competition = 100,
    updated_at = NOW()
WHERE tier = 'enterprise';
