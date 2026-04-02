-- =====================================================
-- Retroactive Achievement Calculation V2
-- The Nineteenth - Golf Competition App
-- =====================================================
-- Calculates achievements retroactively for the new categories
-- added in achievements_v2:
--   - Skins games (side_games)
--   - Wolf games (side_games)
--   - Leagues
--   - Par game type specialist
--   - 9-hole rounds
--   - Knockout tournaments
--   - Scoring machine milestone
--
-- This supplements the original retroactive calculation.
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_retroactive_achievements_v2(
  p_player_id UUID DEFAULT NULL,
  p_batch_size INTEGER DEFAULT 100
)
RETURNS TABLE (
  players_processed INTEGER,
  achievements_awarded INTEGER
) AS $$
DECLARE
  v_player RECORD;
  v_player_count INTEGER := 0;
  v_total_achievements INTEGER := 0;
  v_offset INTEGER := 0;
  v_batch_count INTEGER := 0;
  v_has_more BOOLEAN := TRUE;

  -- Counters
  v_skins_games INTEGER;
  v_skins_holes_won INTEGER;
  v_wolf_games INTEGER;
  v_lone_wolf_wins INTEGER;
  v_blind_wolf_wins INTEGER;
  v_leagues_joined INTEGER;
  v_league_rounds INTEGER;
  v_par_rounds INTEGER;
  v_nine_hole_rounds INTEGER;
  v_knockout_wins INTEGER;
  v_total_scorecards INTEGER;

  -- Achievement tracking
  v_achievement RECORD;
  v_achievement_count INTEGER;
  v_progress_value INTEGER;
BEGIN
  RAISE NOTICE '=== Starting Retroactive Achievement Calculation V2 ===';

  WHILE v_has_more LOOP
    v_batch_count := 0;

    FOR v_player IN
      SELECT p.id, p.name
      FROM players p
      WHERE p.is_placeholder = FALSE
        AND (p_player_id IS NULL OR p.id = p_player_id)
      ORDER BY p.created_at
      OFFSET v_offset
      LIMIT p_batch_size
    LOOP
      v_batch_count := v_batch_count + 1;
      v_player_count := v_player_count + 1;

      -- =====================================================
      -- SKINS GAMES
      -- =====================================================

      -- Count completed skins games
      SELECT COUNT(*) INTO v_skins_games
      FROM skins_games sg
      WHERE sg.status = 'completed'
        AND v_player.id = ANY(sg.participant_ids);

      IF v_skins_games > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'SKINS_SHARK', v_skins_games)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_skins_games),
            last_updated = NOW();
      END IF;

      -- Count total skins holes won
      SELECT COALESCE(SUM(sp.holes_won), 0) INTO v_skins_holes_won
      FROM skins_payouts sp
      JOIN skins_games sg ON sp.skins_game_id = sg.id
      WHERE sp.player_id = v_player.id
        AND sg.status = 'completed';

      IF v_skins_holes_won > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'SKIN_COLLECTOR', v_skins_holes_won)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_skins_holes_won),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- WOLF GAMES
      -- =====================================================

      SELECT COUNT(*) INTO v_wolf_games
      FROM wolf_games wg
      WHERE wg.status = 'completed'
        AND v_player.id = ANY(wg.participant_ids);

      IF v_wolf_games > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'WOLF_PACK', v_wolf_games)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_wolf_games),
            last_updated = NOW();
      END IF;

      -- Count lone wolf wins
      SELECT COUNT(*) INTO v_lone_wolf_wins
      FROM wolf_hole_decisions whd
      JOIN wolf_games wg ON whd.wolf_game_id = wg.id
      WHERE whd.wolf_id = v_player.id
        AND whd.partner_id IS NULL
        AND whd.wolf_team_won = TRUE
        AND wg.status = 'completed';

      IF v_lone_wolf_wins > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'LONE_WOLF', v_lone_wolf_wins)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_lone_wolf_wins),
            last_updated = NOW();
      END IF;

      -- Count blind wolf wins
      SELECT COUNT(*) INTO v_blind_wolf_wins
      FROM wolf_hole_decisions whd
      JOIN wolf_games wg ON whd.wolf_game_id = wg.id
      WHERE whd.wolf_id = v_player.id
        AND whd.is_blind_wolf = TRUE
        AND whd.wolf_team_won = TRUE
        AND wg.status = 'completed';

      IF v_blind_wolf_wins > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'BLIND_WOLF', v_blind_wolf_wins)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_blind_wolf_wins),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- LEAGUES
      -- =====================================================

      SELECT COUNT(*) INTO v_leagues_joined
      FROM league_players lp
      WHERE lp.player_id = v_player.id;

      IF v_leagues_joined > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'LEAGUE_MEMBER', v_leagues_joined)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_leagues_joined),
            last_updated = NOW();
      END IF;

      SELECT COUNT(*) INTO v_league_rounds
      FROM league_rounds lr
      WHERE lr.player_id = v_player.id;

      IF v_league_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'LEAGUE_REGULAR', v_league_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_league_rounds),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- PAR GAME TYPE
      -- =====================================================

      SELECT COUNT(*) INTO v_par_rounds
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed')
        AND r.game_type = 'par';

      IF v_par_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'PAR_SPECIALIST', v_par_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_par_rounds),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- 9-HOLE ROUNDS
      -- =====================================================

      SELECT COUNT(*) INTO v_nine_hole_rounds
      FROM scorecards sc
      JOIN rounds r ON sc.round_id = r.id
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed')
        AND r.nine_type IN ('front9', 'back9');

      IF v_nine_hole_rounds > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'NINE_HOLE_SPECIALIST', v_nine_hole_rounds)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_nine_hole_rounds),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- KNOCKOUT WINS
      -- =====================================================

      SELECT COUNT(*) INTO v_knockout_wins
      FROM knockout_matches km
      WHERE km.winner_id = v_player.id
        AND km.status = 'completed';

      IF v_knockout_wins > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'KNOCKOUT_KING', v_knockout_wins)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_knockout_wins),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- MILESTONES: SCORING MACHINE
      -- =====================================================

      SELECT COUNT(*) INTO v_total_scorecards
      FROM scorecards sc
      WHERE sc.player_id = v_player.id
        AND sc.status IN ('completed', 'confirmed');

      IF v_total_scorecards > 0 THEN
        INSERT INTO achievement_progress (player_id, achievement_code, current_value)
        VALUES (v_player.id, 'SCORING_MACHINE', v_total_scorecards)
        ON CONFLICT (player_id, achievement_code) DO UPDATE
        SET current_value = GREATEST(achievement_progress.current_value, v_total_scorecards),
            last_updated = NOW();
      END IF;

      -- =====================================================
      -- AWARD ACHIEVEMENTS BASED ON PROGRESS
      -- =====================================================

      FOR v_achievement IN
        SELECT ad.id, ad.code, ad.threshold, ad.points,
               COALESCE(ad.base_achievement, REGEXP_REPLACE(ad.code, '_\d+$', '')) AS base_code
        FROM achievement_definitions ad
        WHERE ad.category IN ('side_games', 'leagues', 'milestones', 'streaks')
           OR ad.code LIKE 'PAR_SPECIALIST_%'
           OR ad.code LIKE 'NINE_HOLE_SPECIALIST_%'
           OR ad.code LIKE 'KNOCKOUT_KING_%'
           OR ad.code LIKE 'FORMAT_EXPLORER_5'
           OR ad.code LIKE 'FORMAT_EXPLORER_6'
      LOOP
        -- Get progress for this base code
        SELECT COALESCE(ap.current_value, 0) INTO v_progress_value
        FROM achievement_progress ap
        WHERE ap.player_id = v_player.id
          AND ap.achievement_code = v_achievement.base_code;

        IF v_progress_value IS NULL THEN
          v_progress_value := 0;
        END IF;

        -- Check if threshold is met and not already awarded
        IF v_progress_value >= v_achievement.threshold THEN
          SELECT COUNT(*) INTO v_achievement_count
          FROM player_achievements pa
          WHERE pa.player_id = v_player.id
            AND pa.achievement_id = v_achievement.id;

          IF v_achievement_count = 0 THEN
            INSERT INTO player_achievements (player_id, achievement_id, earned_at, progress, notified)
            VALUES (v_player.id, v_achievement.id, NOW(), v_progress_value, TRUE)
            ON CONFLICT (player_id, achievement_id) DO NOTHING;

            v_total_achievements := v_total_achievements + 1;
          END IF;
        END IF;
      END LOOP;

    END LOOP;

    v_offset := v_offset + p_batch_size;
    v_has_more := v_batch_count >= p_batch_size;
  END LOOP;

  RAISE NOTICE '=== Retroactive V2 Complete: % players, % achievements ===',
    v_player_count, v_total_achievements;

  RETURN QUERY SELECT v_player_count, v_total_achievements;
END;
$$ LANGUAGE plpgsql;

-- Run the retroactive calculation
SELECT * FROM calculate_retroactive_achievements_v2();
