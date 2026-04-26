-- Migration: Add total_par_score column to scorecards
--
-- The Par game type (added 2026-02-02) writes a per-round Par score to
-- scorecards.total_par_score (sum of +1 / 0 / -1 per hole vs net par). The
-- code in src/services/offline/sync/scorecardSync.ts and the round-results
-- pipeline (src/services/rounds/resultsEngine.ts, roundResultsService.ts)
-- already read/write this column, but the schema change was never landed.
--
-- Without this column, every scorecard upsert from the offline sync layer
-- fails with PGRST204 ("Could not find the 'total_par_score' column ... in
-- the schema cache"), because the payload always includes the field
-- (null for non-Par games, an integer for Par games).
--
-- Nullable, no default: the sync code intentionally leaves it null for
-- non-Par game types rather than writing 0.

ALTER TABLE scorecards
ADD COLUMN IF NOT EXISTS total_par_score INTEGER;

COMMENT ON COLUMN scorecards.total_par_score IS
  'Par game total: sum of +1 (win) / 0 (square) / -1 (loss) per hole, vs net par. Null for non-Par game types.';
