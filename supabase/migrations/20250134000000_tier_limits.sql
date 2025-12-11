-- =====================================================
-- Tier Limits Configuration Table
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration creates a configuration table that defines
-- the limits and feature access for each subscription tier.
--
-- Special values for limit columns:
--   -1 = unlimited (no limit enforced)
--   -2 = no system limit (bypass all checks, used for super_admin)
-- =====================================================

-- =====================================================
-- TABLE: tier_limits
-- =====================================================

CREATE TABLE tier_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tier identifier (one row per tier)
  tier subscription_tier NOT NULL UNIQUE,

  -- =====================================================
  -- RESOURCE LIMITS
  -- =====================================================
  -- -1 = unlimited, -2 = no system limit (super admin bypass)

  -- Competition limits
  max_competitions_owned INTEGER NOT NULL,      -- Max competitions user can organize
  max_rounds_per_competition INTEGER NOT NULL,  -- Max rounds per competition
  max_players_per_competition INTEGER NOT NULL, -- Max players per competition

  -- Social limits
  max_friends INTEGER NOT NULL,                 -- Max friends a user can have

  -- =====================================================
  -- FEATURE ACCESS - Game Types & Formats
  -- =====================================================

  -- Game types allowed (array of game_type enum values as text)
  -- Options: 'stableford', 'stroke', 'match-play', 'ambrose', 'best-ball', 'scramble'
  allowed_game_types TEXT[] NOT NULL,

  -- Team format access
  can_use_team_formats BOOLEAN NOT NULL DEFAULT FALSE,

  -- Scoring pairs feature (competitive rounds)
  can_use_scoring_pairs BOOLEAN NOT NULL DEFAULT FALSE,

  -- Data export capability
  can_export_data BOOLEAN NOT NULL DEFAULT FALSE,

  -- Course API search (vs manual entry only)
  can_use_api_course_search BOOLEAN NOT NULL DEFAULT TRUE,

  -- =====================================================
  -- FEATURE ACCESS - Statistics
  -- =====================================================

  -- Basic stats (rounds played, average score, best round)
  can_view_basic_stats BOOLEAN NOT NULL DEFAULT TRUE,

  -- Score distribution charts
  can_view_score_distribution BOOLEAN NOT NULL DEFAULT FALSE,

  -- Advanced stats (fairways hit, GIR, putts per round, etc.)
  can_view_advanced_stats BOOLEAN NOT NULL DEFAULT FALSE,

  -- Compare stats with friends/other players
  can_compare_stats BOOLEAN NOT NULL DEFAULT FALSE,

  -- =====================================================
  -- FEATURE ACCESS - Admin
  -- =====================================================

  -- Access to admin tools (user management, analytics, etc.)
  can_access_admin_tools BOOLEAN NOT NULL DEFAULT FALSE,

  -- =====================================================
  -- BILLING & LIFECYCLE
  -- =====================================================

  -- Whether this tier requires payment (free tiers don't)
  requires_payment BOOLEAN NOT NULL DEFAULT TRUE,

  -- Whether subscriptions to this tier can expire
  can_expire BOOLEAN NOT NULL DEFAULT TRUE,

  -- =====================================================
  -- DISPLAY & UI
  -- =====================================================

  -- Human-readable tier name
  display_name TEXT NOT NULL,

  -- Description for UI
  description TEXT NULL,

  -- Badge color for UI (hex color code)
  badge_color TEXT NULL,

  -- =====================================================
  -- TIMESTAMPS
  -- =====================================================

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup is by tier, which is already UNIQUE (implicitly indexed)
-- No additional indexes needed for this small config table

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================

CREATE TRIGGER update_tier_limits_updated_at
  BEFORE UPDATE ON tier_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE tier_limits ENABLE ROW LEVEL SECURITY;

-- Everyone can read tier limits (it's public configuration)
CREATE POLICY "Anyone can view tier limits"
  ON tier_limits FOR SELECT
  USING (TRUE);

-- Only service role can modify (admin operations)
CREATE POLICY "Service role can manage tier limits"
  ON tier_limits FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- SEED DATA
-- =====================================================

INSERT INTO tier_limits (
  tier,
  max_competitions_owned,
  max_rounds_per_competition,
  max_players_per_competition,
  max_friends,
  allowed_game_types,
  can_use_team_formats,
  can_use_scoring_pairs,
  can_export_data,
  can_use_api_course_search,
  can_view_basic_stats,
  can_view_score_distribution,
  can_view_advanced_stats,
  can_compare_stats,
  can_access_admin_tools,
  requires_payment,
  can_expire,
  display_name,
  description,
  badge_color
) VALUES
-- =====================================================
-- FREE TIER
-- =====================================================
(
  'free',
  1,      -- max_competitions_owned: 1 competition
  1,      -- max_rounds_per_competition: 1 round
  8,      -- max_players_per_competition: 8 players
  5,      -- max_friends: 5 friends
  ARRAY['stableford']::TEXT[],  -- allowed_game_types: stableford only
  FALSE,  -- can_use_team_formats
  FALSE,  -- can_use_scoring_pairs
  FALSE,  -- can_export_data
  TRUE,   -- can_use_api_course_search
  TRUE,   -- can_view_basic_stats
  FALSE,  -- can_view_score_distribution
  FALSE,  -- can_view_advanced_stats
  FALSE,  -- can_compare_stats
  FALSE,  -- can_access_admin_tools
  FALSE,  -- requires_payment: FREE
  TRUE,   -- can_expire: TRUE (though free never expires in practice)
  'Free',
  'Get started with basic golf competition features',
  '#6b7280'  -- Gray
),

-- =====================================================
-- SOCIAL TIER
-- =====================================================
(
  'social',
  5,      -- max_competitions_owned: 5 competitions
  3,      -- max_rounds_per_competition: 3 rounds
  16,     -- max_players_per_competition: 16 players
  25,     -- max_friends: 25 friends
  ARRAY['stableford', 'stroke']::TEXT[],  -- allowed_game_types: stableford + stroke
  FALSE,  -- can_use_team_formats
  FALSE,  -- can_use_scoring_pairs
  TRUE,   -- can_export_data
  TRUE,   -- can_use_api_course_search
  TRUE,   -- can_view_basic_stats
  TRUE,   -- can_view_score_distribution
  FALSE,  -- can_view_advanced_stats
  TRUE,   -- can_compare_stats
  FALSE,  -- can_access_admin_tools
  TRUE,   -- requires_payment
  TRUE,   -- can_expire
  'Social',
  'Perfect for casual golfers and social groups',
  '#3b82f6'  -- Blue
),

-- =====================================================
-- PREMIUM TIER
-- =====================================================
(
  'premium',
  -1,     -- max_competitions_owned: unlimited
  10,     -- max_rounds_per_competition: 10 rounds
  40,     -- max_players_per_competition: 40 players
  -1,     -- max_friends: unlimited
  ARRAY['stableford', 'stroke', 'match-play', 'ambrose', 'best-ball', 'scramble']::TEXT[],  -- all game types
  TRUE,   -- can_use_team_formats
  TRUE,   -- can_use_scoring_pairs
  TRUE,   -- can_export_data
  TRUE,   -- can_use_api_course_search
  TRUE,   -- can_view_basic_stats
  TRUE,   -- can_view_score_distribution
  TRUE,   -- can_view_advanced_stats
  TRUE,   -- can_compare_stats
  FALSE,  -- can_access_admin_tools
  TRUE,   -- requires_payment
  TRUE,   -- can_expire
  'Premium',
  'Full-featured experience for serious competition organizers',
  '#f59e0b'  -- Amber/Gold
),

-- =====================================================
-- SUPER ADMIN TIER
-- =====================================================
(
  'super_admin',
  -2,     -- max_competitions_owned: no system limit
  -2,     -- max_rounds_per_competition: no system limit
  -2,     -- max_players_per_competition: no system limit
  -1,     -- max_friends: unlimited
  ARRAY['stableford', 'stroke', 'match-play', 'ambrose', 'best-ball', 'scramble']::TEXT[],  -- all game types
  TRUE,   -- can_use_team_formats
  TRUE,   -- can_use_scoring_pairs
  TRUE,   -- can_export_data
  TRUE,   -- can_use_api_course_search
  TRUE,   -- can_view_basic_stats
  TRUE,   -- can_view_score_distribution
  TRUE,   -- can_view_advanced_stats
  TRUE,   -- can_compare_stats
  TRUE,   -- can_access_admin_tools: YES (admin only)
  FALSE,  -- requires_payment: NO (internal accounts)
  FALSE,  -- can_expire: NO (permanent)
  'Super Admin',
  'Internal team accounts with full system access',
  '#dc2626'  -- Red
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get tier limits for a specific tier
CREATE OR REPLACE FUNCTION get_tier_limits(p_tier subscription_tier)
RETURNS tier_limits AS $$
BEGIN
  RETURN (SELECT * FROM tier_limits WHERE tier = p_tier);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get tier limits for a user (by user_id)
CREATE OR REPLACE FUNCTION get_user_tier_limits(p_user_id UUID)
RETURNS tier_limits AS $$
DECLARE
  v_tier subscription_tier;
BEGIN
  -- Get the user's effective tier
  v_tier := get_user_subscription_tier(p_user_id);

  -- Return the limits for that tier
  RETURN (SELECT * FROM tier_limits WHERE tier = v_tier);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if a user can create more competitions
CREATE OR REPLACE FUNCTION user_can_create_competition(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limits tier_limits;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier limits
  v_limits := get_user_tier_limits(p_user_id);

  -- -2 means no system limit (super admin bypass)
  IF v_limits.max_competitions_owned = -2 THEN
    RETURN TRUE;
  END IF;

  -- -1 means unlimited
  IF v_limits.max_competitions_owned = -1 THEN
    RETURN TRUE;
  END IF;

  -- Count current competitions owned by user
  SELECT COUNT(*) INTO v_current_count
  FROM competitions
  WHERE organizer_id = p_user_id
    AND status NOT IN ('completed', 'cancelled');  -- Only count active/upcoming

  RETURN v_current_count < v_limits.max_competitions_owned;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if a competition can add more rounds
CREATE OR REPLACE FUNCTION competition_can_add_round(p_competition_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_organizer_id UUID;
  v_limits tier_limits;
  v_current_count INTEGER;
BEGIN
  -- Get competition organizer
  SELECT organizer_id INTO v_organizer_id
  FROM competitions
  WHERE id = p_competition_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get organizer's tier limits
  v_limits := get_user_tier_limits(v_organizer_id);

  -- -2 means no system limit (super admin bypass)
  IF v_limits.max_rounds_per_competition = -2 THEN
    RETURN TRUE;
  END IF;

  -- -1 means unlimited
  IF v_limits.max_rounds_per_competition = -1 THEN
    RETURN TRUE;
  END IF;

  -- Count current rounds in competition
  SELECT COUNT(*) INTO v_current_count
  FROM rounds
  WHERE competition_id = p_competition_id;

  RETURN v_current_count < v_limits.max_rounds_per_competition;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if a competition can add more players
CREATE OR REPLACE FUNCTION competition_can_add_player(p_competition_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_organizer_id UUID;
  v_limits tier_limits;
  v_current_count INTEGER;
BEGIN
  -- Get competition organizer
  SELECT organizer_id INTO v_organizer_id
  FROM competitions
  WHERE id = p_competition_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get organizer's tier limits
  v_limits := get_user_tier_limits(v_organizer_id);

  -- -2 means no system limit (super admin bypass)
  IF v_limits.max_players_per_competition = -2 THEN
    RETURN TRUE;
  END IF;

  -- -1 means unlimited
  IF v_limits.max_players_per_competition = -1 THEN
    RETURN TRUE;
  END IF;

  -- Count current players in competition
  SELECT COUNT(*) INTO v_current_count
  FROM competition_players
  WHERE competition_id = p_competition_id
    AND status != 'declined';  -- Don't count declined invitations

  RETURN v_current_count < v_limits.max_players_per_competition;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if a user can add more friends
CREATE OR REPLACE FUNCTION user_can_add_friend(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limits tier_limits;
  v_current_count INTEGER;
BEGIN
  -- Get user's tier limits
  v_limits := get_user_tier_limits(p_user_id);

  -- -2 or -1 means unlimited
  IF v_limits.max_friends IN (-2, -1) THEN
    RETURN TRUE;
  END IF;

  -- Count current friends (accepted friendships where user is either party)
  SELECT COUNT(*) INTO v_current_count
  FROM friendships
  WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
    AND status = 'accepted';

  RETURN v_current_count < v_limits.max_friends;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if a user can use a specific game type
CREATE OR REPLACE FUNCTION user_can_use_game_type(
  p_user_id UUID,
  p_game_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_limits tier_limits;
BEGIN
  -- Get user's tier limits
  v_limits := get_user_tier_limits(p_user_id);

  -- Check if game type is in allowed list
  RETURN p_game_type = ANY(v_limits.allowed_game_types);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if a user has a specific feature
CREATE OR REPLACE FUNCTION user_has_feature(
  p_user_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_limits tier_limits;
BEGIN
  -- Get user's tier limits
  v_limits := get_user_tier_limits(p_user_id);

  -- Return the appropriate boolean based on feature name
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
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE tier_limits IS 'Configuration table defining limits and feature access for each subscription tier';

COMMENT ON COLUMN tier_limits.tier IS 'The subscription tier these limits apply to';
COMMENT ON COLUMN tier_limits.max_competitions_owned IS 'Max competitions a user can organize. -1 = unlimited, -2 = no system limit';
COMMENT ON COLUMN tier_limits.max_rounds_per_competition IS 'Max rounds per competition. -1 = unlimited, -2 = no system limit';
COMMENT ON COLUMN tier_limits.max_players_per_competition IS 'Max players per competition. -1 = unlimited, -2 = no system limit';
COMMENT ON COLUMN tier_limits.max_friends IS 'Max friends a user can have. -1 = unlimited';
COMMENT ON COLUMN tier_limits.allowed_game_types IS 'Array of game types this tier can use';
COMMENT ON COLUMN tier_limits.can_use_team_formats IS 'Whether tier can use team formats (ambrose, best-ball, etc.)';
COMMENT ON COLUMN tier_limits.can_use_scoring_pairs IS 'Whether tier can set up designated scorers for competitive rounds';
COMMENT ON COLUMN tier_limits.can_export_data IS 'Whether tier can export competition data';
COMMENT ON COLUMN tier_limits.can_use_api_course_search IS 'Whether tier can search courses via API (vs manual entry only)';
COMMENT ON COLUMN tier_limits.can_view_basic_stats IS 'Whether tier can view basic statistics';
COMMENT ON COLUMN tier_limits.can_view_score_distribution IS 'Whether tier can view score distribution charts';
COMMENT ON COLUMN tier_limits.can_view_advanced_stats IS 'Whether tier can view advanced statistics (GIR, fairways, etc.)';
COMMENT ON COLUMN tier_limits.can_compare_stats IS 'Whether tier can compare stats with other players';
COMMENT ON COLUMN tier_limits.can_access_admin_tools IS 'Whether tier has access to admin tools';
COMMENT ON COLUMN tier_limits.requires_payment IS 'Whether this tier requires payment (free tiers do not)';
COMMENT ON COLUMN tier_limits.can_expire IS 'Whether subscriptions to this tier can expire';
COMMENT ON COLUMN tier_limits.display_name IS 'Human-readable tier name for UI';
COMMENT ON COLUMN tier_limits.description IS 'Tier description for UI';
COMMENT ON COLUMN tier_limits.badge_color IS 'Hex color code for tier badge in UI';

COMMENT ON FUNCTION get_tier_limits IS 'Get the tier_limits record for a specific subscription tier';
COMMENT ON FUNCTION get_user_tier_limits IS 'Get the tier_limits record for a user based on their current subscription';
COMMENT ON FUNCTION user_can_create_competition IS 'Check if a user can create more competitions based on their tier limits';
COMMENT ON FUNCTION competition_can_add_round IS 'Check if a competition can add more rounds based on organizer tier limits';
COMMENT ON FUNCTION competition_can_add_player IS 'Check if a competition can add more players based on organizer tier limits';
COMMENT ON FUNCTION user_can_add_friend IS 'Check if a user can add more friends based on their tier limits';
COMMENT ON FUNCTION user_can_use_game_type IS 'Check if a user can use a specific game type based on their tier';
COMMENT ON FUNCTION user_has_feature IS 'Check if a user has access to a specific feature based on their tier';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
