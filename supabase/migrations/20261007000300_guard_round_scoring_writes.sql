-- Shape declarations protect ended-round scores AND client-owned totals.
-- Deploy after 20261007000200, alongside the C4/C5 client adapters.
-- Local proof: supabase/tests/competition_compatibility/run.py (isolated container).
-- Human staging recipe (known pooler port 6543; separate rollout authorization):
-- psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
-- SET default_transaction_read_only = off;
-- show transaction_read_only; -- must be off
-- BEGIN;
-- \i supabase/migrations/20261007000300_guard_round_scoring_writes.sql
-- ROLLBACK; -- use COMMIT only for an approved rollout
-- SQL

-- Private pure comparison used only by the privileged row guard. Optional
-- stat deletion/JSON null is allowed; unchanged unsupported legacy data is
-- deliberately not revalidated. All other JSON content must remain identical.
CREATE OR REPLACE FUNCTION public.round_scoring_stats_delta(p_old JSONB, p_new JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key TEXT; v_stat TEXT; v_old JSONB; v_new JSONB; v_value JSONB;
  v_stats TEXT[] := ARRAY['putts', 'fairwayHit', 'fairwayMissDirection',
    'greenInRegulation', 'greenMissDirection', 'bunkerShots', 'hazards'];
BEGIN
  IF jsonb_typeof(p_old) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_new) IS DISTINCT FROM 'object'
     OR (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_old) k)
        IS DISTINCT FROM
        (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_new) k) THEN
    RETURN FALSE;
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_new) LOOP
    v_old := p_old->v_key; v_new := p_new->v_key;
    IF v_old IS NOT DISTINCT FROM v_new THEN CONTINUE; END IF;
    IF v_key !~ '^[0-9]+$' OR jsonb_typeof(v_old) IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_new) IS DISTINCT FROM 'object'
       OR NOT (v_old ? 'strokes') OR NOT (v_new ? 'strokes')
       OR v_old ? 'balls' OR v_new ? 'balls'
       OR (v_old - v_stats) IS DISTINCT FROM (v_new - v_stats) THEN
      RETURN FALSE;
    END IF;
    FOREACH v_stat IN ARRAY v_stats LOOP
      v_value := v_new->v_stat;
      IF (v_old->v_stat) IS NOT DISTINCT FROM v_value
         OR v_value IS NULL OR v_value = 'null'::JSONB THEN CONTINUE; END IF;
      IF v_stat IN ('putts', 'bunkerShots') THEN
        IF jsonb_typeof(v_value) <> 'number' THEN RETURN FALSE; END IF;
        IF (v_value::TEXT)::NUMERIC <> trunc((v_value::TEXT)::NUMERIC)
           OR (v_value::TEXT)::NUMERIC < 0
           OR (v_value::TEXT)::NUMERIC > (CASE v_stat WHEN 'putts' THEN 6 ELSE 5 END) THEN
          RETURN FALSE;
        END IF;
      ELSIF v_stat IN ('fairwayHit', 'greenInRegulation') THEN
        IF jsonb_typeof(v_value) <> 'boolean' THEN RETURN FALSE; END IF;
      ELSIF v_stat IN ('fairwayMissDirection', 'greenMissDirection') THEN
        IF jsonb_typeof(v_value) <> 'string'
           OR v_value #>> '{}' NOT IN ('left', 'right', 'long', 'short') THEN RETURN FALSE; END IF;
      ELSE
        IF jsonb_typeof(v_value) <> 'array' THEN RETURN FALSE; END IF;
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_value) h
                    WHERE jsonb_typeof(h) IS DISTINCT FROM 'object'
                       OR NOT (h ? 'type') OR h - 'type' <> '{}'::JSONB
                       OR jsonb_typeof(h->'type') IS DISTINCT FROM 'string'
                       OR h->>'type' NOT IN ('water', 'ob', 'lateral', 'lost_ball'))
           OR (SELECT count(*) FROM jsonb_array_elements(v_value)) <>
              (SELECT count(DISTINCT h->>'type') FROM jsonb_array_elements(v_value) h) THEN
          RETURN FALSE;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.round_scoring_stats_delta(JSONB, JSONB) FROM PUBLIC, anon, authenticated;

-- Trigger entry points alone have privileged access. They lock/read rounds,
-- never perform privileged scorecard DML. No role/definer bypass or RLS change.
CREATE OR REPLACE FUNCTION public.guard_round_scorecard_write()
RETURNS TRIGGER LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nine TEXT; v_played INT; v_first INT; v_last INT; v_shape JSONB;
  v_context JSONB; v_raw TEXT; v_bound BOOLEAN := FALSE; v_operation TEXT;
  v_metadata TEXT[] := ARRAY['updated_at', 'created_at', 'synced_at', 'device_id', 'deleted_at'];
  v_delta BOOLEAN; v_expected_trim JSONB;
BEGIN
  -- Existing UPDATEs already hold their card lock; ending locks all cards
  -- NOWAIT. Missing cards and identity moves also need a parent interlock.
  -- KEY SHARE is compatible between ordinary writers AND with completion's
  -- non-key round UPDATE. It conflicts with end_round_early's FOR UPDATE.
  -- Keep NOWAIT for row-first writes racing a round-first end. Do not skip
  -- by competition_id: a round can be reclassified before ending.
  IF TG_OP = 'INSERT' OR NEW.round_id IS DISTINCT FROM OLD.round_id
     OR NEW.player_id IS DISTINCT FROM OLD.player_id
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    BEGIN
      PERFORM r.id FROM public.rounds r WHERE r.id = NEW.round_id FOR KEY SHARE NOWAIT;
      -- ON CONFLICT can wait normally for its own card: this parent lock
      -- cannot block the holder's completion notification. No extra conflict
      -- card probe or round-wide exclusive writer lock is needed.
    EXCEPTION WHEN lock_not_available THEN
      RAISE EXCEPTION 'Round scoring is busy; try again'
        USING ERRCODE = '22023', HINT = 'round_scoring_busy';
    END;
  END IF;

  -- Separate statement, fresh after any lock wait. Include soft-deleted
  -- parents: unrelated deletion/restoration metadata must continue working.
  SELECT r.nine_type, r.holes_played INTO v_nine, v_played
    FROM public.rounds r WHERE r.id = NEW.round_id;
  IF NOT FOUND THEN RETURN NEW; END IF; -- retain normal FK/RLS behavior
  v_first := CASE WHEN v_nine = 'back9' THEN 10 ELSE 1 END;
  v_last := v_first + COALESCE(v_played, CASE WHEN v_nine = 'full' THEN 18 ELSE 9 END) - 1;
  v_shape := jsonb_build_object('nine_type', v_nine, 'holes_played', v_played);

  v_raw := current_setting('app.round_scoring_write', true);
  IF COALESCE(v_raw, '') <> '' THEN
    BEGIN
      v_context := v_raw::JSONB;
    EXCEPTION WHEN invalid_text_representation THEN v_context := NULL;
    END;
    v_operation := v_context->>'operation';
    v_bound := COALESCE(jsonb_typeof(v_context) = 'object'
      AND v_operation IN ('snapshot', 'resolution', 'handicap_patch', 'end_trim')
      AND v_context->>'round_id' = NEW.round_id::TEXT
      AND v_context->>'player_id' = NEW.player_id::TEXT
      AND v_context->>'card_id' = NEW.id::TEXT, FALSE);
    -- Invalid/unbound context cannot be recycled for another card or round.
    IF NOT v_bound THEN
      RAISE EXCEPTION 'Round scoring context is unavailable'
        USING ERRCODE = '22023', HINT = 'round_shape_changed';
    END IF;
    IF v_context ? 'expected_round_shape' THEN
      IF jsonb_typeof(v_context->'expected_round_shape') IS DISTINCT FROM 'object'
         OR NOT ((v_context->'expected_round_shape') ?& ARRAY['nine_type', 'holes_played'])
         OR jsonb_typeof(v_context->'expected_round_shape'->'nine_type') IS DISTINCT FROM 'string'
         OR v_context->'expected_round_shape'->>'nine_type' NOT IN ('full', 'front9', 'back9')
         OR jsonb_typeof(v_context->'expected_round_shape'->'holes_played') NOT IN ('number', 'null') THEN
        RAISE EXCEPTION 'Invalid round scoring shape'
          USING ERRCODE = '22023', HINT = 'invalid_round_shape';
      END IF;
      IF v_context->'expected_round_shape'->'holes_played' <> 'null'::JSONB THEN
        IF (v_context->'expected_round_shape'->>'holes_played')::NUMERIC < 1
           OR (v_context->'expected_round_shape'->>'holes_played')::NUMERIC >=
              (CASE WHEN v_context->'expected_round_shape'->>'nine_type' = 'full' THEN 18 ELSE 9 END)
           OR (v_context->'expected_round_shape'->>'holes_played')::NUMERIC <>
              trunc((v_context->'expected_round_shape'->>'holes_played')::NUMERIC) THEN
          RAISE EXCEPTION 'Invalid round scoring shape'
            USING ERRCODE = '22023', HINT = 'invalid_round_shape';
        END IF;
      END IF;
      IF (v_context->'expected_round_shape'->'nine_type') IS DISTINCT FROM (v_shape->'nine_type')
         OR (v_context->'expected_round_shape'->'holes_played') IS DISTINCT FROM (v_shape->'holes_played') THEN
        RAISE EXCEPTION 'Round scoring shape changed; prepare scores again'
          USING ERRCODE = '22023', HINT = 'round_shape_changed';
      END IF;
    ELSIF v_operation <> 'snapshot' OR v_played IS NOT NULL THEN
      RAISE EXCEPTION 'Round scoring shape changed; prepare scores again'
        USING ERRCODE = '22023', HINT = 'round_shape_changed';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- player_id alone is metadata; id/round and every scoring/lifecycle value
    -- must stay unchanged. Unknown row fields remain protected by default.
    v_delta := (to_jsonb(NEW) - v_metadata - 'player_id') IS DISTINCT FROM
               (to_jsonb(OLD) - v_metadata - 'player_id');
    IF NOT v_delta AND NOT v_bound THEN RETURN NEW; END IF;
  ELSE v_delta := TRUE;
  END IF;

  IF v_operation = 'end_trim' AND v_bound THEN
    IF TG_OP <> 'UPDATE' OR
       (to_jsonb(NEW) - v_metadata - ARRAY['scores', 'handicap_differential']) IS DISTINCT FROM
       (to_jsonb(OLD) - v_metadata - ARRAY['scores', 'handicap_differential']) THEN
      RAISE EXCEPTION 'Invalid round scoring write' USING ERRCODE = '22023', HINT = 'round_shape_changed';
    END IF;
    -- Exactly B1's trim, including existing non-hole JSON behavior. This
    -- narrowly permits its intermediate stale client-owned totals interval.
    v_expected_trim := OLD.scores;
    IF jsonb_typeof(OLD.scores) = 'object' THEN
      SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::JSONB) INTO v_expected_trim
        FROM jsonb_each(OLD.scores) e
       WHERE CASE WHEN e.key ~ '^[0-9]{1,3}$' THEN e.key::INT <= v_last ELSE TRUE END;
    END IF;
    IF NEW.scores IS DISTINCT FROM OLD.scores AND NEW.scores IS DISTINCT FROM v_expected_trim
       OR (NEW.handicap_differential IS NOT NULL AND
           NEW.handicap_differential IS DISTINCT FROM OLD.handicap_differential) THEN
      RAISE EXCEPTION 'Invalid round scoring write' USING ERRCODE = '22023', HINT = 'round_shape_changed';
    END IF;
    RETURN NEW;
  END IF;

  -- Enforce the early-end cutoff, not a new validation policy for ordinary
  -- rounds or legacy clients. Check before the stats exception; never silently
  -- strip scores and accept stale totals.
  IF v_played IS NOT NULL AND jsonb_typeof(NEW.scores) = 'object' AND EXISTS (
    SELECT 1 FROM jsonb_object_keys(NEW.scores) k
     WHERE CASE WHEN k ~ '^[0-9]+$' THEN
       CASE WHEN length(k) > 3 THEN TRUE ELSE k::INT < v_first OR k::INT > v_last END
       ELSE FALSE END
  ) THEN
    RAISE EXCEPTION 'Score is outside the playable round'
      USING ERRCODE = '22023', HINT = 'round_score_out_of_play';
  END IF;

  IF TG_OP = 'UPDATE' AND v_bound AND v_operation IN ('resolution', 'handicap_patch') THEN
    IF v_operation = 'resolution' THEN
      IF (to_jsonb(NEW) - v_metadata - ARRAY['scores', 'total_gross', 'total_net', 'total_points'])
         IS DISTINCT FROM
         (to_jsonb(OLD) - v_metadata - ARRAY['scores', 'total_gross', 'total_net', 'total_points']) THEN
        RAISE EXCEPTION 'Invalid round scoring write' USING ERRCODE = '22023', HINT = 'round_shape_changed';
      END IF;
    ELSIF (to_jsonb(NEW) - v_metadata - ARRAY['handicap_differential', 'course_rating_used',
              'slope_rating_used', 'daily_handicap_used', 'ga_handicap_used', 'total_points'])
       IS DISTINCT FROM
          (to_jsonb(OLD) - v_metadata - ARRAY['handicap_differential', 'course_rating_used',
              'slope_rating_used', 'daily_handicap_used', 'ga_handicap_used', 'total_points']) THEN
      RAISE EXCEPTION 'Invalid round scoring write' USING ERRCODE = '22023', HINT = 'round_shape_changed';
    END IF;
  END IF;

  IF v_played IS NOT NULL AND NOT v_bound THEN
    IF TG_OP = 'UPDATE'
       AND (to_jsonb(NEW) - v_metadata - 'scores') IS NOT DISTINCT FROM
           (to_jsonb(OLD) - v_metadata - 'scores')
       AND public.round_scoring_stats_delta(OLD.scores, NEW.scores) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Round scoring shape changed; prepare scores again'
      USING ERRCODE = '22023', HINT = 'round_shape_changed';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_round_scorecard_write() FROM PUBLIC, anon, authenticated;
-- Runs BEFORE A7's one-way differential nulling; it cannot conceal a direct
-- handicap mutation from actual-delta comparison. A7 never authorizes scores.
DROP TRIGGER IF EXISTS scorecards_a_round_scoring_write ON public.scorecards;
CREATE TRIGGER scorecards_a_round_scoring_write
  BEFORE INSERT OR UPDATE ON public.scorecards
  FOR EACH ROW EXECUTE FUNCTION public.guard_round_scorecard_write();

CREATE OR REPLACE FUNCTION public.guard_round_score_entry_write()
RETURNS TRIGGER LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_nine TEXT; v_played INT; v_first INT; v_last INT;
BEGIN
  BEGIN
    PERFORM r.id FROM public.rounds r WHERE r.id = NEW.round_id FOR KEY SHARE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RAISE EXCEPTION 'Round scoring is busy; try again'
      USING ERRCODE = '22023', HINT = 'round_scoring_busy';
  END;
  SELECT r.nine_type, r.holes_played INTO v_nine, v_played
    FROM public.rounds r WHERE r.id = NEW.round_id;
  IF NOT FOUND OR v_played IS NULL THEN RETURN NEW; END IF;
  v_first := CASE WHEN v_nine = 'back9' THEN 10 ELSE 1 END;
  v_last := v_first + COALESCE(v_played, CASE WHEN v_nine = 'full' THEN 18 ELSE 9 END) - 1;
  IF NEW.hole_number < v_first OR NEW.hole_number > v_last THEN
    RAISE EXCEPTION 'Score is outside the playable round'
      USING ERRCODE = '22023', HINT = 'round_score_out_of_play';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_round_score_entry_write() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS score_entries_round_scoring_write ON public.score_entries;
CREATE TRIGGER score_entries_round_scoring_write
  BEFORE INSERT OR UPDATE ON public.score_entries
  FOR EACH ROW EXECUTE FUNCTION public.guard_round_score_entry_write();

-- Preserve the original four-argument/card-first/revision/terminal contract.
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prior_context TEXT := current_setting('app.round_scoring_write', true);
  v_card_id UUID;
  v_context JSONB;
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

    v_card_id := gen_random_uuid();
    v_context := jsonb_build_object('operation', 'snapshot', 'round_id', p_round_id,
      'player_id', p_player_id, 'card_id', v_card_id);
    IF p_snapshot ? 'expected_round_shape' THEN
      v_context := v_context || jsonb_build_object('expected_round_shape', p_snapshot->'expected_round_shape');
    END IF;
    PERFORM set_config('app.round_scoring_write', v_context::TEXT, true);
    BEGIN
      INSERT INTO scorecards (
        id, round_id, player_id, scores, total_gross, total_net, total_points,
        total_par_score, status, submitted_at, submitted_by, synced_at,
        ga_handicap_used, daily_handicap_used, handicap_differential,
        course_rating_used, slope_rating_used, revision
      ) VALUES (
        v_card_id,
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
      PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
      SELECT * INTO v_existing
        FROM scorecards
       WHERE round_id = p_round_id AND player_id = p_player_id;
      RETURN QUERY SELECT FALSE, TRUE, v_existing.revision, v_existing.status, v_existing.scores;
      RETURN;
    END;

    PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
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

  v_context := jsonb_build_object('operation', 'snapshot', 'round_id', p_round_id,
    'player_id', p_player_id, 'card_id', v_existing.id);
  IF p_snapshot ? 'expected_round_shape' THEN
    v_context := v_context || jsonb_build_object('expected_round_shape', p_snapshot->'expected_round_shape');
  END IF;
  PERFORM set_config('app.round_scoring_write', v_context::TEXT, true);
  -- The VOLATILE row guard reads fresh shape in a separate statement after
  -- the card-first lock above, even when scores compare equal to stored JSON.
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

  PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
  IF v_revision IS NULL THEN
    SELECT * INTO v_existing FROM scorecards WHERE id = v_existing.id;
    RETURN QUERY SELECT FALSE, TRUE, v_existing.revision, v_existing.status, v_existing.scores;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, FALSE, v_revision, v_status, COALESCE(p_snapshot->'scores', '{}'::JSONB);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.write_scorecard_snapshot(UUID, UUID, BIGINT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_scorecard_snapshot(UUID, UUID, BIGINT, JSONB) TO authenticated;

-- B1 authorization, same-N return, NOWAIT/submitted/combined checks and
-- side-game deletion bodies remain unchanged. No revision or totals writes.
CREATE OR REPLACE FUNCTION end_round_early(
  p_round_id UUID,
  p_holes_played INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prior_context TEXT := current_setting('app.round_scoring_write', true);
  v_card RECORD;
  v_user UUID := auth.uid();
  v_owner UUID;
  v_competition_id UUID;
  v_nine_type TEXT;
  v_status TEXT;
  v_existing SMALLINT;
  v_planned INT;
  v_last_hole INT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Reject competitions without taking a lock that could delay ordinary scoring.
  SELECT competition_id INTO v_competition_id
  FROM rounds
  WHERE id = p_round_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round % not found', p_round_id USING ERRCODE = 'P0002';
  END IF;

  IF v_competition_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only social rounds can be ended early' USING ERRCODE = '42501';
  END IF;

  -- Re-read and recheck under lock: the round may have changed since preflight.
  SELECT user_id, competition_id, nine_type, status, holes_played
    INTO v_owner, v_competition_id, v_nine_type, v_status, v_existing
  FROM rounds
  WHERE id = p_round_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round % not found', p_round_id USING ERRCODE = 'P0002';
  END IF;

  IF v_competition_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only social rounds can be ended early' USING ERRCODE = '42501';
  END IF;

  -- The owner, or an ACCEPTED participant. is_round_participant would also
  -- let pending and declined invitees in.
  IF v_owner IS DISTINCT FROM v_user
     AND NOT is_accepted_round_participant(p_round_id, v_user) THEN
    RAISE EXCEPTION 'Not authorized to end round %', p_round_id USING ERRCODE = '42501';
  END IF;

  v_planned := CASE WHEN v_nine_type = 'full' THEN 18 ELSE 9 END;
  IF p_holes_played IS NULL OR p_holes_played < 1 OR p_holes_played >= v_planned THEN
    RAISE EXCEPTION 'holes_played must be between 1 and % for a % round (got %)',
      v_planned - 1, v_nine_type, p_holes_played
      USING ERRCODE = '22023', HINT = 'invalid_holes_played';
  END IF;

  IF v_existing IS NOT NULL THEN
    IF v_existing = p_holes_played THEN
      -- Retry of a call that already landed (queued item, double tap,
      -- second device ending at the same hole): no-op success, any status.
      RETURN;
    END IF;
    -- First end wins. The client adopts the server's N from DETAIL.
    RAISE EXCEPTION 'Round % was already ended after % holes', p_round_id, v_existing
      USING ERRCODE = '22023', DETAIL = v_existing::TEXT, HINT = 'round_already_ended';
  END IF;

  -- Only a round being played can be ended (the same-N retry above already
  -- returned, so a queued retry after completion still succeeds).
  IF v_status IS DISTINCT FROM 'in-progress' THEN
    IF v_status = 'completed' THEN
      RAISE EXCEPTION 'Round % is already completed', p_round_id
        USING ERRCODE = '22023', HINT = 'round_completed';
    END IF;
    RAISE EXCEPTION 'Round % is not in progress (status %)', p_round_id, v_status
      USING ERRCODE = '22023', HINT = 'round_not_in_progress';
  END IF;

  -- Submission holds a scorecard lock before notify_round_completed can
  -- update the round. We already hold the round lock, so NOWAIT avoids that
  -- opposite lock order becoming a deadlock. No writes precede these checks.
  BEGIN
    PERFORM sc.id
      FROM public.scorecards sc
     WHERE sc.round_id = p_round_id
     ORDER BY sc.id
     FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RAISE EXCEPTION 'Round scores are changing; try ending the round again'
      USING ERRCODE = '22023', HINT = 'round_scorecards_busy';
  END;

  -- Fresh statements after locking see submissions/combinations that
  -- committed before the locks were acquired. Keep existing history intact.
  IF EXISTS (
    SELECT 1 FROM public.scorecards sc
     WHERE sc.round_id = p_round_id
       AND sc.status IN ('completed', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'A round with submitted scorecards cannot be ended early'
      USING ERRCODE = '22023', HINT = 'round_has_submitted_scorecards';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.handicap_combined_rounds hcr
      JOIN public.scorecards sc
        ON sc.id = hcr.front_scorecard_id OR sc.id = hcr.back_scorecard_id
     WHERE sc.round_id = p_round_id
  ) THEN
    RAISE EXCEPTION 'A round with combined scorecards cannot be ended early'
      USING ERRCODE = '22023', HINT = 'round_has_combined_scorecards';
  END IF;

  v_last_hole := (CASE WHEN v_nine_type = 'back9' THEN 9 ELSE 0 END) + p_holes_played;

  -- guard_rounds_holes_played (below) refuses any holes_played change unless
  -- this transaction-local flag is on. Set it around this one UPDATE only.
  PERFORM set_config('app.ending_round', 'on', true);
  UPDATE rounds
     SET holes_played = p_holes_played, updated_at = NOW()
   WHERE id = p_round_id;
  PERFORM set_config('app.ending_round', 'off', true);

  -- Rows for holes after the last played hole.
  DELETE FROM skins_results sr
   USING skins_games sg
   WHERE sr.skins_game_id = sg.id
     AND sg.round_id = p_round_id
     AND sr.hole_number > v_last_hole;

  DELETE FROM wolf_hole_decisions wd
   USING wolf_games wg
   WHERE wd.wolf_game_id = wg.id
     AND wg.round_id = p_round_id
     AND wd.hole_number > v_last_hole;

  DELETE FROM score_entries se
   WHERE se.round_id = p_round_id
     AND se.hole_number > v_last_hole;

  -- A pending mismatch on a removed hole would block multi-scorer submission
  -- readiness on another phone.
  DELETE FROM score_mismatches sm
   WHERE sm.round_id = p_round_id
     AND sm.hole_number > v_last_hole;

  -- shot_log feeds the v_sand_saves views; shots on unplayed holes must go.
  DELETE FROM shot_log sl
   WHERE sl.round_id = p_round_id
     AND sl.hole_number > v_last_hole;

  -- Score keys after the last played hole ('16', '17', '18' for a back 9
  -- ended after 6). Non-numeric keys and {} cards are left alone.
  -- Deliberately NOT touched: revision (only write_scorecard_snapshot bumps
  -- it; bumping it here would turn the ending device's own follow-up
  -- snapshot into a stale write and a false "changed on another device"
  -- conflict) and the totals (client-owned; that snapshot carries them,
  -- recomputed over the holes played).
  -- app.ending_round is already OFF. Bind each trim to the exact card,
  -- player and accepted shape; never leave a round-wide scoring bypass.
  FOR v_card IN SELECT id, player_id FROM public.scorecards
                WHERE round_id = p_round_id ORDER BY id LOOP
    PERFORM set_config('app.round_scoring_write', jsonb_build_object(
      'operation', 'end_trim', 'round_id', p_round_id,
      'player_id', v_card.player_id, 'card_id', v_card.id,
      'expected_round_shape', jsonb_build_object('nine_type', v_nine_type,
        'holes_played', p_holes_played))::TEXT, true);
  UPDATE scorecards sc
     SET scores = (
           SELECT COALESCE(jsonb_object_agg(e.key, e.value), '{}'::JSONB)
             FROM jsonb_each(sc.scores) AS e
            WHERE CASE WHEN e.key ~ '^[0-9]{1,3}$' THEN e.key::INT <= v_last_hole ELSE TRUE END
         )
   WHERE sc.round_id = p_round_id AND sc.id = v_card.id
     AND jsonb_typeof(sc.scores) = 'object'
     AND EXISTS (
           SELECT 1
             FROM jsonb_object_keys(sc.scores) AS k
            WHERE CASE WHEN k ~ '^[0-9]{1,3}$' THEN k::INT > v_last_hole ELSE FALSE END
         );

  -- No handicap impact at all (R13). A7's scorecards trigger (via the helper
  -- replaced in section 3) keeps it NULL on every later write.
  UPDATE scorecards
     SET handicap_differential = NULL
   WHERE round_id = p_round_id AND id = v_card.id
     AND handicap_differential IS NOT NULL;
    PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.end_round_early(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_round_early(UUID, INT) TO authenticated;

-- Narrow patches deliberately keep revision/status/submission untouched.
CREATE OR REPLACE FUNCTION public.write_scorecard_resolution(p_scorecard_id UUID, p_patch JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_card public.scorecards%ROWTYPE;
  v_prior_context TEXT := current_setting('app.round_scoring_write', true);
  v_count INT;
BEGIN
  SELECT * INTO v_card FROM public.scorecards WHERE id = p_scorecard_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object'
     OR NOT (p_patch ?& ARRAY['scores', 'total_gross', 'updated_at', 'expected_round_shape'])
     OR p_patch - ARRAY['scores', 'total_gross', 'updated_at', 'total_net', 'total_points', 'expected_round_shape'] <> '{}'::JSONB THEN
    RAISE EXCEPTION 'Invalid scorecard patch' USING ERRCODE = '22023', HINT = 'invalid_round_shape';
  END IF;
  PERFORM set_config('app.round_scoring_write', jsonb_build_object(
    'operation', 'resolution', 'round_id', v_card.round_id,
    'player_id', v_card.player_id, 'card_id', v_card.id,
    'expected_round_shape', p_patch->'expected_round_shape')::TEXT, true);
  -- The private VOLATILE row guard validates fresh shape after card lock.
  -- Existing eligibility trigger nulls ended differentials; no server math.
  UPDATE public.scorecards sc
     SET scores = p_patch->'scores',
         total_gross = (p_patch->>'total_gross')::INTEGER,
         updated_at = (p_patch->>'updated_at')::TIMESTAMPTZ,
         total_net = CASE WHEN p_patch ? 'total_net' THEN (p_patch->>'total_net')::INTEGER ELSE sc.total_net END,
         total_points = CASE WHEN p_patch ? 'total_points' THEN (p_patch->>'total_points')::INTEGER ELSE sc.total_points END
   WHERE sc.id = v_card.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
  RETURN v_count = 1;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
  RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.write_scorecard_resolution(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_scorecard_resolution(UUID, JSONB) TO authenticated;

-- Narrow patches deliberately keep revision/status/submission untouched.
CREATE OR REPLACE FUNCTION public.write_scorecard_handicap_patch(p_scorecard_id UUID, p_patch JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_card public.scorecards%ROWTYPE;
  v_prior_context TEXT := current_setting('app.round_scoring_write', true);
  v_count INT;
BEGIN
  SELECT * INTO v_card FROM public.scorecards WHERE id = p_scorecard_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object'
     OR NOT (p_patch ?& ARRAY['handicap_differential', 'course_rating_used', 'slope_rating_used', 'daily_handicap_used', 'ga_handicap_used', 'expected_round_shape'])
     OR p_patch - ARRAY['handicap_differential', 'course_rating_used', 'slope_rating_used', 'daily_handicap_used', 'ga_handicap_used', 'total_points', 'expected_round_shape'] <> '{}'::JSONB THEN
    RAISE EXCEPTION 'Invalid scorecard patch' USING ERRCODE = '22023', HINT = 'invalid_round_shape';
  END IF;
  PERFORM set_config('app.round_scoring_write', jsonb_build_object(
    'operation', 'handicap_patch', 'round_id', v_card.round_id,
    'player_id', v_card.player_id, 'card_id', v_card.id,
    'expected_round_shape', p_patch->'expected_round_shape')::TEXT, true);
  -- The private VOLATILE row guard validates fresh shape after card lock.
  -- Existing eligibility trigger nulls ended differentials; no server math.
  UPDATE public.scorecards sc
     SET handicap_differential = (p_patch->>'handicap_differential')::NUMERIC,
         course_rating_used = (p_patch->>'course_rating_used')::NUMERIC,
         slope_rating_used = (p_patch->>'slope_rating_used')::INTEGER,
         daily_handicap_used = (p_patch->>'daily_handicap_used')::INTEGER,
         ga_handicap_used = (p_patch->>'ga_handicap_used')::NUMERIC,
         total_points = CASE WHEN p_patch ? 'total_points' THEN (p_patch->>'total_points')::INTEGER ELSE sc.total_points END
   WHERE sc.id = v_card.id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
  RETURN v_count = 1;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.round_scoring_write', COALESCE(v_prior_context, ''), true);
  RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.write_scorecard_handicap_patch(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_scorecard_handicap_patch(UUID, JSONB) TO authenticated;
