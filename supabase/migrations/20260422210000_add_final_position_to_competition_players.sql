-- Add final_position to competition_players to support prize pool settlement.
--
-- The settle_prize_pool() RPC added in 20260327000001_prize_pool_placement_redesign.sql
-- reads competition_players.final_position to map placements (1st, 2nd, 3rd) to
-- players. That migration explicitly noted the column did not yet exist. This
-- migration adds it.
--
-- The column is nullable — positions are only written when the organiser
-- triggers settlement from the Payouts tab. Ties are broken arbitrarily by the
-- RPC's LIMIT 1.

ALTER TABLE competition_players
  ADD COLUMN IF NOT EXISTS final_position INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_competition_players_final_position
  ON competition_players (competition_id, final_position);
