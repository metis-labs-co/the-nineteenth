-- =====================================================
-- Update Tier Limits
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration updates the tier limits to new values:
--
-- FREE TIER:
--   - max_competitions_owned: 1 -> 3
--   - max_rounds_per_competition: 1 -> 2
--   - max_friends: 5 -> 10
--
-- SOCIAL TIER:
--   - max_competitions_owned: 5 -> 8
--   - max_rounds_per_competition: 3 -> 5
--   - allowed_game_types: add 'match-play'
--   - can_use_team_formats: FALSE -> TRUE
--   - can_export_data: TRUE -> FALSE
--
-- PREMIUM TIER:
--   - can_export_data: TRUE -> FALSE
--
-- SUPER ADMIN TIER:
--   - can_export_data: TRUE -> FALSE
--
-- Export data feature is being removed from all tiers.
-- =====================================================

-- =====================================================
-- UPDATE FREE TIER
-- =====================================================
UPDATE tier_limits
SET
  max_competitions_owned = 3,
  max_rounds_per_competition = 2,
  max_friends = 10,
  updated_at = NOW()
WHERE tier = 'free';

-- =====================================================
-- UPDATE SOCIAL TIER
-- =====================================================
UPDATE tier_limits
SET
  max_competitions_owned = 8,
  max_rounds_per_competition = 5,
  allowed_game_types = ARRAY['stableford', 'stroke', 'match-play']::TEXT[],
  can_use_team_formats = TRUE,
  can_export_data = FALSE,
  updated_at = NOW()
WHERE tier = 'social';

-- =====================================================
-- UPDATE PREMIUM TIER
-- =====================================================
UPDATE tier_limits
SET
  can_export_data = FALSE,
  updated_at = NOW()
WHERE tier = 'premium';

-- =====================================================
-- UPDATE SUPER ADMIN TIER
-- =====================================================
UPDATE tier_limits
SET
  can_export_data = FALSE,
  updated_at = NOW()
WHERE tier = 'super_admin';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
