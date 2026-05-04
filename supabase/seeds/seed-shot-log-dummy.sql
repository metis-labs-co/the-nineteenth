-- =====================================================
-- Dummy shot-log data for a single user.
--
-- Creates 3 standalone rounds (one per course, plus a third on the first
-- course) and inserts a realistic 4-shot sequence per hole (driver →
-- 7-iron → pitching wedge → putter), anchored on each hole's actual tee
-- coordinate so per-club distance averages render on the home-screen
-- "What's in the Bag" card and the Club Distance Detail screen.
--
-- Idempotent: re-running the script first deletes any rounds previously
-- created by this script (tagged via a sentinel string in `team_config`)
-- before inserting new ones. Existing real rounds are untouched.
--
-- Run with service-role privileges (Supabase Studio SQL editor or psql
-- against the staging connection string) — RLS is bypassed for the seed.
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- Configuration — edit if you want a different player.
-- -----------------------------------------------------
DO $seed$
DECLARE
  v_player_id      UUID := 'ca7c2924-39e8-4b66-bbb8-d9699adb3d65';
  v_course_a       UUID := '00a3e80c-8c1a-4fda-9f3d-9ec326e891a6';
  v_course_b       UUID := '055a501d-cd9e-4f2b-b8be-8b68c30b6b62';
  v_seed_tag       TEXT := 'dummy-shot-log-seed-v1';

  v_round_id       UUID;
  v_course_id      UUID;
  v_round_date     DATE;
  v_hole           SMALLINT;
  v_tee_lat        NUMERIC;
  v_tee_lng        NUMERIC;

  -- Lat-degree offsets approximating real shot distances.
  -- 1° latitude ≈ 111,320 m → 0.001 deg ≈ 111 m.
  v_off_driver     NUMERIC := 0.001980; -- ~220 m
  v_off_iron7      NUMERIC := 0.001260; -- ~140 m
  v_off_wedge      NUMERIC := 0.000810; -- ~90 m
  v_off_putt       NUMERIC := 0.000045; -- ~5 m
BEGIN
  -- Sanity checks — fail loudly rather than silently producing garbage.
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = v_player_id) THEN
    RAISE EXCEPTION 'Player % not found', v_player_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM courses WHERE id = v_course_a) THEN
    RAISE EXCEPTION 'Course % not found', v_course_a;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM courses WHERE id = v_course_b) THEN
    RAISE EXCEPTION 'Course % not found', v_course_b;
  END IF;

  -- ---------------------------------------------------
  -- Clean up any previous run of this seed — match by
  -- seed_tag only so prior runs that targeted a
  -- different user_id (e.g. typo'd player) are also
  -- removed. shot_log rows cascade via the FK.
  -- ---------------------------------------------------
  DELETE FROM rounds
   WHERE team_config @> jsonb_build_object('seed_tag', v_seed_tag);

  -- ---------------------------------------------------
  -- Make sure the player's bag includes the clubs we're
  -- about to log shots with. Putter is implicit (UI
  -- invariant) but we still INSERT it idempotently.
  -- ---------------------------------------------------
  INSERT INTO player_bag (player_id, club_key)
  VALUES
    (v_player_id, 'driver'),
    (v_player_id, '7-iron'),
    (v_player_id, 'pitching-wedge'),
    (v_player_id, 'putter')
  ON CONFLICT (player_id, club_key) DO NOTHING;

  -- ---------------------------------------------------
  -- Generate three standalone rounds. Use FOR loop so we
  -- can pick a different course per round and stagger
  -- the dates over the past few weeks.
  -- ---------------------------------------------------
  FOR i IN 1..3 LOOP
    v_course_id := CASE i WHEN 2 THEN v_course_b ELSE v_course_a END;
    v_round_date := (CURRENT_DATE - (i * 7))::DATE;

    INSERT INTO rounds (
      id, user_id, course_id, competition_id, round_number,
      date, status, game_type, team_config, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_player_id, v_course_id, NULL, 1,
      v_round_date, 'completed', 'stableford',
      jsonb_build_object('seed_tag', v_seed_tag, 'seed_index', i),
      NOW(), NOW()
    )
    RETURNING id INTO v_round_id;

    -- -------------------------------------------------
    -- For each hole that has a tee coordinate on this
    -- course, log a 4-shot sequence stepping north from
    -- the tee. Distances were chosen so per-club
    -- averages match real-world expectations.
    --
    -- Sequences:
    --   1: driver  (tee + ~220 m)
    --   2: 7-iron  (shot 1 + ~140 m)
    --   3: wedge   (shot 2 + ~90 m)
    --   4: putter  (shot 3 + ~5 m)
    -- -------------------------------------------------
    FOR v_hole, v_tee_lat, v_tee_lng IN
      SELECT
        hc.hole_number,
        -- Prefer tee_back, fall back to tee_front, per the app's
        -- pickTeeCoord() helper.
        COALESCE(MAX(hc.latitude)  FILTER (WHERE hc.poi_type = 'tee_back'),
                 MAX(hc.latitude)  FILTER (WHERE hc.poi_type = 'tee_front')) AS lat,
        COALESCE(MAX(hc.longitude) FILTER (WHERE hc.poi_type = 'tee_back'),
                 MAX(hc.longitude) FILTER (WHERE hc.poi_type = 'tee_front')) AS lng
      FROM hole_coordinates hc
      WHERE hc.course_id = v_course_id
        AND hc.poi_type IN ('tee_back', 'tee_front')
      GROUP BY hc.hole_number
      HAVING COALESCE(
               MAX(hc.latitude) FILTER (WHERE hc.poi_type = 'tee_back'),
               MAX(hc.latitude) FILTER (WHERE hc.poi_type = 'tee_front')
             ) IS NOT NULL
      ORDER BY hc.hole_number
    LOOP
      INSERT INTO shot_log
        (round_id, hole_number, player_id, sequence, latitude, longitude, club_used)
      VALUES
        (v_round_id, v_hole, v_player_id, 1,
         v_tee_lat + v_off_driver,
         v_tee_lng,
         'driver'),
        (v_round_id, v_hole, v_player_id, 2,
         v_tee_lat + v_off_driver + v_off_iron7,
         v_tee_lng,
         '7-iron'),
        (v_round_id, v_hole, v_player_id, 3,
         v_tee_lat + v_off_driver + v_off_iron7 + v_off_wedge,
         v_tee_lng,
         'pitching-wedge'),
        (v_round_id, v_hole, v_player_id, 4,
         v_tee_lat + v_off_driver + v_off_iron7 + v_off_wedge + v_off_putt,
         v_tee_lng,
         'putter');
    END LOOP;

    RAISE NOTICE 'Seeded round % (%) on course %', i, v_round_id, v_course_id;
  END LOOP;

  -- ---------------------------------------------------
  -- Summary line so the SQL editor shows what landed.
  -- ---------------------------------------------------
  RAISE NOTICE 'Total shots logged: %',
    (SELECT COUNT(*) FROM shot_log sl
       JOIN rounds r ON r.id = sl.round_id
      WHERE r.user_id = v_player_id
        AND r.team_config @> jsonb_build_object('seed_tag', v_seed_tag));
END
$seed$;

COMMIT;

-- =====================================================
-- Verify (run separately after the script completes):
--
--   SELECT club_used, COUNT(*) AS shots
--     FROM shot_log
--    WHERE player_id = 'e5579c23-938b-4f03-b08f-b889276cfc50'
--    GROUP BY club_used
--    ORDER BY shots DESC;
--
--   -- Expect ~54 shots per club (3 rounds × 18 holes).
-- =====================================================
