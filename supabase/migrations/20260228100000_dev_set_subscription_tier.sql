-- =====================================================
-- Dev Helper: Set own subscription tier
-- =====================================================
-- SECURITY DEFINER function that allows a user to update
-- their own subscription tier. Used for dev/staging testing
-- in Expo Go where RevenueCat is not available.
--
-- This is safe because:
-- 1. Users can only update their OWN subscription (auth.uid() check)
-- 2. The tier value is validated by the subscription_tier enum
-- 3. In production, RevenueCat webhooks are the source of truth
--    and will overwrite any manual changes on next sync

CREATE OR REPLACE FUNCTION set_own_subscription_tier(p_tier subscription_tier)
RETURNS void AS $$
BEGIN
  UPDATE user_subscriptions
  SET
    tier = p_tier,
    status = 'active',
    source = 'manual',
    updated_at = NOW()
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for current user';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_own_subscription_tier IS 'Allows a user to set their own subscription tier. Used for dev/staging testing.';
