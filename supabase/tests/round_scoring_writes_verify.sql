-- AUTHORED ONLY. Not executed by C3. Disposable staging, after A7/B1/C3.
-- Known pooler port 6543. Human recipe:
-- psql "$DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
-- SET default_transaction_read_only = off;
-- show transaction_read_only; -- must print off
-- \i supabase/tests/round_scoring_writes_verify.sql
-- SQL
-- This file contains BEGIN ... ROLLBACK. Never use production fixture data.
-- Run the C3-adapted end_round_early_verify.sql separately for the complete
-- preserved B1 side-game/submitted/combined/eligibility regression inventory.
-- Its ended fixtures now use valid shape-aware writes or explicit refusals. Real lock schedules are in the companion
-- round_scoring_writes_two_session.md; this file proves no concurrency claim.
BEGIN;

CREATE FUNCTION pg_temp.expect_scoring_error(p_sql TEXT, p_code TEXT, p_hint TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_code TEXT; v_hint TEXT; v_detail TEXT;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_code = RETURNED_SQLSTATE, v_hint = PG_EXCEPTION_HINT,
      v_detail = PG_EXCEPTION_DETAIL;
    ASSERT v_code = p_code, format('Wrong SQLSTATE: %s expected %s', v_code, p_code);
    ASSERT p_hint IS NULL OR v_hint = p_hint, format('Wrong hint: %s expected %s', v_hint, p_hint);
    IF p_hint IN ('round_shape_changed', 'round_score_out_of_play', 'invalid_round_shape') THEN
      ASSERT COALESCE(v_detail, '') = '', 'Guard leaked privileged shape in DETAIL';
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'Expected rejection: %', p_sql;
END;
$$;

INSERT INTO auth.users (id, email) VALUES
 ('ec000000-0000-0000-0000-000000000001', 'c3-owner@example.com'),
 ('ec000000-0000-0000-0000-000000000002', 'c3-mate@example.com'),
 ('ec000000-0000-0000-0000-000000000003', 'c3-outsider@example.com');
INSERT INTO players (id, name, email) VALUES
 ('ec000000-0000-0000-0000-000000000001', 'C3 owner', 'c3-owner@example.com'),
 ('ec000000-0000-0000-0000-000000000002', 'C3 mate', 'c3-mate@example.com'),
 ('ec000000-0000-0000-0000-000000000003', 'C3 outsider', 'c3-outsider@example.com')
 ON CONFLICT (id) DO NOTHING;
INSERT INTO clubs (id, source, name) VALUES
 ('ec000000-0000-0000-0005-000000000001', 'manual', 'C3 physical nine');
INSERT INTO courses (id, club_id, name, holes) VALUES
 ('ec000000-0000-0000-0006-000000000001', 'ec000000-0000-0000-0005-000000000001',
  'C3 nine hole course', '[{"number":1,"par":4},{"number":2,"par":4},{"number":3,"par":4},{"number":4,"par":4},{"number":5,"par":4},{"number":6,"par":4},{"number":7,"par":4},{"number":8,"par":4},{"number":9,"par":4}]');
INSERT INTO rounds (id, user_id, status, nine_type, course_id)
 SELECT ('ec000000-0000-0000-0001-' || lpad(i::TEXT, 12, '0'))::UUID,
   'ec000000-0000-0000-0000-000000000001', 'in-progress',
   CASE i WHEN 2 THEN 'front9' WHEN 3 THEN 'back9' ELSE 'full' END,
   CASE WHEN i = 4 THEN 'ec000000-0000-0000-0006-000000000001'::UUID ELSE NULL END
 FROM generate_series(1, 4) i;
INSERT INTO round_players (round_id, player_id, invitation_status)
 SELECT r.id, p.id, 'accepted' FROM rounds r CROSS JOIN players p
 WHERE r.id::TEXT LIKE 'ec000000-0000-0000-0001-%'
 AND p.id IN ('ec000000-0000-0000-0000-000000000001', 'ec000000-0000-0000-0000-000000000002');
INSERT INTO scorecards (id, round_id, player_id, scores, total_gross, status)
 SELECT ('ec000000-0000-0000-0007-' || lpad(i::TEXT, 12, '0'))::UUID,
   ('ec000000-0000-0000-0001-' || lpad(i::TEXT, 12, '0'))::UUID,
   'ec000000-0000-0000-0000-000000000001',
   CASE WHEN i = 3 THEN '{"10":{"strokes":4},"16":{"strokes":5},"meta":{"legacy":true}}'::JSONB
        ELSE '{"1":{"strokes":4,"putts":99,"unknown":"keep"},"7":{"strokes":5},"meta":{"legacy":true}}'::JSONB END,
   9, 'in-progress' FROM generate_series(1, 4) i;
UPDATE scorecards SET scores=scores || '{"2":{"balls":[{"strokes":4},{"strokes":5}],"unknown":"keep"}}'::JSONB
 WHERE id='ec000000-0000-0000-0007-000000000004';

-- Ordinary competition scorer has scorecard rights but no round UPDATE
-- rights. Neither snapshot path may acquire an INVOKER round lock.
INSERT INTO competitions (id,name,start_date,end_date,handicap_system,visibility,invite_code,organizer_id,status)
VALUES ('ec000000-0000-0000-0004-000000000001','C3 competition',CURRENT_DATE,CURRENT_DATE,
  'honor','private','C3VFY-0001','ec000000-0000-0000-0000-000000000002','upcoming');
INSERT INTO competition_players(competition_id,player_id,status) VALUES
 ('ec000000-0000-0000-0004-000000000001','ec000000-0000-0000-0000-000000000001','accepted'),
 ('ec000000-0000-0000-0004-000000000001','ec000000-0000-0000-0000-000000000002','accepted');
INSERT INTO rounds(id,competition_id,round_number,status,nine_type) VALUES
 ('ec000000-0000-0000-0001-000000000005','ec000000-0000-0000-0004-000000000001',1,'in-progress','full');
INSERT INTO rounds(id,user_id,status,nine_type) VALUES
 ('ec000000-0000-0000-0001-000000000006','ec000000-0000-0000-0000-000000000001','in-progress','full');
INSERT INTO scorecards(id,round_id,player_id,status,scores,deleted_at) VALUES
 ('ec000000-0000-0000-0007-000000000006','ec000000-0000-0000-0001-000000000006',
 'ec000000-0000-0000-0000-000000000001','in-progress','{}',NOW());

-- Real RLS, ordinary owner, not a privileged direct-write bypass.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ec000000-0000-0000-0000-000000000001","role":"authenticated"}';
DO $$
DECLARE
 v_r UUID := 'ec000000-0000-0000-0001-000000000001';
 v_p UUID := 'ec000000-0000-0000-0000-000000000001';
 v_c UUID := 'ec000000-0000-0000-0007-000000000001';
 v_result RECORD; v_before JSONB; v_shape JSONB; v_payload JSONB; v_revision BIGINT;
BEGIN
 -- Legacy omission succeeds only while unended. Actual result/revision contract.
 SELECT * INTO v_result FROM write_scorecard_snapshot(v_r, v_p, 1,
   '{"scores":{"1":{"strokes":4,"putts":99,"unknown":"keep"},"7":{"strokes":5},"meta":{"legacy":true}},"total_gross":9}');
 ASSERT v_result.applied AND NOT v_result.conflict AND v_result.server_revision = 2;
 ASSERT COALESCE(current_setting('app.round_scoring_write', true), '') = '';
 SELECT to_jsonb(sc) INTO v_before FROM scorecards sc WHERE id = v_c;
 FOREACH v_shape IN ARRAY ARRAY['null'::JSONB, '[]'::JSONB, '6'::JSONB, '{}'::JSONB,
   '{"nine_type":"full"}'::JSONB, '{"nine_type":"bad","holes_played":null}'::JSONB,
   '{"nine_type":"full","holes_played":"6"}'::JSONB,
   '{"nine_type":"full","holes_played":1.5}'::JSONB,
   '{"nine_type":"full","holes_played":18}'::JSONB] LOOP
   v_payload := jsonb_build_object('expected_round_shape', v_shape);
   PERFORM pg_temp.expect_scoring_error(format('SELECT * FROM write_scorecard_snapshot(%L,%L,2,%L)',
     v_r, v_p, v_payload), '22023', 'invalid_round_shape');
   ASSERT (SELECT to_jsonb(sc) FROM scorecards sc WHERE id = v_c) = v_before;
   ASSERT COALESCE(current_setting('app.round_scoring_write', true), '') = '';
 END LOOP;
 PERFORM end_round_early(v_r, 6);
 ASSERT (SELECT revision FROM scorecards WHERE id = v_c) = 2;
 ASSERT (SELECT total_gross FROM scorecards WHERE id = v_c) = 9; -- intentionally client-owned interval
 ASSERT NOT (SELECT scores ? '7' FROM scorecards WHERE id = v_c);
 ASSERT COALESCE(current_setting('app.round_scoring_write', true), '') = '';
 SELECT to_jsonb(sc) INTO v_before FROM scorecards sc WHERE id = v_c;
 -- Extra keys and retained-only stale aggregates both reject the WHOLE write.
 FOREACH v_payload IN ARRAY ARRAY[
   '{"scores":{"1":{"strokes":4},"7":{"strokes":5}},"total_gross":9}'::JSONB,
   '{"scores":{"1":{"strokes":4}},"total_gross":9,"expected_round_shape":{"nine_type":"full","holes_played":null}}'::JSONB,
   '{"scores":{"1":{"strokes":4}},"total_gross":9}'::JSONB] LOOP
   PERFORM pg_temp.expect_scoring_error(format('SELECT * FROM write_scorecard_snapshot(%L,%L,2,%L)',
     v_r, v_p, v_payload), '22023', 'round_shape_changed');
   ASSERT (SELECT to_jsonb(sc) FROM scorecards sc WHERE id = v_c) = v_before;
 END LOOP;
 PERFORM pg_temp.expect_scoring_error(format('SELECT * FROM write_scorecard_snapshot(%L,%L,2,%L)', v_r,v_p,
   '{"scores":{"7":{"strokes":5}},"expected_round_shape":{"nine_type":"full","holes_played":6}}'),
   '22023', 'round_score_out_of_play');
 PERFORM pg_temp.expect_scoring_error(format('UPDATE scorecards SET total_gross=99 WHERE id=%L',v_c),
   '22023','round_shape_changed');
 PERFORM pg_temp.expect_scoring_error(format('UPDATE scorecards SET scores=%L WHERE id=%L',
   '{"1":{"strokes":5},"meta":{"legacy":true}}',v_c),'22023','round_shape_changed');
 -- Correct shape succeeds. Ended differential nulling still applies.
 SELECT * INTO v_result FROM write_scorecard_snapshot(v_r,v_p,2,
   '{"scores":{"1":{"strokes":4,"putts":99,"unknown":"keep"},"meta":{"legacy":true}},"total_gross":4,"total_net":4,"handicap_differential":12,"expected_round_shape":{"nine_type":"full","holes_played":6}}');
 ASSERT v_result.applied AND v_result.server_revision=3;
 ASSERT (SELECT handicap_differential IS NULL FROM scorecards WHERE id=v_c);
 -- Changed stat validates; unchanged legacy putts=99 remains supported.
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,fairwayHit}','true') WHERE id=v_c;
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,putts}','2') WHERE id=v_c;
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,greenInRegulation}','false') WHERE id=v_c;
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,fairwayMissDirection}','"left"') WHERE id=v_c;
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,greenMissDirection}','"short"') WHERE id=v_c;
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,bunkerShots}','5') WHERE id=v_c;
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,hazards}','[{"type":"water"},{"type":"ob"}]') WHERE id=v_c;
 UPDATE scorecards SET scores=(scores #- '{1,putts}') WHERE id=v_c;
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,putts}','null') WHERE id=v_c;
 FOREACH v_payload IN ARRAY ARRAY[
   '{"putts":7}', '{"putts":1.5}', '{"bunkerShots":6}', '{"fairwayHit":"yes"}',
   '{"fairwayMissDirection":"up"}', '{"hazards":[{"type":"bunker"}]}',
   '{"hazards":[{"type":"water","extra":1}]}', '{"hazards":[{"type":"ob"},{"type":"ob"}]}',
   '{"penalties":1}', '{"pickedUp":true}', '{"didNotAttempt":true}',
   '{"shotContributions":{"teeShot":"changed"}}', '{"strokes":5}', '{"unknown":"lost"}', '{"balls":[]}'
 ]::JSONB[] LOOP
   PERFORM pg_temp.expect_scoring_error(format(
     'UPDATE scorecards SET scores=jsonb_set(scores,''{1}'',(scores->''1'') || %L::JSONB) WHERE id=%L',v_payload,v_c),
     '22023','round_shape_changed');
 END LOOP;
 PERFORM pg_temp.expect_scoring_error(format('UPDATE scorecards SET scores=scores || %L::JSONB WHERE id=%L',
   '{"2":{"strokes":4,"putts":2}}',v_c),'22023','round_shape_changed');
 PERFORM pg_temp.expect_scoring_error(format('UPDATE scorecards SET scores=scores || %L::JSONB WHERE id=%L',
   '{"7":{"strokes":4}}',v_c),'22023','round_score_out_of_play');
 -- Complete/confirmed compatibility: resolution and handicap patch preserve status,
 -- submission, revision and omitted optional values. Snapshot still refuses confirmed.
 SELECT scores, revision INTO v_payload,v_revision FROM scorecards WHERE id=v_c;
 SELECT * INTO v_result FROM write_scorecard_snapshot(v_r,v_p,v_revision,jsonb_build_object(
   'scores',v_payload,'total_gross',4,'total_net',3,'total_points',8,'status','confirmed',
   'submitted_at',now(),'submitted_by',v_p,'expected_round_shape',jsonb_build_object('nine_type','full','holes_played',6)));
 ASSERT v_result.applied;
 SELECT to_jsonb(sc) INTO v_before FROM scorecards sc WHERE id=v_c;
 ASSERT write_scorecard_resolution(v_c,jsonb_build_object('scores',v_payload,'total_gross',4,
   'updated_at',now(),'expected_round_shape',jsonb_build_object('nine_type','full','holes_played',6)));
 ASSERT (SELECT to_jsonb(sc)-ARRAY['updated_at','synced_at'] FROM scorecards sc WHERE id=v_c)
   = v_before-ARRAY['updated_at','synced_at'];
 ASSERT write_scorecard_handicap_patch(v_c,
   '{"handicap_differential":99,"course_rating_used":72,"slope_rating_used":113,"daily_handicap_used":12,"ga_handicap_used":10,"expected_round_shape":{"nine_type":"full","holes_played":6}}');
 ASSERT (SELECT handicap_differential IS NULL AND total_points=8 AND total_net=3
   AND status='confirmed' AND revision=v_result.server_revision FROM scorecards WHERE id=v_c);
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,putts}','1') WHERE id=v_c;
 PERFORM end_round_early(v_r,6); -- same-N after confirmed submission remains a no-op
 SELECT * INTO v_result FROM write_scorecard_snapshot(v_r,v_p,v_result.server_revision,
   '{"expected_round_shape":{"nine_type":"full","holes_played":6}}');
 ASSERT v_result.conflict AND NOT v_result.applied;
 ASSERT NOT write_scorecard_resolution('ec000000-0000-0000-0007-000000000099','{}');
 ASSERT NOT write_scorecard_handicap_patch('ec000000-0000-0000-0007-000000000099','{}');
 PERFORM pg_temp.expect_scoring_error(format('SELECT write_scorecard_resolution(%L,%L)',v_c,
   '{"scores":{},"total_gross":0,"updated_at":"2026-10-09T00:00:00Z","status":"completed","expected_round_shape":{"nine_type":"full","holes_played":6}}'),
   '22023','invalid_round_shape');
 PERFORM pg_temp.expect_scoring_error(format('SELECT write_scorecard_handicap_patch(%L,%L)',v_c,
   '{"handicap_differential":null,"course_rating_used":72,"slope_rating_used":113,"daily_handicap_used":12,"ga_handicap_used":10,"revision":9,"expected_round_shape":{"nine_type":"full","holes_played":6}}'),
   '22023','invalid_round_shape');
 ASSERT COALESCE(current_setting('app.round_scoring_write',true),'')='';
END;
$$;

DO $$
DECLARE v_result RECORD; v_count INT; v_prior TEXT;
BEGIN
 -- Both INSERT and existing UPDATE work without caller round UPDATE rights.
 UPDATE rounds SET updated_at=NOW() WHERE id='ec000000-0000-0000-0001-000000000005';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 ASSERT v_count=0, 'Fixture scorer unexpectedly has round UPDATE permission';
 SELECT * INTO v_result FROM write_scorecard_snapshot(
   'ec000000-0000-0000-0001-000000000005','ec000000-0000-0000-0000-000000000001',NULL,
   '{"scores":{"1":{"strokes":4}},"total_gross":4,"expected_round_shape":{"nine_type":"full","holes_played":null}}');
 ASSERT v_result.applied AND v_result.server_revision=1;
 SELECT * INTO v_result FROM write_scorecard_snapshot(
   'ec000000-0000-0000-0001-000000000005','ec000000-0000-0000-0000-000000000001',1,
   '{"scores":{"1":{"strokes":5}},"total_gross":5,"expected_round_shape":{"nine_type":"full","holes_played":null}}');
 ASSERT v_result.applied AND v_result.server_revision=2;
 -- Completion notification may update the competition round without a new
 -- round SHARE->UPDATE upgrade lock introduced by this migration.
 SELECT * INTO v_result FROM write_scorecard_snapshot(
   'ec000000-0000-0000-0001-000000000005','ec000000-0000-0000-0000-000000000001',2,
   '{"scores":{"1":{"strokes":5}},"total_gross":5,"status":"completed","expected_round_shape":{"nine_type":"full","holes_played":null}}');
 ASSERT v_result.applied;
 -- Existing-conflict ON CONFLICT path keeps ordinary competition scorer
 -- permissions (no round UPDATE permission), original direct revision behavior
 -- and completion compatibility. The private guard locks the conflict NOWAIT.
 INSERT INTO scorecards(round_id,player_id,scores,total_gross,status)
 VALUES('ec000000-0000-0000-0001-000000000005','ec000000-0000-0000-0000-000000000001',
   '{"1":{"strokes":5}}',5,'completed')
 ON CONFLICT(round_id,player_id) DO UPDATE SET
   scores=EXCLUDED.scores,total_gross=EXCLUDED.total_gross,status=EXCLUDED.status;
 ASSERT (SELECT revision=v_result.server_revision AND status='completed' FROM scorecards
   WHERE round_id='ec000000-0000-0000-0001-000000000005'
     AND player_id='ec000000-0000-0000-0000-000000000001');
 -- Nonempty prior context is restored on success and ordinary revision conflict.
 v_prior := '{"sentinel":"prior setting"}';
 PERFORM set_config('app.round_scoring_write',v_prior,true);
 SELECT * INTO v_result FROM write_scorecard_snapshot(
   'ec000000-0000-0000-0001-000000000005','ec000000-0000-0000-0000-000000000001',v_result.server_revision,
   '{"scores":{"1":{"strokes":5}},"total_gross":5,"status":"completed","expected_round_shape":{"nine_type":"full","holes_played":null}}');
 ASSERT v_result.applied;
 ASSERT current_setting('app.round_scoring_write',true)=v_prior;
 SELECT * INTO v_result FROM write_scorecard_snapshot(
   'ec000000-0000-0000-0001-000000000005','ec000000-0000-0000-0000-000000000001',0,'{}');
 ASSERT v_result.conflict AND current_setting('app.round_scoring_write',true)=v_prior;
 -- Soft-deleted unique row makes missing-card INSERT take unique-conflict path.
 SELECT * INTO v_result FROM write_scorecard_snapshot(
   'ec000000-0000-0000-0001-000000000006','ec000000-0000-0000-0000-000000000001',NULL,
   '{"scores":{},"expected_round_shape":{"nine_type":"full","holes_played":null}}');
 ASSERT v_result.conflict AND current_setting('app.round_scoring_write',true)=v_prior;
 PERFORM set_config('app.round_scoring_write','',true);
END;
$$;

-- Front9/back9/full on a physical-nine course: shape is round-owned, not
-- inferred from course.holes. Correct ranges include physical back9 10..15.
DO $$
DECLARE v_i INT; v_r UUID; v_nine TEXT; v_first INT; v_result RECORD;
BEGIN
 FOR v_i IN 2..4 LOOP
   v_r := ('ec000000-0000-0000-0001-'||lpad(v_i::TEXT,12,'0'))::UUID;
   v_nine := CASE v_i WHEN 2 THEN 'front9' WHEN 3 THEN 'back9' ELSE 'full' END;
   v_first := CASE v_i WHEN 3 THEN 10 ELSE 1 END;
   PERFORM end_round_early(v_r,6);
   SELECT * INTO v_result FROM write_scorecard_snapshot(v_r,'ec000000-0000-0000-0000-000000000001',1,
     jsonb_build_object('scores',jsonb_build_object(v_first::TEXT,jsonb_build_object('strokes',4)),
       'total_gross',4,'expected_round_shape',jsonb_build_object('nine_type',v_nine,'holes_played',6)));
   ASSERT v_result.applied;
   INSERT INTO score_entries (round_id,player_id,scorer_id,hole_number,strokes)
   VALUES(v_r,'ec000000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000001',v_first,4);
   PERFORM pg_temp.expect_scoring_error(format(
     'INSERT INTO score_entries(round_id,player_id,scorer_id,hole_number,strokes) VALUES(%L,%L,%L,%s,4)',
     v_r,'ec000000-0000-0000-0000-000000000001','ec000000-0000-0000-0000-000000000001',v_first+6),
     '22023','round_score_out_of_play');
   PERFORM pg_temp.expect_scoring_error(format('UPDATE score_entries SET hole_number=%s WHERE round_id=%L',v_first+6,v_r),
     '22023','round_score_out_of_play');
 END LOOP;
END;
$$;
DO $$
DECLARE v_c UUID := 'ec000000-0000-0000-0007-000000000004'; v_scores JSONB;
BEGIN
 -- Add unsupported/multi-ball content through a captured-shape snapshot, then
 -- a stats delta on the existing single-ball hole must preserve it exactly.
 SELECT scores INTO v_scores FROM scorecards WHERE id=v_c;
 PERFORM * FROM write_scorecard_snapshot('ec000000-0000-0000-0001-000000000004',
   'ec000000-0000-0000-0000-000000000001',2,jsonb_build_object(
    'scores',v_scores || '{"2":{"balls":[{"strokes":4},{"strokes":5}],"unknown":"keep"}}'::JSONB,
    'total_gross',4,'expected_round_shape',jsonb_build_object('nine_type','full','holes_played',6)));
 UPDATE scorecards SET scores=jsonb_set(scores,'{1,putts}','2') WHERE id=v_c;
 ASSERT (SELECT scores->'2' FROM scorecards WHERE id=v_c)=
   '{"balls":[{"strokes":4},{"strokes":5}],"unknown":"keep"}'::JSONB;
 PERFORM pg_temp.expect_scoring_error(format('UPDATE scorecards SET scores=jsonb_set(scores,''{2,putts}'',''2'') WHERE id=%L',v_c),
   '22023','round_shape_changed');
END;
$$;
-- Accepted participant can create an ended card with a correct captured shape.
-- No scorecard parent exists yet: private destination-round interlock is required.
SET LOCAL request.jwt.claims = '{"sub":"ec000000-0000-0000-0000-000000000002","role":"authenticated"}';
DO $$
DECLARE v_result RECORD;
BEGIN
 SELECT * INTO v_result FROM write_scorecard_snapshot(
  'ec000000-0000-0000-0001-000000000002','ec000000-0000-0000-0000-000000000002',NULL,
  '{"scores":{"1":{"strokes":4}},"total_gross":4,"expected_round_shape":{"nine_type":"front9","holes_played":6}}');
 ASSERT v_result.applied;
 PERFORM end_round_early('ec000000-0000-0000-0001-000000000002',6);
END;
$$;
RESET ROLE;

-- Identity-only lifecycle operations and deleted-parent metadata. This block
-- uses fixture-admin privilege to isolate guard behavior from RPC authorization.
-- Existing link_placeholder_player/delete_user_account authorization is unchanged.
DO $$
DECLARE v_c UUID := 'ec000000-0000-0000-0007-000000000004'; v_before JSONB;
BEGIN
 SELECT to_jsonb(sc) INTO v_before FROM scorecards sc WHERE id=v_c;
 UPDATE scorecards SET player_id='ec000000-0000-0000-0000-000000000002' WHERE id=v_c;
 ASSERT (SELECT to_jsonb(sc)-ARRAY['player_id','updated_at'] FROM scorecards sc WHERE id=v_c)
   = v_before-ARRAY['player_id','updated_at'];
 PERFORM pg_temp.expect_scoring_error(format('UPDATE scorecards SET player_id=%L,total_gross=99 WHERE id=%L',
   'ec000000-0000-0000-0000-000000000003',v_c),'22023','round_shape_changed');
 UPDATE rounds SET deleted_at=now() WHERE id='ec000000-0000-0000-0001-000000000004';
 UPDATE scorecards SET deleted_at=now(),updated_at=now() WHERE id=v_c;
 UPDATE scorecards SET deleted_at=NULL,updated_at=now() WHERE id=v_c;
 -- A forged context for another round/card cannot authorize scoring.
 PERFORM set_config('app.round_scoring_write','{"operation":"snapshot","round_id":"wrong","player_id":"wrong","card_id":"wrong"}',true);
 PERFORM pg_temp.expect_scoring_error(format('UPDATE scorecards SET total_gross=99 WHERE id=%L',v_c),
   '22023','round_shape_changed');
 PERFORM set_config('app.round_scoring_write','',true);
END;
$$;

-- B1 regression controls: submitted cards and stored combinations refuse
-- ending before ANY mutation; valid submitted/eligible nines still combine.
INSERT INTO rounds(id,user_id,status,nine_type) VALUES
 ('ec000000-0000-0000-0001-000000000007','ec000000-0000-0000-0000-000000000001','in-progress','front9'),
 ('ec000000-0000-0000-0001-000000000008','ec000000-0000-0000-0000-000000000001','in-progress','back9');
INSERT INTO scorecards(id,round_id,player_id,status,scores,total_gross,handicap_differential)
 SELECT ('ec000000-0000-0000-0007-'||lpad(i::TEXT,12,'0'))::UUID,
   ('ec000000-0000-0000-0001-'||lpad(i::TEXT,12,'0'))::UUID,
   'ec000000-0000-0000-0000-000000000001',
   CASE i WHEN 7 THEN 'completed' ELSE 'confirmed' END,
   (SELECT jsonb_object_agg(h::TEXT,jsonb_build_object('strokes',4))
     FROM generate_series(CASE i WHEN 7 THEN 1 ELSE 10 END,CASE i WHEN 7 THEN 9 ELSE 18 END) h),36,12
 FROM generate_series(7,8) i;
DO $$
DECLARE v_i INT; v_r UUID; v_before JSONB; v_combo JSONB;
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"ec000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
 FOR v_i IN 7..8 LOOP
   v_r:=('ec000000-0000-0000-0001-'||lpad(v_i::TEXT,12,'0'))::UUID;
   SELECT jsonb_build_object('round',to_jsonb(r),'cards',(SELECT jsonb_agg(to_jsonb(sc)) FROM scorecards sc WHERE round_id=v_r))
     INTO v_before FROM rounds r WHERE id=v_r;
   PERFORM pg_temp.expect_scoring_error(format('SELECT end_round_early(%L,6)',v_r),'22023','round_has_submitted_scorecards');
   ASSERT (SELECT jsonb_build_object('round',to_jsonb(r),'cards',(SELECT jsonb_agg(to_jsonb(sc)) FROM scorecards sc WHERE round_id=v_r))
     FROM rounds r WHERE id=v_r)=v_before;
 END LOOP;
 INSERT INTO handicap_combined_rounds(player_id,front_scorecard_id,back_scorecard_id,course_id,
   combined_gross,handicap_differential,course_rating_used,slope_rating_used,effective_date)
 VALUES('ec000000-0000-0000-0000-000000000001','ec000000-0000-0000-0007-000000000007',
   'ec000000-0000-0000-0007-000000000008','ec000000-0000-0000-0006-000000000001',72,12,72,113,NOW());
 SELECT to_jsonb(h) INTO v_combo FROM handicap_combined_rounds h
   WHERE front_scorecard_id='ec000000-0000-0000-0007-000000000007';
 -- Representative pre-correction history isolates the combined hint after
 -- deliberately making one previously submitted unended card in-progress.
 UPDATE scorecards SET status='in-progress' WHERE id='ec000000-0000-0000-0007-000000000007';
 PERFORM pg_temp.expect_scoring_error('SELECT end_round_early(''ec000000-0000-0000-0001-000000000007'',6)',
   '22023','round_has_combined_scorecards');
 ASSERT (SELECT to_jsonb(h) FROM handicap_combined_rounds h
   WHERE front_scorecard_id='ec000000-0000-0000-0007-000000000007')=v_combo;
END;
$$;

-- Catalog restrictions: PRIVATE trigger entry points; INVOKER public writers.
DO $$
DECLARE v_f TEXT; v_role TEXT;
BEGIN
 FOREACH v_f IN ARRAY ARRAY['guard_round_scorecard_write()', 'guard_round_score_entry_write()'] LOOP
   ASSERT (SELECT prosecdef AND provolatile='v' AND proconfig @> ARRAY['search_path=public, pg_temp']
     FROM pg_proc WHERE oid=('public.'||v_f)::REGPROCEDURE);
   FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
     ASSERT NOT has_function_privilege(v_role,'public.'||v_f,'EXECUTE');
   END LOOP;
   ASSERT NOT EXISTS (SELECT 1 FROM pg_proc p, LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
     WHERE p.oid=('public.'||v_f)::REGPROCEDURE AND a.grantee=0 AND a.privilege_type='EXECUTE');
 END LOOP;
 FOREACH v_f IN ARRAY ARRAY['write_scorecard_snapshot(uuid,uuid,bigint,jsonb)',
   'write_scorecard_resolution(uuid,jsonb)','write_scorecard_handicap_patch(uuid,jsonb)'] LOOP
   ASSERT (SELECT NOT prosecdef FROM pg_proc WHERE oid=('public.'||v_f)::REGPROCEDURE);
   ASSERT has_function_privilege('authenticated','public.'||v_f,'EXECUTE');
   ASSERT NOT has_function_privilege('anon','public.'||v_f,'EXECUTE');
 END LOOP;
 ASSERT 'scorecards_a_round_scoring_write' < 'scorecards_full_card_differential';
END;
$$;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"ec000000-0000-0000-0000-000000000003","role":"authenticated"}';
DO $$
BEGIN
 ASSERT NOT write_scorecard_resolution('ec000000-0000-0000-0007-000000000001',
   '{"scores":{},"total_gross":0,"updated_at":"2026-10-09T00:00:00Z","expected_round_shape":{"nine_type":"full","holes_played":6}}');
 ASSERT NOT write_scorecard_handicap_patch('ec000000-0000-0000-0007-000000000001',
   '{"handicap_differential":null,"course_rating_used":72,"slope_rating_used":113,"daily_handicap_used":0,"ga_handicap_used":0,"expected_round_shape":{"nine_type":"full","holes_played":6}}');
 PERFORM pg_temp.expect_scoring_error('SELECT public.guard_round_scorecard_write()','42501',NULL);
 PERFORM pg_temp.expect_scoring_error('SELECT public.guard_round_score_entry_write()','42501',NULL);
 PERFORM pg_temp.expect_scoring_error('SELECT public.round_scoring_stats_delta(''{}'',''{}'')','42501',NULL);
 -- Before-INSERT guard rejection has generic hints and no hidden shape DETAIL.
 PERFORM pg_temp.expect_scoring_error('INSERT INTO scorecards(round_id,player_id,scores) VALUES(''ec000000-0000-0000-0001-000000000001'',''ec000000-0000-0000-0000-000000000003'',''{"1":{"strokes":4}}'')',
   '22023','round_shape_changed');
END;
$$;
RESET ROLE;
ROLLBACK;
