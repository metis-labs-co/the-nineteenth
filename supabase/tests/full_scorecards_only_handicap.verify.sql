-- =====================================================
-- Full-scorecards-only handicap (R21) - verification script
-- =====================================================
-- Run AFTER applying 20261007000100_full_scorecards_only_handicap.sql:
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/full_scorecards_only_handicap.verify.sql
-- Every assertion runs inside BEGIN … ROLLBACK, so the DB stays clean.
-- Runs as the migration owner (postgres), so RLS does not apply; the
-- triggers are SECURITY DEFINER, so they behave the same for app users.
-- =====================================================

BEGIN;

-- ---- Fixtures --------------------------------------------------------
INSERT INTO auth.users (id, email)
  VALUES ('fc000000-0000-0000-0000-000000000001', 'full-card-verify@example.com');

-- handle_new_user (on auth.users) has usually created the row already.
INSERT INTO players (id, name, email)
  VALUES ('fc000000-0000-0000-0000-000000000001', 'Full Card Verify', 'full-card-verify@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clubs (id, source, name)
  VALUES ('fc000000-0000-0000-0000-0000000000c1', 'manual', 'Verify Club');

INSERT INTO courses (id, club_id, name)
  VALUES ('fc000000-0000-0000-0000-0000000000c2',
          'fc000000-0000-0000-0000-0000000000c1',
          'Verify Course');

-- One round per card (scorecards are unique per round + player).
INSERT INTO rounds (id, course_id, user_id, status, nine_type) VALUES
  ('fc000000-0000-0000-0001-000000000001', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000001', 'in-progress', 'full'),
  ('fc000000-0000-0000-0001-000000000002', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000001', 'in-progress', 'full'),
  ('fc000000-0000-0000-0001-000000000003', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000001', 'in-progress', 'full'),
  ('fc000000-0000-0000-0001-000000000004', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000001', 'in-progress', 'front9'),
  ('fc000000-0000-0000-0001-000000000005', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000001', 'in-progress', 'back9'),
  ('fc000000-0000-0000-0001-000000000006', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000001', 'in-progress', 'back9'),
  ('fc000000-0000-0000-0001-000000000008', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000001', 'in-progress', 'full');

DO $$ BEGIN RAISE NOTICE 'Fixtures seeded'; END $$;

-- ---- Test 1: the predicate mirrors isCompleteForHandicap -------------
DO $$
DECLARE
  full18 JSONB := (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 18) n);
  front9 JSONB := (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 9) n);
  back9  JSONB := (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(10, 18) n);
  six    JSONB := (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 6) n);
  back6  JSONB := (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(10, 15) n);
  bare9  JSONB := (SELECT jsonb_object_agg(n::TEXT, to_jsonb(5)) FROM generate_series(1, 9) n);
BEGIN
  ASSERT public.scorecard_is_complete_for_handicap(NULL, 'full'), 'T1a: NULL scores are legacy (complete)';
  ASSERT public.scorecard_is_complete_for_handicap('{}'::JSONB, 'full'), 'T1b: {} is legacy (complete)';
  ASSERT public.scorecard_is_complete_for_handicap('{}'::JSONB, 'back9'), 'T1c: {} is legacy for a back 9';
  ASSERT public.scorecard_is_complete_for_handicap('null'::JSONB, 'full'), 'T1d: JSON null is legacy';
  ASSERT public.scorecard_is_complete_for_handicap(full18, 'full'), 'T1e: 18 scored holes are complete';
  ASSERT NOT public.scorecard_is_complete_for_handicap(full18 - '18', 'full'), 'T1f: 17 of 18 is incomplete';
  ASSERT NOT public.scorecard_is_complete_for_handicap(six, 'full'), 'T1g: 6 of 18 is incomplete';
  ASSERT public.scorecard_is_complete_for_handicap(front9, 'front9'), 'T1h: front 9 judged on 1-9';
  ASSERT public.scorecard_is_complete_for_handicap(back9, 'back9'), 'T1i: back 9 judged on 10-18';
  ASSERT NOT public.scorecard_is_complete_for_handicap(back6, 'back9'), 'T1j: back 9 ended after 6 (10-15)';
  ASSERT NOT public.scorecard_is_complete_for_handicap(front9, 'back9'), 'T1k: back 9 scored on 1-9 is incomplete';
  ASSERT NOT public.scorecard_is_complete_for_handicap(front9, 'full'), 'T1l: nine type decides, not the scores';
  ASSERT public.scorecard_is_complete_for_handicap(front9 || '{"10": {"strokes": 4}}'::JSONB, 'front9'), 'T1m: holes outside the nine are ignored';
  ASSERT public.scorecard_is_complete_for_handicap(full18 || '{"7": {"strokes": 10}}'::JSONB, 'full'), 'T1n: a pickup (10) counts';
  ASSERT NOT public.scorecard_is_complete_for_handicap(full18 || '{"7": {"strokes": 0}}'::JSONB, 'full'), 'T1o: strokes 0 is unscored';
  ASSERT NOT public.scorecard_is_complete_for_handicap(full18 || '{"7": null}'::JSONB, 'full'), 'T1p: a null hole is unscored';
  ASSERT NOT public.scorecard_is_complete_for_handicap(front9 || '{"4": {"strokes": "5"}}'::JSONB, 'front9'), 'T1q: string strokes do not count';
  ASSERT public.scorecard_is_complete_for_handicap(bare9, 'front9'), 'T1r: bare numbers count';
  ASSERT public.scorecard_is_complete_for_handicap(front9 || '{"3": {"balls": [{"strokes": 0}, {"strokes": 5}]}}'::JSONB, 'front9'), 'T1s: multi-ball, any ball scored';
  ASSERT NOT public.scorecard_is_complete_for_handicap(front9 || '{"3": {"balls": [{"strokes": 0}, {"strokes": 0}]}}'::JSONB, 'front9'), 'T1t: multi-ball, no ball scored';
  RAISE NOTICE 'Test 1 PASSED: predicate mirrors isCompleteForHandicap';
END $$;

-- ---- Cards -----------------------------------------------------------
-- C1 complete 18, C2 six of 18, C3 legacy {}, C4 complete front 9,
-- C5 complete back 9, C6 back 9 holes 10-15, C8 multi-ball 18 (any ball).
INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential) VALUES
  ('fc000000-0000-0000-0002-000000000001', 'fc000000-0000-0000-0001-000000000001', 'fc000000-0000-0000-0000-000000000001', 'completed',
   (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 18) n), 90, 15.8),
  ('fc000000-0000-0000-0002-000000000002', 'fc000000-0000-0000-0001-000000000002', 'fc000000-0000-0000-0000-000000000001', 'completed',
   (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 6) n), 30, -38.4),
  ('fc000000-0000-0000-0002-000000000003', 'fc000000-0000-0000-0001-000000000003', 'fc000000-0000-0000-0000-000000000001', 'completed',
   '{}'::JSONB, 90, 17.6),
  ('fc000000-0000-0000-0002-000000000004', 'fc000000-0000-0000-0001-000000000004', 'fc000000-0000-0000-0000-000000000001', 'completed',
   (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 9) n), 45, 8.0),
  ('fc000000-0000-0000-0002-000000000005', 'fc000000-0000-0000-0001-000000000005', 'fc000000-0000-0000-0000-000000000001', 'completed',
   (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(10, 18) n), 45, 8.0),
  ('fc000000-0000-0000-0002-000000000006', 'fc000000-0000-0000-0001-000000000006', 'fc000000-0000-0000-0000-000000000001', 'completed',
   (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(10, 15) n), 30, -20.0),
  ('fc000000-0000-0000-0002-000000000008', 'fc000000-0000-0000-0001-000000000008', 'fc000000-0000-0000-0000-000000000001', 'completed',
   (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('balls', jsonb_build_array(jsonb_build_object('strokes', 0), jsonb_build_object('strokes', 5)))) FROM generate_series(1, 18) n), 90, 15.8);

-- ---- Test 2: the scorecards trigger on INSERT ------------------------
DO $$
DECLARE
  d1 NUMERIC; d2 NUMERIC; d3 NUMERIC; d4 NUMERIC; d6 NUMERIC; d8 NUMERIC;
BEGIN
  SELECT handicap_differential INTO d1 FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000001';
  SELECT handicap_differential INTO d2 FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000002';
  SELECT handicap_differential INTO d3 FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000003';
  SELECT handicap_differential INTO d4 FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000004';
  SELECT handicap_differential INTO d6 FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000006';
  SELECT handicap_differential INTO d8 FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000008';
  ASSERT d1 = 15.8, 'T2a FAILED: a complete 18 keeps its differential';
  ASSERT d2 IS NULL, 'T2b FAILED: a 6-of-18 card must get a NULL differential';
  ASSERT d3 = 17.6, 'T2c FAILED: a legacy {} card keeps its differential';
  ASSERT d4 = 8.0, 'T2d FAILED: a complete front 9 is judged on its own nine (rounds.nine_type)';
  ASSERT d6 IS NULL, 'T2e FAILED: a back 9 scored on 10-15 must get a NULL differential';
  ASSERT d8 = 15.8, 'T2f FAILED: a multi-ball card with every hole scored keeps its differential';
  RAISE NOTICE 'Test 2 PASSED: INSERT nulls only incomplete cards';
END $$;

-- ---- Test 3: UPDATE that removes a hole nulls the differential -------
UPDATE scorecards
   SET scores = scores - '18'
 WHERE id = 'fc000000-0000-0000-0002-000000000001';

DO $$
DECLARE d NUMERIC;
BEGIN
  SELECT handicap_differential INTO d FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000001';
  ASSERT d IS NULL, 'T3 FAILED: removing hole 18 must null the differential';
  RAISE NOTICE 'Test 3 PASSED: an UPDATE that makes a card incomplete nulls the differential';
END $$;

-- ---- Test 4: an old client re-writing a differential is neutralised --
-- (recalculateScorecardDifferential on 1.14.x updates the differential only)
UPDATE scorecards
   SET handicap_differential = -38.4
 WHERE id = 'fc000000-0000-0000-0002-000000000002';

DO $$
DECLARE d NUMERIC;
BEGIN
  SELECT handicap_differential INTO d FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000002';
  ASSERT d IS NULL, 'T4 FAILED: an old-client recalculation must not resurrect the differential';
  RAISE NOTICE 'Test 4 PASSED: old-client recalculation is neutralised';
END $$;

-- ---- Test 5: write_scorecard_snapshot path (scores + differential) ---
-- Completing the 6-hole card with the snapshot RPC's UPDATE shape restores it.
UPDATE scorecards
   SET scores = (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 18) n),
       total_gross = 90,
       handicap_differential = 15.8
 WHERE id = 'fc000000-0000-0000-0002-000000000002';

DO $$
DECLARE d NUMERIC;
BEGIN
  SELECT handicap_differential INTO d FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000002';
  ASSERT d = 15.8, 'T5 FAILED: a card completed in the same write keeps its differential';
  RAISE NOTICE 'Test 5 PASSED: the trigger judges the NEW scores';
END $$;

-- ---- Test 6: combined rounds reject an incomplete nine ---------------
DO $$
BEGIN
  BEGIN
    INSERT INTO handicap_combined_rounds (
      player_id, front_scorecard_id, back_scorecard_id, course_id,
      combined_gross, handicap_differential, course_rating_used, slope_rating_used, effective_date
    ) VALUES (
      'fc000000-0000-0000-0000-000000000001',
      'fc000000-0000-0000-0002-000000000004',
      'fc000000-0000-0000-0002-000000000006',
      'fc000000-0000-0000-0000-0000000000c2',
      75, 2.3, 72.5, 125, now()
    );
    RAISE EXCEPTION 'T6 FAILED: a pair with a part-filled back nine was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    RAISE NOTICE 'Test 6 PASSED: incomplete nine rejected (%)', SQLERRM;
  END;
END $$;

-- ---- Test 7: combined rounds accept two complete nines ---------------
INSERT INTO handicap_combined_rounds (
  player_id, front_scorecard_id, back_scorecard_id, course_id,
  combined_gross, handicap_differential, course_rating_used, slope_rating_used, effective_date
) VALUES (
  'fc000000-0000-0000-0000-000000000001',
  'fc000000-0000-0000-0002-000000000004',
  'fc000000-0000-0000-0002-000000000005',
  'fc000000-0000-0000-0000-0000000000c2',
  90, 15.8, 72.5, 125, now()
);

DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM handicap_combined_rounds
     WHERE front_scorecard_id = 'fc000000-0000-0000-0002-000000000004'
       AND back_scorecard_id = 'fc000000-0000-0000-0002-000000000005'
  ), 'T7 FAILED: two complete nines must combine';
  RAISE NOTICE 'Test 7 PASSED: complete nines combine';
END $$;

-- ---- Test 8: the data fix left no incomplete card with a differential
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n
    FROM scorecards s JOIN rounds r ON r.id = s.round_id
   WHERE s.handicap_differential IS NOT NULL
     AND NOT public.scorecard_is_complete_for_handicap(s.scores, COALESCE(r.nine_type, 'full'));
  ASSERT n = 0, format('T8 FAILED: %s incomplete card(s) still carry a differential', n);
  RAISE NOTICE 'Test 8 PASSED: no incomplete card carries a differential';
END $$;

-- ---- Test 9: the audit tables and fix functions are not exposed ------
DO $$
BEGIN
  ASSERT NOT has_table_privilege('authenticated', 'public.handicap_full_card_fix_audit', 'SELECT'),
    'T9 FAILED: authenticated can read the card audit table';
  ASSERT NOT has_table_privilege('anon', 'public.handicap_full_card_fix_audit', 'SELECT'),
    'T9 FAILED: anon can read the card audit table';
  ASSERT NOT has_table_privilege('authenticated', 'public.handicap_full_card_fix_player_audit', 'SELECT'),
    'T9 FAILED: authenticated can read the player audit table';
  ASSERT NOT has_table_privilege('anon', 'public.handicap_full_card_fix_player_audit', 'SELECT'),
    'T9 FAILED: anon can read the player audit table';
  ASSERT NOT has_function_privilege('authenticated', 'public.handicap_full_card_data_fix()', 'EXECUTE'),
    'T9 FAILED: authenticated can run the data fix';
  ASSERT NOT has_function_privilege('authenticated', 'public.handicap_full_card_projected_index(uuid)', 'EXECUTE'),
    'T9 FAILED: authenticated can call the index projection';
  RAISE NOTICE 'Test 9 PASSED: audit tables and fix functions are private';
END $$;

-- ---- Test 10: the data fix nulls bad cards and recomputes the index --
-- Two more players: P2 has a complete card (10.0) and a part-filled card
-- (-38.4); P3 has only a part-filled card. Both carry the stale index an
-- old client computed from the part-filled card (-38.4 × 0.96 = -36.9).
INSERT INTO auth.users (id, email) VALUES
  ('fc000000-0000-0000-0000-000000000002', 'full-card-verify-2@example.com'),
  ('fc000000-0000-0000-0000-000000000003', 'full-card-verify-3@example.com');

INSERT INTO players (id, name, email) VALUES
  ('fc000000-0000-0000-0000-000000000002', 'Full Card Verify 2', 'full-card-verify-2@example.com'),
  ('fc000000-0000-0000-0000-000000000003', 'Full Card Verify 3', 'full-card-verify-3@example.com')
ON CONFLICT (id) DO NOTHING;

UPDATE players SET handicap_index = -36.9
 WHERE id IN ('fc000000-0000-0000-0000-000000000002', 'fc000000-0000-0000-0000-000000000003');

INSERT INTO rounds (id, course_id, user_id, status, nine_type) VALUES
  ('fc000000-0000-0000-0001-000000000010', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000002', 'completed', 'full'),
  ('fc000000-0000-0000-0001-000000000011', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000002', 'completed', 'full'),
  ('fc000000-0000-0000-0001-000000000012', 'fc000000-0000-0000-0000-0000000000c2', 'fc000000-0000-0000-0000-000000000003', 'completed', 'full');

-- Seed the data as it exists before this migration: the guard is off.
ALTER TABLE scorecards DISABLE TRIGGER scorecards_full_card_differential;

INSERT INTO scorecards (id, round_id, player_id, status, scores, total_gross, handicap_differential, submitted_at) VALUES
  ('fc000000-0000-0000-0002-000000000010', 'fc000000-0000-0000-0001-000000000010', 'fc000000-0000-0000-0000-000000000002', 'completed',
   (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 18) n), 90, 10.0, '2026-09-01T08:00:00Z'),
  ('fc000000-0000-0000-0002-000000000011', 'fc000000-0000-0000-0001-000000000011', 'fc000000-0000-0000-0000-000000000002', 'completed',
   (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 6) n), 30, -38.4, '2026-09-05T08:00:00Z'),
  ('fc000000-0000-0000-0002-000000000012', 'fc000000-0000-0000-0001-000000000012', 'fc000000-0000-0000-0000-000000000003', 'completed',
   (SELECT jsonb_object_agg(n::TEXT, jsonb_build_object('strokes', 5)) FROM generate_series(1, 6) n), 30, -38.4, '2026-09-05T08:00:00Z');

ALTER TABLE scorecards ENABLE TRIGGER scorecards_full_card_differential;

DO $$
DECLARE
  fix RECORD;
  idx2 NUMERIC; idx3 NUMERIC;
  d10 NUMERIC; d11 NUMERIC; d12 NUMERIC;
  old2 NUMERIC; new2 NUMERIC; old3 NUMERIC; new3 NUMERIC;
  audited INT;
BEGIN
  SELECT * INTO fix FROM public.handicap_full_card_data_fix();
  ASSERT fix.cards_nulled = 2, format('T10a FAILED: expected 2 cards nulled, got %s', fix.cards_nulled);
  ASSERT fix.players_recomputed = 2, format('T10b FAILED: expected 2 players recomputed, got %s', fix.players_recomputed);

  SELECT handicap_differential INTO d10 FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000010';
  SELECT handicap_differential INTO d11 FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000011';
  SELECT handicap_differential INTO d12 FROM scorecards WHERE id = 'fc000000-0000-0000-0002-000000000012';
  ASSERT d10 = 10.0, 'T10c FAILED: the complete card keeps its differential';
  ASSERT d11 IS NULL AND d12 IS NULL, 'T10d FAILED: part-filled cards must lose their differential';

  SELECT handicap_index INTO idx2 FROM players WHERE id = 'fc000000-0000-0000-0000-000000000002';
  SELECT handicap_index INTO idx3 FROM players WHERE id = 'fc000000-0000-0000-0000-000000000003';
  -- P2: one qualifying round → best 1: 10.0 × 0.96 = 9.6
  ASSERT idx2 = 9.6, format('T10e FAILED: P2 index should be recomputed to 9.6, got %s', idx2);
  ASSERT idx3 IS NULL, format('T10f FAILED: P3 has nothing left that qualifies, index should be NULL, got %s', idx3);

  SELECT old_handicap_index, new_handicap_index INTO old2, new2
    FROM handicap_full_card_fix_player_audit WHERE player_id = 'fc000000-0000-0000-0000-000000000002';
  SELECT old_handicap_index, new_handicap_index INTO old3, new3
    FROM handicap_full_card_fix_player_audit WHERE player_id = 'fc000000-0000-0000-0000-000000000003';
  ASSERT old2 = -36.9 AND new2 = 9.6, format('T10g FAILED: P2 audit should be -36.9 → 9.6, got % → %', old2, new2);
  ASSERT old3 = -36.9 AND new3 IS NULL, format('T10h FAILED: P3 audit should be -36.9 → NULL, got % → %', old3, new3);

  SELECT COUNT(*) INTO audited
    FROM handicap_full_card_fix_audit
   WHERE scorecard_id IN ('fc000000-0000-0000-0002-000000000011', 'fc000000-0000-0000-0002-000000000012')
     AND old_differential = -38.4
     AND NOT is_competition
     AND course_hole_count = 18;
  ASSERT audited = 2, format('T10i FAILED: both nulled cards must be audited with their breakdown columns, got %s', audited);

  RAISE NOTICE 'Test 10 PASSED: data fix nulls bad cards, recomputes the index, clears it when nothing qualifies';
END $$;

-- ---- Test 11: re-running the data fix is a no-op ----------------------
DO $$
DECLARE fix RECORD; old2 NUMERIC;
BEGIN
  SELECT * INTO fix FROM public.handicap_full_card_data_fix();
  ASSERT fix.cards_nulled = 0 AND fix.players_recomputed = 0,
    format('T11a FAILED: a re-run should change nothing, got %s cards / %s players', fix.cards_nulled, fix.players_recomputed);
  SELECT old_handicap_index INTO old2
    FROM handicap_full_card_fix_player_audit WHERE player_id = 'fc000000-0000-0000-0000-000000000002';
  ASSERT old2 = -36.9, 'T11b FAILED: a re-run must keep the first recorded old index';
  RAISE NOTICE 'Test 11 PASSED: the data fix is idempotent';
END $$;

ROLLBACK;
