-- Migration: soft_delete_round / restore_round
-- Soft-deletes a round + its scorecards/pairings/scoring_pairs by stamping a
-- single shared deleted_at, then recomputes skins/wolf aggregates for affected
-- players. restore_round reverses it, only un-stamping children that share the
-- round's deletion timestamp.

CREATE OR REPLACE FUNCTION soft_delete_round(p_round_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_user UUID := auth.uid();
  v_owner UUID;
  v_competition_id UUID;
  v_organizer UUID;
  v_authorized BOOLEAN := FALSE;
  v_skins_players UUID[];
  v_wolf_players UUID[];
BEGIN
  SELECT user_id, competition_id INTO v_owner, v_competition_id
  FROM rounds WHERE id = p_round_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN FALSE; -- already deleted or does not exist
  END IF;

  IF v_owner IS NOT NULL AND v_owner = v_user THEN
    v_authorized := TRUE;
  ELSIF v_competition_id IS NOT NULL THEN
    SELECT organizer_id INTO v_organizer FROM competitions WHERE id = v_competition_id;
    v_authorized := (v_organizer = v_user);
  END IF;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized to delete round %', p_round_id USING ERRCODE = '42501';
  END IF;

  -- Capture affected players BEFORE stamping deleted_at.
  SELECT ARRAY(
    SELECT DISTINCT sp.player_id FROM skins_payouts sp
    JOIN skins_games sg ON sg.id = sp.skins_game_id
    WHERE sg.round_id = p_round_id
  ) INTO v_skins_players;
  SELECT ARRAY(
    SELECT DISTINCT wp.player_id FROM wolf_payouts wp
    JOIN wolf_games wg ON wg.id = wp.wolf_game_id
    WHERE wg.round_id = p_round_id
  ) INTO v_wolf_players;

  UPDATE scorecards   SET deleted_at = v_now, updated_at = v_now WHERE round_id = p_round_id AND deleted_at IS NULL;
  UPDATE pairings     SET deleted_at = v_now, updated_at = v_now WHERE round_id = p_round_id AND deleted_at IS NULL;
  UPDATE scoring_pairs SET deleted_at = v_now, updated_at = v_now WHERE round_id = p_round_id AND deleted_at IS NULL;
  UPDATE rounds       SET deleted_at = v_now, updated_at = v_now WHERE id = p_round_id;

  PERFORM recompute_skins_player_statistics(v_skins_players);
  PERFORM recompute_wolf_player_statistics(v_wolf_players);

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION restore_round(p_round_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_owner UUID;
  v_competition_id UUID;
  v_organizer UUID;
  v_authorized BOOLEAN := FALSE;
  v_deleted_at TIMESTAMPTZ;
  v_skins_players UUID[];
  v_wolf_players UUID[];
BEGIN
  SELECT user_id, competition_id, deleted_at
    INTO v_owner, v_competition_id, v_deleted_at
  FROM rounds WHERE id = p_round_id;
  IF NOT FOUND OR v_deleted_at IS NULL THEN
    RETURN FALSE; -- nothing to restore
  END IF;

  IF v_owner IS NOT NULL AND v_owner = v_user THEN
    v_authorized := TRUE;
  ELSIF v_competition_id IS NOT NULL THEN
    SELECT organizer_id INTO v_organizer FROM competitions WHERE id = v_competition_id;
    v_authorized := (v_organizer = v_user);
  END IF;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized to restore round %', p_round_id USING ERRCODE = '42501';
  END IF;

  -- Restore the round + only the children stamped at the same timestamp.
  UPDATE rounds       SET deleted_at = NULL, updated_at = NOW() WHERE id = p_round_id;
  UPDATE scorecards   SET deleted_at = NULL, updated_at = NOW() WHERE round_id = p_round_id AND deleted_at = v_deleted_at;
  UPDATE pairings     SET deleted_at = NULL, updated_at = NOW() WHERE round_id = p_round_id AND deleted_at = v_deleted_at;
  UPDATE scoring_pairs SET deleted_at = NULL, updated_at = NOW() WHERE round_id = p_round_id AND deleted_at = v_deleted_at;

  -- Recompute now that the round is live again.
  SELECT ARRAY(
    SELECT DISTINCT sp.player_id FROM skins_payouts sp
    JOIN skins_games sg ON sg.id = sp.skins_game_id
    WHERE sg.round_id = p_round_id
  ) INTO v_skins_players;
  SELECT ARRAY(
    SELECT DISTINCT wp.player_id FROM wolf_payouts wp
    JOIN wolf_games wg ON wg.id = wp.wolf_game_id
    WHERE wg.round_id = p_round_id
  ) INTO v_wolf_players;

  PERFORM recompute_skins_player_statistics(v_skins_players);
  PERFORM recompute_wolf_player_statistics(v_wolf_players);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_round(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_round(UUID) TO authenticated;

COMMENT ON FUNCTION soft_delete_round(UUID) IS 'Soft-delete a round (owner or competition organizer only) + recompute skins/wolf stats.';
COMMENT ON FUNCTION restore_round(UUID) IS 'Restore a soft-deleted round + its same-timestamp children + recompute stats.';
