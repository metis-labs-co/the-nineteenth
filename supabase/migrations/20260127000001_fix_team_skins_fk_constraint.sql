-- =====================================================
-- Migration: Fix Team Skins Foreign Key Constraint
-- =====================================================
-- Removes the foreign key constraint on team_winner_id since
-- standalone rounds store teams in team_config JSONB, not in
-- the teams table. The constraint is too restrictive.
-- =====================================================

-- Drop the foreign key constraint on team_winner_id
ALTER TABLE skins_results
  DROP CONSTRAINT IF EXISTS skins_results_team_winner_id_fkey;

-- Drop the foreign key constraint on team_id in payouts
ALTER TABLE skins_payouts
  DROP CONSTRAINT IF EXISTS skins_payouts_team_id_fkey;

-- Add comments explaining the change
COMMENT ON COLUMN skins_results.team_winner_id IS 'Team ID that won this hole (for team skins). Can be a UUID from teams table OR from round.team_config for standalone rounds. No FK constraint.';
COMMENT ON COLUMN skins_payouts.team_id IS 'Team ID this payout is for (team skins). Can be a UUID from teams table OR from round.team_config for standalone rounds. No FK constraint.';
