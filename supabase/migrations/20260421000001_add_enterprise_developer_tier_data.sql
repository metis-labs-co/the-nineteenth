-- Migration: Seed enterprise + developer tier_limits rows and update helpers
--
-- Pairs with 20260421000000 which adds the two new enum values. That migration
-- must be committed first so the values are usable here.
--
-- Tier definitions:
--   enterprise: paid tier above premium, below super_admin. Higher resource
--               limits (200 competitions/leagues, 100 players/comp, 20 rounds
--               per comp); same feature set as premium.
--   developer:  internal-only tier above super_admin. Unlimited everything,
--               admin tools, plus access to beta features via the new
--               can_access_beta_features flag.
--
-- New column: can_access_beta_features — gates experimental/WIP UI behind
-- the developer tier so work can ship to production and be tested in the
-- real world without exposing it to ordinary super_admin users.

-- =====================================================
-- NEW COLUMN: can_access_beta_features
-- =====================================================

ALTER TABLE tier_limits
  ADD COLUMN IF NOT EXISTS can_access_beta_features BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN tier_limits.can_access_beta_features IS
  'Whether this tier can see beta/WIP features. TRUE only for developer tier.';

-- =====================================================
-- SEED: enterprise tier
-- =====================================================

INSERT INTO tier_limits (
  tier,
  max_competitions_owned,
  max_rounds_per_competition,
  max_players_per_competition,
  max_friends,
  max_rounds_played,
  max_leagues_owned,
  allowed_game_types,
  can_use_team_formats,
  can_use_scoring_pairs,
  can_export_data,
  can_use_api_course_search,
  can_view_basic_stats,
  can_view_score_distribution,
  can_view_advanced_stats,
  can_compare_stats,
  can_view_detailed_stats,
  can_view_handicap_history,
  can_view_achievement_leaderboard,
  can_use_ai_competition,
  can_manage_guests,
  can_use_gps_distance,
  can_use_skins_game,
  can_use_wolf_game,
  can_use_prize_pool,
  can_create_league,
  can_join_league,
  can_access_admin_tools,
  can_access_beta_features,
  requires_payment,
  can_expire,
  display_name,
  description,
  badge_color
) VALUES (
  'enterprise',
  200,    -- max_competitions_owned
  20,     -- max_rounds_per_competition
  100,    -- max_players_per_competition
  -1,     -- max_friends: unlimited
  -1,     -- max_rounds_played: unlimited
  200,    -- max_leagues_owned
  ARRAY['stableford', 'stroke', 'match-play', 'par', 'best-ball', 'scramble', 'shamble']::TEXT[],
  TRUE,   -- can_use_team_formats
  TRUE,   -- can_use_scoring_pairs
  TRUE,   -- can_export_data
  TRUE,   -- can_use_api_course_search
  TRUE,   -- can_view_basic_stats
  TRUE,   -- can_view_score_distribution
  TRUE,   -- can_view_advanced_stats
  TRUE,   -- can_compare_stats
  TRUE,   -- can_view_detailed_stats
  TRUE,   -- can_view_handicap_history
  TRUE,   -- can_view_achievement_leaderboard
  TRUE,   -- can_use_ai_competition
  TRUE,   -- can_manage_guests
  TRUE,   -- can_use_gps_distance
  TRUE,   -- can_use_skins_game
  TRUE,   -- can_use_wolf_game
  TRUE,   -- can_use_prize_pool
  TRUE,   -- can_create_league
  TRUE,   -- can_join_league
  FALSE,  -- can_access_admin_tools: still a customer tier
  FALSE,  -- can_access_beta_features
  TRUE,   -- requires_payment
  TRUE,   -- can_expire
  'Enterprise',
  'For large organisations and serious competition organisers',
  '#8b5cf6'  -- Violet
);

-- =====================================================
-- SEED: developer tier
-- =====================================================

INSERT INTO tier_limits (
  tier,
  max_competitions_owned,
  max_rounds_per_competition,
  max_players_per_competition,
  max_friends,
  max_rounds_played,
  max_leagues_owned,
  allowed_game_types,
  can_use_team_formats,
  can_use_scoring_pairs,
  can_export_data,
  can_use_api_course_search,
  can_view_basic_stats,
  can_view_score_distribution,
  can_view_advanced_stats,
  can_compare_stats,
  can_view_detailed_stats,
  can_view_handicap_history,
  can_view_achievement_leaderboard,
  can_use_ai_competition,
  can_manage_guests,
  can_use_gps_distance,
  can_use_skins_game,
  can_use_wolf_game,
  can_use_prize_pool,
  can_create_league,
  can_join_league,
  can_access_admin_tools,
  can_access_beta_features,
  requires_payment,
  can_expire,
  display_name,
  description,
  badge_color
) VALUES (
  'developer',
  -2,     -- no system limit on everything
  -2,
  -2,
  -1,
  -2,
  -2,
  ARRAY['stableford', 'stroke', 'match-play', 'par', 'best-ball', 'scramble', 'shamble']::TEXT[],
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE,
  TRUE, TRUE,
  TRUE,   -- can_access_admin_tools
  TRUE,   -- can_access_beta_features: THE point of this tier
  FALSE,  -- requires_payment: internal accounts
  FALSE,  -- can_expire: permanent
  'Developer',
  'Internal beta access for testing work-in-progress features',
  '#06b6d4'  -- Cyan
);

-- =====================================================
-- HELPER: never-expire tiers now include developer
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

  IF NOT FOUND THEN
    RETURN 'free'::subscription_tier;
  END IF;

  -- Internal tiers never expire
  IF v_tier IN ('super_admin', 'developer') THEN
    RETURN v_tier;
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    RETURN 'free'::subscription_tier;
  END IF;

  IF v_status NOT IN ('active', 'trial') THEN
    RETURN 'free'::subscription_tier;
  END IF;

  RETURN v_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER: tier hierarchy check extended for new tiers
-- =====================================================
-- Hierarchy: free < social < premium < enterprise < super_admin < developer.
-- Developer inherits super_admin privileges (above it in the hierarchy),
-- so any 'super_admin'-gated check passes for developer too.

CREATE OR REPLACE FUNCTION user_has_tier_or_higher(
  p_user_id UUID,
  p_required_tier subscription_tier
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_tier subscription_tier;
BEGIN
  v_current_tier := get_user_subscription_tier(p_user_id);

  -- Developer is the highest tier and bypasses all checks
  IF v_current_tier = 'developer' THEN
    RETURN TRUE;
  END IF;

  -- Super admin bypasses every customer-tier check
  IF v_current_tier = 'super_admin' THEN
    RETURN TRUE;
  END IF;

  CASE p_required_tier
    WHEN 'free' THEN
      RETURN TRUE;
    WHEN 'social' THEN
      RETURN v_current_tier IN ('social', 'premium', 'enterprise', 'super_admin', 'developer');
    WHEN 'premium' THEN
      RETURN v_current_tier IN ('premium', 'enterprise', 'super_admin', 'developer');
    WHEN 'enterprise' THEN
      RETURN v_current_tier IN ('enterprise', 'super_admin', 'developer');
    WHEN 'super_admin' THEN
      RETURN v_current_tier IN ('super_admin', 'developer');
    WHEN 'developer' THEN
      RETURN v_current_tier = 'developer';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER: feature check now knows about beta_features
-- =====================================================

CREATE OR REPLACE FUNCTION user_has_feature(
  p_user_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_limits tier_limits;
BEGIN
  v_limits := get_user_tier_limits(p_user_id);

  CASE p_feature
    WHEN 'team_formats' THEN RETURN v_limits.can_use_team_formats;
    WHEN 'scoring_pairs' THEN RETURN v_limits.can_use_scoring_pairs;
    WHEN 'export_data' THEN RETURN v_limits.can_export_data;
    WHEN 'api_course_search' THEN RETURN v_limits.can_use_api_course_search;
    WHEN 'basic_stats' THEN RETURN v_limits.can_view_basic_stats;
    WHEN 'score_distribution' THEN RETURN v_limits.can_view_score_distribution;
    WHEN 'advanced_stats' THEN RETURN v_limits.can_view_advanced_stats;
    WHEN 'compare_stats' THEN RETURN v_limits.can_compare_stats;
    WHEN 'admin_tools' THEN RETURN v_limits.can_access_admin_tools;
    WHEN 'beta_features' THEN RETURN v_limits.can_access_beta_features;
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
