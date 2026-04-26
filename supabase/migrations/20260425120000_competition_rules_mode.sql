-- =====================================================
-- Migration: Competition Scoring Rules Mode
-- =====================================================
-- Adds an explicit competition-level toggle that decides whether scoring
-- rules are:
--   * "general"   — use competitions.point_system for every round; ignore
--                   any rounds.rules_override (default, new behaviour)
--   * "per-round" — honor rounds.rules_override on a round-by-round basis
--                   (requires advanced_round_rules Premium feature to edit)
--
-- Default is FALSE ("general rules"). The engine reads this flag in
-- src/services/rounds/roundResultsService.ts::finalizeRound and skips
-- rules_override resolution when it's false. This makes the organiser's
-- intent explicit: toggling "per-round rules" on in Competition Settings
-- is what enables the Phase 2 template picker in Round Settings.
--
-- Back-fill: competitions created during the Phase 1-5 rollout may already
-- have per-round overrides in use. Flip the flag TRUE for any such
-- competition so their saved behaviour isn't silently disabled by the new
-- default.
-- =====================================================

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS per_round_rules_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN competitions.per_round_rules_enabled IS
  'When TRUE, rounds.rules_override takes precedence over competition.point_system at finalization. When FALSE (default), the competition point_system applies to every round and any saved per-round overrides are ignored. Editing the per-round option is gated behind the advanced_round_rules feature flag.';

-- -----------------------------------------------------
-- Back-fill for existing per-round override users
-- -----------------------------------------------------

UPDATE competitions c
SET per_round_rules_enabled = TRUE
WHERE EXISTS (
  SELECT 1 FROM rounds r
  WHERE r.competition_id = c.id AND r.rules_override IS NOT NULL
);
