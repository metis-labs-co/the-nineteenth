-- =====================================================
-- Round Matchup (Which Two Teams Play This Round)
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds two nullable FK columns to the `rounds` table that
-- identify which two teams are squaring off in a given team match play
-- round. Needed because a competition can have 3+ teams but a team match
-- play round pairs exactly two teams per round.
--
--   rounds.team1_id  — UUID ref teams(id), ON DELETE SET NULL
--   rounds.team2_id  — UUID ref teams(id), ON DELETE SET NULL
--
-- Both NULL is valid: the application falls back to "first two teams in
-- the competition" for backward compatibility with existing 2-team rounds.
-- A CHECK constraint prevents pointing both columns at the same team.
-- =====================================================

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS team1_id UUID
    REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team2_id UUID
    REFERENCES teams(id) ON DELETE SET NULL,
  ADD CONSTRAINT team1_team2_distinct
    CHECK (
      team1_id IS NULL
      OR team2_id IS NULL
      OR team1_id <> team2_id
    );

COMMENT ON COLUMN rounds.team1_id IS
  'Team A for a team match play round. NULL falls back to the first team in the competition (for back-compat with 2-team rounds).';

COMMENT ON COLUMN rounds.team2_id IS
  'Team B for a team match play round. NULL falls back to the second team in the competition.';

CREATE INDEX IF NOT EXISTS idx_rounds_team1_id ON rounds(team1_id) WHERE team1_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rounds_team2_id ON rounds(team2_id) WHERE team2_id IS NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
