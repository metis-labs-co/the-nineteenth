-- =====================================================
-- Migration: Redistribute Skins Pots RPC
-- =====================================================
-- Creates a function to redistribute skins pot amounts across
-- rounds when rounds are added or removed from a competition.
--
-- Key Features:
-- - Locks in-progress and completed round pots (won't change)
-- - Evenly distributes remaining budget across upcoming rounds
-- - Creates skins games for new rounds that don't have them
-- - Updates existing skins games with new pot amounts
-- - Maintains complete transaction audit trail
-- =====================================================

-- ============================================================================
-- FUNCTION: redistribute_skins_pots
-- ============================================================================
-- Redistributes skins pot amounts across rounds when the round count changes.
-- Called when:
--   - Prize pool is saved with auto_split_skins = true
--   - A new round is added to a competition
--   - A round is deleted from a competition
--
-- Algorithm:
--   1. Calculate locked amount (in_progress + completed rounds)
--   2. remaining_budget = skins_budget - locked_amount
--   3. pot_per_upcoming = remaining_budget / upcoming_round_count
--   4. Update existing upcoming skins games with new pot
--   5. Create skins games for rounds without them
--   6. Update pool.skins_pot_per_round

CREATE OR REPLACE FUNCTION redistribute_skins_pots(
  p_competition_id UUID
) RETURNS TABLE (
  rounds_updated INT,
  rounds_created INT,
  new_pot_per_round DECIMAL,
  locked_amount DECIMAL
) AS $$
DECLARE
  v_pool competition_prize_pools%ROWTYPE;
  v_locked_amount DECIMAL := 0;
  v_remaining_budget DECIMAL;
  v_upcoming_round_count INT := 0;
  v_new_pot_per_round DECIMAL;
  v_rounds_updated INT := 0;
  v_rounds_created INT := 0;
  v_participant_ids UUID[];
  v_round RECORD;
  v_new_game_id UUID;
  v_current_pot DECIMAL;
BEGIN
  -- Get prize pool for competition
  SELECT * INTO v_pool
  FROM competition_prize_pools
  WHERE competition_id = p_competition_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No prize pool found for competition: %', p_competition_id;
  END IF;

  -- Verify auto_split_skins is enabled
  IF NOT v_pool.auto_split_skins THEN
    RAISE EXCEPTION 'Auto-split skins is not enabled for this pool';
  END IF;

  -- Calculate locked amount from in_progress and completed rounds
  SELECT COALESCE(SUM(sg.pot_value), 0) INTO v_locked_amount
  FROM skins_games sg
  JOIN rounds r ON r.id = sg.round_id
  WHERE r.competition_id = p_competition_id
    AND r.status IN ('in_progress', 'completed')
    AND sg.pool_source = 'prize_pool'
    AND sg.status != 'cancelled';

  -- Calculate remaining budget
  v_remaining_budget := v_pool.skins_budget - v_locked_amount;

  -- If no remaining budget, we can't create/update games
  IF v_remaining_budget <= 0 THEN
    -- Return zeros - no changes made
    rounds_updated := 0;
    rounds_created := 0;
    new_pot_per_round := 0;
    locked_amount := v_locked_amount;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Count upcoming rounds
  SELECT COUNT(*) INTO v_upcoming_round_count
  FROM rounds
  WHERE competition_id = p_competition_id
    AND status = 'upcoming';

  -- If no upcoming rounds, nothing to do
  IF v_upcoming_round_count = 0 THEN
    rounds_updated := 0;
    rounds_created := 0;
    new_pot_per_round := 0;
    locked_amount := v_locked_amount;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Calculate new pot per upcoming round
  v_new_pot_per_round := ROUND(v_remaining_budget / v_upcoming_round_count, 2);

  -- Get all accepted players for this competition (used for new games)
  SELECT ARRAY_AGG(cp.player_id) INTO v_participant_ids
  FROM competition_players cp
  WHERE cp.competition_id = p_competition_id
    AND cp.status = 'accepted';

  -- Validate we have enough participants
  IF array_length(v_participant_ids, 1) IS NULL OR array_length(v_participant_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Not enough participants for skins games. Need at least 2, found: %',
      COALESCE(array_length(v_participant_ids, 1), 0);
  END IF;

  -- Process each upcoming round
  FOR v_round IN
    SELECT r.id as round_id, sg.id as skins_game_id, sg.pot_value as current_pot
    FROM rounds r
    LEFT JOIN skins_games sg ON sg.round_id = r.id
      AND sg.pool_source = 'prize_pool'
      AND sg.status != 'cancelled'
    WHERE r.competition_id = p_competition_id
      AND r.status = 'upcoming'
    ORDER BY r.round_number
  LOOP
    IF v_round.skins_game_id IS NOT NULL THEN
      -- Round HAS existing pool-sourced skins game - update it
      v_current_pot := COALESCE(v_round.current_pot, 0);

      -- Only update if pot amount is different
      IF v_current_pot != v_new_pot_per_round THEN
        -- Return current pot to pool
        IF v_current_pot > 0 THEN
          PERFORM return_to_pool(
            v_pool.id,
            v_round.round_id,
            v_current_pot,
            'Redistribution - returning pot for rebalance'
          );
        END IF;

        -- Draw new pot amount
        PERFORM draw_from_pool(
          v_pool.id,
          v_round.round_id,
          v_new_pot_per_round
        );

        -- Update the skins game with new pot value
        UPDATE skins_games
        SET
          pot_value = v_new_pot_per_round,
          pool_draw_amount = v_new_pot_per_round,
          updated_at = NOW()
        WHERE id = v_round.skins_game_id;

        v_rounds_updated := v_rounds_updated + 1;
      END IF;

    ELSE
      -- Round does NOT have skins game - create one
      -- Draw from pool first
      PERFORM draw_from_pool(
        v_pool.id,
        v_round.round_id,
        v_new_pot_per_round
      );

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
        v_round.round_id,
        v_participant_ids,
        'total_pot',
        v_new_pot_per_round,
        'AUD',
        COALESCE(v_pool.skins_scoring_type, 'net'),
        'prize_pool',
        v_new_pot_per_round,
        NOW(),
        v_pool.created_by,
        v_pool.created_by,
        'active'
      )
      RETURNING id INTO v_new_game_id;

      v_rounds_created := v_rounds_created + 1;
    END IF;
  END LOOP;

  -- Update pool's skins_pot_per_round
  UPDATE competition_prize_pools
  SET
    skins_pot_per_round = v_new_pot_per_round,
    updated_at = NOW()
  WHERE id = v_pool.id;

  -- Return results
  rounds_updated := v_rounds_updated;
  rounds_created := v_rounds_created;
  new_pot_per_round := v_new_pot_per_round;
  locked_amount := v_locked_amount;
  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION redistribute_skins_pots IS 'Redistributes skins pot amounts across upcoming rounds. Locks in-progress/completed rounds and evenly splits remaining budget.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
