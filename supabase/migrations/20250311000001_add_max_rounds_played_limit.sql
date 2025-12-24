-- =====================================================
-- Add max_rounds_played Limit to Tier Limits
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds a new limit column to control how many
-- rounds a user can play (participate in) based on their tier.
--
-- Limit values:
--   free: 20 rounds (encourages upgrade after decent usage)
--   social: -1 (unlimited)
--   premium: -1 (unlimited)
--   super_admin: -2 (no system limit)
-- =====================================================

-- =====================================================
-- ADD COLUMN
-- =====================================================

ALTER TABLE tier_limits
ADD COLUMN max_rounds_played INTEGER NOT NULL DEFAULT -1;

COMMENT ON COLUMN tier_limits.max_rounds_played IS 'Max rounds a user can participate in (submit scorecards for). -1 = unlimited, -2 = no system limit';

-- =====================================================
-- UPDATE TIER VALUES
-- =====================================================

-- Free tier: 20 rounds
UPDATE tier_limits
SET max_rounds_played = 20
WHERE tier = 'free';

-- Social tier: unlimited
UPDATE tier_limits
SET max_rounds_played = -1
WHERE tier = 'social';

-- Premium tier: unlimited
UPDATE tier_limits
SET max_rounds_played = -1
WHERE tier = 'premium';

-- Super Admin: no system limit
UPDATE tier_limits
SET max_rounds_played = -2
WHERE tier = 'super_admin';

-- =====================================================
-- HELPER FUNCTION: Count user's played standalone rounds
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_rounds_played_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  -- Count distinct STANDALONE rounds where user has a scorecard
  -- Only counts rounds where competition_id IS NULL (not competition rounds)
  -- We count submitted/completed scorecards as "played"
  RETURN (
    SELECT COUNT(DISTINCT s.round_id)
    FROM scorecards s
    INNER JOIN rounds r ON r.id = s.round_id
    WHERE s.player_id = p_user_id
      AND s.status IN ('completed', 'confirmed')
      AND r.competition_id IS NULL  -- Only standalone rounds
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_rounds_played_count IS 'Count the number of standalone rounds a user has played (excludes competition rounds)';

-- =====================================================
-- HELPER FUNCTION: Check if user can play another round
-- =====================================================

CREATE OR REPLACE FUNCTION user_can_play_round(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limits tier_limits;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier limits
  v_limits := get_user_tier_limits(p_user_id);

  -- -2 means no system limit (super admin bypass)
  IF v_limits.max_rounds_played = -2 THEN
    RETURN TRUE;
  END IF;

  -- -1 means unlimited
  IF v_limits.max_rounds_played = -1 THEN
    RETURN TRUE;
  END IF;

  -- Count current rounds played by user
  v_current_count := get_user_rounds_played_count(p_user_id);

  RETURN v_current_count < v_limits.max_rounds_played;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION user_can_play_round IS 'Check if a user can play more standalone rounds based on their tier limits (excludes competition rounds)';

-- =====================================================
-- HELPER FUNCTION: Get remaining rounds for user
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_remaining_rounds(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_limits tier_limits;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier limits
  v_limits := get_user_tier_limits(p_user_id);

  -- -2 or -1 means unlimited, return -1 to indicate unlimited
  IF v_limits.max_rounds_played IN (-2, -1) THEN
    RETURN -1;
  END IF;

  -- Calculate remaining
  v_current_count := get_user_rounds_played_count(p_user_id);

  RETURN GREATEST(0, v_limits.max_rounds_played - v_current_count);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_remaining_rounds IS 'Get the number of remaining standalone rounds a user can play (-1 = unlimited, excludes competition rounds)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
