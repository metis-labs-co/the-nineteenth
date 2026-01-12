-- =====================================================
-- Migration: Prize Pool Functions
-- =====================================================
-- PostgreSQL functions for prize pool management
-- including calculations, locking, and transactions.
-- =====================================================

-- ============================================================================
-- FUNCTION 1: calculate_pool_total
-- ============================================================================
-- Calculates the total pool amount based on funding type
-- - per_player: funding_amount × player_count
-- - fixed_total: funding_amount

CREATE OR REPLACE FUNCTION calculate_pool_total(
  p_funding_type TEXT,
  p_funding_amount DECIMAL,
  p_player_count INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  IF p_funding_type = 'per_player' THEN
    RETURN p_funding_amount * p_player_count;
  ELSIF p_funding_type = 'fixed_total' THEN
    RETURN p_funding_amount;
  ELSE
    RAISE EXCEPTION 'Invalid funding type: %. Must be per_player or fixed_total', p_funding_type;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_pool_total IS 'Calculates total pool amount based on funding type and player count';

-- ============================================================================
-- FUNCTION 2: calculate_pool_allocations
-- ============================================================================
-- Updates the budget amounts based on percentages and total pool amount
-- Should be called after updating allocations or total amount

CREATE OR REPLACE FUNCTION calculate_pool_allocations(
  p_pool_id UUID
) RETURNS VOID AS $$
DECLARE
  v_total DECIMAL;
  v_skins_pct DECIMAL;
  v_winner_pct DECIMAL;
  v_other_pct DECIMAL;
BEGIN
  -- Get current pool values
  SELECT total_pool_amount, skins_allocation_percent, winner_allocation_percent, other_allocation_percent
  INTO v_total, v_skins_pct, v_winner_pct, v_other_pct
  FROM competition_prize_pools
  WHERE id = p_pool_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prize pool not found: %', p_pool_id;
  END IF;

  -- Update calculated budgets
  UPDATE competition_prize_pools
  SET
    skins_budget = ROUND(v_total * v_skins_pct / 100, 2),
    winner_budget = ROUND(v_total * v_winner_pct / 100, 2),
    other_budget = ROUND(v_total * v_other_pct / 100, 2),
    updated_at = NOW()
  WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_pool_allocations IS 'Updates budget amounts based on allocation percentages';

-- ============================================================================
-- FUNCTION 3: lock_prize_pool
-- ============================================================================
-- Locks a prize pool (called when first round starts)

CREATE OR REPLACE FUNCTION lock_prize_pool(
  p_pool_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE competition_prize_pools
  SET
    is_locked = TRUE,
    locked_at = NOW(),
    status = CASE WHEN status = 'draft' THEN 'active' ELSE status END,
    updated_at = NOW()
  WHERE id = p_pool_id
    AND is_locked = FALSE;

  IF NOT FOUND THEN
    -- Pool doesn't exist or already locked - that's okay
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION lock_prize_pool IS 'Locks a prize pool to prevent modifications after round starts';

-- ============================================================================
-- FUNCTION 4: draw_from_pool
-- ============================================================================
-- Draws an amount from the pool's skins budget for a round
-- Returns the actual amount drawn (may be less if insufficient funds)

CREATE OR REPLACE FUNCTION draw_from_pool(
  p_pool_id UUID,
  p_round_id UUID,
  p_amount DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  v_available DECIMAL;
  v_draw_amount DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Get available skins budget
  v_available := get_pool_balance(p_pool_id, 'skins');

  -- Determine actual draw amount (can't draw more than available)
  IF p_amount > v_available THEN
    v_draw_amount := v_available;
  ELSE
    v_draw_amount := p_amount;
  END IF;

  -- Calculate new balance after draw
  v_new_balance := v_available - v_draw_amount;

  -- Create transaction record
  INSERT INTO pool_transactions (
    pool_id,
    transaction_type,
    amount,
    round_id,
    description,
    balance_after
  ) VALUES (
    p_pool_id,
    'skins_draw',
    -v_draw_amount,  -- Negative for draw
    p_round_id,
    'Skins pot draw for round',
    v_new_balance
  );

  RETURN v_draw_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION draw_from_pool IS 'Draws amount from pool skins budget, returns actual amount drawn';

-- ============================================================================
-- FUNCTION 5: return_to_pool
-- ============================================================================
-- Returns an amount to the pool (e.g., carryover after round completion)

CREATE OR REPLACE FUNCTION return_to_pool(
  p_pool_id UUID,
  p_round_id UUID,
  p_amount DECIMAL,
  p_description TEXT DEFAULT 'Carryover returned to pool'
) RETURNS VOID AS $$
DECLARE
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
BEGIN
  -- Get current skins balance
  v_current_balance := get_pool_balance(p_pool_id, 'skins');
  v_new_balance := v_current_balance + p_amount;

  -- Create transaction record
  INSERT INTO pool_transactions (
    pool_id,
    transaction_type,
    amount,
    round_id,
    description,
    balance_after
  ) VALUES (
    p_pool_id,
    'skins_return',
    p_amount,  -- Positive for return
    p_round_id,
    p_description,
    v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION return_to_pool IS 'Returns amount to pool (e.g., carryover from completed round)';

-- ============================================================================
-- FUNCTION 6: get_pool_balance
-- ============================================================================
-- Gets the remaining balance for a specific category
-- Categories: 'skins', 'winner', 'other', 'total'

CREATE OR REPLACE FUNCTION get_pool_balance(
  p_pool_id UUID,
  p_category TEXT DEFAULT 'skins'
) RETURNS DECIMAL AS $$
DECLARE
  v_budget DECIMAL;
  v_used DECIMAL := 0;
BEGIN
  -- Get the budget for the category
  CASE p_category
    WHEN 'skins' THEN
      SELECT skins_budget INTO v_budget
      FROM competition_prize_pools
      WHERE id = p_pool_id;

      -- Calculate used amount from transactions
      SELECT COALESCE(SUM(
        CASE
          WHEN transaction_type = 'skins_draw' THEN ABS(amount)
          WHEN transaction_type = 'skins_return' THEN -amount
          ELSE 0
        END
      ), 0) INTO v_used
      FROM pool_transactions
      WHERE pool_id = p_pool_id
        AND transaction_type IN ('skins_draw', 'skins_return');

    WHEN 'winner' THEN
      SELECT winner_budget INTO v_budget
      FROM competition_prize_pools
      WHERE id = p_pool_id;

      -- Calculate used from prize payouts
      SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_used
      FROM pool_transactions
      WHERE pool_id = p_pool_id
        AND transaction_type = 'prize_payout'
        AND description LIKE '%winner%';

    WHEN 'other' THEN
      SELECT other_budget INTO v_budget
      FROM competition_prize_pools
      WHERE id = p_pool_id;

      -- Calculate used from other payouts
      SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_used
      FROM pool_transactions
      WHERE pool_id = p_pool_id
        AND transaction_type = 'prize_payout'
        AND description NOT LIKE '%winner%';

    WHEN 'total' THEN
      SELECT total_pool_amount INTO v_budget
      FROM competition_prize_pools
      WHERE id = p_pool_id;

      -- All transactions affect total
      SELECT COALESCE(SUM(
        CASE
          WHEN transaction_type IN ('skins_draw', 'prize_payout') THEN ABS(amount)
          WHEN transaction_type = 'skins_return' THEN -amount
          WHEN transaction_type = 'adjustment' THEN -amount
          ELSE 0
        END
      ), 0) INTO v_used
      FROM pool_transactions
      WHERE pool_id = p_pool_id;

    ELSE
      RAISE EXCEPTION 'Invalid category: %. Must be skins, winner, other, or total', p_category;
  END CASE;

  IF v_budget IS NULL THEN
    RAISE EXCEPTION 'Prize pool not found: %', p_pool_id;
  END IF;

  RETURN v_budget - v_used;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_pool_balance IS 'Gets remaining balance for a pool category (skins, winner, other, total)';

-- ============================================================================
-- FUNCTION 7: can_draw_from_pool
-- ============================================================================
-- Checks if the skins budget has sufficient funds for the requested amount

CREATE OR REPLACE FUNCTION can_draw_from_pool(
  p_pool_id UUID,
  p_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_available DECIMAL;
BEGIN
  v_available := get_pool_balance(p_pool_id, 'skins');
  RETURN v_available >= p_amount;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_draw_from_pool IS 'Checks if pool has sufficient skins budget for requested amount';

-- ============================================================================
-- FUNCTION 8: auto_split_pool_for_skins
-- ============================================================================
-- Calculates and sets skins_pot_per_round for auto-split

CREATE OR REPLACE FUNCTION auto_split_pool_for_skins(
  p_pool_id UUID,
  p_round_count INTEGER
) RETURNS VOID AS $$
DECLARE
  v_skins_budget DECIMAL;
  v_pot_per_round DECIMAL;
BEGIN
  IF p_round_count <= 0 THEN
    RAISE EXCEPTION 'Round count must be positive, got: %', p_round_count;
  END IF;

  -- Get skins budget
  SELECT skins_budget INTO v_skins_budget
  FROM competition_prize_pools
  WHERE id = p_pool_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prize pool not found: %', p_pool_id;
  END IF;

  -- Calculate pot per round
  v_pot_per_round := ROUND(v_skins_budget / p_round_count, 2);

  -- Update pool
  UPDATE competition_prize_pools
  SET
    skins_pot_per_round = v_pot_per_round,
    updated_at = NOW()
  WHERE id = p_pool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_split_pool_for_skins IS 'Calculates skins pot per round for auto-split configuration';

-- ============================================================================
-- FUNCTION 9: recalculate_pool_total
-- ============================================================================
-- Recalculates total pool amount based on current player count
-- Only for per_player funding type

CREATE OR REPLACE FUNCTION recalculate_pool_total(
  p_pool_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_pool competition_prize_pools%ROWTYPE;
  v_player_count INTEGER;
  v_new_total DECIMAL;
BEGIN
  -- Get pool
  SELECT * INTO v_pool
  FROM competition_prize_pools
  WHERE id = p_pool_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prize pool not found: %', p_pool_id;
  END IF;

  -- Only recalculate for per_player type
  IF v_pool.funding_type != 'per_player' THEN
    RETURN v_pool.total_pool_amount;
  END IF;

  -- Get current player count
  SELECT COUNT(*) INTO v_player_count
  FROM competition_players
  WHERE competition_id = v_pool.competition_id;

  -- Calculate new total
  v_new_total := v_pool.funding_amount * v_player_count;

  -- Update pool
  UPDATE competition_prize_pools
  SET
    total_pool_amount = v_new_total,
    updated_at = NOW()
  WHERE id = p_pool_id;

  -- Recalculate allocations based on new total
  PERFORM calculate_pool_allocations(p_pool_id);

  -- If auto-split is enabled, recalculate pot per round
  IF v_pool.auto_split_skins THEN
    DECLARE
      v_round_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_round_count
      FROM rounds
      WHERE competition_id = v_pool.competition_id;

      IF v_round_count > 0 THEN
        PERFORM auto_split_pool_for_skins(p_pool_id, v_round_count);
      END IF;
    END;
  END IF;

  RETURN v_new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_pool_total IS 'Recalculates pool total for per_player funding when player count changes';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
