-- =====================================================
-- Migration: Skins Player Statistics
-- =====================================================
-- Creates a table to track aggregate skins game statistics
-- for each player, updated automatically when skins games
-- are completed. Enables leaderboards and player stats display.
--
-- Key Features:
-- - Aggregate statistics per player (games, holes, winnings)
-- - Win rate and streak tracking
-- - Auto-update trigger on game completion
-- - RLS for own stats + friends stats visibility
-- - Optimized indexes for leaderboard queries
-- =====================================================

-- ============================================================================
-- STEP 1: Create skins_player_statistics table
-- ============================================================================

CREATE TABLE skins_player_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player reference (unique per player)
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  CONSTRAINT unique_player_statistics UNIQUE (player_id),

  -- Game counts
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,  -- Games where player had positive net result

  -- Hole statistics
  total_holes_played INTEGER NOT NULL DEFAULT 0,
  total_holes_won INTEGER NOT NULL DEFAULT 0,
  total_holes_tied INTEGER NOT NULL DEFAULT 0,

  -- Financial statistics (in AUD)
  total_buy_ins DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_winnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_net_result DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Streak tracking
  current_win_streak INTEGER NOT NULL DEFAULT 0,  -- Consecutive games with positive net
  longest_win_streak INTEGER NOT NULL DEFAULT 0,  -- Best streak ever

  -- Calculated field for quick access
  win_rate DECIMAL(5,2),  -- Percentage of games with positive net
  hole_win_rate DECIMAL(5,2),  -- Percentage of holes won

  -- Timestamps
  last_game_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table and column comments
COMMENT ON TABLE skins_player_statistics IS 'Aggregate skins game statistics for each player';
COMMENT ON COLUMN skins_player_statistics.player_id IS 'Player this statistics record belongs to (unique per player)';
COMMENT ON COLUMN skins_player_statistics.games_played IS 'Total number of completed skins games played';
COMMENT ON COLUMN skins_player_statistics.games_won IS 'Number of games where player had positive net result';
COMMENT ON COLUMN skins_player_statistics.total_holes_played IS 'Total holes played across all skins games';
COMMENT ON COLUMN skins_player_statistics.total_holes_won IS 'Total holes won outright across all games';
COMMENT ON COLUMN skins_player_statistics.total_holes_tied IS 'Total holes tied (carryover) across all games';
COMMENT ON COLUMN skins_player_statistics.total_buy_ins IS 'Sum of all buy-ins paid';
COMMENT ON COLUMN skins_player_statistics.total_winnings IS 'Sum of all winnings across all games';
COMMENT ON COLUMN skins_player_statistics.total_net_result IS 'Total profit/loss (winnings - buy_ins)';
COMMENT ON COLUMN skins_player_statistics.current_win_streak IS 'Current consecutive games with positive net result';
COMMENT ON COLUMN skins_player_statistics.longest_win_streak IS 'Longest ever streak of positive-net games';
COMMENT ON COLUMN skins_player_statistics.win_rate IS 'Percentage of games with positive net result (0-100)';
COMMENT ON COLUMN skins_player_statistics.hole_win_rate IS 'Percentage of holes won outright (0-100)';
COMMENT ON COLUMN skins_player_statistics.last_game_at IS 'Timestamp of most recent completed game';

-- ============================================================================
-- STEP 2: Create indexes for efficient leaderboard queries
-- ============================================================================

-- Primary lookup by player
CREATE INDEX idx_skins_stats_player ON skins_player_statistics(player_id);

-- Leaderboard sorting indexes
CREATE INDEX idx_skins_stats_net_result ON skins_player_statistics(total_net_result DESC);
CREATE INDEX idx_skins_stats_win_rate ON skins_player_statistics(win_rate DESC NULLS LAST);
CREATE INDEX idx_skins_stats_games_played ON skins_player_statistics(games_played DESC);
CREATE INDEX idx_skins_stats_holes_won ON skins_player_statistics(total_holes_won DESC);
CREATE INDEX idx_skins_stats_winnings ON skins_player_statistics(total_winnings DESC);

-- Compound index for filtered leaderboards (e.g., players with min games)
CREATE INDEX idx_skins_stats_leaderboard ON skins_player_statistics(total_net_result DESC, games_played DESC)
  WHERE games_played >= 1;

-- Activity tracking
CREATE INDEX idx_skins_stats_last_game ON skins_player_statistics(last_game_at DESC NULLS LAST);

-- ============================================================================
-- STEP 3: Create trigger function to update statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION update_skins_player_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_payout RECORD;
  v_current_stats skins_player_statistics;
  v_is_win BOOLEAN;
  v_new_streak INTEGER;
  v_new_win_rate DECIMAL(5,2);
  v_new_hole_win_rate DECIMAL(5,2);
BEGIN
  -- Only trigger when game status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Process each payout record for this game
    FOR v_payout IN
      SELECT * FROM skins_payouts WHERE skins_game_id = NEW.id
    LOOP
      -- Check if player won this game (positive net result)
      v_is_win := v_payout.net_result > 0;

      -- Get or create current statistics for this player
      SELECT * INTO v_current_stats
      FROM skins_player_statistics
      WHERE player_id = v_payout.player_id;

      IF v_current_stats IS NULL THEN
        -- Create new statistics record
        INSERT INTO skins_player_statistics (
          player_id,
          games_played,
          games_won,
          total_holes_played,
          total_holes_won,
          total_holes_tied,
          total_buy_ins,
          total_winnings,
          total_net_result,
          current_win_streak,
          longest_win_streak,
          win_rate,
          hole_win_rate,
          last_game_at
        ) VALUES (
          v_payout.player_id,
          1,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost,
          v_payout.holes_won,
          v_payout.holes_tied,
          v_payout.buy_in,
          v_payout.total_winnings,
          v_payout.net_result,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          CASE WHEN v_is_win THEN 100.00 ELSE 0.00 END,
          CASE WHEN (v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost) > 0
               THEN ROUND((v_payout.holes_won::DECIMAL / (v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost)) * 100, 2)
               ELSE NULL END,
          NEW.completed_at
        );
      ELSE
        -- Calculate new streak
        IF v_is_win THEN
          v_new_streak := v_current_stats.current_win_streak + 1;
        ELSE
          v_new_streak := 0;
        END IF;

        -- Calculate new win rate
        v_new_win_rate := ROUND(
          ((v_current_stats.games_won + CASE WHEN v_is_win THEN 1 ELSE 0 END)::DECIMAL /
           (v_current_stats.games_played + 1)) * 100,
          2
        );

        -- Calculate new hole win rate
        IF (v_current_stats.total_holes_played + v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost) > 0 THEN
          v_new_hole_win_rate := ROUND(
            ((v_current_stats.total_holes_won + v_payout.holes_won)::DECIMAL /
             (v_current_stats.total_holes_played + v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost)) * 100,
            2
          );
        ELSE
          v_new_hole_win_rate := NULL;
        END IF;

        -- Update existing statistics record
        UPDATE skins_player_statistics SET
          games_played = games_played + 1,
          games_won = games_won + CASE WHEN v_is_win THEN 1 ELSE 0 END,
          total_holes_played = total_holes_played + v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost,
          total_holes_won = total_holes_won + v_payout.holes_won,
          total_holes_tied = total_holes_tied + v_payout.holes_tied,
          total_buy_ins = total_buy_ins + v_payout.buy_in,
          total_winnings = total_winnings + v_payout.total_winnings,
          total_net_result = total_net_result + v_payout.net_result,
          current_win_streak = v_new_streak,
          longest_win_streak = GREATEST(longest_win_streak, v_new_streak),
          win_rate = v_new_win_rate,
          hole_win_rate = v_new_hole_win_rate,
          last_game_at = NEW.completed_at,
          updated_at = NOW()
        WHERE player_id = v_payout.player_id;
      END IF;

    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_skins_player_statistics IS 'Automatically updates player statistics when a skins game is completed';

-- ============================================================================
-- STEP 4: Create trigger on skins_games table
-- ============================================================================

CREATE TRIGGER update_skins_statistics_on_completion
  AFTER UPDATE ON skins_games
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION update_skins_player_statistics();

COMMENT ON TRIGGER update_skins_statistics_on_completion ON skins_games IS 'Triggers statistics update when a skins game is completed';

-- ============================================================================
-- STEP 5: Add updated_at trigger
-- ============================================================================

CREATE TRIGGER update_skins_player_statistics_updated_at
  BEFORE UPDATE ON skins_player_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Enable RLS and create policies
-- ============================================================================

ALTER TABLE skins_player_statistics ENABLE ROW LEVEL SECURITY;

-- Players can view their own statistics
CREATE POLICY "Players can view their own skins statistics"
  ON skins_player_statistics FOR SELECT
  USING (player_id = auth.uid());

-- Players can view their friends' statistics
CREATE POLICY "Players can view friends skins statistics"
  ON skins_player_statistics FOR SELECT
  USING (
    player_id IN (
      SELECT
        CASE
          WHEN requester_id = auth.uid() THEN addressee_id
          WHEN addressee_id = auth.uid() THEN requester_id
        END
      FROM friendships
      WHERE (requester_id = auth.uid() OR addressee_id = auth.uid())
        AND status = 'accepted'
    )
  );

-- System can insert/update via trigger (SECURITY DEFINER function)
-- No direct INSERT/UPDATE/DELETE policies for regular users

-- ============================================================================
-- STEP 7: Create helper functions for leaderboards
-- ============================================================================

-- Get player's skins statistics
CREATE OR REPLACE FUNCTION get_player_skins_stats(p_player_id UUID)
RETURNS skins_player_statistics AS $$
  SELECT * FROM skins_player_statistics WHERE player_id = p_player_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_player_skins_stats IS 'Get skins statistics for a specific player';

-- Get skins leaderboard (top players by net result)
CREATE OR REPLACE FUNCTION get_skins_leaderboard(
  p_limit INTEGER DEFAULT 10,
  p_min_games INTEGER DEFAULT 1,
  p_friends_only BOOLEAN DEFAULT FALSE,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  rank BIGINT,
  player_id UUID,
  games_played INTEGER,
  games_won INTEGER,
  total_holes_won INTEGER,
  total_winnings DECIMAL(12,2),
  total_net_result DECIMAL(12,2),
  win_rate DECIMAL(5,2),
  hole_win_rate DECIMAL(5,2),
  current_win_streak INTEGER,
  longest_win_streak INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY s.total_net_result DESC, s.games_played DESC) AS rank,
    s.player_id,
    s.games_played,
    s.games_won,
    s.total_holes_won,
    s.total_winnings,
    s.total_net_result,
    s.win_rate,
    s.hole_win_rate,
    s.current_win_streak,
    s.longest_win_streak
  FROM skins_player_statistics s
  WHERE s.games_played >= p_min_games
    AND (
      NOT p_friends_only
      OR p_user_id IS NULL
      OR s.player_id = p_user_id
      OR s.player_id IN (
        SELECT
          CASE
            WHEN requester_id = p_user_id THEN addressee_id
            WHEN addressee_id = p_user_id THEN requester_id
          END
        FROM friendships
        WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
          AND status = 'accepted'
      )
    )
  ORDER BY s.total_net_result DESC, s.games_played DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_skins_leaderboard IS 'Get skins leaderboard with optional friends-only filter';

-- Get player's rank in the leaderboard
CREATE OR REPLACE FUNCTION get_player_skins_rank(
  p_player_id UUID,
  p_min_games INTEGER DEFAULT 1
)
RETURNS BIGINT AS $$
DECLARE
  v_rank BIGINT;
BEGIN
  SELECT rank INTO v_rank
  FROM (
    SELECT
      player_id,
      ROW_NUMBER() OVER (ORDER BY total_net_result DESC, games_played DESC) AS rank
    FROM skins_player_statistics
    WHERE games_played >= p_min_games
  ) ranked
  WHERE player_id = p_player_id;

  RETURN v_rank;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_player_skins_rank IS 'Get a player''s rank in the skins leaderboard';

-- ============================================================================
-- STEP 8: Backfill statistics for existing completed games
-- ============================================================================

-- Create a one-time backfill function
CREATE OR REPLACE FUNCTION backfill_skins_player_statistics()
RETURNS INTEGER AS $$
DECLARE
  v_game RECORD;
  v_payout RECORD;
  v_count INTEGER := 0;
  v_is_win BOOLEAN;
  v_current_stats skins_player_statistics;
  v_new_win_rate DECIMAL(5,2);
  v_new_hole_win_rate DECIMAL(5,2);
BEGIN
  -- Process all completed games in chronological order
  FOR v_game IN
    SELECT * FROM skins_games
    WHERE status = 'completed'
    ORDER BY completed_at ASC
  LOOP
    -- Process each payout for this game
    FOR v_payout IN
      SELECT * FROM skins_payouts WHERE skins_game_id = v_game.id
    LOOP
      v_is_win := v_payout.net_result > 0;

      -- Get current stats
      SELECT * INTO v_current_stats
      FROM skins_player_statistics
      WHERE player_id = v_payout.player_id;

      IF v_current_stats IS NULL THEN
        -- Create new record
        INSERT INTO skins_player_statistics (
          player_id,
          games_played,
          games_won,
          total_holes_played,
          total_holes_won,
          total_holes_tied,
          total_buy_ins,
          total_winnings,
          total_net_result,
          current_win_streak,
          longest_win_streak,
          win_rate,
          hole_win_rate,
          last_game_at
        ) VALUES (
          v_payout.player_id,
          1,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost,
          v_payout.holes_won,
          v_payout.holes_tied,
          v_payout.buy_in,
          v_payout.total_winnings,
          v_payout.net_result,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          CASE WHEN v_is_win THEN 100.00 ELSE 0.00 END,
          CASE WHEN (v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost) > 0
               THEN ROUND((v_payout.holes_won::DECIMAL / (v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost)) * 100, 2)
               ELSE NULL END,
          v_game.completed_at
        );
      ELSE
        -- Update existing record (mimicking trigger logic with streak handling)
        -- Note: For backfill, we maintain streak if consecutive wins in chronological order
        v_new_win_rate := ROUND(
          ((v_current_stats.games_won + CASE WHEN v_is_win THEN 1 ELSE 0 END)::DECIMAL /
           (v_current_stats.games_played + 1)) * 100,
          2
        );

        IF (v_current_stats.total_holes_played + v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost) > 0 THEN
          v_new_hole_win_rate := ROUND(
            ((v_current_stats.total_holes_won + v_payout.holes_won)::DECIMAL /
             (v_current_stats.total_holes_played + v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost)) * 100,
            2
          );
        ELSE
          v_new_hole_win_rate := NULL;
        END IF;

        UPDATE skins_player_statistics SET
          games_played = games_played + 1,
          games_won = games_won + CASE WHEN v_is_win THEN 1 ELSE 0 END,
          total_holes_played = total_holes_played + v_payout.holes_won + v_payout.holes_tied + v_payout.holes_lost,
          total_holes_won = total_holes_won + v_payout.holes_won,
          total_holes_tied = total_holes_tied + v_payout.holes_tied,
          total_buy_ins = total_buy_ins + v_payout.buy_in,
          total_winnings = total_winnings + v_payout.total_winnings,
          total_net_result = total_net_result + v_payout.net_result,
          current_win_streak = CASE WHEN v_is_win THEN current_win_streak + 1 ELSE 0 END,
          longest_win_streak = GREATEST(longest_win_streak, CASE WHEN v_is_win THEN current_win_streak + 1 ELSE 0 END),
          win_rate = v_new_win_rate,
          hole_win_rate = v_new_hole_win_rate,
          last_game_at = v_game.completed_at,
          updated_at = NOW()
        WHERE player_id = v_payout.player_id;
      END IF;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION backfill_skins_player_statistics IS 'One-time function to backfill statistics for existing completed skins games';

-- Run the backfill
SELECT backfill_skins_player_statistics();

-- Drop the backfill function after use (optional, keep for re-runs)
-- DROP FUNCTION backfill_skins_player_statistics();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
