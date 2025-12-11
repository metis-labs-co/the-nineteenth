-- =====================================================
-- User Subscriptions System
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration creates the subscription management system for:
-- - Free tier (default)
-- - Social tier (casual users)
-- - Premium tier (full feature access)
--
-- Supports manual subscriptions and future RevenueCat/Stripe integration
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- Subscription tier levels
-- super_admin: Internal team/company accounts with full access, no payment, never expires
CREATE TYPE subscription_tier AS ENUM ('free', 'social', 'premium', 'super_admin');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial');

-- Subscription source (how the subscription was created)
CREATE TYPE subscription_source AS ENUM ('manual', 'revenuecat', 'stripe');

-- =====================================================
-- TABLE: user_subscriptions
-- =====================================================

CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User relationship (one subscription per user)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription details
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  source subscription_source NOT NULL DEFAULT 'manual',

  -- External payment provider IDs
  external_id TEXT NULL,  -- RevenueCat subscriber ID or Stripe customer ID
  product_id TEXT NULL,   -- App Store/Play Store product ID

  -- Subscription dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL,  -- NULL for free tier (never expires)
  cancelled_at TIMESTAMPTZ NULL,

  -- Trial period tracking
  trial_started_at TIMESTAMPTZ NULL,
  trial_ends_at TIMESTAMPTZ NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each user can only have one subscription record
  CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for querying by tier (e.g., get all premium users)
CREATE INDEX idx_user_subscriptions_tier ON user_subscriptions(tier);

-- Index for querying by status (e.g., get all active subscriptions)
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- Index for expiration checks (e.g., find subscriptions expiring soon)
CREATE INDEX idx_user_subscriptions_expires ON user_subscriptions(expires_at)
  WHERE expires_at IS NOT NULL;

-- Index for external ID lookups (RevenueCat/Stripe webhooks)
CREATE INDEX idx_user_subscriptions_external_id ON user_subscriptions(external_id)
  WHERE external_id IS NOT NULL;

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================

-- Use existing trigger function if it exists, otherwise create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
  END IF;
END;
$$;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own subscription (for initial creation)
-- Note: In production, this would typically be handled by a server-side function
CREATE POLICY "Users can create their own subscription"
  ON user_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users cannot directly update subscriptions (must go through API/webhooks)
-- This prevents users from upgrading themselves without payment
-- CREATE POLICY "Users can update their own subscription"
--   ON user_subscriptions FOR UPDATE
--   USING (user_id = auth.uid());

-- Service role can do everything (for webhook handlers)
CREATE POLICY "Service role has full access"
  ON user_subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- FUNCTION: Get user subscription tier
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_subscription_tier(p_user_id UUID)
RETURNS subscription_tier AS $$
DECLARE
  v_tier subscription_tier;
  v_status subscription_status;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT tier, status, expires_at
  INTO v_tier, v_status, v_expires_at
  FROM user_subscriptions
  WHERE user_id = p_user_id;

  -- If no subscription record, return 'free'
  IF NOT FOUND THEN
    RETURN 'free'::subscription_tier;
  END IF;

  -- Super admin tier never expires
  IF v_tier = 'super_admin' THEN
    RETURN v_tier;
  END IF;

  -- If subscription is expired (past expiry date), return 'free'
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RETURN 'free'::subscription_tier;
  END IF;

  -- If subscription is not active, return 'free'
  IF v_status NOT IN ('active', 'trial') THEN
    RETURN 'free'::subscription_tier;
  END IF;

  RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check if user has specific tier or higher
-- =====================================================

CREATE OR REPLACE FUNCTION user_has_tier_or_higher(
  p_user_id UUID,
  p_required_tier subscription_tier
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_tier subscription_tier;
BEGIN
  v_current_tier := get_user_subscription_tier(p_user_id);

  -- Super admin has access to everything
  IF v_current_tier = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  -- Tier hierarchy: free < social < premium < super_admin
  CASE p_required_tier
    WHEN 'free' THEN
      RETURN TRUE;  -- Everyone has at least free
    WHEN 'social' THEN
      RETURN v_current_tier IN ('social', 'premium', 'super_admin');
    WHEN 'premium' THEN
      RETURN v_current_tier IN ('premium', 'super_admin');
    WHEN 'super_admin' THEN
      RETURN v_current_tier = 'super_admin';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Create or update subscription from webhook
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_user_subscription(
  p_user_id UUID,
  p_tier subscription_tier,
  p_status subscription_status,
  p_source subscription_source,
  p_external_id TEXT DEFAULT NULL,
  p_product_id TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  INSERT INTO user_subscriptions (
    user_id,
    tier,
    status,
    source,
    external_id,
    product_id,
    started_at,
    expires_at,
    trial_started_at,
    trial_ends_at
  )
  VALUES (
    p_user_id,
    p_tier,
    p_status,
    p_source,
    p_external_id,
    p_product_id,
    NOW(),
    p_expires_at,
    CASE WHEN p_status = 'trial' THEN NOW() ELSE NULL END,
    p_trial_ends_at
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    tier = EXCLUDED.tier,
    status = EXCLUDED.status,
    source = EXCLUDED.source,
    external_id = COALESCE(EXCLUDED.external_id, user_subscriptions.external_id),
    product_id = COALESCE(EXCLUDED.product_id, user_subscriptions.product_id),
    expires_at = EXCLUDED.expires_at,
    trial_ends_at = EXCLUDED.trial_ends_at,
    cancelled_at = CASE
      WHEN EXCLUDED.status = 'cancelled' THEN NOW()
      ELSE user_subscriptions.cancelled_at
    END,
    updated_at = NOW()
  RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Create default subscription for new users
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, tier, status, source)
  VALUES (NEW.id, 'free', 'active', 'manual')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default subscription when a new user is created
-- Note: This hooks into the players table since that's created on auth signup
CREATE TRIGGER create_default_subscription_on_player
  AFTER INSERT ON players
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_subscriptions IS 'User subscription management for tiered access control';
COMMENT ON COLUMN user_subscriptions.tier IS 'Subscription tier: free (default), social (casual users), premium (full access)';
COMMENT ON COLUMN user_subscriptions.status IS 'Current status: active, cancelled, expired, or trial';
COMMENT ON COLUMN user_subscriptions.source IS 'How subscription was created: manual, revenuecat, or stripe';
COMMENT ON COLUMN user_subscriptions.external_id IS 'RevenueCat subscriber ID or Stripe customer ID for webhook handling';
COMMENT ON COLUMN user_subscriptions.product_id IS 'App Store or Play Store product identifier';
COMMENT ON COLUMN user_subscriptions.expires_at IS 'When subscription expires (NULL for free tier = never expires)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
