-- =============================================================================
-- Migration: Fix subscription trigger for placeholder players
-- =============================================================================
--
-- Problem: The create_default_subscription trigger fires on ALL player inserts,
-- but placeholder players don't have an auth.users entry. This causes a foreign
-- key violation when creating a subscription for a placeholder player.
--
-- Error: "insert or update on table "user_subscriptions" violates foreign key
-- constraint "user_subscriptions_user_id_fkey" - Key (user_id)=(...) is not
-- present in table "users"."
--
-- Solution: Modify the trigger function to skip placeholder players.
-- =============================================================================

-- Drop and recreate the function to check for placeholder players
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip placeholder players - they don't have auth.users entries
  -- Only real players (is_placeholder = FALSE or NULL) should get subscriptions
  IF NEW.is_placeholder = TRUE THEN
    RETURN NEW;
  END IF;

  -- Create default free subscription for real players only
  INSERT INTO user_subscriptions (user_id, tier, status, source)
  VALUES (NEW.id, 'free', 'active', 'manual')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The existing trigger will automatically use the updated function
-- No need to recreate the trigger itself

COMMENT ON FUNCTION create_default_subscription IS 'Creates a default free subscription for new real players (skips placeholder players)';
