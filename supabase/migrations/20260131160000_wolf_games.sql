-- =====================================================
-- Migration: Wolf Games (Strategic Partner Selection Side-Game)
-- =====================================================
-- Adds support for Wolf as a side-game that runs alongside
-- regular round scoring. Wolf is a strategic partner selection
-- game where a rotating "Wolf" player chooses to partner with
-- another player or go alone against the pack.
--
-- Key Features:
-- - Rotating Wolf player each hole
-- - Partner selection or lone wolf option
-- - Blind wolf for double points (declare before tee shots)
-- - Per-point pot configuration
-- - Supports stableford, stroke, and par game types
-- - Premium tier only
-- =====================================================

-- ============================================================================
-- STEP 1: Create wolf_games table
-- ============================================================================

CREATE TABLE wolf_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Round association (required)
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,

  -- Participants (3-4 players for Wolf)
  participant_ids UUID[] NOT NULL,
  CONSTRAINT wolf_participant_count CHECK (
    array_length(participant_ids, 1) >= 3 AND array_length(participant_ids, 1) <= 4
  ),

  -- Wolf rotation order (determines who is Wolf on each hole)
  wolf_order UUID[] NOT NULL,
  CONSTRAINT wolf_order_matches_participants CHECK (
    array_length(wolf_order, 1) = array_length(participant_ids, 1)
  ),

  -- Scoring configuration
  scoring_type TEXT NOT NULL DEFAULT 'gross' CHECK (scoring_type IN ('gross', 'net')),

  -- Blind Wolf option (can declare lone wolf before tee shots for double points)
  blind_wolf_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Pot configuration (optional - per-point betting)
  pot_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  pot_value DECIMAL(10,2) CHECK (pot_value IS NULL OR pot_value > 0),
  currency TEXT NOT NULL DEFAULT 'AUD',
  CONSTRAINT pot_value_required_if_enabled CHECK (
    (pot_enabled = FALSE) OR (pot_enabled = TRUE AND pot_value IS NOT NULL)
  ),

  -- Game status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),

  -- Disclaimer acknowledgment (required if pot is enabled)
  disclaimer_accepted_at TIMESTAMPTZ,
  disclaimer_accepted_by UUID REFERENCES players(id),
  CONSTRAINT disclaimer_required_if_pot_enabled CHECK (
    (pot_enabled = FALSE) OR
    (pot_enabled = TRUE AND disclaimer_accepted_at IS NOT NULL AND disclaimer_accepted_by IS NOT NULL)
  ),

  -- Audit fields
  created_by UUID NOT NULL REFERENCES players(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add table and column comments
COMMENT ON TABLE wolf_games IS 'Wolf side-games that run alongside regular rounds';
COMMENT ON COLUMN wolf_games.round_id IS 'The round this Wolf game is associated with';
COMMENT ON COLUMN wolf_games.participant_ids IS 'Array of player UUIDs participating (3-4 players)';
COMMENT ON COLUMN wolf_games.wolf_order IS 'Rotation order determining who is Wolf on each hole';
COMMENT ON COLUMN wolf_games.scoring_type IS 'Whether to use gross or net scores for determining winners';
COMMENT ON COLUMN wolf_games.blind_wolf_enabled IS 'Whether Blind Wolf option is available (double points if declared before any tee shots)';
COMMENT ON COLUMN wolf_games.pot_enabled IS 'Whether this game has money stakes';
COMMENT ON COLUMN wolf_games.pot_value IS 'Dollar amount per point when pot is enabled';
COMMENT ON COLUMN wolf_games.currency IS 'Currency code (default AUD for Australian market)';
COMMENT ON COLUMN wolf_games.status IS 'Game status: active, completed, or cancelled';
COMMENT ON COLUMN wolf_games.disclaimer_accepted_at IS 'Timestamp when gambling disclaimer was accepted';
COMMENT ON COLUMN wolf_games.disclaimer_accepted_by IS 'Player who accepted the disclaimer';
COMMENT ON COLUMN wolf_games.created_by IS 'Player who created the Wolf game';
COMMENT ON COLUMN wolf_games.completed_at IS 'Timestamp when game was finalized';

-- ============================================================================
-- STEP 2: Create wolf_hole_decisions table
-- ============================================================================

CREATE TABLE wolf_hole_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game association
  wolf_game_id UUID NOT NULL REFERENCES wolf_games(id) ON DELETE CASCADE,

  -- Hole information
  hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),

  -- Who is Wolf this hole (calculated from wolf_order and hole_number)
  wolf_id UUID NOT NULL REFERENCES players(id),

  -- Wolf's decision
  is_blind_wolf BOOLEAN NOT NULL DEFAULT FALSE,
  partner_id UUID REFERENCES players(id), -- NULL if lone wolf or blind wolf

  -- Scores for all participants on this hole
  -- Format: { "player_id": gross_score } (integers)
  hole_scores JSONB,

  -- Result (calculated after scores are entered)
  is_tie BOOLEAN NOT NULL DEFAULT FALSE,
  wolf_team_won BOOLEAN, -- NULL until calculated, or if tie

  -- Points awarded to each player (calculated)
  -- Format: { "player_id": points } (integers, can be positive or negative)
  points_awarded JSONB,

  -- Timestamps
  decided_at TIMESTAMPTZ, -- When Wolf made their partner decision
  calculated_at TIMESTAMPTZ, -- When hole result was calculated

  -- Ensure one decision per hole per game
  CONSTRAINT unique_wolf_hole UNIQUE (wolf_game_id, hole_number)
);

-- Add table and column comments
COMMENT ON TABLE wolf_hole_decisions IS 'Hole-by-hole Wolf decisions and results';
COMMENT ON COLUMN wolf_hole_decisions.wolf_game_id IS 'The Wolf game this decision belongs to';
COMMENT ON COLUMN wolf_hole_decisions.hole_number IS 'Hole number (1-18)';
COMMENT ON COLUMN wolf_hole_decisions.wolf_id IS 'Player who is Wolf on this hole';
COMMENT ON COLUMN wolf_hole_decisions.is_blind_wolf IS 'TRUE if Wolf declared blind before tee shots (double points)';
COMMENT ON COLUMN wolf_hole_decisions.partner_id IS 'Partner player ID, or NULL for lone wolf/blind wolf';
COMMENT ON COLUMN wolf_hole_decisions.hole_scores IS 'JSONB of participant gross scores: {player_id: score}';
COMMENT ON COLUMN wolf_hole_decisions.is_tie IS 'TRUE if best scores are tied (hole pushed, no points awarded)';
COMMENT ON COLUMN wolf_hole_decisions.wolf_team_won IS 'TRUE if Wolf team won, FALSE if pack won, NULL if tie or not yet calculated';
COMMENT ON COLUMN wolf_hole_decisions.points_awarded IS 'JSONB of points: {player_id: points}';
COMMENT ON COLUMN wolf_hole_decisions.decided_at IS 'When Wolf made their partner/lone decision';
COMMENT ON COLUMN wolf_hole_decisions.calculated_at IS 'When the hole result was calculated';

-- ============================================================================
-- STEP 3: Create wolf_payouts table
-- ============================================================================

CREATE TABLE wolf_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game association
  wolf_game_id UUID NOT NULL REFERENCES wolf_games(id) ON DELETE CASCADE,

  -- Player
  player_id UUID NOT NULL REFERENCES players(id),

  -- Point summary
  total_points INTEGER NOT NULL DEFAULT 0,

  -- Financial summary (only meaningful if pot_enabled)
  total_winnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_result DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Calculation timestamp
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one payout record per player per game
  CONSTRAINT unique_wolf_player_payout UNIQUE (wolf_game_id, player_id)
);

-- Add table and column comments
COMMENT ON TABLE wolf_payouts IS 'Final payout summary for each player in a Wolf game';
COMMENT ON COLUMN wolf_payouts.wolf_game_id IS 'The Wolf game this payout belongs to';
COMMENT ON COLUMN wolf_payouts.player_id IS 'Player this payout is for';
COMMENT ON COLUMN wolf_payouts.total_points IS 'Total points accumulated across all holes';
COMMENT ON COLUMN wolf_payouts.total_winnings IS 'Total money won (points * pot_value)';
COMMENT ON COLUMN wolf_payouts.net_result IS 'Net profit/loss after settling with other players';
COMMENT ON COLUMN wolf_payouts.calculated_at IS 'When this payout was calculated';

-- ============================================================================
-- STEP 4: Create indexes for efficient queries
-- ============================================================================

-- wolf_games indexes
CREATE INDEX idx_wolf_games_round ON wolf_games(round_id);
CREATE INDEX idx_wolf_games_status ON wolf_games(status);
CREATE INDEX idx_wolf_games_created_by ON wolf_games(created_by);

-- wolf_hole_decisions indexes
CREATE INDEX idx_wolf_decisions_game ON wolf_hole_decisions(wolf_game_id);
CREATE INDEX idx_wolf_decisions_hole ON wolf_hole_decisions(wolf_game_id, hole_number);
CREATE INDEX idx_wolf_decisions_wolf ON wolf_hole_decisions(wolf_id);

-- wolf_payouts indexes
CREATE INDEX idx_wolf_payouts_game ON wolf_payouts(wolf_game_id);
CREATE INDEX idx_wolf_payouts_player ON wolf_payouts(player_id);

-- ============================================================================
-- STEP 5: Add updated_at trigger for wolf_games
-- ============================================================================

CREATE TRIGGER update_wolf_games_updated_at
  BEFORE UPDATE ON wolf_games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Enable RLS and create policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE wolf_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolf_hole_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wolf_payouts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- wolf_games policies
-- =====================================================

-- Participants can view games they're part of
CREATE POLICY "Participants can view their wolf games"
  ON wolf_games FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

-- Creators can manage their games
CREATE POLICY "Creators can manage their wolf games"
  ON wolf_games FOR ALL
  USING (created_by = auth.uid());

-- Round organizers can manage Wolf games in their rounds
CREATE POLICY "Round organizers can manage wolf games"
  ON wolf_games FOR ALL
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT c.id FROM competitions c
        WHERE c.organizer_id = auth.uid()
      )
      OR r.user_id = auth.uid()
    )
  );

-- =====================================================
-- wolf_hole_decisions policies
-- =====================================================

-- Participants can view decisions for their games
CREATE POLICY "Participants can view wolf decisions"
  ON wolf_hole_decisions FOR SELECT
  USING (
    wolf_game_id IN (
      SELECT id FROM wolf_games
      WHERE auth.uid() = ANY(participant_ids)
    )
  );

-- Participants can insert/update decisions for their games
CREATE POLICY "Participants can manage wolf decisions"
  ON wolf_hole_decisions FOR ALL
  USING (
    wolf_game_id IN (
      SELECT id FROM wolf_games
      WHERE auth.uid() = ANY(participant_ids)
    )
  );

-- Creators can manage decisions for their games
CREATE POLICY "Creators can manage wolf decisions"
  ON wolf_hole_decisions FOR ALL
  USING (
    wolf_game_id IN (
      SELECT id FROM wolf_games
      WHERE created_by = auth.uid()
    )
  );

-- =====================================================
-- wolf_payouts policies
-- =====================================================

-- Players can view their own payouts
CREATE POLICY "Players can view their own wolf payouts"
  ON wolf_payouts FOR SELECT
  USING (player_id = auth.uid());

-- Participants can view all payouts for games they're in
CREATE POLICY "Participants can view game wolf payouts"
  ON wolf_payouts FOR SELECT
  USING (
    wolf_game_id IN (
      SELECT id FROM wolf_games
      WHERE auth.uid() = ANY(participant_ids)
    )
  );

-- Creators can manage payouts for their games
CREATE POLICY "Creators can manage wolf payouts"
  ON wolf_payouts FOR ALL
  USING (
    wolf_game_id IN (
      SELECT id FROM wolf_games
      WHERE created_by = auth.uid()
    )
  );

-- ============================================================================
-- STEP 7: Add can_use_wolf to tier_limits
-- ============================================================================

ALTER TABLE tier_limits
  ADD COLUMN IF NOT EXISTS can_use_wolf BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN tier_limits.can_use_wolf IS 'Whether tier can create/join Wolf games';

-- Update tier permissions (same as skins - Premium and Super Admin only)
UPDATE tier_limits SET can_use_wolf = FALSE WHERE tier IN ('free', 'social');
UPDATE tier_limits SET can_use_wolf = TRUE WHERE tier IN ('premium', 'super_admin');

-- ============================================================================
-- STEP 8: Update user_has_feature function to handle 'wolf'
-- ============================================================================

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
    WHEN 'skins' THEN RETURN v_limits.can_use_skins;
    WHEN 'wolf' THEN RETURN v_limits.can_use_wolf;
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION user_has_feature IS 'Check if a user has access to a specific feature based on their tier (includes skins and wolf features)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
