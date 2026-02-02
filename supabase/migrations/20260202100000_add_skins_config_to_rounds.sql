-- =====================================================
-- Migration: Add Skins Configuration to Rounds
-- =====================================================
-- For competition rounds, we need to store the skins config on the round
-- because participants aren't known until pairings are assigned.
-- The actual skins_games record will be created when pairings are made.
-- =====================================================

-- Add skins configuration columns to rounds table
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS skins_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN rounds.skins_enabled IS 'Whether this round has a skins game configured';

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS skins_config JSONB DEFAULT NULL;

COMMENT ON COLUMN rounds.skins_config IS 'Skins game configuration: {pot_type, pot_value, scoring_type, currency}';

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS skins_pool_source TEXT DEFAULT 'direct';

COMMENT ON COLUMN rounds.skins_pool_source IS 'Source of skins pot: direct (players pay) or prize_pool (from competition pool)';

-- Add constraint for skins_pool_source values
ALTER TABLE rounds
  ADD CONSTRAINT rounds_skins_pool_source_check
  CHECK (skins_pool_source IN ('direct', 'prize_pool'));

-- Add index for rounds with skins enabled (for quick lookup)
CREATE INDEX IF NOT EXISTS idx_rounds_skins_enabled
  ON rounds (competition_id, skins_enabled)
  WHERE skins_enabled = TRUE;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
