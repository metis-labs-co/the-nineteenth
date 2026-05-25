-- Migration: recompute scoped skins/wolf player statistics (soft-delete aware)
-- These DELETE the given players' aggregate rows, then rebuild from completed
-- games whose parent round has deleted_at IS NULL. Idempotent: safe for both
-- soft-delete and restore. Internal helpers, called from the soft-delete /
-- restore RPCs (which run SECURITY DEFINER), plus service_role for manual ops.

-- ---------- SKINS ----------
CREATE OR REPLACE FUNCTION recompute_skins_player_statistics(p_player_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player_id UUID;
  v_payout RECORD;
  v_games INTEGER; v_wins INTEGER; v_holes_played INTEGER; v_holes_won INTEGER;
  v_holes_tied INTEGER; v_buy_ins DECIMAL(12,2); v_winnings DECIMAL(12,2);
  v_net DECIMAL(12,2); v_streak INTEGER; v_longest INTEGER; v_last TIMESTAMPTZ;
  v_is_win BOOLEAN; v_count INTEGER := 0;
BEGIN
  IF p_player_ids IS NULL OR array_length(p_player_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM skins_player_statistics WHERE player_id = ANY(p_player_ids);

  FOREACH v_player_id IN ARRAY p_player_ids LOOP
    v_games := 0; v_wins := 0; v_holes_played := 0; v_holes_won := 0;
    v_holes_tied := 0; v_buy_ins := 0; v_winnings := 0; v_net := 0;
    v_streak := 0; v_longest := 0; v_last := NULL;

    FOR v_payout IN
      SELECT sp.holes_won, sp.holes_tied, sp.holes_lost, sp.buy_in,
             sp.total_winnings, sp.net_result, sg.completed_at AS game_completed_at
      FROM skins_payouts sp
      JOIN skins_games sg ON sg.id = sp.skins_game_id
      JOIN rounds r ON r.id = sg.round_id
      WHERE sp.player_id = v_player_id
        AND sg.status = 'completed'
        AND r.deleted_at IS NULL
      ORDER BY sg.completed_at ASC
    LOOP
      v_is_win := v_payout.net_result > 0;
      v_games := v_games + 1;
      IF v_is_win THEN
        v_wins := v_wins + 1;
        v_streak := v_streak + 1;
        v_longest := GREATEST(v_longest, v_streak);
      ELSE
        v_streak := 0;
      END IF;
      v_holes_played := v_holes_played + (v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost);
      v_holes_won := v_holes_won + v_payout.holes_won;
      v_holes_tied := v_holes_tied + v_payout.holes_tied;
      v_buy_ins := v_buy_ins + v_payout.buy_in;
      v_winnings := v_winnings + v_payout.total_winnings;
      v_net := v_net + v_payout.net_result;
      v_last := v_payout.game_completed_at;
    END LOOP;

    IF v_games > 0 THEN
      INSERT INTO skins_player_statistics (
        player_id, games_played, games_won, total_holes_played, total_holes_won,
        total_holes_tied, total_buy_ins, total_winnings, total_net_result,
        current_win_streak, longest_win_streak, win_rate, hole_win_rate, last_game_at
      ) VALUES (
        v_player_id, v_games, v_wins, v_holes_played, v_holes_won,
        v_holes_tied, v_buy_ins, v_winnings, v_net,
        v_streak, v_longest,
        ROUND((v_wins::DECIMAL / v_games) * 100, 2),
        CASE WHEN v_holes_played > 0
             THEN ROUND((v_holes_won::DECIMAL / v_holes_played) * 100, 2)
             ELSE NULL END,
        v_last
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------- WOLF ----------
CREATE OR REPLACE FUNCTION recompute_wolf_player_statistics(p_player_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player_id UUID;
  v_payout RECORD;
  v_total_holes INTEGER; v_holes_as_wolf INTEGER;
  v_games INTEGER; v_wins INTEGER; v_points INTEGER; v_holes_played INTEGER;
  v_holes_wolf INTEGER; v_winnings DECIMAL(12,2); v_net DECIMAL(12,2);
  v_streak INTEGER; v_longest INTEGER; v_last TIMESTAMPTZ;
  v_is_win BOOLEAN; v_count INTEGER := 0;
BEGIN
  IF p_player_ids IS NULL OR array_length(p_player_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM wolf_player_statistics WHERE player_id = ANY(p_player_ids);

  FOREACH v_player_id IN ARRAY p_player_ids LOOP
    v_games := 0; v_wins := 0; v_points := 0; v_holes_played := 0;
    v_holes_wolf := 0; v_winnings := 0; v_net := 0;
    v_streak := 0; v_longest := 0; v_last := NULL;

    FOR v_payout IN
      SELECT wp.total_points, wp.total_winnings, wp.net_result,
             wg.id AS game_id, wg.completed_at AS game_completed_at
      FROM wolf_payouts wp
      JOIN wolf_games wg ON wg.id = wp.wolf_game_id
      JOIN rounds r ON r.id = wg.round_id
      WHERE wp.player_id = v_player_id
        AND wg.status = 'completed'
        AND r.deleted_at IS NULL
      ORDER BY wg.completed_at ASC
    LOOP
      SELECT COUNT(*) INTO v_total_holes
      FROM wolf_hole_decisions
      WHERE wolf_game_id = v_payout.game_id AND calculated_at IS NOT NULL;

      SELECT COUNT(*) INTO v_holes_as_wolf
      FROM wolf_hole_decisions
      WHERE wolf_game_id = v_payout.game_id AND wolf_id = v_player_id;

      v_is_win := v_payout.net_result > 0;
      v_games := v_games + 1;
      IF v_is_win THEN
        v_wins := v_wins + 1;
        v_streak := v_streak + 1;
        v_longest := GREATEST(v_longest, v_streak);
      ELSE
        v_streak := 0;
      END IF;
      v_points := v_points + v_payout.total_points;
      v_holes_played := v_holes_played + v_total_holes;
      v_holes_wolf := v_holes_wolf + v_holes_as_wolf;
      v_winnings := v_winnings + v_payout.total_winnings;
      v_net := v_net + v_payout.net_result;
      v_last := v_payout.game_completed_at;
    END LOOP;

    IF v_games > 0 THEN
      INSERT INTO wolf_player_statistics (
        player_id, games_played, games_won, total_points_earned,
        total_holes_played, total_holes_as_wolf, total_winnings, total_net_result,
        current_win_streak, longest_win_streak, win_rate, last_game_at
      ) VALUES (
        v_player_id, v_games, v_wins, v_points,
        v_holes_played, v_holes_wolf, v_winnings, v_net,
        v_streak, v_longest,
        ROUND((v_wins::DECIMAL / v_games) * 100, 2),
        v_last
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION recompute_skins_player_statistics(UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION recompute_wolf_player_statistics(UUID[]) TO service_role;

COMMENT ON FUNCTION recompute_skins_player_statistics(UUID[]) IS
  'Reset + rebuild skins aggregate rows for the given players from completed games whose round is not soft-deleted. Idempotent.';
COMMENT ON FUNCTION recompute_wolf_player_statistics(UUID[]) IS
  'Reset + rebuild wolf aggregate rows for the given players from completed games whose round is not soft-deleted. Idempotent.';
