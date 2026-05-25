-- Migration: harden soft_delete_competition (auth + stat recompute) and add restore_competition

CREATE OR REPLACE FUNCTION soft_delete_competition(p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_round_ids UUID[];
  v_organizer UUID;
  v_skins_players UUID[];
  v_wolf_players UUID[];
BEGIN
  SELECT organizer_id INTO v_organizer
  FROM competitions WHERE id = p_competition_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF v_organizer IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to delete competition %', p_competition_id USING ERRCODE = '42501';
  END IF;

  SELECT ARRAY_AGG(id) INTO v_round_ids
  FROM rounds WHERE competition_id = p_competition_id AND deleted_at IS NULL;

  -- Capture affected players across all of this competition's rounds' games.
  SELECT ARRAY(
    SELECT DISTINCT sp.player_id FROM skins_payouts sp
    JOIN skins_games sg ON sg.id = sp.skins_game_id
    WHERE sg.round_id = ANY(COALESCE(v_round_ids, ARRAY[]::UUID[]))
  ) INTO v_skins_players;
  SELECT ARRAY(
    SELECT DISTINCT wp.player_id FROM wolf_payouts wp
    JOIN wolf_games wg ON wg.id = wp.wolf_game_id
    WHERE wg.round_id = ANY(COALESCE(v_round_ids, ARRAY[]::UUID[]))
  ) INTO v_wolf_players;

  IF v_round_ids IS NOT NULL AND array_length(v_round_ids, 1) > 0 THEN
    UPDATE scorecards    SET deleted_at = v_now, updated_at = v_now WHERE round_id = ANY(v_round_ids) AND deleted_at IS NULL;
    UPDATE pairings      SET deleted_at = v_now, updated_at = v_now WHERE round_id = ANY(v_round_ids) AND deleted_at IS NULL;
    UPDATE scoring_pairs SET deleted_at = v_now, updated_at = v_now WHERE round_id = ANY(v_round_ids) AND deleted_at IS NULL;
  END IF;

  UPDATE rounds SET deleted_at = v_now, updated_at = v_now
  WHERE competition_id = p_competition_id AND deleted_at IS NULL;

  UPDATE competition_players SET deleted_at = v_now
  WHERE competition_id = p_competition_id AND deleted_at IS NULL;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    EXECUTE format('UPDATE teams SET deleted_at = $1, updated_at = $1 WHERE competition_id = $2 AND deleted_at IS NULL')
      USING v_now, p_competition_id;
  END IF;

  UPDATE competitions SET deleted_at = v_now, updated_at = v_now
  WHERE id = p_competition_id AND deleted_at IS NULL;

  PERFORM recompute_skins_player_statistics(v_skins_players);
  PERFORM recompute_wolf_player_statistics(v_wolf_players);

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION restore_competition(p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_at TIMESTAMPTZ;
  v_organizer UUID;
  v_round_ids UUID[];
  v_skins_players UUID[];
  v_wolf_players UUID[];
BEGIN
  SELECT organizer_id, deleted_at INTO v_organizer, v_deleted_at
  FROM competitions WHERE id = p_competition_id;
  IF NOT FOUND OR v_deleted_at IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_organizer IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to restore competition %', p_competition_id USING ERRCODE = '42501';
  END IF;

  SELECT ARRAY_AGG(id) INTO v_round_ids
  FROM rounds WHERE competition_id = p_competition_id AND deleted_at = v_deleted_at;

  UPDATE competitions SET deleted_at = NULL, updated_at = NOW() WHERE id = p_competition_id;
  UPDATE competition_players SET deleted_at = NULL WHERE competition_id = p_competition_id AND deleted_at = v_deleted_at;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    EXECUTE format('UPDATE teams SET deleted_at = NULL, updated_at = NOW() WHERE competition_id = $1 AND deleted_at = $2')
      USING p_competition_id, v_deleted_at;
  END IF;
  UPDATE rounds SET deleted_at = NULL, updated_at = NOW() WHERE competition_id = p_competition_id AND deleted_at = v_deleted_at;

  IF v_round_ids IS NOT NULL AND array_length(v_round_ids, 1) > 0 THEN
    UPDATE scorecards    SET deleted_at = NULL, updated_at = NOW() WHERE round_id = ANY(v_round_ids) AND deleted_at = v_deleted_at;
    UPDATE pairings      SET deleted_at = NULL, updated_at = NOW() WHERE round_id = ANY(v_round_ids) AND deleted_at = v_deleted_at;
    UPDATE scoring_pairs SET deleted_at = NULL, updated_at = NOW() WHERE round_id = ANY(v_round_ids) AND deleted_at = v_deleted_at;
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT sp.player_id FROM skins_payouts sp
    JOIN skins_games sg ON sg.id = sp.skins_game_id
    WHERE sg.round_id = ANY(COALESCE(v_round_ids, ARRAY[]::UUID[]))
  ) INTO v_skins_players;
  SELECT ARRAY(
    SELECT DISTINCT wp.player_id FROM wolf_payouts wp
    JOIN wolf_games wg ON wg.id = wp.wolf_game_id
    WHERE wg.round_id = ANY(COALESCE(v_round_ids, ARRAY[]::UUID[]))
  ) INTO v_wolf_players;

  PERFORM recompute_skins_player_statistics(v_skins_players);
  PERFORM recompute_wolf_player_statistics(v_wolf_players);

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_competition(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_competition(UUID) TO authenticated;

COMMENT ON FUNCTION soft_delete_competition(UUID) IS 'Soft-delete a competition tree (organizer only) + recompute skins/wolf stats.';
COMMENT ON FUNCTION restore_competition(UUID) IS 'Restore a soft-deleted competition tree (same-timestamp rows) + recompute stats.';
