-- =====================================================
-- Restore friend visibility to scorecards & rounds RLS
-- =====================================================
-- Regression fix.
--
-- 20260412000000_add_friend_scorecard_round_visibility added an
-- `is_friend(scorecards.player_id)` branch to the "Users can view
-- scorecards" SELECT policy so that viewing a friend's profile
-- shows ALL of their rounds/stats (not just rounds you shared).
--
-- That branch was then silently lost when the policy was recreated
-- by later migrations that reproduced an OLDER policy body:
--   * 20260427110000_relax_competition_players_status_in_rls
--       (header claims the policy was "last set in 20260202000000" --
--        it was actually last set in 20260412000000, so the is_friend
--        branch added there was dropped)
--   * 20260528000000_league_member_scorecard_player_visibility
--       (rebuilt from the already-broken 20260427110000 body)
--
-- Symptoms this fixes:
--   1. A friend's profile shows stale / incomplete statistics --
--      the stats query (src/hooks/playerStatistics/queries.ts) reads
--      `scorecards` filtered by the friend's player_id, so with no
--      friend branch it only ever saw rounds you co-played.
--   2. Opening a friend's scorecard from the activity feed errors /
--      shows "Player not found" -- PlayerScorecardScreen reads the
--      scorecard directly from `scorecards`/`rounds` (RLS-restricted),
--      even though the feed itself is populated by SECURITY DEFINER
--      RPCs that bypass RLS. The row/round were invisible to the viewer.
--
-- Rounds coverage:
--   The stats query joins `rounds!inner`, and the scorecard screen
--   fetches the round via `.single()`, so the ROUND must also be
--   RLS-visible for a friend's scorecard to resolve.
--     * Standalone / social rounds: already covered -- the friend is
--       written to `round_players`, so round_has_friend_player() (added
--       by 20260412010000) exposes the round.
--     * Competition rounds: participants live in `competition_players`,
--       NOT `round_players`, so round_has_friend_player() does not cover
--       them. This migration adds competition_has_friend_member() to
--       expose a round of any competition an accepted friend belongs to.
--
-- Recursion safety (42P17):
--   20260412010000 replaced round_has_friend_scorecard() (which read
--   `scorecards`, whose RLS references `rounds`, creating a rounds<->
--   scorecards cycle) with round_has_friend_player() (reads
--   `round_players`). competition_has_friend_member() below follows the
--   same safe pattern: it reads `competition_players`, whose SELECT
--   policy (is_competition_member / is_competition_organizer) does NOT
--   reference `rounds`, so no cycle is introduced.
-- =====================================================


-- =====================================================
-- 1. HELPER: does a competition have an accepted friend as a member?
-- =====================================================
-- SECURITY DEFINER, mirrors round_has_friend_player(). Reads
-- competition_players only (never scorecards/rounds) to stay clear of
-- the rounds<->scorecards RLS cycle.

CREATE OR REPLACE FUNCTION competition_has_friend_member(p_competition_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM competition_players cp
    WHERE cp.competition_id = p_competition_id
    AND is_friend(cp.player_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION competition_has_friend_member(UUID) IS
  'Check if a competition has an accepted friend of the current user among its competition_players. SECURITY DEFINER and reads only competition_players (whose RLS never touches rounds) to avoid the rounds<->scorecards RLS cycle that round_has_friend_scorecard hit.';


-- =====================================================
-- 2. SCORECARDS SELECT -- re-add the friend branch
-- =====================================================
-- Body reproduced verbatim from 20260528000000_league_member_scorecard_
-- player_visibility (the latest definition), with the is_friend branch
-- restored at the end.

DROP POLICY IF EXISTS "Users can view scorecards" ON scorecards;

CREATE POLICY "Users can view scorecards"
  ON scorecards FOR SELECT
  USING (
    -- Own scorecard
    (player_id = auth.uid())
    OR
    -- Scorecard in a standalone round the user owns
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = scorecards.round_id
      AND r.user_id = auth.uid()
    )
    OR
    -- Scorecard for another player in the same standalone round (via round_players)
    EXISTS (
      SELECT 1 FROM round_players rp_self
      JOIN round_players rp_target ON rp_target.round_id = rp_self.round_id
      WHERE rp_self.round_id = scorecards.round_id
      AND rp_self.player_id = auth.uid()
      AND rp_target.player_id = scorecards.player_id
    )
    OR
    -- Scorecard in a competition the user is part of
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competition_players cp ON cp.competition_id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND cp.player_id = auth.uid()
    )
    OR
    -- User is the organizer of the competition
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND c.organizer_id = auth.uid()
    )
    OR
    -- Scorecard belongs to a round tagged to a league the user is in
    is_league_tagged_round(scorecards.round_id, auth.uid())
    OR
    -- RESTORED: Scorecard belongs to an accepted friend
    is_friend(scorecards.player_id)
  );


-- =====================================================
-- 3. ROUNDS SELECT -- add competition friend coverage
-- =====================================================
-- Body reproduced verbatim from 20260412010000_fix_rounds_friend_
-- visibility_recursion (the latest definition), with a competition
-- friend branch added. Standalone friend rounds stay covered by the
-- existing round_has_friend_player() branch.

DROP POLICY IF EXISTS "Users can view rounds" ON rounds;

CREATE POLICY "Users can view rounds"
  ON rounds FOR SELECT
  USING (
    -- Standalone rounds: user owns it
    (user_id = auth.uid())
    OR
    -- Standalone rounds: user is a participant via round_players
    (competition_id IS NULL AND is_round_participant(rounds.id, auth.uid()))
    OR
    -- Competition rounds: user is in the competition
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competition_players cp
      WHERE cp.competition_id = rounds.competition_id
      AND cp.player_id = auth.uid()
      AND cp.status = 'accepted'
    ))
    OR
    -- Competition rounds: user is the organizer
    (competition_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM competitions c
      WHERE c.id = rounds.competition_id
      AND c.organizer_id = auth.uid()
    ))
    OR
    -- Friend visibility (standalone): round has an accepted friend as a
    -- round_players participant.
    round_has_friend_player(rounds.id)
    OR
    -- RESTORED (competition): round belongs to a competition an accepted
    -- friend is a member of. Covers friend competition/league rounds,
    -- whose participants live in competition_players (not round_players).
    (competition_id IS NOT NULL AND competition_has_friend_member(rounds.competition_id))
  );
