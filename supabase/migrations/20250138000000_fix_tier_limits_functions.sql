-- =====================================================
-- Fix Tier Limits Functions
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration fixes the "subquery must return only one column" error
-- in the get_tier_limits and get_user_tier_limits functions.
--
-- The issue was using `RETURN (SELECT * FROM ...)` which doesn't work
-- for returning composite types. The fix uses `SELECT ... INTO` instead.
-- =====================================================

-- Fix get_tier_limits function
CREATE OR REPLACE FUNCTION get_tier_limits(p_tier subscription_tier)
RETURNS tier_limits AS $$
DECLARE
  v_result tier_limits;
BEGIN
  SELECT * INTO v_result
  FROM tier_limits
  WHERE tier = p_tier;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Fix get_user_tier_limits function
CREATE OR REPLACE FUNCTION get_user_tier_limits(p_user_id UUID)
RETURNS tier_limits AS $$
DECLARE
  v_tier subscription_tier;
  v_result tier_limits;
BEGIN
  -- Get the user's effective tier
  v_tier := get_user_subscription_tier(p_user_id);

  -- Return the limits for that tier
  SELECT * INTO v_result
  FROM tier_limits
  WHERE tier = v_tier;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
