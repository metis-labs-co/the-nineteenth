-- =====================================================
-- Fix link_placeholder_player: remove non-existent handicap_at_time column
-- =====================================================
-- The round_players table does not have a handicap_at_time column.
-- The original RPC referenced it, causing error 42703 when linking.
-- This migration replaces the function with corrected column references.
-- =====================================================

CREATE OR REPLACE FUNCTION link_placeholder_player(
  p_placeholder_id UUID,
  p_real_player_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_placeholder RECORD;
  v_pairing RECORD;
BEGIN
  -- Verify placeholder exists and is unlinked
  SELECT * INTO v_placeholder
  FROM players
  WHERE id = p_placeholder_id
    AND is_placeholder = TRUE
    AND linked_player_id IS NULL
    AND created_by = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Placeholder not found, already linked, or not owned by current user';
  END IF;

  -- Verify real player exists and is not a placeholder
  IF NOT EXISTS (
    SELECT 1 FROM players
    WHERE id = p_real_player_id
      AND is_placeholder = FALSE
  ) THEN
    RAISE EXCEPTION 'Real player not found or is also a placeholder';
  END IF;

  -- Prevent linking to self
  IF p_placeholder_id = p_real_player_id THEN
    RAISE EXCEPTION 'Cannot link placeholder to itself';
  END IF;

  -- Transfer competition_players entries
  INSERT INTO competition_players (competition_id, player_id, status, invited_at, responded_at, created_at)
  SELECT competition_id, p_real_player_id, status, invited_at, responded_at, created_at
  FROM competition_players
  WHERE player_id = p_placeholder_id
  ON CONFLICT (competition_id, player_id) DO NOTHING;

  DELETE FROM competition_players WHERE player_id = p_placeholder_id;

  -- Transfer scorecards
  UPDATE scorecards
  SET player_id = p_real_player_id
  WHERE player_id = p_placeholder_id
    AND NOT EXISTS (
      SELECT 1 FROM scorecards s2
      WHERE s2.round_id = scorecards.round_id
        AND s2.player_id = p_real_player_id
    );

  DELETE FROM scorecards WHERE player_id = p_placeholder_id;

  -- Transfer pairings (update player_ids arrays)
  FOR v_pairing IN
    SELECT id, player_ids
    FROM pairings
    WHERE p_placeholder_id = ANY(player_ids)
  LOOP
    IF NOT p_real_player_id = ANY(v_pairing.player_ids) THEN
      UPDATE pairings
      SET player_ids = array_replace(player_ids, p_placeholder_id, p_real_player_id)
      WHERE id = v_pairing.id;
    ELSE
      UPDATE pairings
      SET player_ids = array_remove(player_ids, p_placeholder_id)
      WHERE id = v_pairing.id;
    END IF;
  END LOOP;

  -- Transfer round_players entries (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'round_players') THEN
    EXECUTE format('
      INSERT INTO round_players (round_id, player_id, added_by, created_at)
      SELECT round_id, $1, added_by, created_at
      FROM round_players
      WHERE player_id = $2
      ON CONFLICT (round_id, player_id) DO NOTHING
    ') USING p_real_player_id, p_placeholder_id;

    EXECUTE format('DELETE FROM round_players WHERE player_id = $1') USING p_placeholder_id;
  END IF;

  -- Transfer scoring_pairs entries (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scoring_pairs') THEN
    EXECUTE format('
      UPDATE scoring_pairs
      SET scorer_id = $1
      WHERE scorer_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM scoring_pairs sp2
          WHERE sp2.round_id = scoring_pairs.round_id
            AND sp2.scorer_id = $1
        )
    ') USING p_real_player_id, p_placeholder_id;

    EXECUTE format('
      UPDATE scoring_pairs
      SET player_id = $1
      WHERE player_id = $2
        AND NOT EXISTS (
          SELECT 1 FROM scoring_pairs sp2
          WHERE sp2.round_id = scoring_pairs.round_id
            AND sp2.player_id = $1
        )
    ') USING p_real_player_id, p_placeholder_id;

    EXECUTE format('DELETE FROM scoring_pairs WHERE scorer_id = $1 OR player_id = $1') USING p_placeholder_id;
  END IF;

  -- Mark placeholder as linked
  UPDATE players
  SET linked_player_id = p_real_player_id,
      updated_at = NOW()
  WHERE id = p_placeholder_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
