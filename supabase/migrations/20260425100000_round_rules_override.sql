-- =====================================================
-- Migration: Per-Round Rules Override
-- =====================================================
-- Adds a JSONB column on `rounds` to let organizers override competition-level
-- scoring rules on a single round. Used by the per-round rules engine to:
--   * swap team aggregation (e.g. best 3 of 4 individual Stableford)
--   * override win/tie/loss points for team or sub-match outcomes
--   * override individual position points for that round
--   * flag whether the round contributes to the team / individual / qualifying
--     leaderboards
--
-- Null = inherit competition defaults (today's behavior). The engine always
-- honors a saved override regardless of the current tier so downgrades don't
-- retroactively change past-round settlements — only *editing* the override
-- is gated behind the Premium-tier `advanced_round_rules` feature.
--
-- Shape (see src/types/database/roundRules.types.ts for the canonical type):
--   {
--     "template_id": "team_stableford_best_n_of_m",
--     "team_aggregation": "best_n_of_m",
--     "team_aggregation_config": { "n": 3, "m": 4 },
--     "team_points":       { "win": 2,   "tie": 1,   "loss": 0 },
--     "pair_points":       { "win": 1,   "tie": 0.5, "loss": 0 },
--     "individual_points": { "1": 10, "2": 8, "default": 0 },
--     "contributes_to_individual_leaderboard": true,
--     "contributes_to_team_leaderboard": true,
--     "counts_as_qualifying": true
--   }
-- =====================================================

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS rules_override JSONB;

COMMENT ON COLUMN rounds.rules_override IS
  'Per-round scoring rule override. NULL = inherit competition.point_system defaults. When set, overrides team aggregation, win/tie/loss point allocation, individual position points, and leaderboard contribution flags for this round only. Editing is gated behind the ''advanced_round_rules'' feature flag on the tier_limits table; reading/applying is always honored.';
