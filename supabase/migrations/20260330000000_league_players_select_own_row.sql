-- Fix: Allow players to see their own league_players row regardless of status.
-- Required for upsert conflict detection when rejoining a league after removal.
-- Consistent with UPDATE policy which already allows auth.uid() = player_id.

DROP POLICY IF EXISTS league_players_select ON league_players;

CREATE POLICY league_players_select ON league_players FOR SELECT
  USING (
    auth.uid() = player_id
    OR is_league_member(league_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_players.league_id AND created_by = auth.uid()
    )
  );
