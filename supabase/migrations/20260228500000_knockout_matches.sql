-- =====================================================
-- Knockout Tournament Matches
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Knockout tournaments use single elimination + full consolation.
-- All rounds/matches created upfront when bracket is generated.
-- Winners advance via next_match_id, losers route to consolation_match_id.
-- =====================================================

-- =====================================================
-- ADD knockout_config TO competitions
-- =====================================================

ALTER TABLE competitions ADD COLUMN IF NOT EXISTS knockout_config JSONB;

COMMENT ON COLUMN competitions.knockout_config IS 'Knockout bracket config: { playerCount, seedingMethod, bracketGenerated }';

-- =====================================================
-- TABLE: knockout_matches
-- =====================================================

CREATE TABLE knockout_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  bracket_type TEXT NOT NULL CHECK (bracket_type IN ('main', 'consolation')),
  bracket_position INTEGER NOT NULL,
  stage INTEGER NOT NULL,
  player1_id UUID REFERENCES players(id),
  player2_id UUID REFERENCES players(id),
  seed1 INTEGER,
  seed2 INTEGER,
  winner_id UUID REFERENCES players(id),
  loser_id UUID REFERENCES players(id),
  player1_score NUMERIC,
  player2_score NUMERIC,
  next_match_id UUID REFERENCES knockout_matches(id),
  next_match_slot INTEGER CHECK (next_match_slot IN (1, 2)),
  consolation_match_id UUID REFERENCES knockout_matches(id),
  consolation_match_slot INTEGER CHECK (consolation_match_slot IN (1, 2)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'completed', 'bye')),
  pairing_id UUID REFERENCES pairings(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_match_position UNIQUE (competition_id, bracket_type, stage, bracket_position)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_knockout_matches_competition ON knockout_matches(competition_id);
CREATE INDEX idx_knockout_matches_round ON knockout_matches(round_id);
CREATE INDEX idx_knockout_matches_status ON knockout_matches(status);
CREATE INDEX idx_knockout_matches_player1 ON knockout_matches(player1_id) WHERE player1_id IS NOT NULL;
CREATE INDEX idx_knockout_matches_player2 ON knockout_matches(player2_id) WHERE player2_id IS NOT NULL;
CREATE INDEX idx_knockout_matches_next ON knockout_matches(next_match_id) WHERE next_match_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE knockout_matches ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is a competition member
-- (reuses existing competition_players table)
CREATE OR REPLACE FUNCTION is_knockout_competition_member(p_competition_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM competition_players
    WHERE competition_id = p_competition_id AND player_id = p_user_id AND status = 'accepted'
  )
  OR EXISTS (
    SELECT 1 FROM competitions
    WHERE id = p_competition_id AND organizer_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Members and organizer can view matches
CREATE POLICY knockout_matches_select ON knockout_matches FOR SELECT
  USING (is_knockout_competition_member(competition_id, auth.uid()));

-- Only organizer can insert matches (bracket generation)
CREATE POLICY knockout_matches_insert ON knockout_matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE id = knockout_matches.competition_id AND organizer_id = auth.uid()
    )
  );

-- Only organizer can update matches (advance winners, complete matches)
CREATE POLICY knockout_matches_update ON knockout_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE id = knockout_matches.competition_id AND organizer_id = auth.uid()
    )
  );

-- Only organizer can delete matches (bracket reset)
CREATE POLICY knockout_matches_delete ON knockout_matches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE id = knockout_matches.competition_id AND organizer_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_knockout_matches_updated_at
  BEFORE UPDATE ON knockout_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE knockout_matches IS 'Individual matches in a knockout tournament bracket (main + consolation)';
COMMENT ON COLUMN knockout_matches.bracket_type IS 'main = winners bracket, consolation = losers bracket';
COMMENT ON COLUMN knockout_matches.bracket_position IS '0-based position within this stage';
COMMENT ON COLUMN knockout_matches.stage IS '0 = first round, increments each stage';
COMMENT ON COLUMN knockout_matches.next_match_id IS 'Match the winner advances to';
COMMENT ON COLUMN knockout_matches.next_match_slot IS 'Slot (1 or 2) in the next match the winner fills';
COMMENT ON COLUMN knockout_matches.consolation_match_id IS 'Match the loser is routed to (consolation bracket)';
COMMENT ON COLUMN knockout_matches.consolation_match_slot IS 'Slot (1 or 2) in the consolation match the loser fills';
COMMENT ON FUNCTION is_knockout_competition_member IS 'Check if user is a member or organizer of a competition';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
