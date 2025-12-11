-- =====================================================
-- Migration: Scoring Pairs
-- =====================================================
-- Adds support for designated scoring pairs where one player
-- (the marker/scorer) is responsible for recording another
-- player's score. This is a common golf practice where players
-- swap scorecards and mark each other's scores.
--
-- Key Features:
-- - Each player has exactly one scorer per round (enforced by unique constraint)
-- - A player cannot be their own scorer (enforced by check constraint)
-- - Organizers can optionally require scoring pairs for competition rounds
-- =====================================================

-- ============================================================================
-- STEP 1: Create scoring_pairs table
-- ============================================================================

CREATE TABLE scoring_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  scorer_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- The marker (person recording the score)
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- The player being scored

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  -- Each player can only have one scorer per round
  CONSTRAINT unique_player_scorer_per_round UNIQUE (round_id, player_id),
  -- A player cannot be their own scorer
  CONSTRAINT different_scorer_player CHECK (scorer_id != player_id)
);

-- Add table comment
COMMENT ON TABLE scoring_pairs IS 'Designated scoring pairs where one player marks another players score';
COMMENT ON COLUMN scoring_pairs.scorer_id IS 'The marker - player responsible for recording the score';
COMMENT ON COLUMN scoring_pairs.player_id IS 'The player whose score is being recorded';

-- ============================================================================
-- STEP 2: Create indexes for efficient queries
-- ============================================================================

-- Index for looking up all scoring pairs in a round
CREATE INDEX idx_scoring_pairs_round ON scoring_pairs(round_id);

-- Index for finding rounds where a player is the scorer
CREATE INDEX idx_scoring_pairs_scorer ON scoring_pairs(scorer_id);

-- Index for finding who scores a specific player
CREATE INDEX idx_scoring_pairs_player ON scoring_pairs(player_id);

-- Composite index for common query: get scorer for a player in a round
CREATE INDEX idx_scoring_pairs_round_scorer ON scoring_pairs(round_id, scorer_id);

-- Composite index for reverse lookup: who is this player scoring in a round
CREATE INDEX idx_scoring_pairs_round_player ON scoring_pairs(round_id, player_id);

-- ============================================================================
-- STEP 3: Add updated_at trigger
-- ============================================================================

CREATE TRIGGER update_scoring_pairs_updated_at
  BEFORE UPDATE ON scoring_pairs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Alter rounds table to add scoring_pairs_required flag
-- ============================================================================

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS scoring_pairs_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN rounds.scoring_pairs_required IS 'If TRUE, scoring pairs must be set up before the round can start';

-- ============================================================================
-- STEP 5: Enable RLS and create policies
-- ============================================================================

ALTER TABLE scoring_pairs ENABLE ROW LEVEL SECURITY;

-- Policy: Organizers can manage (SELECT, INSERT, UPDATE, DELETE) scoring pairs in their competitions
CREATE POLICY "Organizers can manage scoring pairs"
  ON scoring_pairs FOR ALL
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT c.id FROM competitions c
        WHERE c.organizer_id = auth.uid()
      )
    )
  );

-- Policy: Organizers can manage scoring pairs for their standalone rounds
CREATE POLICY "Users can manage scoring pairs for their standalone rounds"
  ON scoring_pairs FOR ALL
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.user_id = auth.uid()
    )
  );

-- Policy: Players can view scoring pairs in competitions they're part of
CREATE POLICY "Players can view scoring pairs in their competitions"
  ON scoring_pairs FOR SELECT
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT cp.competition_id FROM competition_players cp
        WHERE cp.player_id = auth.uid()
        AND cp.status = 'accepted'
      )
    )
  );

-- Policy: Players can view scoring pairs where they are scorer or player
CREATE POLICY "Players can view their own scoring pairs"
  ON scoring_pairs FOR SELECT
  USING (
    scorer_id = auth.uid() OR player_id = auth.uid()
  );

-- ============================================================================
-- STEP 6: Helper function to get scoring assignment for a player in a round
-- ============================================================================

-- Get who a player is scoring (returns the player_id they are marking)
CREATE OR REPLACE FUNCTION get_player_scoring_assignment(
  p_round_id UUID,
  p_scorer_id UUID
)
RETURNS UUID AS $$
  SELECT player_id
  FROM scoring_pairs
  WHERE round_id = p_round_id
  AND scorer_id = p_scorer_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_player_scoring_assignment IS 'Get the player_id that a scorer is responsible for marking in a round';

-- Get who is scoring a player (returns the scorer_id marking their card)
CREATE OR REPLACE FUNCTION get_player_scorer(
  p_round_id UUID,
  p_player_id UUID
)
RETURNS UUID AS $$
  SELECT scorer_id
  FROM scoring_pairs
  WHERE round_id = p_round_id
  AND player_id = p_player_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_player_scorer IS 'Get the scorer_id who is responsible for marking a players score in a round';

-- ============================================================================
-- STEP 7: Function to validate scoring pairs for a round
-- ============================================================================

-- Validates that all players in a round have exactly one scorer assigned
CREATE OR REPLACE FUNCTION validate_scoring_pairs(p_round_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  missing_players UUID[],
  message TEXT
) AS $$
DECLARE
  v_round rounds%ROWTYPE;
  v_competition_id UUID;
  v_player_ids UUID[];
  v_scored_player_ids UUID[];
  v_missing UUID[];
BEGIN
  -- Get round info
  SELECT * INTO v_round FROM rounds WHERE id = p_round_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, ARRAY[]::UUID[], 'Round not found'::TEXT;
    RETURN;
  END IF;

  -- Get competition_id (could be NULL for standalone rounds)
  v_competition_id := v_round.competition_id;

  IF v_competition_id IS NULL THEN
    -- For standalone rounds, just check if scoring_pairs_required is true
    IF NOT v_round.scoring_pairs_required THEN
      RETURN QUERY SELECT TRUE, ARRAY[]::UUID[], 'Scoring pairs not required for this round'::TEXT;
      RETURN;
    END IF;

    -- For standalone rounds, we cant easily validate - just return valid
    RETURN QUERY SELECT TRUE, ARRAY[]::UUID[], 'Standalone round - manual validation required'::TEXT;
    RETURN;
  END IF;

  -- Get all accepted players in the competition
  SELECT ARRAY_AGG(player_id) INTO v_player_ids
  FROM competition_players
  WHERE competition_id = v_competition_id
  AND status = 'accepted';

  IF v_player_ids IS NULL OR array_length(v_player_ids, 1) = 0 THEN
    RETURN QUERY SELECT TRUE, ARRAY[]::UUID[], 'No players in competition'::TEXT;
    RETURN;
  END IF;

  -- Get all players who have a scorer assigned
  SELECT ARRAY_AGG(player_id) INTO v_scored_player_ids
  FROM scoring_pairs
  WHERE round_id = p_round_id;

  IF v_scored_player_ids IS NULL THEN
    v_scored_player_ids := ARRAY[]::UUID[];
  END IF;

  -- Find players without a scorer
  SELECT ARRAY_AGG(pid) INTO v_missing
  FROM unnest(v_player_ids) AS pid
  WHERE NOT (pid = ANY(v_scored_player_ids));

  IF v_missing IS NULL OR array_length(v_missing, 1) = 0 THEN
    RETURN QUERY SELECT TRUE, ARRAY[]::UUID[], 'All players have scorers assigned'::TEXT;
  ELSE
    RETURN QUERY SELECT
      FALSE,
      v_missing,
      format('%s player(s) do not have a scorer assigned', array_length(v_missing, 1))::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION validate_scoring_pairs IS 'Validates that all players in a competition round have exactly one scorer assigned';

-- ============================================================================
-- STEP 8: Function to auto-generate reciprocal scoring pairs
-- ============================================================================

-- Auto-generates scoring pairs where players score each other (reciprocal)
-- This is a common pattern in golf where A scores B and B scores A
CREATE OR REPLACE FUNCTION generate_reciprocal_scoring_pairs(p_round_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_pairing pairings%ROWTYPE;
  v_player_ids UUID[];
  v_pairs_created INTEGER := 0;
  i INTEGER;
  j INTEGER;
BEGIN
  -- Get all pairings for this round
  FOR v_pairing IN SELECT * FROM pairings WHERE round_id = p_round_id
  LOOP
    v_player_ids := v_pairing.player_ids;

    -- For each pairing, create reciprocal scoring pairs
    -- Player 1 scores Player 2, Player 2 scores Player 1, etc.
    IF array_length(v_player_ids, 1) >= 2 THEN
      FOR i IN 1..array_length(v_player_ids, 1) LOOP
        -- Each player scores the next player in the array (circular)
        j := i % array_length(v_player_ids, 1) + 1;

        -- Insert scoring pair (scorer scores player)
        INSERT INTO scoring_pairs (round_id, scorer_id, player_id)
        VALUES (p_round_id, v_player_ids[i], v_player_ids[j])
        ON CONFLICT (round_id, player_id) DO NOTHING;

        IF FOUND THEN
          v_pairs_created := v_pairs_created + 1;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_pairs_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_reciprocal_scoring_pairs IS 'Auto-generates circular scoring pairs from existing pairings (Player 1 scores Player 2, Player 2 scores Player 3, etc.)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
