-- =====================================================
-- Migration: Competition Prize Pools
-- =====================================================
-- Adds support for competition-level prize pools that can
-- fund skins games and other competition prizes.
--
-- Key Features:
-- - Flexible funding: per-player contribution OR fixed total
-- - Multi-purpose allocation: skins, winner prizes, other
-- - Pool-to-skins integration: rounds can draw from pool
-- - Carryover returns: leftover skins pot returns to pool
-- - Auto-split: automatically enable skins on all rounds
-- - Balance tracking: remaining pool throughout competition
-- - Locking: pool locked once any round starts
-- =====================================================

-- ============================================================================
-- STEP 1: Create competition_prize_pools table
-- ============================================================================

CREATE TABLE competition_prize_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Competition association (one pool per competition)
  competition_id UUID NOT NULL UNIQUE REFERENCES competitions(id) ON DELETE CASCADE,

  -- Funding configuration
  funding_type TEXT NOT NULL DEFAULT 'per_player' CHECK (funding_type IN ('per_player', 'fixed_total')),
  funding_amount DECIMAL(10,2) NOT NULL CHECK (funding_amount > 0),
  currency TEXT NOT NULL DEFAULT 'AUD',

  -- Calculated total pool amount
  -- For per_player: funding_amount × player_count
  -- For fixed_total: funding_amount
  total_pool_amount DECIMAL(12,2) NOT NULL CHECK (total_pool_amount >= 0),

  -- Allocation percentages (must sum to <= 100)
  skins_allocation_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (skins_allocation_percent >= 0 AND skins_allocation_percent <= 100),
  winner_allocation_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (winner_allocation_percent >= 0 AND winner_allocation_percent <= 100),
  other_allocation_percent DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (other_allocation_percent >= 0 AND other_allocation_percent <= 100),

  -- Calculated budget amounts (derived from percentages)
  skins_budget DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (skins_budget >= 0),
  winner_budget DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (winner_budget >= 0),
  other_budget DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (other_budget >= 0),

  -- Auto-split skins configuration
  auto_split_skins BOOLEAN NOT NULL DEFAULT FALSE,
  skins_pot_per_round DECIMAL(10,2), -- Calculated: skins_budget / round_count (NULL if auto_split disabled)

  -- Locking (pool locked when any round starts)
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMPTZ,

  -- Pool status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'settled')),

  -- Audit fields
  created_by UUID NOT NULL REFERENCES players(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure allocations don't exceed 100%
  CONSTRAINT prize_pool_allocations_sum CHECK (
    skins_allocation_percent + winner_allocation_percent + other_allocation_percent <= 100
  )
);

-- Add table and column comments
COMMENT ON TABLE competition_prize_pools IS 'Prize pools for competitions that can fund skins games and other prizes';
COMMENT ON COLUMN competition_prize_pools.competition_id IS 'Competition this pool belongs to (one pool per competition)';
COMMENT ON COLUMN competition_prize_pools.funding_type IS 'How pool is funded: per_player (amount × players) or fixed_total';
COMMENT ON COLUMN competition_prize_pools.funding_amount IS 'Dollar amount - per player contribution or fixed total depending on type';
COMMENT ON COLUMN competition_prize_pools.currency IS 'Currency code (default AUD for Australian market)';
COMMENT ON COLUMN competition_prize_pools.total_pool_amount IS 'Calculated total pool amount based on funding type';
COMMENT ON COLUMN competition_prize_pools.skins_allocation_percent IS 'Percentage of pool allocated to skins games (0-100)';
COMMENT ON COLUMN competition_prize_pools.winner_allocation_percent IS 'Percentage of pool allocated to overall winner prizes (0-100)';
COMMENT ON COLUMN competition_prize_pools.other_allocation_percent IS 'Percentage of pool allocated to other prizes (0-100)';
COMMENT ON COLUMN competition_prize_pools.skins_budget IS 'Calculated skins budget: total_pool_amount × skins_allocation_percent / 100';
COMMENT ON COLUMN competition_prize_pools.winner_budget IS 'Calculated winner budget: total_pool_amount × winner_allocation_percent / 100';
COMMENT ON COLUMN competition_prize_pools.other_budget IS 'Calculated other budget: total_pool_amount × other_allocation_percent / 100';
COMMENT ON COLUMN competition_prize_pools.auto_split_skins IS 'If TRUE, automatically create skins games on all rounds with equal pots';
COMMENT ON COLUMN competition_prize_pools.skins_pot_per_round IS 'Calculated pot per round when auto_split enabled: skins_budget / round_count';
COMMENT ON COLUMN competition_prize_pools.is_locked IS 'TRUE when pool is locked (after first round starts)';
COMMENT ON COLUMN competition_prize_pools.locked_at IS 'Timestamp when pool was locked';
COMMENT ON COLUMN competition_prize_pools.status IS 'Pool status: draft, active (funded), or settled (distributed)';
COMMENT ON COLUMN competition_prize_pools.created_by IS 'Player who created the prize pool';

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================

CREATE INDEX idx_prize_pools_competition ON competition_prize_pools(competition_id);
CREATE INDEX idx_prize_pools_status ON competition_prize_pools(status);
CREATE INDEX idx_prize_pools_created_by ON competition_prize_pools(created_by);

-- ============================================================================
-- STEP 3: Add updated_at trigger
-- ============================================================================

CREATE TRIGGER update_prize_pools_updated_at
  BEFORE UPDATE ON competition_prize_pools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Enable RLS and create policies
-- ============================================================================

ALTER TABLE competition_prize_pools ENABLE ROW LEVEL SECURITY;

-- Organizers can manage pools for their competitions
CREATE POLICY "Organizers can manage prize pools"
  ON competition_prize_pools FOR ALL
  USING (
    competition_id IN (
      SELECT id FROM competitions
      WHERE organizer_id = auth.uid()
    )
  );

-- Competition members can view pools
CREATE POLICY "Competition members can view prize pools"
  ON competition_prize_pools FOR SELECT
  USING (
    competition_id IN (
      SELECT competition_id FROM competition_players
      WHERE player_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 5: Add pool fields to skins_games for Phase 2 integration
-- ============================================================================

-- Add pool tracking columns to skins_games
ALTER TABLE skins_games
  ADD COLUMN IF NOT EXISTS pool_draw_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carryover_returned DECIMAL(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN skins_games.pool_draw_amount IS 'Amount drawn from prize pool for this game (0 if direct pot)';
COMMENT ON COLUMN skins_games.carryover_returned IS 'Carryover amount returned to pool on completion';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
