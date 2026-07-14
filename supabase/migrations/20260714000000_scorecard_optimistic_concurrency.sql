-- Server-authoritative optimistic concurrency for scorecard snapshots.
-- The local pending_syncs.revision orders work on one device; this revision
-- protects a scorecard from stale writes originating on different devices.

ALTER TABLE scorecards
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;

COMMENT ON COLUMN scorecards.revision IS
  'Server-owned optimistic concurrency revision. Clients must provide the revision they read; successful writes increment it atomically.';

CREATE OR REPLACE FUNCTION write_scorecard_snapshot(
  p_round_id UUID,
  p_player_id UUID,
  p_expected_revision BIGINT,
  p_snapshot JSONB
)
RETURNS TABLE (
  applied BOOLEAN,
  conflict BOOLEAN,
  server_revision BIGINT,
  server_status TEXT,
  server_scores JSONB
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing scorecards%ROWTYPE;
  v_revision BIGINT;
  v_status TEXT := COALESCE(p_snapshot->>'status', 'in-progress');
BEGIN
  SELECT *
    INTO v_existing
    FROM scorecards
   WHERE round_id = p_round_id
     AND player_id = p_player_id
     AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    -- A create has no server base revision. Accept NULL/0 only, so a stale
    -- client cannot accidentally recreate a row it previously observed.
    IF p_expected_revision IS NOT NULL AND p_expected_revision <> 0 THEN
      RETURN QUERY SELECT FALSE, TRUE, NULL::BIGINT, NULL::TEXT, NULL::JSONB;
      RETURN;
    END IF;

    BEGIN
      INSERT INTO scorecards (
        round_id, player_id, scores, total_gross, total_net, total_points,
        total_par_score, status, submitted_at, submitted_by, synced_at,
        ga_handicap_used, daily_handicap_used, handicap_differential,
        course_rating_used, slope_rating_used, revision
      ) VALUES (
        p_round_id,
        p_player_id,
        COALESCE(p_snapshot->'scores', '{}'::JSONB),
        COALESCE((p_snapshot->>'total_gross')::INTEGER, 0),
        COALESCE((p_snapshot->>'total_net')::INTEGER, 0),
        COALESCE((p_snapshot->>'total_points')::INTEGER, 0),
        (p_snapshot->>'total_par_score')::INTEGER,
        v_status,
        (p_snapshot->>'submitted_at')::TIMESTAMPTZ,
        (p_snapshot->>'submitted_by')::UUID,
        COALESCE((p_snapshot->>'synced_at')::TIMESTAMPTZ, NOW()),
        (p_snapshot->>'ga_handicap_used')::NUMERIC,
        (p_snapshot->>'daily_handicap_used')::INTEGER,
        (p_snapshot->>'handicap_differential')::NUMERIC,
        (p_snapshot->>'course_rating_used')::NUMERIC,
        (p_snapshot->>'slope_rating_used')::INTEGER,
        1
      )
      RETURNING revision INTO v_revision;
    EXCEPTION WHEN unique_violation THEN
      SELECT * INTO v_existing
        FROM scorecards
       WHERE round_id = p_round_id AND player_id = p_player_id;
      RETURN QUERY SELECT FALSE, TRUE, v_existing.revision, v_existing.status, v_existing.scores;
      RETURN;
    END;

    RETURN QUERY SELECT TRUE, FALSE, v_revision, v_status, COALESCE(p_snapshot->'scores', '{}'::JSONB);
    RETURN;
  END IF;

  IF p_expected_revision IS NULL
     OR p_expected_revision <> v_existing.revision
     OR v_existing.status = 'confirmed'
     OR (v_existing.status = 'completed' AND v_status IN ('not-started', 'in-progress')) THEN
    RETURN QUERY SELECT FALSE, TRUE, v_existing.revision, v_existing.status, v_existing.scores;
    RETURN;
  END IF;

  UPDATE scorecards
     SET scores = COALESCE(p_snapshot->'scores', '{}'::JSONB),
         total_gross = COALESCE((p_snapshot->>'total_gross')::INTEGER, 0),
         total_net = COALESCE((p_snapshot->>'total_net')::INTEGER, 0),
         total_points = COALESCE((p_snapshot->>'total_points')::INTEGER, 0),
         total_par_score = (p_snapshot->>'total_par_score')::INTEGER,
         status = v_status,
         submitted_at = (p_snapshot->>'submitted_at')::TIMESTAMPTZ,
         submitted_by = (p_snapshot->>'submitted_by')::UUID,
         synced_at = COALESCE((p_snapshot->>'synced_at')::TIMESTAMPTZ, NOW()),
         ga_handicap_used = (p_snapshot->>'ga_handicap_used')::NUMERIC,
         daily_handicap_used = (p_snapshot->>'daily_handicap_used')::INTEGER,
         handicap_differential = (p_snapshot->>'handicap_differential')::NUMERIC,
         course_rating_used = (p_snapshot->>'course_rating_used')::NUMERIC,
         slope_rating_used = (p_snapshot->>'slope_rating_used')::INTEGER,
         revision = scorecards.revision + 1
   WHERE id = v_existing.id
     AND revision = p_expected_revision
  RETURNING revision INTO v_revision;

  IF NOT FOUND THEN
    SELECT * INTO v_existing FROM scorecards WHERE id = v_existing.id;
    RETURN QUERY SELECT FALSE, TRUE, v_existing.revision, v_existing.status, v_existing.scores;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, FALSE, v_revision, v_status, COALESCE(p_snapshot->'scores', '{}'::JSONB);
END;
$$;

REVOKE ALL ON FUNCTION write_scorecard_snapshot(UUID, UUID, BIGINT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION write_scorecard_snapshot(UUID, UUID, BIGINT, JSONB) TO authenticated;

COMMENT ON FUNCTION write_scorecard_snapshot(UUID, UUID, BIGINT, JSONB) IS
  'Atomically creates or updates a scorecard snapshot using an expected server revision. Returns conflict=true rather than overwriting a newer snapshot.';
