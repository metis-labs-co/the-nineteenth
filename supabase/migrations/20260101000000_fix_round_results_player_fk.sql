-- =====================================================
-- Fix Round Results Player Foreign Key
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds the missing foreign key constraint
-- from round_results.player_id to players.id.
--
-- This FK was originally created in 20250122000000_teams_and_game_types.sql
-- but was dropped when 20250329000000_placeholder_players.sql ran:
--   ALTER TABLE players DROP CONSTRAINT IF EXISTS players_pkey CASCADE;
--
-- The fix migration 20250330000000_fix_dropped_foreign_keys.sql
-- missed restoring this constraint.
-- =====================================================

-- Recreate round_results.player_id FK to players
ALTER TABLE round_results
  DROP CONSTRAINT IF EXISTS round_results_player_id_fkey;

ALTER TABLE round_results
  ADD CONSTRAINT round_results_player_id_fkey
  FOREIGN KEY (player_id)
  REFERENCES players(id)
  ON DELETE CASCADE;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON CONSTRAINT round_results_player_id_fkey ON round_results IS 'Restored FK dropped by placeholder_players migration CASCADE';
