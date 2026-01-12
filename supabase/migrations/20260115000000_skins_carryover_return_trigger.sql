-- =====================================================
-- Migration: Skins Carryover Return Trigger
-- =====================================================
-- Creates a trigger on skins_games that automatically
-- returns any remaining carryover to the competition
-- prize pool when a pool-funded skins game completes.
--
-- Behavior:
-- - Triggers when skins_game status changes to 'completed'
-- - Only applies to games with pool_source = 'prize_pool'
-- - Calculates remaining carryover from skins_results
-- - Calls return_to_pool() to credit the prize pool
-- - Updates skins_games.carryover_returned field
-- =====================================================

-- ============================================================================
-- FUNCTION: calculate_skins_remaining_carryover
-- ============================================================================
-- Calculates any remaining carryover after all 18 holes
-- This handles edge cases where carryover wasn't fully distributed

CREATE OR REPLACE FUNCTION calculate_skins_remaining_carryover(
  p_skins_game_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_game skins_games%ROWTYPE;
  v_total_pot DECIMAL;
  v_total_distributed DECIMAL;
  v_remaining DECIMAL;
BEGIN
  -- Get the skins game
  SELECT * INTO v_game
  FROM skins_games
  WHERE id = p_skins_game_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate total pot value
  IF v_game.pot_type = 'per_hole' THEN
    v_total_pot := v_game.pot_value * 18;
  ELSE
    v_total_pot := v_game.pot_value;
  END IF;

  -- Calculate total distributed (sum of all payout amounts)
  SELECT COALESCE(SUM(payout_amount), 0) INTO v_total_distributed
  FROM skins_results
  WHERE skins_game_id = p_skins_game_id
    AND payout_amount > 0;

  -- Remaining = Total pot - Distributed
  v_remaining := v_total_pot - v_total_distributed;

  -- Handle floating point precision issues
  IF v_remaining < 0.01 THEN
    v_remaining := 0;
  END IF;

  RETURN v_remaining;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_skins_remaining_carryover IS 'Calculates remaining carryover after all holes in a skins game';

-- ============================================================================
-- FUNCTION: return_skins_carryover_to_pool
-- ============================================================================
-- Main trigger function that handles returning carryover to the prize pool

CREATE OR REPLACE FUNCTION return_skins_carryover_to_pool()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_carryover DECIMAL;
  v_pool_id UUID;
  v_round rounds%ROWTYPE;
  v_description TEXT;
BEGIN
  -- Only trigger on status change to 'completed'
  IF OLD.status = NEW.status OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Only process pool-funded games
  IF NEW.pool_source != 'prize_pool' THEN
    RETURN NEW;
  END IF;

  -- Calculate remaining carryover
  v_remaining_carryover := calculate_skins_remaining_carryover(NEW.id);

  -- If no carryover, nothing to return
  IF v_remaining_carryover <= 0 THEN
    -- Still update the field to indicate we processed it
    NEW.carryover_returned := 0;
    RETURN NEW;
  END IF;

  -- Get the round to find the competition
  SELECT * INTO v_round
  FROM rounds
  WHERE id = NEW.round_id;

  IF NOT FOUND THEN
    -- Round not found, can't find pool
    RAISE WARNING 'Round not found for skins game %, cannot return carryover', NEW.id;
    NEW.carryover_returned := 0;
    RETURN NEW;
  END IF;

  -- Get the prize pool for this competition
  SELECT id INTO v_pool_id
  FROM competition_prize_pools
  WHERE competition_id = v_round.competition_id;

  IF v_pool_id IS NULL THEN
    -- No prize pool exists (shouldn't happen for pool-funded games, but handle gracefully)
    RAISE WARNING 'No prize pool found for competition %, cannot return carryover', v_round.competition_id;
    NEW.carryover_returned := 0;
    RETURN NEW;
  END IF;

  -- Build description for the transaction
  v_description := format('Skins carryover returned from Round %s',
    COALESCE(v_round.name, v_round.round_number::TEXT, 'Unknown'));

  -- Return the carryover to the pool
  PERFORM return_to_pool(v_pool_id, NEW.round_id, v_remaining_carryover, v_description);

  -- Update the carryover_returned field
  NEW.carryover_returned := v_remaining_carryover;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION return_skins_carryover_to_pool IS 'Trigger function to return skins carryover to prize pool on game completion';

-- ============================================================================
-- TRIGGER: on_skins_game_complete_return_carryover
-- ============================================================================
-- Fires BEFORE UPDATE to modify the NEW record with carryover_returned value

CREATE TRIGGER on_skins_game_complete_return_carryover
  BEFORE UPDATE ON skins_games
  FOR EACH ROW
  EXECUTE FUNCTION return_skins_carryover_to_pool();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
