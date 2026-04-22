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
--
-- The statements below are written to be idempotent so the migration can
-- be re-applied safely after a partial failure:
--   * `ADD COLUMN IF NOT EXISTS` skips existing columns.
--   * The CHECK constraint is added via a DO block that checks
--     `pg_constraint` first — Postgres has no `ADD CONSTRAINT IF NOT
--     EXISTS` shortcut, so mixing a plain `ADD CONSTRAINT` into an
--     ALTER TABLE would abort the whole statement on re-run.
-- =====================================================

-- 1. Columns
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS team1_id UUID
    REFERENCES teams(id) ON DELETE SET NULL;

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS team2_id UUID
    REFERENCES teams(id) ON DELETE SET NULL;

-- 2. CHECK constraint — guarded so re-runs are no-ops.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team1_team2_distinct'
      AND conrelid = 'rounds'::regclass
  ) THEN
    ALTER TABLE rounds
      ADD CONSTRAINT team1_team2_distinct
      CHECK (
        team1_id IS NULL
        OR team2_id IS NULL
        OR team1_id <> team2_id
      );
  END IF;
END $$;

-- 3. Comments (idempotent — COMMENT overwrites any existing value)
COMMENT ON COLUMN rounds.team1_id IS
  'Team A for a team match play round. NULL falls back to the first team in the competition (for back-compat with 2-team rounds).';

COMMENT ON COLUMN rounds.team2_id IS
  'Team B for a team match play round. NULL falls back to the second team in the competition.';

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_rounds_team1_id ON rounds(team1_id) WHERE team1_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rounds_team2_id ON rounds(team2_id) WHERE team2_id IS NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
