-- =====================================================
-- Subscription Helper Functions & Backfill
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds:
-- 1. is_super_admin() convenience function
-- 2. Backfill query for existing users without subscriptions
-- =====================================================

-- =====================================================
-- FUNCTION: is_super_admin
-- =====================================================
-- Quick check if a user has super_admin tier
-- More efficient than calling get_user_subscription_tier() when
-- you only need to check for admin access

CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier subscription_tier;
BEGIN
  -- Get the user's effective tier
  v_tier := get_user_subscription_tier(p_user_id);

  RETURN v_tier = 'super_admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_super_admin IS 'Quick check if a user has super_admin tier (convenience wrapper around get_user_subscription_tier)';

-- =====================================================
-- BACKFILL: Create subscriptions for existing users
-- =====================================================
-- Insert free tier subscriptions for any existing players
-- who don't already have a subscription record

INSERT INTO user_subscriptions (user_id, tier, status, source)
SELECT
  p.id,
  'free'::subscription_tier,
  'active'::subscription_status,
  'manual'::subscription_source
FROM players p
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
