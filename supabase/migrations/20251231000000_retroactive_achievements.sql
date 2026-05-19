-- =====================================================
-- Retroactive Achievement Calculation
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration calculates achievements retroactively for all existing
-- players based on their historical data:
-- 1. Completed scorecards for round achievements
-- 2. Parsed scorecard scores JSONB for birdies/eagles/pars/hole-in-ones
-- 3. Accepted friendships for social achievements
-- 4. Competition participation for competition achievements
-- 5. Distinct courses played for course achievements
--
-- The function:
-- - Calculates all progress values
-- - Inserts achievement_progress records
-- - Awards achievements that meet thresholds
-- - Unlocks cosmetics based on total points earned
-- - Uses batching for performance with large user bases
-- =====================================================

-- =====================================================
-- FUNCTION: calculate_retroactive_achievements
-- =====================================================
-- Main function that calculates achievements for all players
-- or a specific player if p_player_id is provided.
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_retroactive_achievements(
  p_player_id UUID DEFAULT NULL,
  p_batch_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  players_processed INTEGER,
  achievements_awarded INTEGER,
  cosmetics_unlocked INTEGER
) AS $$
DECLARE
  v_player RECORD;
  v_player_count INTEGER := 0;
  v_total_achievements INTEGER := 0;
  v_total_cosmetics INTEGER := 0;
  v_batch_count INTEGER := 0;
  v_offset INTEGER := 0;
  v_has_more BOOLEAN := TRUE;

  -- Progress counters
  v_total_rounds INTEGER;
  v_practice_rounds INTEGER;
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

  -- Social counters
  v_friend_count INTEGER;

  -- Competition counters
  v_competitions_joined INTEGER;
  v_competitions_created INTEGER;

  -- Course counters
  v_unique_courses INTEGER;
  v_home_venue_rounds INTEGER;

  -- Achievement tracking
  v_achievement RECORD;
  v_achievement_count INTEGER;
  v_progress_value INTEGER;
  v_total_points INTEGER;
  v_cosmetic RECORD;
  v_cosmetic_count INTEGER;
BEGIN
  RAISE NOTICE '=== Starting Retroactive Achievement Calculation ===';
  RAISE NOTICE 'Batch size: %, Target player: %', p_batch_size, COALESCE(p_player_id::TEXT, 'ALL');

  -- Process players in batches
  WHILE v_has_more LOOP
    v_batch_count := 0;

    FOR v_player IN
      SELECT p.id, p.name, p.home_club_id
      FROM players p
      WHERE p.is_placeholder = FALSE
        AND (p_player_id IS NULL OR p.id = p_player_id)
      ORDER BY p.created_at
      OFFSET v_offset
      LIMIT p_batch_size
    LOOP
      v_batch_count := v_batch_count + 1;
      v_player_count := v_player_count + 1;

      IF v_player_count % 10 = 0 OR v_player_count = 1 THEN
        RAISE NOTICE 'Processing player % (#%): %', v_player.id, v_player_count, v_player.name;
      END IF;

      -- =====================================================
      -- ROUNDS CATEGORY
      -- =====================================================

      -- Count total completed scorecards (rounds)
      SELECT COUNT(*) INTO v_total_rounds
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed');

      -- Count practice rounds (standalone, non-competition)
      SELECT COUNT(*) INTO v_practice_rounds
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed')
        AND r.competition_id IS NULL;

      -- Count competition rounds
      SELECT COUNT(*) INTO v_competition_rounds
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed')
        AND r.competition_id IS NOT NULL;

      -- Upsert progress for round achievements
      IF v_total_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'ROUND_VETERAN', v_total_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_total_rounds),
            last_updated = NOW();
      END IF;

      IF v_practice_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'PRACTICE_MAKES_PERFECT', v_practice_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_practice_rounds),
            last_updated = NOW();
      END IF;

      IF v_competition_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'COMPETITOR', v_competition_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_competition_rounds),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- GAME TYPES CATEGORY
      -- =====================================================

      -- Count by game type
      SELECT COUNT(*) INTO v_stableford_rounds
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed')
        AND r.game_type = 'stableford';

      SELECT COUNT(*) INTO v_stroke_rounds
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed')
        AND r.game_type = 'stroke';

      SELECT COUNT(*) INTO v_match_play_rounds
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed')
        AND r.game_type = 'match-play';

      SELECT COUNT(*) INTO v_team_rounds
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed')
        AND r.game_type IN ('scramble', 'shamble', 'best-ball');

      -- Count unique game types played
      SELECT COUNT(DISTINCT r.game_type) INTO v_unique_game_types
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed');

      -- Upsert game type progress
      IF v_stableford_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'STABLEFORD_SPECIALIST', v_stableford_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_stableford_rounds),
            last_updated = NOW();
      END IF;

      IF v_stroke_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'STROKE_PLAYER', v_stroke_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_stroke_rounds),
            last_updated = NOW();
      END IF;

      IF v_match_play_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'MATCH_PLAY_MASTER', v_match_play_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_match_play_rounds),
            last_updated = NOW();
      END IF;

      IF v_team_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'TEAM_PLAYER', v_team_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_team_rounds),
            last_updated = NOW();
      END IF;

      IF v_unique_game_types > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'FORMAT_EXPLORER', v_unique_game_types)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_unique_game_types),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- SCORING CATEGORY
      -- Parse scorecard scores JSONB to count scoring events
      -- =====================================================

      -- Count scoring events from all scorecards
      -- Scorecard scores format: { "1": { "strokes": 4, "par": 4 }, "2": { "strokes": 3, "par": 4 }, ... }
      WITH hole_scores AS (
        SELECT
          sc.id AS scorecard_id,
          (hole_data.value->>'strokes')::INTEGER AS strokes,
          COALESCE(
            (hole_data.value->>'par')::INTEGER,
            (SELECT (h->>'par')::INTEGER
             FROM jsonb_array_elements(c.holes) h
             WHERE (h->>'holeNumber')::INTEGER = hole_data.hole_num::INTEGER)
          ) AS par
        FROM scorecards sc
        JOIN rounds r ON sc.round_id = r.id
        JOIN courses c ON r.course_id = c.id
        CROSS JOIN LATERAL jsonb_each(sc.scores) AS hole_data(hole_num, value)
        WHERE sc.player_id = v_player.id
          AND sc.status IN ('completed', 'confirmed')
          AND (hole_data.value->>'strokes') IS NOT NULL
          AND (hole_data.value->>'strokes')::INTEGER > 0
      ),
      score_counts AS (
        SELECT
          SUM(CASE WHEN strokes = par - 1 THEN 1 ELSE 0 END) AS birdies,
          SUM(CASE WHEN strokes = par - 2 THEN 1 ELSE 0 END) AS eagles,
          SUM(CASE WHEN strokes = par - 3 THEN 1 ELSE 0 END) AS albatrosses,
          SUM(CASE WHEN strokes = 1 THEN 1 ELSE 0 END) AS hole_in_ones,
          SUM(CASE WHEN strokes = par THEN 1 ELSE 0 END) AS pars
        FROM hole_scores
      )
      SELECT
        COALESCE(birdies, 0),
        COALESCE(eagles, 0),
        COALESCE(albatrosses, 0),
        COALESCE(hole_in_ones, 0),
        COALESCE(pars, 0)
      INTO v_birdies, v_eagles, v_albatrosses, v_hole_in_ones, v_pars
      FROM score_counts;

      -- Upsert scoring progress
      IF v_birdies > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'BIRDIE_HUNTER', v_birdies)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_birdies),
            last_updated = NOW();
      END IF;

      IF v_eagles > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'EAGLE_EYE', v_eagles)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_eagles),
            last_updated = NOW();
      END IF;

      IF v_albatrosses > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'ALBATROSS_RARE', v_albatrosses)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_albatrosses),
            last_updated = NOW();
      END IF;

      IF v_hole_in_ones > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'ACE', v_hole_in_ones)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_hole_in_ones),
            last_updated = NOW();
      END IF;

      IF v_pars > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'PAR_MACHINE', v_pars)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_pars),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- SOCIAL CATEGORY
      -- =====================================================

      -- Count accepted friendships
      SELECT COUNT(*) INTO v_friend_count
      FROM friendships
      WHERE (requester_id = v_player.id OR addressee_id = v_player.id)
        AND status = 'accepted';

      -- First Friend and Social Circle use same counter
      IF v_friend_count > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'FIRST_FRIEND', v_friend_count)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_friend_count),
            last_updated = NOW();

        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'SOCIAL_CIRCLE', v_friend_count)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_friend_count),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- COMPETITIONS CATEGORY
      -- =====================================================

      -- Count accepted competition memberships
      SELECT COUNT(*) INTO v_competitions_joined
      FROM competition_players
      WHERE player_id = v_player.id
        AND status = 'accepted';

      -- First Timer and Competition Junkie
      IF v_competitions_joined > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'FIRST_TIMER', v_competitions_joined)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_competitions_joined),
            last_updated = NOW();

        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'COMPETITION_JUNKIE', v_competitions_joined)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_competitions_joined),
            last_updated = NOW();
      END IF;

      -- Count competitions created (where player is organizer)
      SELECT COUNT(*) INTO v_competitions_created
      FROM competitions
      WHERE organizer_id = v_player.id;

      IF v_competitions_created > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'ORGANIZER', v_competitions_created)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_competitions_created),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- COURSES CATEGORY
      -- =====================================================

      -- Count unique courses played
      SELECT COUNT(DISTINCT r.course_id) INTO v_unique_courses
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed');

      IF v_unique_courses > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'COURSE_EXPLORER', v_unique_courses)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_unique_courses),
            last_updated = NOW();
      END IF;

      -- Count rounds at home club
      IF v_player.home_club_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_home_venue_rounds
        FROM scorecards sc
        JOIN rounds r ON sc.round_id = r.id
        JOIN courses c ON r.course_id = c.id
        WHERE sc.player_id = v_player.id
          AND sc.status IN ('completed', 'confirmed')
          AND c.club_id = v_player.home_club_id;

        IF v_home_venue_rounds > 0 THEN
          INSERT INTO achievement_progress (player_id, achievement_code, current_value)
          VALUES (v_player.id, 'HOME_ADVANTAGE', v_home_venue_rounds)
          ON CONFLICT (player_id, achievement_code) DO UPDATE
          SET current_value = GREATEST(achievement_progress.current_value, v_home_venue_rounds),
              last_updated = NOW();
        END IF;
      END IF;

      -- =====================================================
      -- AWARD ACHIEVEMENTS
      -- Check thresholds and award any earned achievements
      -- =====================================================

      v_achievement_count := 0;

      FOR v_achievement IN
        SELECT ad.id, ad.code, ad.threshold, COALESCE(ad.base_achievement, ad.code) AS base_code
        FROM achievement_definitions ad
        WHERE NOT EXISTS (
          SELECT 1 FROM player_achievements pa
          WHERE pa.player_id = v_player.id AND pa.achievement_id = ad.id
        )
        ORDER BY ad.tier ASC
      LOOP
        -- Get current progress for this achievement's base code
        SELECT COALESCE(ap.current_value, 0) INTO v_progress_value
        FROM achievement_progress ap
        WHERE ap.player_id = v_player.id
          AND ap.achievement_code = v_achievement.base_code;

        -- Check if threshold is met
        IF v_progress_value >= v_achievement.threshold THEN
          -- Award the achievement
          INSERT INTO player_achievements (player_id, achievement_id, progress, earned_at)
          VALUES (v_player.id, v_achievement.id, v_progress_value, NOW())
          ON CONFLICT (player_id, achievement_id) DO NOTHING;

          IF FOUND THEN
            v_achievement_count := v_achievement_count + 1;
          END IF;
        END IF;
      END LOOP;

      v_total_achievements := v_total_achievements + v_achievement_count;

      -- =====================================================
      -- UNLOCK COSMETICS
      -- Calculate total points and unlock eligible cosmetics
      -- =====================================================

      -- Get player's total achievement points
      SELECT COALESCE(SUM(ad.points), 0) INTO v_total_points
      FROM player_achievements pa
      JOIN achievement_definitions ad ON pa.achievement_id = ad.id
      WHERE pa.player_id = v_player.id;

      v_cosmetic_count := 0;

      -- Unlock any cosmetics the player qualifies for
      FOR v_cosmetic IN
        SELECT cd.id, cd.code, cd.name, cd.points_required
        FROM cosmetic_definitions cd
        WHERE cd.points_required <= v_total_points
          AND NOT EXISTS (
            SELECT 1 FROM player_cosmetics pc
            WHERE pc.player_id = v_player.id AND pc.cosmetic_id = cd.id
          )
        ORDER BY cd.points_required ASC
      LOOP
        INSERT INTO player_cosmetics (player_id, cosmetic_id)
        VALUES (v_player.id, v_cosmetic.id)
        ON CONFLICT (player_id, cosmetic_id) DO NOTHING;

        IF FOUND THEN
          v_cosmetic_count := v_cosmetic_count + 1;
        END IF;
      END LOOP;

      v_total_cosmetics := v_total_cosmetics + v_cosmetic_count;

      -- Log progress for this player if they earned anything
      IF v_achievement_count > 0 OR v_cosmetic_count > 0 THEN
        RAISE NOTICE '  -> % earned % achievements, % cosmetics (% total points)',
          v_player.name, v_achievement_count, v_cosmetic_count, v_total_points;
      END IF;

    END LOOP;

    -- Check if we got a full batch (more players to process)
    IF v_batch_count < p_batch_size THEN
      v_has_more := FALSE;
    ELSE
      v_offset := v_offset + p_batch_size;
      RAISE NOTICE '--- Batch complete. Processed % players so far. Moving to next batch... ---', v_player_count;
    END IF;

    -- Exit early if processing a single player
    IF p_player_id IS NOT NULL THEN
      v_has_more := FALSE;
    END IF;
  END LOOP;

  RAISE NOTICE '=== Retroactive Achievement Calculation Complete ===';
  RAISE NOTICE 'Total players processed: %', v_player_count;
  RAISE NOTICE 'Total achievements awarded: %', v_total_achievements;
  RAISE NOTICE 'Total cosmetics unlocked: %', v_total_cosmetics;

  RETURN QUERY SELECT v_player_count, v_total_achievements, v_total_cosmetics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: recalculate_player_achievements
-- =====================================================
-- Convenience function to recalculate achievements for a single player
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_player_achievements(p_player_id UUID)
RETURNS TABLE (
  players_processed INTEGER,
  achievements_awarded INTEGER,
  cosmetics_unlocked INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM calculate_retroactive_achievements(p_player_id, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION calculate_retroactive_achievements(UUID, INTEGER) IS
  'Calculates and awards achievements retroactively for all players (or a specific player).
   Processes in batches for performance. Use p_batch_size to control memory usage.';

COMMENT ON FUNCTION recalculate_player_achievements(UUID) IS
  'Convenience wrapper to recalculate achievements for a single player.';

-- =====================================================
-- RUN RETROACTIVE CALCULATION
-- Execute the function as a one-time migration
-- =====================================================

DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║     RETROACTIVE ACHIEVEMENT CALCULATION - ONE-TIME RUN       ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- Run the retroactive calculation for all players
  SELECT * INTO v_result FROM calculate_retroactive_achievements(NULL, 50);

  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║                       FINAL RESULTS                          ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Players Processed:      %-34s  ║', v_result.players_processed;
  RAISE NOTICE '║  Achievements Awarded:   %-34s  ║', v_result.achievements_awarded;
  RAISE NOTICE '║  Cosmetics Unlocked:     %-34s  ║', v_result.cosmetics_unlocked;
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END;
$$;

-- =====================================================
-- VERIFICATION QUERIES (for manual inspection)
-- =====================================================

-- Uncomment these to verify the results after migration:

-- -- Check achievement progress distribution
-- SELECT
--   achievement_code,
--   COUNT(*) as player_count,
--   AVG(current_value)::INTEGER as avg_progress,
--   MAX(current_value) as max_progress
-- FROM achievement_progress
-- GROUP BY achievement_code
-- ORDER BY player_count DESC;

-- -- Check earned achievements by category
-- SELECT
--   ad.category,
--   COUNT(*) as times_earned
-- FROM player_achievements pa
-- JOIN achievement_definitions ad ON pa.achievement_id = ad.id
-- GROUP BY ad.category
-- ORDER BY times_earned DESC;

-- -- Check cosmetics unlocked by type
-- SELECT
--   cd.type,
--   cd.code,
--   cd.points_required,
--   COUNT(pc.id) as times_unlocked
-- FROM cosmetic_definitions cd
-- LEFT JOIN player_cosmetics pc ON cd.id = pc.cosmetic_id
-- GROUP BY cd.type, cd.code, cd.points_required
-- ORDER BY cd.type, cd.points_required;

-- -- Top 10 players by achievement points
-- SELECT * FROM achievement_leaderboard LIMIT 10;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
