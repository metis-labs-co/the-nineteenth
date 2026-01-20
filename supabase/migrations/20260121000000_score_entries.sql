-- =====================================================
-- Migration: Score Entries for Mismatch Detection
-- =====================================================
-- Adds support for dual score tracking where both the player and their
-- scoring partner record scores independently. This enables automatic
-- mismatch detection when scores differ between the two versions.
--
-- Key Features:
-- - Each score entry tracks who entered it (scorer_id)
-- - A player can have two entries per hole: one from self, one from partner
-- - Mismatch detection compares self-entered vs partner-entered scores
-- - Resolution UI allows either party to resolve conflicts
-- - 30-minute bypass timer for when partner is unavailable
-- =====================================================

-- ============================================================================
-- STEP 1: Create score_entries table
-- ============================================================================
-- This table stores individual score entries with attribution.
-- For each hole, a player may have up to 2 entries:
-- 1. Their own entry (scorer_id = player_id)
-- 2. Their partner's entry (scorer_id = partner's player_id)

CREATE TABLE score_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- Player whose score this is FOR
  hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
  scorer_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- Who ENTERED this score

  -- Score Data
  strokes INTEGER NOT NULL CHECK (strokes > 0),
  putts INTEGER CHECK (putts >= 0),
  penalties INTEGER DEFAULT 0 CHECK (penalties >= 0),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  -- Each player can have only one entry per hole from each scorer
  CONSTRAINT unique_score_entry_per_scorer UNIQUE (round_id, player_id, hole_number, scorer_id)
);

-- Add table comments
COMMENT ON TABLE score_entries IS 'Individual score entries with attribution for mismatch detection. A player may have two entries per hole: self-entered and partner-entered.';
COMMENT ON COLUMN score_entries.player_id IS 'The player whose score this entry represents';
COMMENT ON COLUMN score_entries.scorer_id IS 'The player who physically entered this score';
COMMENT ON COLUMN score_entries.strokes IS 'Number of strokes for this hole';
COMMENT ON COLUMN score_entries.putts IS 'Number of putts (optional tracking)';
COMMENT ON COLUMN score_entries.penalties IS 'Number of penalty strokes';

-- ============================================================================
-- STEP 2: Create indexes for efficient queries
-- ============================================================================

-- Index for looking up all entries in a round
CREATE INDEX idx_score_entries_round ON score_entries(round_id);

-- Composite index for getting both versions of a player's score on a hole
CREATE INDEX idx_score_entries_round_player_hole ON score_entries(round_id, player_id, hole_number);

-- Index for getting all entries by a scorer (their entered scores)
CREATE INDEX idx_score_entries_round_scorer ON score_entries(round_id, scorer_id);

-- ============================================================================
-- STEP 3: Add updated_at trigger
-- ============================================================================

CREATE TRIGGER update_score_entries_updated_at
  BEFORE UPDATE ON score_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Create score_mismatches table
-- ============================================================================
-- Tracks detected mismatches between self-entered and partner-entered scores.
-- Created when both players have submitted entries but scores differ.

CREATE TABLE score_mismatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- Player whose score has the mismatch
  hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),

  -- The conflicting scores
  self_score INTEGER NOT NULL,     -- What the player recorded for themselves
  partner_score INTEGER NOT NULL,  -- What their partner recorded for them
  self_scorer_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  partner_scorer_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Resolution status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_score INTEGER,          -- The agreed-upon final score
  resolved_by UUID REFERENCES players(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  -- One mismatch record per player per hole per round
  CONSTRAINT unique_mismatch_per_player_hole UNIQUE (round_id, player_id, hole_number)
);

-- Add table comments
COMMENT ON TABLE score_mismatches IS 'Detected score discrepancies between self-entered and partner-entered scores, requiring resolution';
COMMENT ON COLUMN score_mismatches.self_score IS 'Score the player recorded for themselves';
COMMENT ON COLUMN score_mismatches.partner_score IS 'Score the partners recorded for the player';
COMMENT ON COLUMN score_mismatches.status IS 'pending = needs resolution, resolved = agreed score recorded';
COMMENT ON COLUMN score_mismatches.resolved_score IS 'The final agreed-upon score after resolution';
COMMENT ON COLUMN score_mismatches.resolved_by IS 'Player who resolved the mismatch (first-write-wins)';

-- Indexes for score_mismatches
CREATE INDEX idx_score_mismatches_round ON score_mismatches(round_id);
CREATE INDEX idx_score_mismatches_round_status ON score_mismatches(round_id, status);

-- ============================================================================
-- STEP 5: Create score_submission_status table
-- ============================================================================
-- Tracks the submission process, particularly the 30-minute bypass timer
-- for when a partner is unresponsive.

CREATE TABLE score_submission_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,  -- Player attempting submission
  partner_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE, -- Their scoring partner

  -- Bypass timer tracking
  bypass_available_at TIMESTAMPTZ,  -- When bypass becomes available (30 mins after first attempt)
  bypassed_at TIMESTAMPTZ,          -- When bypass was actually used
  bypassed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_submission_status_per_player UNIQUE (round_id, player_id)
);

-- Add table comments
COMMENT ON TABLE score_submission_status IS 'Tracks submission progress and bypass timer for partner verification';
COMMENT ON COLUMN score_submission_status.bypass_available_at IS 'When the 30-minute bypass timer expires and submission without verification is allowed';
COMMENT ON COLUMN score_submission_status.bypassed IS 'TRUE if submission was completed without partner verification';

-- Index for score_submission_status
CREATE INDEX idx_score_submission_status_round ON score_submission_status(round_id);

-- Trigger for updated_at
CREATE TRIGGER update_score_submission_status_updated_at
  BEFORE UPDATE ON score_submission_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Add bypassed column to scorecards table
-- ============================================================================
-- Flags scorecards that were submitted without partner verification.

ALTER TABLE scorecards
  ADD COLUMN IF NOT EXISTS bypassed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN scorecards.bypassed IS 'TRUE if this scorecard was submitted without partner verification (30-minute bypass used)';

-- ============================================================================
-- STEP 7: Enable RLS and create policies for score_entries
-- ============================================================================

ALTER TABLE score_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view entries for rounds they're participating in (via competition)
CREATE POLICY "Players can view score entries in their competitions"
  ON score_entries FOR SELECT
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

-- Policy: Players can view entries for standalone rounds they created
CREATE POLICY "Users can view score entries in their standalone rounds"
  ON score_entries FOR SELECT
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.user_id = auth.uid()
    )
  );

-- Policy: Players can view entries for rounds they're players in (via round_players)
CREATE POLICY "Players can view score entries in rounds they participate in"
  ON score_entries FOR SELECT
  USING (
    round_id IN (
      SELECT rp.round_id FROM round_players rp
      WHERE rp.player_id = auth.uid()
    )
  );

-- Policy: Players can insert entries where they are the scorer
CREATE POLICY "Players can insert their own score entries"
  ON score_entries FOR INSERT
  WITH CHECK (
    scorer_id = auth.uid()
  );

-- Policy: Players can update their own entries
CREATE POLICY "Players can update their own score entries"
  ON score_entries FOR UPDATE
  USING (
    scorer_id = auth.uid()
  );

-- Policy: Organizers can delete entries in their competitions
CREATE POLICY "Organizers can delete score entries in their competitions"
  ON score_entries FOR DELETE
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT c.id FROM competitions c
        WHERE c.organizer_id = auth.uid()
      )
    )
  );

-- Policy: Users can delete entries in their standalone rounds
CREATE POLICY "Users can delete score entries in their standalone rounds"
  ON score_entries FOR DELETE
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 8: Enable RLS and create policies for score_mismatches
-- ============================================================================

ALTER TABLE score_mismatches ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view mismatches where they are involved
CREATE POLICY "Players can view their own score mismatches"
  ON score_mismatches FOR SELECT
  USING (
    player_id = auth.uid()
    OR self_scorer_id = auth.uid()
    OR partner_scorer_id = auth.uid()
  );

-- Policy: Players involved can resolve mismatches
CREATE POLICY "Players can resolve their score mismatches"
  ON score_mismatches FOR UPDATE
  USING (
    player_id = auth.uid()
    OR self_scorer_id = auth.uid()
    OR partner_scorer_id = auth.uid()
  );

-- Policy: System inserts mismatches (via service role or organizers)
CREATE POLICY "Organizers can insert score mismatches"
  ON score_mismatches FOR INSERT
  WITH CHECK (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT c.id FROM competitions c
        WHERE c.organizer_id = auth.uid()
      )
    )
    OR round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.user_id = auth.uid()
    )
    -- Also allow if the authenticated user is one of the scorers
    OR self_scorer_id = auth.uid()
    OR partner_scorer_id = auth.uid()
  );

-- Policy: Organizers can delete mismatches in their competitions
CREATE POLICY "Organizers can delete score mismatches"
  ON score_mismatches FOR DELETE
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT c.id FROM competitions c
        WHERE c.organizer_id = auth.uid()
      )
    )
    OR round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 9: Enable RLS and create policies for score_submission_status
-- ============================================================================

ALTER TABLE score_submission_status ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view their own submission status
CREATE POLICY "Players can view their own submission status"
  ON score_submission_status FOR SELECT
  USING (
    player_id = auth.uid()
  );

-- Policy: Players can manage their own submission status
CREATE POLICY "Players can insert their submission status"
  ON score_submission_status FOR INSERT
  WITH CHECK (
    player_id = auth.uid()
  );

CREATE POLICY "Players can update their submission status"
  ON score_submission_status FOR UPDATE
  USING (
    player_id = auth.uid()
  );

-- Policy: Organizers can manage submission status in their competitions
CREATE POLICY "Organizers can manage submission status in their competitions"
  ON score_submission_status FOR ALL
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT c.id FROM competitions c
        WHERE c.organizer_id = auth.uid()
      )
    )
    OR round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.user_id = auth.uid()
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
