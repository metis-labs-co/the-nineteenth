-- Migration: Tighten free tier player cap from 8 to 4 per competition.
-- Small-group ceiling encourages upgrade for anything bigger than a foursome.

UPDATE tier_limits
SET max_players_per_competition = 4,
    updated_at = NOW()
WHERE tier = 'free';
