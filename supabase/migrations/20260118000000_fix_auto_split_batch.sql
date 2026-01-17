-- =====================================================
-- Migration: Fix Auto-Split Batch RPC
-- =====================================================
-- This migration fixes critical bugs in the create_auto_split_skins_batch
-- function that prevented auto-split skins from working correctly.
--
-- BUGS FIXED:
-- 1. VALIDATION BUG (Line 70-72 of original):
--    - OLD: IF NOT v_pool.is_locked OR v_pool.status != 'active' THEN
--    - This always rejected new pools because is_locked is false initially
--    - and draft pools aren't 'active' yet
--    - NEW: Allow both 'draft' and 'active' status (don't check is_locked)
--
-- 2. PLAYER STATUS MISMATCH (Line 103 of original):
--    - OLD: AND cp.status = 'confirmed'
--    - The app uses 'accepted' status, not 'confirmed'
--    - NEW: AND cp.status = 'accepted'
--
-- 3. 4-PLAYER LIMIT REMOVED (Lines 111-115 of original):
--    - OLD: Limited skins games to 4 players max
--    - User requirement: All competition players should participate
--    - NEW: No player limit - all accepted players are included
-- =====================================================

-- ============================================================================
-- FUNCTION: create_auto_split_skins_batch (FIXED)
-- ============================================================================
-- Creates skins games for multiple rounds atomically.
-- Used by auto-split feature to create all games at once.

CREATE OR REPLACE FUNCTION create_auto_split_skins_batch(
  p_competition_id UUID,
  p_pool_id UUID,
  p_round_ids UUID[],
  p_pot_per_round DECIMAL,
  p_scoring_type TEXT,
  p_created_by UUID
) RETURNS TABLE (
  game_id UUID,
  round_id UUID,
  draw_amount DECIMAL
) AS $$
DECLARE
  v_pool competition_prize_pools%ROWTYPE;
  v_total_needed DECIMAL;
  v_available_balance DECIMAL;
  v_current_round_id UUID;
  v_new_game_id UUID;
  v_actual_draw DECIMAL;
  v_participant_ids UUID[];
BEGIN
  -- Validate inputs
  IF array_length(p_round_ids, 1) IS NULL OR array_length(p_round_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No rounds provided for auto-split';
  END IF;

  IF p_pot_per_round <= 0 THEN
    RAISE EXCEPTION 'Pot per round must be positive, got: %', p_pot_per_round;
  END IF;

  IF p_scoring_type NOT IN ('gross', 'net') THEN
    RAISE EXCEPTION 'Invalid scoring type: %. Must be gross or net', p_scoring_type;
  END IF;

  -- Get pool and validate it exists and is active
  SELECT * INTO v_pool
  FROM competition_prize_pools
  WHERE id = p_pool_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prize pool not found: %', p_pool_id;
  END IF;

  IF v_pool.competition_id != p_competition_id THEN
    RAISE EXCEPTION 'Pool does not belong to competition';
  END IF;

  -- FIX #1: Allow both draft and active pools
  -- Draft pools are used before the first round starts
  -- Active pools are used after the competition begins
  IF v_pool.status NOT IN ('draft', 'active') THEN
    RAISE EXCEPTION 'Pool status must be draft or active, got: %', v_pool.status;
  END IF;

  -- Calculate total funds needed
  v_total_needed := p_pot_per_round * array_length(p_round_ids, 1);

  -- Get current skins budget balance
  v_available_balance := get_pool_balance(p_pool_id, 'skins');

  -- Validate sufficient funds BEFORE creating any games
  IF v_total_needed > v_available_balance THEN
    RAISE EXCEPTION 'Insufficient skins budget: need $%, only $% available',
      ROUND(v_total_needed, 2),
      ROUND(v_available_balance, 2);
  END IF;

  -- Check for existing skins games on any of the rounds
  IF EXISTS (
    SELECT 1 FROM skins_games sg
    WHERE sg.round_id = ANY(p_round_ids)
      AND sg.status != 'cancelled'
  ) THEN
    RAISE EXCEPTION 'One or more rounds already have skins games';
  END IF;

  -- Create skins games for each round atomically
  FOREACH v_current_round_id IN ARRAY p_round_ids
  LOOP
    -- FIX #2: Get participants for this round - use 'accepted' status, not 'confirmed'
    -- The app uses 'accepted' for players who have joined the competition
    SELECT ARRAY_AGG(cp.player_id) INTO v_participant_ids
    FROM competition_players cp
    WHERE cp.competition_id = p_competition_id
      AND cp.status = 'accepted';

    -- Validate participant count (minimum 2 players required for skins)
    IF array_length(v_participant_ids, 1) IS NULL OR array_length(v_participant_ids, 1) < 2 THEN
      RAISE EXCEPTION 'Not enough participants for skins game. Need at least 2, found: %',
        COALESCE(array_length(v_participant_ids, 1), 0);
    END IF;

    -- FIX #3: REMOVED 4-PLAYER LIMIT
    -- All competition players should participate in pool-sourced skins games
    -- This is a user requirement - support larger groups without artificial limits

    -- Draw from pool - this creates the transaction record
    v_actual_draw := draw_from_pool(p_pool_id, v_current_round_id, p_pot_per_round);

    -- Create the skins game
    INSERT INTO skins_games (
      round_id,
      participant_ids,
      pot_type,
      pot_value,
      currency,
      scoring_type,
      pool_source,
      pool_draw_amount,
      disclaimer_accepted_at,
      disclaimer_accepted_by,
      created_by,
      status
    ) VALUES (
      v_current_round_id,
      v_participant_ids,
      'total_pot',  -- Auto-split uses total pot mode
      v_actual_draw,
      'AUD',
      p_scoring_type,
      'prize_pool',  -- Funded from prize pool
      v_actual_draw,
      NOW(),  -- Disclaimer accepted at creation time for auto-split
      p_created_by,
      p_created_by,
      'active'
    )
    RETURNING id INTO v_new_game_id;

    -- Return this game in the result set
    game_id := v_new_game_id;
    round_id := v_current_round_id;
    draw_amount := v_actual_draw;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_auto_split_skins_batch IS 'Atomically creates skins games for multiple rounds with funds from prize pool. Rolls back entirely if any step fails. Fixed: Allows draft/active pools, uses accepted status, no player limit.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
