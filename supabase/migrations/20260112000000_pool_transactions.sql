-- =====================================================
-- Migration: Pool Transactions
-- =====================================================
-- Tracks all transactions against a competition prize pool
-- for audit and balance tracking purposes.
--
-- Transaction Types:
-- - allocation: Initial budget allocation when pool created
-- - skins_draw: Amount drawn for a skins game
-- - skins_return: Carryover returned to pool after round
-- - prize_payout: Prize distributed to winner
-- - adjustment: Manual adjustment by organizer
-- =====================================================

-- ============================================================================
-- STEP 1: Create pool_transactions table
-- ============================================================================

CREATE TABLE pool_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pool association
  pool_id UUID NOT NULL REFERENCES competition_prize_pools(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('allocation', 'skins_draw', 'skins_return', 'prize_payout', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,

  -- Optional round association (for skins transactions)
  round_id UUID REFERENCES rounds(id) ON DELETE SET NULL,

  -- Description for audit trail
  description TEXT,

  -- Running balance after this transaction
  balance_after DECIMAL(12,2) NOT NULL,

  -- Audit fields
  created_by UUID REFERENCES players(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table and column comments
COMMENT ON TABLE pool_transactions IS 'Audit trail of all transactions against competition prize pools';
COMMENT ON COLUMN pool_transactions.pool_id IS 'Prize pool this transaction belongs to';
COMMENT ON COLUMN pool_transactions.transaction_type IS 'Type: allocation, skins_draw, skins_return, prize_payout, adjustment';
COMMENT ON COLUMN pool_transactions.amount IS 'Transaction amount (positive for credits, negative for debits)';
COMMENT ON COLUMN pool_transactions.round_id IS 'Associated round for skins transactions (NULL for non-round transactions)';
COMMENT ON COLUMN pool_transactions.description IS 'Human-readable description for audit trail';
COMMENT ON COLUMN pool_transactions.balance_after IS 'Pool balance after this transaction was applied';
COMMENT ON COLUMN pool_transactions.created_by IS 'Player who initiated the transaction (NULL for system-generated)';

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================

CREATE INDEX idx_pool_transactions_pool_id ON pool_transactions(pool_id);
CREATE INDEX idx_pool_transactions_type ON pool_transactions(transaction_type);
CREATE INDEX idx_pool_transactions_round_id ON pool_transactions(round_id) WHERE round_id IS NOT NULL;
CREATE INDEX idx_pool_transactions_created_at ON pool_transactions(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_pool_transactions_pool_type ON pool_transactions(pool_id, transaction_type);

-- ============================================================================
-- STEP 3: Enable RLS and create policies
-- ============================================================================

ALTER TABLE pool_transactions ENABLE ROW LEVEL SECURITY;

-- Competition members can view transactions for pools they have access to
CREATE POLICY "Pool members can view transactions"
  ON pool_transactions FOR SELECT
  USING (
    pool_id IN (
      SELECT cpp.id FROM competition_prize_pools cpp
      WHERE cpp.competition_id IN (
        -- Organizers
        SELECT id FROM competitions WHERE organizer_id = auth.uid()
        UNION
        -- Competition members
        SELECT competition_id FROM competition_players WHERE player_id = auth.uid()
      )
    )
  );

-- Only organizers can create transactions
CREATE POLICY "Organizers can create transactions"
  ON pool_transactions FOR INSERT
  WITH CHECK (
    pool_id IN (
      SELECT cpp.id FROM competition_prize_pools cpp
      JOIN competitions c ON c.id = cpp.competition_id
      WHERE c.organizer_id = auth.uid()
    )
  );

-- Transactions are immutable - no UPDATE or DELETE policies
-- (transactions should never be modified, only new adjustment transactions created)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
