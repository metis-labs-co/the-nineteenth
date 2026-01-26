-- =====================================================
-- Migration: Team Skins Support
-- =====================================================
-- Extends the skins game system to support team-based skins
-- where teams compete against each other instead of individuals.
--
-- Key Features:
-- - Team participants instead of individual players
-- - Team winners per hole
-- - Team-level payouts with auto-split to members
-- - Works with team formats: best-ball, scramble, shamble
-- =====================================================

-- ============================================================================
-- STEP 1: Add team skins columns to skins_games
-- ============================================================================

-- Add is_team_skins flag
ALTER TABLE skins_games
  ADD COLUMN IF NOT EXISTS is_team_skins BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN skins_games.is_team_skins IS 'TRUE if this is a team-based skins game';

-- Add participant_team_ids array
ALTER TABLE skins_games
  ADD COLUMN IF NOT EXISTS participant_team_ids UUID[] DEFAULT NULL;

COMMENT ON COLUMN skins_games.participant_team_ids IS 'Array of team UUIDs participating in team skins (2-4 teams)';

-- Drop the old constraint and add a new one that supports both modes
ALTER TABLE skins_games
  DROP CONSTRAINT IF EXISTS skins_participant_count;

ALTER TABLE skins_games
  ADD CONSTRAINT skins_participant_count CHECK (
    (is_team_skins = FALSE AND participant_ids IS NOT NULL AND array_length(participant_ids, 1) >= 2 AND array_length(participant_ids, 1) <= 4) OR
    (is_team_skins = TRUE AND participant_team_ids IS NOT NULL AND array_length(participant_team_ids, 1) >= 2 AND array_length(participant_team_ids, 1) <= 4)
  );

-- ============================================================================
-- STEP 2: Add team winner column to skins_results
-- ============================================================================

ALTER TABLE skins_results
  ADD COLUMN IF NOT EXISTS team_winner_id UUID REFERENCES teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN skins_results.team_winner_id IS 'Team that won this hole (for team skins), NULL if carryover';

-- Update the hole_scores comment to reflect team support
COMMENT ON COLUMN skins_results.hole_scores IS 'JSONB of scores. Individual: {player_id: {gross, net, strokes_received}}. Team: {team_id: {team_score, member_scores: {player_id: {gross, net}}}}';

-- ============================================================================
-- STEP 3: Add team columns to skins_payouts
-- ============================================================================

-- Add team_id column
ALTER TABLE skins_payouts
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

COMMENT ON COLUMN skins_payouts.team_id IS 'Team this payout is for (team skins)';

-- Add is_team_payout flag
ALTER TABLE skins_payouts
  ADD COLUMN IF NOT EXISTS is_team_payout BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN skins_payouts.is_team_payout IS 'TRUE if this is a team-level payout';

-- Make player_id nullable for team payouts
ALTER TABLE skins_payouts
  ALTER COLUMN player_id DROP NOT NULL;

-- Drop old unique constraint and add new ones for both individual and team
ALTER TABLE skins_payouts
  DROP CONSTRAINT IF EXISTS unique_skins_player_payout;

-- Unique constraint for individual payouts
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_skins_player_payout
  ON skins_payouts (skins_game_id, player_id)
  WHERE player_id IS NOT NULL AND is_team_payout = FALSE;

-- Unique constraint for team payouts
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_skins_team_payout
  ON skins_payouts (skins_game_id, team_id)
  WHERE team_id IS NOT NULL AND is_team_payout = TRUE;

-- ============================================================================
-- STEP 4: Create indexes for team queries
-- ============================================================================

-- Index for team participants (GIN for array containment queries)
CREATE INDEX IF NOT EXISTS idx_skins_games_team_participants
  ON skins_games USING GIN (participant_team_ids)
  WHERE participant_team_ids IS NOT NULL;

-- Index for team skins flag
CREATE INDEX IF NOT EXISTS idx_skins_games_is_team
  ON skins_games (is_team_skins)
  WHERE is_team_skins = TRUE;

-- Index for team winner lookup
CREATE INDEX IF NOT EXISTS idx_skins_results_team_winner
  ON skins_results (team_winner_id)
  WHERE team_winner_id IS NOT NULL;

-- Index for team payouts
CREATE INDEX IF NOT EXISTS idx_skins_payouts_team
  ON skins_payouts (team_id)
  WHERE team_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Add RLS policies for team skins
-- ============================================================================

-- Team members can view team skins games they're part of
CREATE POLICY "Team members can view their team skins games"
  ON skins_games FOR SELECT
  USING (
    is_team_skins = TRUE AND
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = ANY(skins_games.participant_team_ids)
        AND tm.player_id = auth.uid()
    )
  );

-- Team members can view results for their team skins games
CREATE POLICY "Team members can view team skins results"
  ON skins_results FOR SELECT
  USING (
    skins_game_id IN (
      SELECT sg.id FROM skins_games sg
      WHERE sg.is_team_skins = TRUE
        AND EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = ANY(sg.participant_team_ids)
            AND tm.player_id = auth.uid()
        )
    )
  );

-- Team members can view payouts for their team skins games
CREATE POLICY "Team members can view team skins payouts"
  ON skins_payouts FOR SELECT
  USING (
    skins_game_id IN (
      SELECT sg.id FROM skins_games sg
      WHERE sg.is_team_skins = TRUE
        AND EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = ANY(sg.participant_team_ids)
            AND tm.player_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
