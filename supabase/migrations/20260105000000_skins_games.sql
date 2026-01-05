-- =====================================================
-- Migration: Skins Games (Gambling Side-Game)
-- =====================================================
-- Adds support for skins gambling as a side-game that runs
-- alongside any existing game type (Stableford, Stroke Play, etc.)
-- where players compete hole-by-hole for a pot of money.
-- Tied holes result in carryover to the next hole.
--
-- Key Features:
-- - Add-on game type - Works alongside any scoring format
-- - Pot configuration - Per-hole value OR total pot amount
-- - Scoring type - Configurable gross or net scoring
-- - Carryover logic - Tied holes roll money to next hole
-- - Hole 18 split - Any remaining carryover splits evenly
-- - Premium tier - Requires Premium subscription
-- - Gambling disclaimer - Legal acknowledgment required
-- =====================================================

-- ============================================================================
-- STEP 1: Create skins_games table
-- ============================================================================

CREATE TABLE skins_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Round association (required)
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,

  -- Optional pairing association (null means all round players participate)
  pairing_id UUID REFERENCES pairings(id) ON DELETE SET NULL,

  -- Participants (2-4 players)
  participant_ids UUID[] NOT NULL,
  CONSTRAINT skins_participant_count CHECK (
    array_length(participant_ids, 1) >= 2 AND array_length(participant_ids, 1) <= 4
  ),

  -- Pot configuration
  pot_type TEXT NOT NULL CHECK (pot_type IN ('per_hole', 'total_pot')),
  pot_value DECIMAL(10,2) NOT NULL CHECK (pot_value > 0),
  currency TEXT NOT NULL DEFAULT 'AUD',

  -- Scoring configuration
  scoring_type TEXT NOT NULL DEFAULT 'gross' CHECK (scoring_type IN ('gross', 'net')),

  -- Game status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),

  -- Disclaimer acknowledgment (required for legal compliance)
  disclaimer_accepted_at TIMESTAMPTZ NOT NULL,
  disclaimer_accepted_by UUID NOT NULL REFERENCES players(id),

  -- Audit fields
  created_by UUID NOT NULL REFERENCES players(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add table and column comments
COMMENT ON TABLE skins_games IS 'Skins gambling side-games that run alongside regular rounds';
COMMENT ON COLUMN skins_games.round_id IS 'The round this skins game is associated with';
COMMENT ON COLUMN skins_games.pairing_id IS 'Optional pairing - if null, uses participant_ids directly';
COMMENT ON COLUMN skins_games.participant_ids IS 'Array of player UUIDs participating (2-4 players)';
COMMENT ON COLUMN skins_games.pot_type IS 'How the pot is calculated: per_hole or total_pot';
COMMENT ON COLUMN skins_games.pot_value IS 'Dollar amount - either per hole or total pot depending on pot_type';
COMMENT ON COLUMN skins_games.currency IS 'Currency code (default AUD for Australian market)';
COMMENT ON COLUMN skins_games.scoring_type IS 'Whether to use gross or net scores for determining winners';
COMMENT ON COLUMN skins_games.status IS 'Game status: active, completed, or cancelled';
COMMENT ON COLUMN skins_games.disclaimer_accepted_at IS 'Timestamp when gambling disclaimer was accepted';
COMMENT ON COLUMN skins_games.disclaimer_accepted_by IS 'Player who accepted the disclaimer';
COMMENT ON COLUMN skins_games.created_by IS 'Player who created the skins game';
COMMENT ON COLUMN skins_games.completed_at IS 'Timestamp when game was finalized';

-- ============================================================================
-- STEP 2: Create skins_results table
-- ============================================================================

CREATE TABLE skins_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game association
  skins_game_id UUID NOT NULL REFERENCES skins_games(id) ON DELETE CASCADE,

  -- Hole information
  hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),

  -- Winner (null if carryover due to tie)
  winner_id UUID REFERENCES players(id),

  -- Carryover flag
  is_carryover BOOLEAN NOT NULL DEFAULT FALSE,

  -- Scores for all participants
  -- Format: { "player_id": { "gross": 5, "net": 4, "strokes_received": 1 } }
  hole_scores JSONB NOT NULL,

  -- Pot values for this hole
  hole_pot_value DECIMAL(10,2) NOT NULL,
  carryover_to_next DECIMAL(10,2) NOT NULL DEFAULT 0,
  payout_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Calculation timestamp
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one result per hole per game
  CONSTRAINT unique_skins_hole UNIQUE (skins_game_id, hole_number)
);

-- Add table and column comments
COMMENT ON TABLE skins_results IS 'Hole-by-hole results for skins games';
COMMENT ON COLUMN skins_results.skins_game_id IS 'The skins game this result belongs to';
COMMENT ON COLUMN skins_results.hole_number IS 'Hole number (1-18)';
COMMENT ON COLUMN skins_results.winner_id IS 'Player who won this hole, or NULL if carryover';
COMMENT ON COLUMN skins_results.is_carryover IS 'TRUE if this hole was tied and pot carried over';
COMMENT ON COLUMN skins_results.hole_scores IS 'JSONB of all participant scores: {player_id: {gross, net, strokes_received}}';
COMMENT ON COLUMN skins_results.hole_pot_value IS 'Base pot value for this hole before carryover';
COMMENT ON COLUMN skins_results.carryover_to_next IS 'Amount carried over to next hole (0 if won)';
COMMENT ON COLUMN skins_results.payout_amount IS 'Total amount won on this hole (includes carryover)';
COMMENT ON COLUMN skins_results.calculated_at IS 'When this result was calculated';

-- ============================================================================
-- STEP 3: Create skins_payouts table
-- ============================================================================

CREATE TABLE skins_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Game association
  skins_game_id UUID NOT NULL REFERENCES skins_games(id) ON DELETE CASCADE,

  -- Player
  player_id UUID NOT NULL REFERENCES players(id),

  -- Financial summary
  buy_in DECIMAL(10,2) NOT NULL,
  total_winnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_result DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Hole statistics
  holes_won INTEGER NOT NULL DEFAULT 0,
  holes_tied INTEGER NOT NULL DEFAULT 0,
  holes_lost INTEGER NOT NULL DEFAULT 0,

  -- Calculation timestamp
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one payout record per player per game
  CONSTRAINT unique_skins_player_payout UNIQUE (skins_game_id, player_id)
);

-- Add table and column comments
COMMENT ON TABLE skins_payouts IS 'Final payout summary for each player in a skins game';
COMMENT ON COLUMN skins_payouts.skins_game_id IS 'The skins game this payout belongs to';
COMMENT ON COLUMN skins_payouts.player_id IS 'Player this payout is for';
COMMENT ON COLUMN skins_payouts.buy_in IS 'Amount the player paid to participate';
COMMENT ON COLUMN skins_payouts.total_winnings IS 'Total amount won across all holes';
COMMENT ON COLUMN skins_payouts.net_result IS 'Net profit/loss (total_winnings - buy_in)';
COMMENT ON COLUMN skins_payouts.holes_won IS 'Number of holes won outright';
COMMENT ON COLUMN skins_payouts.holes_tied IS 'Number of holes tied (contributed to carryover)';
COMMENT ON COLUMN skins_payouts.holes_lost IS 'Number of holes lost';
COMMENT ON COLUMN skins_payouts.calculated_at IS 'When this payout was calculated';

-- ============================================================================
-- STEP 4: Create indexes for efficient queries
-- ============================================================================

-- skins_games indexes
CREATE INDEX idx_skins_games_round ON skins_games(round_id);
CREATE INDEX idx_skins_games_pairing ON skins_games(pairing_id) WHERE pairing_id IS NOT NULL;
CREATE INDEX idx_skins_games_status ON skins_games(status);
CREATE INDEX idx_skins_games_created_by ON skins_games(created_by);
CREATE INDEX idx_skins_games_disclaimer_accepted_by ON skins_games(disclaimer_accepted_by);

-- skins_results indexes
CREATE INDEX idx_skins_results_game ON skins_results(skins_game_id);
CREATE INDEX idx_skins_results_winner ON skins_results(winner_id) WHERE winner_id IS NOT NULL;
CREATE INDEX idx_skins_results_hole ON skins_results(skins_game_id, hole_number);

-- skins_payouts indexes
CREATE INDEX idx_skins_payouts_game ON skins_payouts(skins_game_id);
CREATE INDEX idx_skins_payouts_player ON skins_payouts(player_id);

-- ============================================================================
-- STEP 5: Add updated_at trigger for skins_games
-- ============================================================================

CREATE TRIGGER update_skins_games_updated_at
  BEFORE UPDATE ON skins_games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Enable RLS and create policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE skins_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE skins_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE skins_payouts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- skins_games policies
-- =====================================================

-- Participants can view games they're part of
CREATE POLICY "Participants can view their skins games"
  ON skins_games FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

-- Creators can manage their games
CREATE POLICY "Creators can manage their skins games"
  ON skins_games FOR ALL
  USING (created_by = auth.uid());

-- Round organizers can manage skins games in their rounds
CREATE POLICY "Round organizers can manage skins games"
  ON skins_games FOR ALL
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
-- skins_results policies
-- =====================================================

-- Participants can view results for their games
CREATE POLICY "Participants can view skins results"
  ON skins_results FOR SELECT
  USING (
    skins_game_id IN (
      SELECT id FROM skins_games
      WHERE auth.uid() = ANY(participant_ids)
    )
  );

-- Creators can manage results for their games
CREATE POLICY "Creators can manage skins results"
  ON skins_results FOR ALL
  USING (
    skins_game_id IN (
      SELECT id FROM skins_games
      WHERE created_by = auth.uid()
    )
  );

-- =====================================================
-- skins_payouts policies
-- =====================================================

-- Players can view their own payouts
CREATE POLICY "Players can view their own skins payouts"
  ON skins_payouts FOR SELECT
  USING (player_id = auth.uid());

-- Participants can view all payouts for games they're in
CREATE POLICY "Participants can view game payouts"
  ON skins_payouts FOR SELECT
  USING (
    skins_game_id IN (
      SELECT id FROM skins_games
      WHERE auth.uid() = ANY(participant_ids)
    )
  );

-- Creators can manage payouts for their games
CREATE POLICY "Creators can manage skins payouts"
  ON skins_payouts FOR ALL
  USING (
    skins_game_id IN (
      SELECT id FROM skins_games
      WHERE created_by = auth.uid()
    )
  );

-- ============================================================================
-- STEP 7: Add can_use_skins to tier_limits
-- ============================================================================

ALTER TABLE tier_limits
  ADD COLUMN IF NOT EXISTS can_use_skins BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN tier_limits.can_use_skins IS 'Whether tier can create/join skins games (gambling feature)';

-- Update tier permissions
UPDATE tier_limits SET can_use_skins = FALSE WHERE tier IN ('free', 'social');
UPDATE tier_limits SET can_use_skins = TRUE WHERE tier IN ('premium', 'super_admin');

-- ============================================================================
-- STEP 8: Update user_has_feature function to handle 'skins'
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
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION user_has_feature IS 'Check if a user has access to a specific feature based on their tier (includes skins gambling feature)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
