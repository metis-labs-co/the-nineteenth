-- =====================================================
-- Migration: Wolf Player Statistics
-- =====================================================
-- Creates a table to track aggregate wolf game statistics
-- for each player, updated automatically when wolf games
-- are completed. Enables game results display and tracking.
--
-- Mirrors the skins_player_statistics pattern with
-- Wolf-specific fields (points, holes as wolf).
-- =====================================================

-- ============================================================================
-- STEP 1: Create wolf_player_statistics table
-- ============================================================================

CREATE TABLE wolf_player_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player reference (unique per player)
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  CONSTRAINT unique_wolf_player_statistics UNIQUE (player_id),

  -- Game counts
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,  -- Games where player had positive net result

  -- Point & hole statistics
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  total_holes_played INTEGER NOT NULL DEFAULT 0,
  total_holes_as_wolf INTEGER NOT NULL DEFAULT 0,

  -- Financial statistics (in AUD)
  total_winnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_net_result DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Streak tracking
  current_win_streak INTEGER NOT NULL DEFAULT 0,  -- Consecutive games with positive net
  longest_win_streak INTEGER NOT NULL DEFAULT 0,  -- Best streak ever

  -- Calculated field for quick access
  win_rate DECIMAL(5,2),  -- Percentage of games with positive net

  -- Timestamps
  last_game_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table and column comments
COMMENT ON TABLE wolf_player_statistics IS 'Aggregate wolf game statistics for each player';
COMMENT ON COLUMN wolf_player_statistics.player_id IS 'Player this statistics record belongs to (unique per player)';
COMMENT ON COLUMN wolf_player_statistics.games_played IS 'Total number of completed wolf games played';
COMMENT ON COLUMN wolf_player_statistics.games_won IS 'Number of games where player had positive net result';
COMMENT ON COLUMN wolf_player_statistics.total_points_earned IS 'Total points accumulated across all wolf games';
COMMENT ON COLUMN wolf_player_statistics.total_holes_played IS 'Total holes played across all wolf games';
COMMENT ON COLUMN wolf_player_statistics.total_holes_as_wolf IS 'Total holes where player was the Wolf';
COMMENT ON COLUMN wolf_player_statistics.total_winnings IS 'Sum of all winnings across all games';
COMMENT ON COLUMN wolf_player_statistics.total_net_result IS 'Total profit/loss across all games';
COMMENT ON COLUMN wolf_player_statistics.current_win_streak IS 'Current consecutive games with positive net result';
COMMENT ON COLUMN wolf_player_statistics.longest_win_streak IS 'Longest ever streak of positive-net games';
COMMENT ON COLUMN wolf_player_statistics.win_rate IS 'Percentage of games with positive net result (0-100)';
COMMENT ON COLUMN wolf_player_statistics.last_game_at IS 'Timestamp of most recent completed game';

-- ============================================================================
-- STEP 2: Create indexes for efficient queries
-- ============================================================================

-- Primary lookup by player
CREATE INDEX idx_wolf_stats_player ON wolf_player_statistics(player_id);

-- Leaderboard sorting indexes
CREATE INDEX idx_wolf_stats_net_result ON wolf_player_statistics(total_net_result DESC);
CREATE INDEX idx_wolf_stats_win_rate ON wolf_player_statistics(win_rate DESC NULLS LAST);
CREATE INDEX idx_wolf_stats_games_played ON wolf_player_statistics(games_played DESC);
CREATE INDEX idx_wolf_stats_points ON wolf_player_statistics(total_points_earned DESC);
CREATE INDEX idx_wolf_stats_winnings ON wolf_player_statistics(total_winnings DESC);

-- Compound index for filtered queries
CREATE INDEX idx_wolf_stats_leaderboard ON wolf_player_statistics(total_net_result DESC, games_played DESC)
  WHERE games_played >= 1;

-- Activity tracking
CREATE INDEX idx_wolf_stats_last_game ON wolf_player_statistics(last_game_at DESC NULLS LAST);

-- ============================================================================
-- STEP 3: Create trigger function to update statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wolf_player_statistics()
RETURNS TRIGGER AS $$
DECLARE
  v_payout RECORD;
  v_current_stats wolf_player_statistics;
  v_is_win BOOLEAN;
  v_new_streak INTEGER;
  v_new_win_rate DECIMAL(5,2);
  v_holes_as_wolf INTEGER;
  v_total_holes INTEGER;
BEGIN
  -- Only trigger when game status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Count total holes played in this game (from wolf_hole_decisions)
    SELECT COUNT(*) INTO v_total_holes
    FROM wolf_hole_decisions
    WHERE wolf_game_id = NEW.id AND calculated_at IS NOT NULL;

    -- Process each payout record for this game
    FOR v_payout IN
      SELECT * FROM wolf_payouts WHERE wolf_game_id = NEW.id
    LOOP
      -- Check if player won this game (positive net result)
      v_is_win := v_payout.net_result > 0;

      -- Count holes where this player was the Wolf
      SELECT COUNT(*) INTO v_holes_as_wolf
      FROM wolf_hole_decisions
      WHERE wolf_game_id = NEW.id AND wolf_id = v_payout.player_id;

      -- Get or create current statistics for this player
      SELECT * INTO v_current_stats
      FROM wolf_player_statistics
      WHERE player_id = v_payout.player_id;

      IF v_current_stats IS NULL THEN
        -- Create new statistics record
        INSERT INTO wolf_player_statistics (
          player_id,
          games_played,
          games_won,
          total_points_earned,
          total_holes_played,
          total_holes_as_wolf,
          total_winnings,
          total_net_result,
          current_win_streak,
          longest_win_streak,
          win_rate,
          last_game_at
        ) VALUES (
          v_payout.player_id,
          1,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          v_payout.total_points,
          v_total_holes,
          v_holes_as_wolf,
          v_payout.total_winnings,
          v_payout.net_result,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          CASE WHEN v_is_win THEN 100.00 ELSE 0.00 END,
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

        -- Update existing statistics record
        UPDATE wolf_player_statistics SET
          games_played = games_played + 1,
          games_won = games_won + CASE WHEN v_is_win THEN 1 ELSE 0 END,
          total_points_earned = total_points_earned + v_payout.total_points,
          total_holes_played = total_holes_played + v_total_holes,
          total_holes_as_wolf = total_holes_as_wolf + v_holes_as_wolf,
          total_winnings = total_winnings + v_payout.total_winnings,
          total_net_result = total_net_result + v_payout.net_result,
          current_win_streak = v_new_streak,
          longest_win_streak = GREATEST(longest_win_streak, v_new_streak),
          win_rate = v_new_win_rate,
          last_game_at = NEW.completed_at,
          updated_at = NOW()
        WHERE player_id = v_payout.player_id;
      END IF;

    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_wolf_player_statistics IS 'Automatically updates player statistics when a wolf game is completed';

-- ============================================================================
-- STEP 4: Create trigger on wolf_games table
-- ============================================================================

CREATE TRIGGER update_wolf_statistics_on_completion
  AFTER UPDATE ON wolf_games
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION update_wolf_player_statistics();

COMMENT ON TRIGGER update_wolf_statistics_on_completion ON wolf_games IS 'Triggers statistics update when a wolf game is completed';

-- ============================================================================
-- STEP 5: Add updated_at trigger
-- ============================================================================

CREATE TRIGGER update_wolf_player_statistics_updated_at
  BEFORE UPDATE ON wolf_player_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Enable RLS and create policies
-- ============================================================================

ALTER TABLE wolf_player_statistics ENABLE ROW LEVEL SECURITY;

-- Players can view their own statistics
CREATE POLICY "Players can view their own wolf statistics"
  ON wolf_player_statistics FOR SELECT
  USING (player_id = auth.uid());

-- Players can view their friends' statistics
CREATE POLICY "Players can view friends wolf statistics"
  ON wolf_player_statistics FOR SELECT
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
-- STEP 7: Create helper function
-- ============================================================================

-- Get player's wolf statistics
CREATE OR REPLACE FUNCTION get_player_wolf_stats(p_player_id UUID)
RETURNS wolf_player_statistics AS $$
  SELECT * FROM wolf_player_statistics WHERE player_id = p_player_id;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_player_wolf_stats IS 'Get wolf statistics for a specific player';

-- ============================================================================
-- STEP 8: Backfill statistics for existing completed games
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_wolf_player_statistics()
RETURNS INTEGER AS $$
DECLARE
  v_game RECORD;
  v_payout RECORD;
  v_count INTEGER := 0;
  v_is_win BOOLEAN;
  v_current_stats wolf_player_statistics;
  v_new_win_rate DECIMAL(5,2);
  v_holes_as_wolf INTEGER;
  v_total_holes INTEGER;
BEGIN
  -- Process all completed games in chronological order
  FOR v_game IN
    SELECT * FROM wolf_games
    WHERE status = 'completed'
    ORDER BY completed_at ASC
  LOOP
    -- Count total holes for this game
    SELECT COUNT(*) INTO v_total_holes
    FROM wolf_hole_decisions
    WHERE wolf_game_id = v_game.id AND calculated_at IS NOT NULL;

    -- Process each payout for this game
    FOR v_payout IN
      SELECT * FROM wolf_payouts WHERE wolf_game_id = v_game.id
    LOOP
      v_is_win := v_payout.net_result > 0;

      -- Count holes as wolf
      SELECT COUNT(*) INTO v_holes_as_wolf
      FROM wolf_hole_decisions
      WHERE wolf_game_id = v_game.id AND wolf_id = v_payout.player_id;

      -- Get current stats
      SELECT * INTO v_current_stats
      FROM wolf_player_statistics
      WHERE player_id = v_payout.player_id;

      IF v_current_stats IS NULL THEN
        -- Create new record
        INSERT INTO wolf_player_statistics (
          player_id,
          games_played,
          games_won,
          total_points_earned,
          total_holes_played,
          total_holes_as_wolf,
          total_winnings,
          total_net_result,
          current_win_streak,
          longest_win_streak,
          win_rate,
          last_game_at
        ) VALUES (
          v_payout.player_id,
          1,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          v_payout.total_points,
          v_total_holes,
          v_holes_as_wolf,
          v_payout.total_winnings,
          v_payout.net_result,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          CASE WHEN v_is_win THEN 1 ELSE 0 END,
          CASE WHEN v_is_win THEN 100.00 ELSE 0.00 END,
          v_game.completed_at
        );
      ELSE
        v_new_win_rate := ROUND(
          ((v_current_stats.games_won + CASE WHEN v_is_win THEN 1 ELSE 0 END)::DECIMAL /
           (v_current_stats.games_played + 1)) * 100,
          2
        );

        UPDATE wolf_player_statistics SET
          games_played = games_played + 1,
          games_won = games_won + CASE WHEN v_is_win THEN 1 ELSE 0 END,
          total_points_earned = total_points_earned + v_payout.total_points,
          total_holes_played = total_holes_played + v_total_holes,
          total_holes_as_wolf = total_holes_as_wolf + v_holes_as_wolf,
          total_winnings = total_winnings + v_payout.total_winnings,
          total_net_result = total_net_result + v_payout.net_result,
          current_win_streak = CASE WHEN v_is_win THEN current_win_streak + 1 ELSE 0 END,
          longest_win_streak = GREATEST(longest_win_streak, CASE WHEN v_is_win THEN current_win_streak + 1 ELSE 0 END),
          win_rate = v_new_win_rate,
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

COMMENT ON FUNCTION backfill_wolf_player_statistics IS 'One-time function to backfill statistics for existing completed wolf games';

-- Run the backfill
SELECT backfill_wolf_player_statistics();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
