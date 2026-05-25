-- Migration: partnership_rounds scorecard FKs -> ON DELETE CASCADE
-- Without this, hard-deleting a round whose scorecards were tagged into a
-- partnership league fails with a FK violation, blocking the 90-day purge.
-- Mirrors the pattern used by league_rounds.scorecard_id.
--
-- Constraint names: Postgres conventional names (partnership_rounds_<col>_fkey).
-- The FKs were created inline (no explicit name) in migration
-- 20260311000000_partnership_leagues.sql, so Postgres assigned the standard
-- names. Live DB confirmation was not possible (local stack not running at
-- time of authoring); if names differ, the DROP CONSTRAINT IF EXISTS is a
-- no-op and the ADD CONSTRAINT will still succeed cleanly.

ALTER TABLE partnership_rounds
  DROP CONSTRAINT IF EXISTS partnership_rounds_scorecard_1_id_fkey,
  ADD CONSTRAINT partnership_rounds_scorecard_1_id_fkey
    FOREIGN KEY (scorecard_1_id) REFERENCES scorecards(id) ON DELETE CASCADE;

ALTER TABLE partnership_rounds
  DROP CONSTRAINT IF EXISTS partnership_rounds_scorecard_2_id_fkey,
  ADD CONSTRAINT partnership_rounds_scorecard_2_id_fkey
    FOREIGN KEY (scorecard_2_id) REFERENCES scorecards(id) ON DELETE CASCADE;
