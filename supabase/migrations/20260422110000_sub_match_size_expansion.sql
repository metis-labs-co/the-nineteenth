-- =====================================================
-- Sub-Match Size Expansion
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Raises sub-match size caps from 1..3 to 1..10 so team
-- rounds with larger teams (e.g. 4v4, 6v6, 8v8) can use
-- the split Ryder-Cup format with sensible sub-team sizes.
--
-- Valid sub-match sizes are still UI-enforced to divisors
-- of the team size (e.g. team size 4 → 1, 2, 4).
-- =====================================================

-- Relax the rounds.sub_match_size check (was 1..3, now 1..10)
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_sub_match_size_check;
ALTER TABLE rounds ADD CONSTRAINT rounds_sub_match_size_check
  CHECK (sub_match_size IS NULL OR sub_match_size BETWEEN 1 AND 10);

-- Relax per-sub-team size checks (were 1..3, now 1..10)
ALTER TABLE sub_matches DROP CONSTRAINT IF EXISTS valid_team_a_size;
ALTER TABLE sub_matches DROP CONSTRAINT IF EXISTS valid_team_b_size;

ALTER TABLE sub_matches ADD CONSTRAINT valid_team_a_size
  CHECK (array_length(team_a_player_ids, 1) BETWEEN 1 AND 10);
ALTER TABLE sub_matches ADD CONSTRAINT valid_team_b_size
  CHECK (array_length(team_b_player_ids, 1) BETWEEN 1 AND 10);

-- Refresh comments that reference the old cap
COMMENT ON COLUMN rounds.sub_match_size IS
  'Players per sub-team when round_format = ''split''. Must be a divisor of the team size (UI-enforced). NULL for combined rounds.';

COMMENT ON COLUMN sub_matches.team_a_player_ids IS
  'Sub-team A (1-10 players). For match play, best-ball net per hole determines the hole winner. For 1v1, straight head-to-head.';

COMMENT ON COLUMN sub_matches.team_b_player_ids IS
  'Sub-team B (1-10 players).';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
