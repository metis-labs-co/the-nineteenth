-- =====================================================
-- SEED ACHIEVEMENTS FOR 8 COMPREHENSIVE ROUND USERS
-- =====================================================
-- This seed file populates achievement progress, earned achievements,
-- and cosmetic unlocks for the 8 users in seed-comprehensive-rounds.sql.
--
-- Must be run AFTER seed-comprehensive-rounds.sql (depends on scorecards,
-- rounds, competitions, pairings, round_results data).
--
-- Computes all achievement data dynamically from actual seed data:
--   - Round counts (total, by game type, team rounds)
--   - Scoring events (birdies, eagles, pars from course hole pars)
--   - Competition participation, wins, podium finishes
--   - Unique courses and playing partners
--   - Peak performance (best stableford, lowest gross)
-- =====================================================

-- =====================================================
-- STEP 1: CLEAN UP EXISTING ACHIEVEMENT DATA
-- =====================================================

DELETE FROM player_cosmetics WHERE player_id IN (
  'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
  'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
  '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
);

DELETE FROM player_achievements WHERE player_id IN (
  'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
  'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
  '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
);

DELETE FROM achievement_progress WHERE player_id IN (
  'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
  'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
  '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
);

-- Reset equipped cosmetics
UPDATE players SET
  equipped_badge_id = NULL,
  equipped_frame_id = NULL,
  equipped_title_id = NULL
WHERE id IN (
  'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
  'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
  '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
);

-- =====================================================
-- STEP 2: CALCULATE AND INSERT ACHIEVEMENT PROGRESS
-- =====================================================

DO $$
DECLARE
  v_user_ids UUID[] := ARRAY[
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
    '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
    'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
    '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
  ];
  v_player_id UUID;
  v_missing_courses INTEGER;

  -- Round counters
  v_total_rounds INTEGER;
  v_competition_rounds INTEGER;
  v_stableford_rounds INTEGER;
  v_stroke_rounds INTEGER;
  v_match_play_rounds INTEGER;
  v_team_rounds INTEGER;
  v_unique_game_types INTEGER;

  -- Scoring counters
  v_birdies INTEGER;
  v_eagles INTEGER;
  v_albatrosses INTEGER;
  v_hole_in_ones INTEGER;
  v_pars INTEGER;
  v_max_stableford_points INTEGER;
  v_best_gross INTEGER;

  -- Competition counters
  v_competitions_joined INTEGER;
  v_competitions_created INTEGER;
  v_competition_wins INTEGER;
  v_podium_finishes INTEGER;

  -- Social/course counters
  v_friend_count INTEGER;
  v_unique_partners INTEGER;
  v_unique_courses INTEGER;
  v_home_club_rounds INTEGER;

  -- Achievement awarding
  v_achievement RECORD;
  v_progress_value INTEGER;
  v_achievement_count INTEGER;
  v_total_achievements INTEGER := 0;
  v_total_points INTEGER;
  v_cosmetic_count INTEGER;
  v_total_cosmetics INTEGER := 0;
  v_player_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Seeding Achievement Data for 8 Users ===';

  -- Warn if any courses referenced by seed rounds are missing (scoring will be incomplete)
  SELECT COUNT(*) INTO v_missing_courses
  FROM (
    SELECT DISTINCT r.course_id
    FROM rounds r
    WHERE r.id::TEXT LIKE 'b0000001%'
      AND NOT EXISTS (SELECT 1 FROM courses c WHERE c.id = r.course_id)
  ) missing;

  IF v_missing_courses > 0 THEN
    RAISE WARNING '% course(s) referenced by seed rounds do not exist in the courses table. Scoring achievements (birdies, eagles, pars) will be incomplete for rounds at missing courses.', v_missing_courses;
  END IF;

  FOREACH v_player_id IN ARRAY v_user_ids
  LOOP
    v_player_count := v_player_count + 1;

    -- =================================================
    -- ROUNDS CATEGORY
    -- =================================================

    -- Total completed rounds
    SELECT COUNT(*) INTO v_total_rounds
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed');

    -- Competition rounds (all rounds are competition rounds since is_practice doesn't exist)
    v_competition_rounds := v_total_rounds;

    -- Insert ROUND_VETERAN progress
    IF v_total_rounds > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'ROUND_VETERAN', v_total_rounds)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_total_rounds, last_updated = NOW();
    END IF;

    -- Insert COMPETITOR progress
    IF v_competition_rounds > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'COMPETITOR', v_competition_rounds)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_competition_rounds, last_updated = NOW();
    END IF;

    -- =================================================
    -- GAME TYPES CATEGORY
    -- =================================================

    -- Stableford rounds
    SELECT COUNT(*) INTO v_stableford_rounds
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed')
      AND r.game_type = 'stableford';

    -- Stroke play rounds
    SELECT COUNT(*) INTO v_stroke_rounds
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed')
      AND r.game_type = 'stroke';

    -- Match play rounds
    SELECT COUNT(*) INTO v_match_play_rounds
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed')
      AND r.game_type = 'match-play';

    -- Team rounds (using is_team_round flag, not game_type)
    SELECT COUNT(*) INTO v_team_rounds
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed')
      AND r.is_team_round = TRUE;

    -- Unique game types played
    SELECT COUNT(DISTINCT r.game_type) INTO v_unique_game_types
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed');

    -- Insert game type progress
    IF v_stableford_rounds > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'STABLEFORD_SPECIALIST', v_stableford_rounds)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_stableford_rounds, last_updated = NOW();
    END IF;

    IF v_stroke_rounds > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'STROKE_PLAYER', v_stroke_rounds)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_stroke_rounds, last_updated = NOW();
    END IF;

    IF v_match_play_rounds > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'MATCH_PLAY_MASTER', v_match_play_rounds)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_match_play_rounds, last_updated = NOW();
    END IF;

    IF v_team_rounds > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'TEAM_PLAYER', v_team_rounds)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_team_rounds, last_updated = NOW();
    END IF;

    IF v_unique_game_types > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'FORMAT_EXPLORER', v_unique_game_types)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_unique_game_types, last_updated = NOW();
    END IF;

    -- =================================================
    -- SCORING CATEGORY
    -- Parse scorecard scores JSONB against course holes
    -- Scorecard format: {"1": {"strokes": 4, "putts": 2}, ...}
    -- Course holes format: [{"number": 1, "par": 4, "strokeIndex": 7}, ...]
    -- =================================================

    WITH hole_scores AS (
      SELECT
        (hole_data.value->>'strokes')::INTEGER AS strokes,
        (course_hole->>'par')::INTEGER AS hole_par
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      JOIN courses c ON r.course_id = c.id
      CROSS JOIN LATERAL jsonb_each(sc.scores) AS hole_data(hole_num, value)
      CROSS JOIN LATERAL (
        SELECT elem
        FROM jsonb_array_elements(c.holes) AS elem
        WHERE (elem->>'number')::TEXT = hole_data.hole_num
      ) AS course_hole(course_hole)
      WHERE sc.player_id = v_player_id
        AND sc.status IN ('completed', 'confirmed')
        AND (hole_data.value->>'strokes') IS NOT NULL
        AND (hole_data.value->>'strokes')::INTEGER > 0
    ),
    score_counts AS (
      SELECT
        COALESCE(SUM(CASE WHEN strokes = hole_par - 1 THEN 1 ELSE 0 END), 0) AS birdies,
        COALESCE(SUM(CASE WHEN strokes = hole_par - 2 THEN 1 ELSE 0 END), 0) AS eagles,
        COALESCE(SUM(CASE WHEN strokes <= hole_par - 3 THEN 1 ELSE 0 END), 0) AS albatrosses,
        COALESCE(SUM(CASE WHEN strokes = 1 THEN 1 ELSE 0 END), 0) AS hole_in_ones,
        COALESCE(SUM(CASE WHEN strokes = hole_par THEN 1 ELSE 0 END), 0) AS pars
      FROM hole_scores
    )
    SELECT birdies, eagles, albatrosses, hole_in_ones, pars
    INTO v_birdies, v_eagles, v_albatrosses, v_hole_in_ones, v_pars
    FROM score_counts;

    -- Insert scoring progress
    IF v_birdies > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'BIRDIE_HUNTER', v_birdies)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_birdies, last_updated = NOW();
    END IF;

    IF v_eagles > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'EAGLE_EYE', v_eagles)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_eagles, last_updated = NOW();
    END IF;

    IF v_albatrosses > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'ALBATROSS_RARE', v_albatrosses)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_albatrosses, last_updated = NOW();
    END IF;

    IF v_hole_in_ones > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'ACE', v_hole_in_ones)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_hole_in_ones, last_updated = NOW();
    END IF;

    IF v_pars > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'PAR_MACHINE', v_pars)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_pars, last_updated = NOW();
    END IF;

    -- Best stableford points in a single round (for STABLEFORD_STAR)
    SELECT COALESCE(MAX(sc.total_points), 0) INTO v_max_stableford_points
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed')
      AND r.game_type = 'stableford';

    IF v_max_stableford_points > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'STABLEFORD_STAR', v_max_stableford_points)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = GREATEST(achievement_progress.current_value, v_max_stableford_points),
          last_updated = NOW();
    END IF;

    -- Best (lowest) gross score in a single completed 18-hole round (for LOW_SCORER)
    -- LOW_SCORER thresholds are "under X", so we store the best gross and compare inverted
    -- We need to handle this specially when awarding achievements
    SELECT COALESCE(MIN(sc.total_gross), 999) INTO v_best_gross
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed')
      AND sc.total_gross > 0;

    IF v_best_gross < 999 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'LOW_SCORER', v_best_gross)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = LEAST(achievement_progress.current_value, v_best_gross),
          last_updated = NOW();
    END IF;

    -- =================================================
    -- COMPETITIONS CATEGORY
    -- =================================================

    -- Competitions joined
    SELECT COUNT(*) INTO v_competitions_joined
    FROM competition_players
    WHERE player_id = v_player_id
      AND status = 'accepted';

    IF v_competitions_joined > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'FIRST_TIMER', v_competitions_joined)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_competitions_joined, last_updated = NOW();

      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'COMPETITION_JUNKIE', v_competitions_joined)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_competitions_joined, last_updated = NOW();
    END IF;

    -- Competitions created (organizer)
    SELECT COUNT(*) INTO v_competitions_created
    FROM competitions
    WHERE organizer_id = v_player_id;

    IF v_competitions_created > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'ORGANIZER', v_competitions_created)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_competitions_created, last_updated = NOW();
    END IF;

    -- Competition wins (1st place overall in completed competitions)
    -- Sum competition_points per player per completed competition, rank, count wins
    WITH comp_standings AS (
      SELECT
        rr.player_id,
        r.competition_id,
        SUM(rr.competition_points) AS total_comp_points,
        RANK() OVER (
          PARTITION BY r.competition_id
          ORDER BY SUM(rr.competition_points) DESC
        ) AS comp_rank
      FROM round_results rr
      JOIN rounds r ON rr.round_id = r.id
      JOIN competitions c ON r.competition_id = c.id
      WHERE c.status = 'completed'
        AND c.id::TEXT LIKE 'c0000001%'
      GROUP BY rr.player_id, r.competition_id
    )
    SELECT COUNT(*) INTO v_competition_wins
    FROM comp_standings
    WHERE player_id = v_player_id
      AND comp_rank = 1;

    IF v_competition_wins > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'CHAMPION', v_competition_wins)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_competition_wins, last_updated = NOW();
    END IF;

    -- Podium finishes (top 3 overall in completed competitions)
    WITH comp_standings AS (
      SELECT
        rr.player_id,
        r.competition_id,
        SUM(rr.competition_points) AS total_comp_points,
        RANK() OVER (
          PARTITION BY r.competition_id
          ORDER BY SUM(rr.competition_points) DESC
        ) AS comp_rank
      FROM round_results rr
      JOIN rounds r ON rr.round_id = r.id
      JOIN competitions c ON r.competition_id = c.id
      WHERE c.status = 'completed'
        AND c.id::TEXT LIKE 'c0000001%'
      GROUP BY rr.player_id, r.competition_id
    )
    SELECT COUNT(*) INTO v_podium_finishes
    FROM comp_standings
    WHERE player_id = v_player_id
      AND comp_rank <= 3;

    IF v_podium_finishes > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'PODIUM_FINISH', v_podium_finishes)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_podium_finishes, last_updated = NOW();
    END IF;

    -- =================================================
    -- SOCIAL CATEGORY
    -- =================================================

    -- Friend count
    SELECT COUNT(*) INTO v_friend_count
    FROM friendships
    WHERE (requester_id = v_player_id OR addressee_id = v_player_id)
      AND status = 'accepted';

    IF v_friend_count > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'FIRST_FRIEND', v_friend_count)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_friend_count, last_updated = NOW();

      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'SOCIAL_CIRCLE', v_friend_count)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_friend_count, last_updated = NOW();
    END IF;

    -- Unique playing partners (from pairings)
    SELECT COUNT(DISTINCT partner_id) INTO v_unique_partners
    FROM (
      SELECT unnest(p.player_ids) AS partner_id
      FROM pairings p
      JOIN rounds r ON p.round_id = r.id
      JOIN scorecards sc ON sc.round_id = r.id AND sc.player_id = v_player_id
      WHERE v_player_id = ANY(p.player_ids)
        AND sc.status IN ('completed', 'confirmed')
    ) partners
    WHERE partner_id != v_player_id;

    IF v_unique_partners > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'PLAYING_PARTNERS', v_unique_partners)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_unique_partners, last_updated = NOW();
    END IF;

    -- =================================================
    -- COURSES CATEGORY
    -- =================================================

    -- Unique courses played
    SELECT COUNT(DISTINCT r.course_id) INTO v_unique_courses
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed');

    IF v_unique_courses > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'COURSE_EXPLORER', v_unique_courses)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_unique_courses, last_updated = NOW();
    END IF;

    -- Rounds at home club
    SELECT COUNT(*) INTO v_home_club_rounds
    FROM scorecards sc
    JOIN rounds r ON sc.round_id = r.id
    JOIN courses c ON r.course_id = c.id
    JOIN players pl ON pl.id = v_player_id
    WHERE sc.player_id = v_player_id
      AND sc.status IN ('completed', 'confirmed')
      AND pl.home_club_id IS NOT NULL
      AND c.club_id = pl.home_club_id;

    IF v_home_club_rounds > 0 THEN
      INSERT INTO achievement_progress (player_id, achievement_code, current_value)
      VALUES (v_player_id, 'HOME_ADVANTAGE', v_home_club_rounds)
      ON CONFLICT (player_id, achievement_code) DO UPDATE
      SET current_value = v_home_club_rounds, last_updated = NOW();
    END IF;

    -- =================================================
    -- AWARD ACHIEVEMENTS
    -- Check each achievement definition against progress
    -- =================================================

    v_achievement_count := 0;

    FOR v_achievement IN
      SELECT
        ad.id,
        ad.code,
        ad.threshold,
        ad.tier,
        COALESCE(ad.base_achievement, ad.code) AS base_code
      FROM achievement_definitions ad
      WHERE NOT EXISTS (
        SELECT 1 FROM player_achievements pa
        WHERE pa.player_id = v_player_id AND pa.achievement_id = ad.id
      )
      ORDER BY ad.category, ad.tier ASC
    LOOP
      -- Get current progress for this achievement's base code
      -- Must handle zero rows case: SELECT INTO sets NULL when no rows match
      v_progress_value := 0;
      SELECT ap.current_value INTO v_progress_value
      FROM achievement_progress ap
      WHERE ap.player_id = v_player_id
        AND ap.achievement_code = v_achievement.base_code;
      IF v_progress_value IS NULL THEN
        v_progress_value := 0;
      END IF;

      -- Handle LOW_SCORER specially (lower is better, threshold means "under X")
      IF v_achievement.base_code = 'LOW_SCORER' THEN
        -- v_progress_value is the best (lowest) gross score
        -- Award if best gross < threshold
        IF v_progress_value > 0 AND v_progress_value < v_achievement.threshold THEN
          INSERT INTO player_achievements (player_id, achievement_id, progress, earned_at)
          VALUES (v_player_id, v_achievement.id, v_progress_value, NOW())
          ON CONFLICT (player_id, achievement_id) DO NOTHING;

          IF FOUND THEN
            v_achievement_count := v_achievement_count + 1;
          END IF;
        END IF;
      ELSE
        -- Standard: award if progress >= threshold
        IF v_progress_value >= v_achievement.threshold THEN
          INSERT INTO player_achievements (player_id, achievement_id, progress, earned_at)
          VALUES (v_player_id, v_achievement.id, v_progress_value, NOW())
          ON CONFLICT (player_id, achievement_id) DO NOTHING;

          IF FOUND THEN
            v_achievement_count := v_achievement_count + 1;
          END IF;
        END IF;
      END IF;
    END LOOP;

    v_total_achievements := v_total_achievements + v_achievement_count;

    -- =================================================
    -- UNLOCK COSMETICS
    -- Based on total achievement points earned
    -- =================================================

    SELECT COALESCE(SUM(ad.points), 0) INTO v_total_points
    FROM player_achievements pa
    JOIN achievement_definitions ad ON pa.achievement_id = ad.id
    WHERE pa.player_id = v_player_id;

    v_cosmetic_count := 0;

    INSERT INTO player_cosmetics (player_id, cosmetic_id)
    SELECT v_player_id, cd.id
    FROM cosmetic_definitions cd
    WHERE cd.points_required <= v_total_points
      AND NOT EXISTS (
        SELECT 1 FROM player_cosmetics pc
        WHERE pc.player_id = v_player_id AND pc.cosmetic_id = cd.id
      )
    ON CONFLICT (player_id, cosmetic_id) DO NOTHING;

    GET DIAGNOSTICS v_cosmetic_count = ROW_COUNT;
    v_total_cosmetics := v_total_cosmetics + v_cosmetic_count;

    RAISE NOTICE 'Player % (#%): % rounds, % achievements earned (% pts), % cosmetics unlocked | Birdies:% Eagles:% Pars:% | Best Stab:% Best Gross:%',
      v_player_id, v_player_count,
      v_total_rounds, v_achievement_count, v_total_points, v_cosmetic_count,
      v_birdies, v_eagles, v_pars,
      v_max_stableford_points, v_best_gross;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Achievement Seed Complete ===';
  RAISE NOTICE 'Total players: %', v_player_count;
  RAISE NOTICE 'Total achievements awarded: %', v_total_achievements;
  RAISE NOTICE 'Total cosmetics unlocked: %', v_total_cosmetics;
END $$;

-- =====================================================
-- STEP 3: EQUIP COSMETICS FOR VARIETY
-- =====================================================
-- Give each user different equipped cosmetics based on what they've unlocked

DO $$
DECLARE
  v_user_ids UUID[] := ARRAY[
    'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
    'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
    'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
    '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
    '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
    '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
    'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
    '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
  ];
  v_player_id UUID;
  v_best_badge_id UUID;
  v_best_frame_id UUID;
  v_best_title_id UUID;
BEGIN
  FOREACH v_player_id IN ARRAY v_user_ids
  LOOP
    -- Equip the highest-tier unlocked badge
    SELECT cd.id INTO v_best_badge_id
    FROM player_cosmetics pc
    JOIN cosmetic_definitions cd ON pc.cosmetic_id = cd.id
    WHERE pc.player_id = v_player_id AND cd.type = 'badge'
    ORDER BY cd.points_required DESC
    LIMIT 1;

    -- Equip the highest-tier unlocked frame
    SELECT cd.id INTO v_best_frame_id
    FROM player_cosmetics pc
    JOIN cosmetic_definitions cd ON pc.cosmetic_id = cd.id
    WHERE pc.player_id = v_player_id AND cd.type = 'frame'
    ORDER BY cd.points_required DESC
    LIMIT 1;

    -- Equip the highest-tier unlocked title
    SELECT cd.id INTO v_best_title_id
    FROM player_cosmetics pc
    JOIN cosmetic_definitions cd ON pc.cosmetic_id = cd.id
    WHERE pc.player_id = v_player_id AND cd.type = 'title'
    ORDER BY cd.points_required DESC
    LIMIT 1;

    UPDATE players SET
      equipped_badge_id = v_best_badge_id,
      equipped_frame_id = v_best_frame_id,
      equipped_title_id = v_best_title_id
    WHERE id = v_player_id;

    IF v_best_badge_id IS NOT NULL OR v_best_frame_id IS NOT NULL OR v_best_title_id IS NOT NULL THEN
      RAISE NOTICE 'Equipped cosmetics for %: badge=%, frame=%, title=%',
        v_player_id,
        COALESCE(v_best_badge_id::TEXT, 'none'),
        COALESCE(v_best_frame_id::TEXT, 'none'),
        COALESCE(v_best_title_id::TEXT, 'none');
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- STEP 4: VERIFICATION QUERIES
-- =====================================================

-- Achievement progress summary per user
SELECT
  p.name,
  ap.achievement_code,
  ap.current_value
FROM players p
JOIN achievement_progress ap ON p.id = ap.player_id
WHERE p.id IN (
  'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
  'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
  '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
)
ORDER BY p.name, ap.achievement_code;

-- Earned achievements per user
SELECT
  p.name,
  ad.category::TEXT,
  ad.code,
  ad.name AS achievement_name,
  ad.points,
  ad.rarity::TEXT,
  pa.progress,
  pa.earned_at
FROM players p
JOIN player_achievements pa ON p.id = pa.player_id
JOIN achievement_definitions ad ON pa.achievement_id = ad.id
WHERE p.id IN (
  'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
  'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
  '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
)
ORDER BY p.name, ad.category, ad.tier;

-- Leaderboard summary
SELECT
  p.name,
  COALESCE(SUM(ad.points), 0)::INTEGER AS total_points,
  COUNT(pa.id)::INTEGER AS achievements_earned,
  (SELECT COUNT(*) FROM player_cosmetics pc WHERE pc.player_id = p.id)::INTEGER AS cosmetics_unlocked
FROM players p
LEFT JOIN player_achievements pa ON p.id = pa.player_id
LEFT JOIN achievement_definitions ad ON pa.achievement_id = ad.id
WHERE p.id IN (
  'd76287de-f504-4541-8ccd-e7484f4d8679'::UUID,
  'ca7c2924-39e8-4b66-bbb8-d9699adb3d65'::UUID,
  'e5579c23-938b-4f03-b08f-b889276cfc50'::UUID,
  '5d7c1ffc-0ad4-486b-b069-d93d626c762f'::UUID,
  '74e84922-d5fc-4cdb-9835-251c31784309'::UUID,
  '25c171c8-c087-4d4a-b3be-545acdfe3f11'::UUID,
  'e8ba6eb4-1894-422d-bbd2-485c9f141a55'::UUID,
  '41677ffc-f9c4-490b-bc39-1f7370b36c2b'::UUID
)
GROUP BY p.id, p.name
ORDER BY total_points DESC;
