-- =====================================================
-- Round Sub-Matches (Ryder-Cup-Style Team Match Play)
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds support for splitting a team round into
-- multiple independent head-to-head sub-matches:
--
--   rounds.round_format   'combined' (default, today's behavior) or 'split'
--   rounds.sub_match_size 1..3 (when split; null otherwise)
--
-- New table: sub_matches
--   One row per independent head-to-head within a split round.
--   Each sub-match has its own sub-team sides, tee time, status,
--   and final result (for match play) or net totals (for stroke
--   play pairs-aggregate).
--
-- `combined` rounds continue to use the existing Team Match Play
-- code path (best-ball across all team members, one match result
-- per round). `split` rounds aggregate sub-match results Ryder-Cup
-- style: 1 point per win, 0.5 for halved, 0 for loss.
-- =====================================================

-- -----------------------------------------------------
-- 1. Extend rounds with round_format and sub_match_size
-- -----------------------------------------------------

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS round_format TEXT NOT NULL DEFAULT 'combined'
    CHECK (round_format IN ('combined', 'split')),
  ADD COLUMN IF NOT EXISTS sub_match_size SMALLINT
    CHECK (sub_match_size IS NULL OR sub_match_size BETWEEN 1 AND 3);

COMMENT ON COLUMN rounds.round_format IS
  'How team-round scoring is aggregated. ''combined'' = single best-ball team match (default, legacy behavior). ''split'' = multiple independent sub-matches aggregated Ryder-Cup style.';

COMMENT ON COLUMN rounds.sub_match_size IS
  'Players per sub-team when round_format = ''split''. 1 = 1v1, 2 = 2v2, 3 = 3v3. Remainder players form a smaller final sub-match. NULL for combined rounds.';

-- Enforce that sub_match_size is only set for split rounds.
-- Guarded so re-runs after a partial apply are no-ops (Postgres has no
-- ADD CONSTRAINT IF NOT EXISTS shortcut).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sub_match_size_requires_split'
      AND conrelid = 'rounds'::regclass
  ) THEN
    ALTER TABLE rounds
      ADD CONSTRAINT sub_match_size_requires_split
      CHECK (
        (round_format = 'split' AND sub_match_size IS NOT NULL)
        OR (round_format = 'combined' AND sub_match_size IS NULL)
      );
  END IF;
END $$;

-- -----------------------------------------------------
-- 2. Create sub_matches table
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS sub_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  sort_order SMALLINT NOT NULL,
  team_a_player_ids UUID[] NOT NULL,
  team_b_player_ids UUID[] NOT NULL,
  tee_time TIME,
  pairing_id UUID REFERENCES pairings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'in-progress', 'completed', 'forfeited')),
  result TEXT
    CHECK (result IS NULL OR result IN ('a-wins', 'b-wins', 'halved', 'forfeit-a', 'forfeit-b')),
  final_differential SMALLINT,
  team_a_net_total SMALLINT,
  team_b_net_total SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_team_a_size
    CHECK (array_length(team_a_player_ids, 1) BETWEEN 1 AND 3),
  CONSTRAINT valid_team_b_size
    CHECK (array_length(team_b_player_ids, 1) BETWEEN 1 AND 3),
  CONSTRAINT unique_sort_order_per_round UNIQUE (round_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_sub_matches_round_id ON sub_matches(round_id);
CREATE INDEX IF NOT EXISTS idx_sub_matches_pairing_id ON sub_matches(pairing_id);

COMMENT ON TABLE sub_matches IS
  'One row per head-to-head sub-match within a split team round. Aggregates Ryder-Cup style to the round result.';
COMMENT ON COLUMN sub_matches.team_a_player_ids IS
  'Sub-team A (1-3 players). For match play, best-ball net per hole determines the hole winner. For 1v1, straight head-to-head.';
COMMENT ON COLUMN sub_matches.team_b_player_ids IS
  'Sub-team B (1-3 players).';
COMMENT ON COLUMN sub_matches.pairing_id IS
  'Physical tee group this sub-match plays in. Typically 1:1 with a pairings row because sub-matches fit in one tee group.';
COMMENT ON COLUMN sub_matches.result IS
  'Final match play result. NULL until completed. forfeit-a = team A forfeited (B wins 1 point).';
COMMENT ON COLUMN sub_matches.final_differential IS
  'Signed hole differential at close for match play (positive = team A ahead, e.g. 3 for 3&2). NULL for stroke play.';
COMMENT ON COLUMN sub_matches.team_a_net_total IS
  'Sum of sub-team A member net stroke totals for stroke play pairs-aggregate. NULL for match play.';
COMMENT ON COLUMN sub_matches.team_b_net_total IS
  'Sum of sub-team B member net stroke totals for stroke play pairs-aggregate. NULL for match play.';

-- -----------------------------------------------------
-- 3. Updated-at trigger (reuse the standard pattern)
-- -----------------------------------------------------

DROP TRIGGER IF EXISTS update_sub_matches_updated_at ON sub_matches;
CREATE TRIGGER update_sub_matches_updated_at
  BEFORE UPDATE ON sub_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- 4. Row-level security
-- -----------------------------------------------------
-- Sub-matches inherit access from the parent round: if you can
-- see the round (via rounds RLS), you can see its sub-matches.
-- Mutations are restricted to the organizer.

ALTER TABLE sub_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_matches_select_via_round" ON sub_matches;
CREATE POLICY "sub_matches_select_via_round"
  ON sub_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = sub_matches.round_id
      -- Rely on rounds RLS already filtering visible rounds.
    )
  );

DROP POLICY IF EXISTS "sub_matches_insert_organizer" ON sub_matches;
CREATE POLICY "sub_matches_insert_organizer"
  ON sub_matches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds r
      LEFT JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = sub_matches.round_id
        AND (
          r.user_id = auth.uid()
          OR c.organizer_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "sub_matches_update_organizer" ON sub_matches;
CREATE POLICY "sub_matches_update_organizer"
  ON sub_matches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      LEFT JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = sub_matches.round_id
        AND (
          r.user_id = auth.uid()
          OR c.organizer_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "sub_matches_delete_organizer" ON sub_matches;
CREATE POLICY "sub_matches_delete_organizer"
  ON sub_matches
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      LEFT JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = sub_matches.round_id
        AND (
          r.user_id = auth.uid()
          OR c.organizer_id = auth.uid()
        )
    )
  );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
