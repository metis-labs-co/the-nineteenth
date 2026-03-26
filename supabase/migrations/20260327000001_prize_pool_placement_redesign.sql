-- ============================================================================
-- Prize Pool Placement Redesign Migration
-- Replaces skins/winner/other allocation model with placement-based payouts
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create prize_pool_placements table
-- ============================================================================

CREATE TABLE prize_pool_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES competition_prize_pools(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  percent DECIMAL(5,2) NOT NULL,
  payout_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  player_id UUID REFERENCES players(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pool_id, position),
  CHECK (percent > 0 AND percent <= 100),
  CHECK (position > 0)
);

-- RLS
ALTER TABLE prize_pool_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage placements"
  ON prize_pool_placements FOR ALL
  USING (
    pool_id IN (
      SELECT pp.id FROM competition_prize_pools pp
      JOIN competitions c ON c.id = pp.competition_id
      WHERE c.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Competition members can view placements"
  ON prize_pool_placements FOR SELECT
  USING (
    pool_id IN (
      SELECT pp.id FROM competition_prize_pools pp
      JOIN competition_players cp ON cp.competition_id = pp.competition_id
      WHERE cp.player_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. Migrate existing prize pools to default placements
-- ============================================================================

INSERT INTO prize_pool_placements (pool_id, position, percent, payout_amount)
SELECT
  pp.id,
  1,
  60.00,
  pp.total_pool_amount * 0.60
FROM competition_prize_pools pp;

INSERT INTO prize_pool_placements (pool_id, position, percent, payout_amount)
SELECT
  pp.id,
  2,
  30.00,
  pp.total_pool_amount * 0.30
FROM competition_prize_pools pp;

INSERT INTO prize_pool_placements (pool_id, position, percent, payout_amount)
SELECT
  pp.id,
  3,
  10.00,
  pp.total_pool_amount * 0.10
FROM competition_prize_pools pp;

-- ============================================================================
-- 3. Update skins_games: remove pool-source columns
-- ============================================================================

UPDATE skins_games SET pool_source = 'direct' WHERE pool_source = 'prize_pool';

ALTER TABLE skins_games
  DROP COLUMN IF EXISTS pool_source,
  DROP COLUMN IF EXISTS pool_draw_amount,
  DROP COLUMN IF EXISTS carryover_returned;

-- ============================================================================
-- 4. Drop pool-skins triggers and functions
-- ============================================================================

-- Drop trigger first (depends on function)
DROP TRIGGER IF EXISTS on_skins_game_complete_return_carryover ON skins_games;

-- Drop trigger function (no params)
DROP FUNCTION IF EXISTS return_skins_carryover_to_pool();

-- Drop helper called by the trigger function (1 UUID param)
DROP FUNCTION IF EXISTS calculate_skins_remaining_carryover(UUID);

-- Drop pool-skins interaction functions with exact signatures
DROP FUNCTION IF EXISTS draw_from_pool(UUID, UUID, DECIMAL);
DROP FUNCTION IF EXISTS return_to_pool(UUID, UUID, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS can_draw_from_pool(UUID, DECIMAL);
DROP FUNCTION IF EXISTS auto_split_pool_for_skins(UUID, INTEGER);
DROP FUNCTION IF EXISTS create_auto_split_skins_batch(UUID, UUID, UUID[], DECIMAL, TEXT, UUID);
DROP FUNCTION IF EXISTS redistribute_skins_pots(UUID);
DROP FUNCTION IF EXISTS calculate_pool_allocations(UUID);

-- Drop recalculate_pool_total which references dropped columns (skins_budget,
-- auto_split_skins) and dropped functions (calculate_pool_allocations,
-- auto_split_pool_for_skins)
DROP FUNCTION IF EXISTS recalculate_pool_total(UUID);

-- ============================================================================
-- 5. Drop allocation columns from competition_prize_pools
-- ============================================================================

-- Drop the multi-column constraint BEFORE dropping columns it references
ALTER TABLE competition_prize_pools
  DROP CONSTRAINT IF EXISTS prize_pool_allocations_sum;

ALTER TABLE competition_prize_pools
  DROP COLUMN IF EXISTS skins_allocation_percent,
  DROP COLUMN IF EXISTS winner_allocation_percent,
  DROP COLUMN IF EXISTS other_allocation_percent,
  DROP COLUMN IF EXISTS skins_budget,
  DROP COLUMN IF EXISTS winner_budget,
  DROP COLUMN IF EXISTS other_budget,
  DROP COLUMN IF EXISTS auto_split_skins,
  DROP COLUMN IF EXISTS skins_pot_per_round;

-- ============================================================================
-- 6. Simplify pool_transactions (drop round_id, remove skins types)
-- ============================================================================

-- Delete skins-related and allocation transactions (no longer relevant)
DELETE FROM pool_transactions
WHERE transaction_type IN ('skins_draw', 'skins_return', 'allocation');

-- Drop round_id column (was only used for skins transactions)
ALTER TABLE pool_transactions
  DROP COLUMN IF EXISTS round_id;

-- Replace the inline CHECK constraint on transaction_type
-- PostgreSQL auto-generates the name as <table>_<column>_check
ALTER TABLE pool_transactions
  DROP CONSTRAINT IF EXISTS pool_transactions_transaction_type_check;

ALTER TABLE pool_transactions
  ADD CONSTRAINT pool_transactions_transaction_type_check
  CHECK (transaction_type IN ('prize_payout', 'adjustment'));

-- ============================================================================
-- 7. Drop the old get_pool_balance (2-param version) before creating new one
-- ============================================================================

DROP FUNCTION IF EXISTS get_pool_balance(UUID, TEXT);

-- ============================================================================
-- 8. New functions
-- ============================================================================

-- Recalculate placement payout amounts when pool total changes
CREATE OR REPLACE FUNCTION recalculate_placement_amounts(p_pool_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE prize_pool_placements ppl
  SET payout_amount = (
    SELECT pp.total_pool_amount * ppl.percent / 100
    FROM competition_prize_pools pp
    WHERE pp.id = p_pool_id
  ),
  updated_at = NOW()
  WHERE ppl.pool_id = p_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Settle a prize pool by assigning players to placements based on final_position.
--
-- IMPORTANT: This function depends on competition_players.final_position which
-- does NOT yet exist. A future migration must add this column to the
-- competition_players table before settle_prize_pool can be called.
-- Calling this function without that column will result in a runtime error.
CREATE OR REPLACE FUNCTION settle_prize_pool(p_pool_id UUID)
RETURNS VOID AS $$
DECLARE
  v_competition_id UUID;
  v_placement RECORD;
  v_standing RECORD;
BEGIN
  SELECT competition_id INTO v_competition_id
  FROM competition_prize_pools
  WHERE id = p_pool_id;

  IF v_competition_id IS NULL THEN
    RAISE EXCEPTION 'Prize pool not found';
  END IF;

  FOR v_placement IN
    SELECT id, position
    FROM prize_pool_placements
    WHERE pool_id = p_pool_id
    ORDER BY position
  LOOP
    SELECT cp.player_id INTO v_standing
    FROM competition_players cp
    WHERE cp.competition_id = v_competition_id
      AND cp.final_position = v_placement.position
    LIMIT 1;

    IF v_standing.player_id IS NOT NULL THEN
      UPDATE prize_pool_placements
      SET player_id = v_standing.player_id,
          paid_at = NOW(),
          updated_at = NOW()
      WHERE id = v_placement.id;

      INSERT INTO pool_transactions (pool_id, transaction_type, amount, description, balance_after)
      VALUES (
        p_pool_id,
        'prize_payout',
        -(SELECT payout_amount FROM prize_pool_placements WHERE id = v_placement.id),
        'Prize payout for position ' || v_placement.position,
        0
      );
    END IF;
  END LOOP;

  UPDATE competition_prize_pools
  SET status = 'settled', updated_at = NOW()
  WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate that placement percentages don't exceed 100%
CREATE OR REPLACE FUNCTION validate_placement_percentages()
RETURNS TRIGGER AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(percent), 0) INTO v_total
  FROM prize_pool_placements
  WHERE pool_id = COALESCE(NEW.pool_id, OLD.pool_id);

  IF v_total > 100 THEN
    RAISE EXCEPTION 'Placement percentages cannot exceed 100%% (current total: %%)', v_total;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_placement_percentages
  AFTER INSERT OR UPDATE ON prize_pool_placements
  FOR EACH ROW
  EXECUTE FUNCTION validate_placement_percentages();

-- Get remaining pool balance (total minus payouts)
CREATE OR REPLACE FUNCTION get_pool_balance(p_pool_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL;
  v_paid DECIMAL;
BEGIN
  SELECT total_pool_amount INTO v_total
  FROM competition_prize_pools
  WHERE id = p_pool_id;

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_paid
  FROM pool_transactions
  WHERE pool_id = p_pool_id
    AND transaction_type = 'prize_payout';

  RETURN v_total - v_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
