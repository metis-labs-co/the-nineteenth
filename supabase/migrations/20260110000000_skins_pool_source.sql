-- =====================================================
-- Migration: Add pool_source column to skins_games
-- =====================================================
-- Adds the pool_source column that was missing from the
-- initial skins_games migration. This column enables
-- Phase 2 functionality where competition rounds can
-- draw skins pot from the competition prize pool.
-- =====================================================

ALTER TABLE skins_games
  ADD COLUMN IF NOT EXISTS pool_source TEXT NOT NULL DEFAULT 'direct'
  CHECK (pool_source IN ('direct', 'prize_pool'));

COMMENT ON COLUMN skins_games.pool_source IS 'Where the pot comes from: direct (players pay in) or prize_pool (from competition prize pool, Phase 2)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
