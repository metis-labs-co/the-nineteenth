-- =====================================================
-- Migration: Pool Locking Triggers
-- =====================================================
-- Triggers to auto-lock prize pools when rounds start
-- and prevent modifications to locked pools.
--
-- Key Features:
-- - Auto-lock pool when first round status changes from 'upcoming'
-- - Prevent changes to funding/allocation fields after lock
-- - Allow status updates on locked pools (for settlement)
-- =====================================================

-- ============================================================================
-- TRIGGER FUNCTION 1: lock_pool_on_round_start
-- ============================================================================
-- Called when a round's status changes from 'upcoming' to any other status.
-- If the round's competition has a prize pool that isn't locked, lock it.

CREATE OR REPLACE FUNCTION lock_pool_on_round_start()
RETURNS TRIGGER AS $$
DECLARE
  v_pool_id UUID;
BEGIN
  -- Only trigger when status changes FROM 'upcoming' to something else
  IF OLD.status = 'upcoming' AND NEW.status != 'upcoming' THEN
    -- Find prize pool for this round's competition
    SELECT id INTO v_pool_id
    FROM competition_prize_pools
    WHERE competition_id = NEW.competition_id
      AND is_locked = FALSE;

    -- If an unlocked pool exists, lock it
    IF v_pool_id IS NOT NULL THEN
      PERFORM lock_prize_pool(v_pool_id);

      -- Log the lock event (optional - could be removed if not needed)
      RAISE NOTICE 'Prize pool % locked due to round % starting', v_pool_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION lock_pool_on_round_start IS 'Automatically locks competition prize pool when first round starts';

-- ============================================================================
-- TRIGGER: Auto-lock pool on round start
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_lock_pool_on_round_start ON rounds;

CREATE TRIGGER trigger_lock_pool_on_round_start
  AFTER UPDATE OF status ON rounds
  FOR EACH ROW
  WHEN (OLD.status = 'upcoming' AND NEW.status != 'upcoming')
  EXECUTE FUNCTION lock_pool_on_round_start();

COMMENT ON TRIGGER trigger_lock_pool_on_round_start ON rounds IS 'Auto-locks prize pool when a round starts';

-- ============================================================================
-- TRIGGER FUNCTION 2: prevent_locked_pool_changes
-- ============================================================================
-- Prevents changes to funding and allocation fields after pool is locked.
-- Allows changes to:
-- - status (for settlement workflow)
-- - updated_at (automatic)
-- Blocks changes to:
-- - funding_type, funding_amount, total_pool_amount
-- - allocation percentages and budgets
-- - auto_split_skins, skins_pot_per_round
-- - currency

CREATE OR REPLACE FUNCTION prevent_locked_pool_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if pool is already locked
  IF OLD.is_locked = TRUE THEN
    -- Check if protected fields are being changed
    IF
      OLD.funding_type IS DISTINCT FROM NEW.funding_type OR
      OLD.funding_amount IS DISTINCT FROM NEW.funding_amount OR
      OLD.total_pool_amount IS DISTINCT FROM NEW.total_pool_amount OR
      OLD.currency IS DISTINCT FROM NEW.currency OR
      OLD.skins_allocation_percent IS DISTINCT FROM NEW.skins_allocation_percent OR
      OLD.winner_allocation_percent IS DISTINCT FROM NEW.winner_allocation_percent OR
      OLD.other_allocation_percent IS DISTINCT FROM NEW.other_allocation_percent OR
      OLD.skins_budget IS DISTINCT FROM NEW.skins_budget OR
      OLD.winner_budget IS DISTINCT FROM NEW.winner_budget OR
      OLD.other_budget IS DISTINCT FROM NEW.other_budget OR
      OLD.auto_split_skins IS DISTINCT FROM NEW.auto_split_skins OR
      OLD.skins_pot_per_round IS DISTINCT FROM NEW.skins_pot_per_round
    THEN
      RAISE EXCEPTION 'Cannot modify prize pool after it is locked. Pool was locked at: %',
        OLD.locked_at
        USING HINT = 'Prize pools are locked when the first round starts to ensure fairness.';
    END IF;

    -- Allow changes to status, is_locked (for admin override), locked_at, updated_at, created_by
    -- These are operational fields that don't affect pool value/distribution
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_locked_pool_changes IS 'Prevents modifications to funding and allocation fields after pool is locked';

-- ============================================================================
-- TRIGGER: Prevent locked pool changes
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_prevent_locked_pool_changes ON competition_prize_pools;

CREATE TRIGGER trigger_prevent_locked_pool_changes
  BEFORE UPDATE ON competition_prize_pools
  FOR EACH ROW
  WHEN (OLD.is_locked = TRUE)
  EXECUTE FUNCTION prevent_locked_pool_changes();

COMMENT ON TRIGGER trigger_prevent_locked_pool_changes ON competition_prize_pools IS 'Prevents changes to locked prize pool configuration';

-- ============================================================================
-- HELPER FUNCTION: unlock_prize_pool (Admin Override)
-- ============================================================================
-- Allows administrators to unlock a pool in exceptional circumstances.
-- Should be used with extreme caution and only when necessary.

CREATE OR REPLACE FUNCTION unlock_prize_pool(
  p_pool_id UUID,
  p_reason TEXT DEFAULT 'Admin override'
) RETURNS VOID AS $$
BEGIN
  -- Verify pool exists
  IF NOT EXISTS (SELECT 1 FROM competition_prize_pools WHERE id = p_pool_id) THEN
    RAISE EXCEPTION 'Prize pool not found: %', p_pool_id;
  END IF;

  -- Temporarily disable the trigger to allow unlock
  -- We do this by directly updating with a bypass
  UPDATE competition_prize_pools
  SET
    is_locked = FALSE,
    locked_at = NULL,
    updated_at = NOW()
  WHERE id = p_pool_id;

  -- Log the unlock (could be expanded to write to an audit table)
  RAISE NOTICE 'Prize pool % unlocked. Reason: %', p_pool_id, p_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unlock_prize_pool IS 'Admin function to unlock a prize pool (use with caution)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
