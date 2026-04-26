-- =====================================================
-- Migration: Round Pairing Source (Standings-Driven Pairings)
-- =====================================================
-- Lets organisers opt a 1v1 match-play round into auto-generated pairings
-- driven by the current competition individual standings, instead of the
-- default manual / handicap-based flow.
--
-- Three columns capture the choice:
--   * pairing_source  — 'manual' (default) or 'current_standings'
--   * pairing_style   — 'standard' (1vN, 2vN-1, …) or 'adjacent' (1v2, 3v4, …)
--                       NULL when source = 'manual'
--   * pairing_metric  — which leaderboard metric ranks players for seeding
--                       NULL when source = 'manual'
--
-- Pairing config is intentionally separate from `rules_override`: rules_override
-- is scoring/leaderboard semantics, while these columns determine the *contents*
-- of the `pairings` and `sub_matches` rows generated when the round is created.
--
-- Applies to three presets today (individual_match_play, individual_match_play_seeded,
-- ryder_cup_singles). The columns are written at round-create time and consumed
-- by the round-creation flow in src/screens/admin/AddRoundScreen/hooks/useAddRoundForm.ts.
-- =====================================================

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS pairing_source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS pairing_style  TEXT,
  ADD COLUMN IF NOT EXISTS pairing_metric TEXT;

ALTER TABLE rounds
  DROP CONSTRAINT IF EXISTS rounds_pairing_source_check,
  ADD  CONSTRAINT rounds_pairing_source_check
    CHECK (pairing_source IN ('manual', 'current_standings'));

ALTER TABLE rounds
  DROP CONSTRAINT IF EXISTS rounds_pairing_style_check,
  ADD  CONSTRAINT rounds_pairing_style_check
    CHECK (pairing_style IS NULL OR pairing_style IN ('standard', 'adjacent'));

ALTER TABLE rounds
  DROP CONSTRAINT IF EXISTS rounds_pairing_metric_check,
  ADD  CONSTRAINT rounds_pairing_metric_check
    CHECK (pairing_metric IS NULL OR pairing_metric IN ('stableford_points', 'net_strokes', 'competition_points'));

-- Style and metric must be present together with a non-manual source, and
-- must be NULL otherwise — guard against half-configured rows.
ALTER TABLE rounds
  DROP CONSTRAINT IF EXISTS rounds_pairing_config_consistency,
  ADD  CONSTRAINT rounds_pairing_config_consistency CHECK (
    (pairing_source = 'manual'            AND pairing_style IS NULL     AND pairing_metric IS NULL) OR
    (pairing_source = 'current_standings' AND pairing_style IS NOT NULL AND pairing_metric IS NOT NULL)
  );

COMMENT ON COLUMN rounds.pairing_source IS
  'How player pairings are generated for this round. ''manual'' (default) leaves pairings to the organiser; ''current_standings'' auto-generates 1v1 pairings from the cumulative individual leaderboard of completed prior rounds in the competition. Used by individual_match_play, individual_match_play_seeded, and ryder_cup_singles presets.';

COMMENT ON COLUMN rounds.pairing_style IS
  'Pairing style when pairing_source = ''current_standings''. ''standard'' = 1vN, 2vN-1, … (top seed rewarded). ''adjacent'' = 1v2, 3v4, … (every match competitive).';

COMMENT ON COLUMN rounds.pairing_metric IS
  'Leaderboard metric ranking players for standings-driven pairings. Mirrors qualifying_metric semantics: stableford_points / net_strokes / competition_points.';
