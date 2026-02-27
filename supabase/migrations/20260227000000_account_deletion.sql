-- Migration: Account deletion support (GDPR Article 17 / UK GDPR)
-- Description: Creates a function to delete a user account, anonymising historical data
-- and hard-deleting personal data. Called via edge function with service_role.
-- Author: Claude
-- Date: 2026-02-27

-- ============================================================================
-- ACCOUNT DELETION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player_id UUID;
BEGIN
  -- Get the player record (player.id = auth.uid())
  v_player_id := p_user_id;

  -- ========================================================================
  -- 1. Clean array-based references (remove player from arrays)
  -- ========================================================================

  -- Remove from pairings.player_ids
  UPDATE pairings
  SET player_ids = array_remove(player_ids, v_player_id),
      updated_at = NOW()
  WHERE v_player_id = ANY(player_ids);

  -- Remove from skins_games.participant_ids
  UPDATE skins_games
  SET participant_ids = array_remove(participant_ids, v_player_id),
      updated_at = NOW()
  WHERE v_player_id = ANY(participant_ids);

  -- Remove from wolf_games.participant_ids
  UPDATE wolf_games
  SET participant_ids = array_remove(participant_ids, v_player_id),
      updated_at = NOW()
  WHERE v_player_id = ANY(participant_ids);

  -- Remove from wolf_games.wolf_order
  UPDATE wolf_games
  SET wolf_order = array_remove(wolf_order, v_player_id),
      updated_at = NOW()
  WHERE v_player_id = ANY(wolf_order);

  -- ========================================================================
  -- 2. Anonymise historical scores (preserve competition integrity)
  -- ========================================================================

  -- Anonymise scorecards - null out player_id, keep scores for leaderboards
  UPDATE scorecards
  SET player_id = NULL,
      updated_at = NOW()
  WHERE player_id = v_player_id;

  -- Anonymise hole_scores
  UPDATE hole_scores
  SET player_id = NULL,
      updated_at = NOW()
  WHERE player_id = v_player_id;

  -- Anonymise score_entries
  UPDATE score_entries
  SET player_id = NULL,
      updated_at = NOW()
  WHERE player_id = v_player_id;

  -- Anonymise skins_results
  UPDATE skins_results
  SET winner_player_id = NULL
  WHERE winner_player_id = v_player_id;

  -- Anonymise skins_payouts
  UPDATE skins_payouts
  SET player_id = NULL
  WHERE player_id = v_player_id;

  -- Anonymise wolf_hole_decisions
  UPDATE wolf_hole_decisions
  SET wolf_player_id = NULL
  WHERE wolf_player_id = v_player_id;

  UPDATE wolf_hole_decisions
  SET partner_player_id = NULL
  WHERE partner_player_id = v_player_id;

  -- Anonymise wolf_payouts
  UPDATE wolf_payouts
  SET player_id = NULL
  WHERE player_id = v_player_id;

  -- Anonymise round_results
  UPDATE round_results
  SET player_id = NULL
  WHERE player_id = v_player_id;

  -- ========================================================================
  -- 3. Hard delete personal data
  -- ========================================================================

  -- Push tokens
  DELETE FROM push_tokens WHERE user_id = v_player_id;

  -- Notifications
  DELETE FROM notifications WHERE user_id = v_player_id;

  -- Friendships (both directions)
  DELETE FROM friendships WHERE user_id = v_player_id OR friend_id = v_player_id;

  -- Favorite courses
  DELETE FROM favorite_courses WHERE user_id = v_player_id;

  -- User subscriptions
  DELETE FROM user_subscriptions WHERE user_id = v_player_id;

  -- Player achievements
  DELETE FROM player_achievements WHERE player_id = v_player_id;

  -- Player cosmetics
  DELETE FROM player_cosmetics WHERE player_id = v_player_id;

  -- Skins player statistics
  DELETE FROM skins_player_statistics WHERE player_id = v_player_id;

  -- Handicap differentials
  DELETE FROM handicap_differentials WHERE player_id = v_player_id;

  -- User preferences
  DELETE FROM user_preferences WHERE user_id = v_player_id;

  -- Competition players
  DELETE FROM competition_players WHERE player_id = v_player_id;

  -- Scoring pairs (both as scorer and player)
  DELETE FROM scoring_pairs WHERE scorer_id = v_player_id OR player_id = v_player_id;

  -- Round players
  DELETE FROM round_players WHERE player_id = v_player_id;

  -- ========================================================================
  -- 4. Delete the player record
  -- ========================================================================

  DELETE FROM players WHERE id = v_player_id;

  RETURN TRUE;
END;
$$;

-- Only grant to service_role (called from edge function, not directly by users)
REVOKE ALL ON FUNCTION delete_user_account(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION delete_user_account(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO service_role;

COMMENT ON FUNCTION delete_user_account(UUID) IS 'Deletes a user account: anonymises historical scores, removes personal data, deletes player record. Called via service_role from edge function.';
