-- Allow league creators to add players directly (not just self-join)
-- Previously only auth.uid() = player_id was allowed on INSERT

DROP POLICY IF EXISTS league_players_insert ON league_players;

CREATE POLICY league_players_insert ON league_players FOR INSERT
  WITH CHECK (
    auth.uid() = player_id
    OR EXISTS (
      SELECT 1 FROM leagues
      WHERE id = league_players.league_id AND created_by = auth.uid()
    )
  );
