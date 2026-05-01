-- =====================================================
-- Migration: Sub-match scoping for skins games
-- =====================================================
-- Lets a skins game be scoped to a single sub-match within
-- a split team round. Round-level skins games (sub_match_id
-- IS NULL) continue to work unchanged.
--
-- Membership-aware RLS: any player listed on the sub-match's
-- team_a_player_ids OR team_b_player_ids may create / edit /
-- cancel a sub-match skins game (in addition to the existing
-- round-owner and competition-organizer paths).
-- =====================================================

-- ----------------------------------------------------------
-- 1. Add sub_match_id column
-- ----------------------------------------------------------

ALTER TABLE skins_games
  ADD COLUMN IF NOT EXISTS sub_match_id UUID
    REFERENCES sub_matches(id) ON DELETE CASCADE;

COMMENT ON COLUMN skins_games.sub_match_id IS
  'When set, this skins game is scoped to a single sub-match within the round. NULL = round-wide game.';

-- ----------------------------------------------------------
-- 2. Relax the participant-count cap when scoped to a sub-match
-- ----------------------------------------------------------
-- Round-level individual skins is still capped at 4 participants
-- (matches existing UX of one tee group). Sub-matches can run up
-- to 3v3 = 6 individual participants.

ALTER TABLE skins_games DROP CONSTRAINT IF EXISTS skins_participant_count;

ALTER TABLE skins_games
  ADD CONSTRAINT skins_participant_count CHECK (
    array_length(participant_ids, 1) IS NULL
    OR (
      sub_match_id IS NULL
        AND array_length(participant_ids, 1) >= 2
        AND array_length(participant_ids, 1) <= 4
    )
    OR (
      sub_match_id IS NOT NULL
        AND array_length(participant_ids, 1) >= 2
        AND array_length(participant_ids, 1) <= 6
    )
  );

-- ----------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_skins_games_sub_match_id
  ON skins_games (sub_match_id)
  WHERE sub_match_id IS NOT NULL;

-- At most one ACTIVE skins game per sub-match.
CREATE UNIQUE INDEX IF NOT EXISTS uq_skins_games_one_active_per_sub_match
  ON skins_games (sub_match_id)
  WHERE sub_match_id IS NOT NULL AND status = 'active';

-- ----------------------------------------------------------
-- 4. RLS — sub-match members can manage sub-match skins games
-- ----------------------------------------------------------
-- Existing "Creators" and "Round organizers" ALL-policies stay in
-- place. Postgres OR-merges permissive policies, so this widens
-- access only for rows where sub_match_id IS NOT NULL.

DROP POLICY IF EXISTS "Sub-match members can manage sub-match skins" ON skins_games;
CREATE POLICY "Sub-match members can manage sub-match skins"
  ON skins_games FOR ALL
  USING (
    sub_match_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sub_matches sm
      WHERE sm.id = skins_games.sub_match_id
        AND auth.uid() = ANY(sm.team_a_player_ids || sm.team_b_player_ids)
    )
  )
  WITH CHECK (
    sub_match_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM sub_matches sm
      WHERE sm.id = skins_games.sub_match_id
        AND auth.uid() = ANY(sm.team_a_player_ids || sm.team_b_player_ids)
    )
  );

-- Mirror for results: sub-match members must be able to read /
-- write the per-hole rows produced by the engine.
DROP POLICY IF EXISTS "Sub-match members can manage sub-match skins results" ON skins_results;
CREATE POLICY "Sub-match members can manage sub-match skins results"
  ON skins_results FOR ALL
  USING (
    skins_game_id IN (
      SELECT sg.id FROM skins_games sg
      JOIN sub_matches sm ON sm.id = sg.sub_match_id
      WHERE auth.uid() = ANY(sm.team_a_player_ids || sm.team_b_player_ids)
    )
  )
  WITH CHECK (
    skins_game_id IN (
      SELECT sg.id FROM skins_games sg
      JOIN sub_matches sm ON sm.id = sg.sub_match_id
      WHERE auth.uid() = ANY(sm.team_a_player_ids || sm.team_b_player_ids)
    )
  );

-- Mirror for payouts.
DROP POLICY IF EXISTS "Sub-match members can manage sub-match skins payouts" ON skins_payouts;
CREATE POLICY "Sub-match members can manage sub-match skins payouts"
  ON skins_payouts FOR ALL
  USING (
    skins_game_id IN (
      SELECT sg.id FROM skins_games sg
      JOIN sub_matches sm ON sm.id = sg.sub_match_id
      WHERE auth.uid() = ANY(sm.team_a_player_ids || sm.team_b_player_ids)
    )
  )
  WITH CHECK (
    skins_game_id IN (
      SELECT sg.id FROM skins_games sg
      JOIN sub_matches sm ON sm.id = sg.sub_match_id
      WHERE auth.uid() = ANY(sm.team_a_player_ids || sm.team_b_player_ids)
    )
  );
