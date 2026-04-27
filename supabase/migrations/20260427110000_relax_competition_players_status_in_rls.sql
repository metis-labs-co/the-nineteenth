-- =====================================================
-- Relax `cp.status = 'accepted'` filters in RLS policies
-- =====================================================
--
-- The `competition_players.status` column is dead weight: no app code path
-- ever creates a row in any state other than 'accepted', and the column
-- has no UI surface to drive transitions. The companion backfill migration
-- normalises any non-accepted rows.
--
-- Removing the status filter from RLS prevents this class of bug from
-- recurring if a future code path accidentally inserts with a non-accepted
-- status — RLS shouldn't gate visibility/sync on a flag the app doesn't
-- meaningfully manage. Visibility/membership is fully captured by the
-- existence of the (competition_id, player_id) row.
--
-- Touches the latest version of two RLS policies that gate scoring sync:
--   - `scorecards`            (SELECT, INSERT, UPDATE)  — last set in 20260202000000
--   - `score_entries`         (SELECT in their competitions) — set in 20260121000000
--
-- DELETE on scorecards is unchanged (it doesn't reference cp.status).
-- Other status-gated paths (notification triggers, achievement triggers,
-- backfill helpers, etc.) are not security-critical and are no-ops once
-- the backfill runs.

-- ============================================================================
-- scorecards: SELECT
-- ============================================================================

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
  );

-- ============================================================================
-- scorecards: INSERT
-- ============================================================================

DROP POLICY IF EXISTS "Users can create scorecards" ON scorecards;

CREATE POLICY "Users can create scorecards"
  ON scorecards FOR INSERT
  WITH CHECK (
    -- Own scorecard in a standalone round the user owns
    (player_id = auth.uid() AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = scorecards.round_id
      AND r.user_id = auth.uid()
    ))
    OR
    -- Scorecard for ANY player in a standalone round the user owns
    -- (Round owner can create scorecards for all players in their round)
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN round_players rp ON rp.round_id = r.id
      WHERE r.id = scorecards.round_id
      AND r.user_id = auth.uid()
      AND r.competition_id IS NULL
      AND rp.player_id = scorecards.player_id
    )
    OR
    -- Scorecard for another player in the same standalone round (via round_players)
    -- User must be a participant in the round
    EXISTS (
      SELECT 1 FROM round_players rp_self
      JOIN round_players rp_target ON rp_target.round_id = rp_self.round_id
      WHERE rp_self.round_id = scorecards.round_id
      AND rp_self.player_id = auth.uid()
      AND rp_target.player_id = scorecards.player_id
    )
    OR
    -- Own scorecard in a competition round where user is a member
    (player_id = auth.uid() AND EXISTS (
      SELECT 1 FROM rounds r
      JOIN competition_players cp ON cp.competition_id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND cp.player_id = auth.uid()
    ))
    OR
    -- Scorecard for another player in same pairing (group scoring with pairings)
    EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = scorecards.round_id
      AND auth.uid() = ANY(p.player_ids)
      AND scorecards.player_id = ANY(p.player_ids)
    )
    OR
    -- Scorecard for any player in the same competition (group scoring without pairings)
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competition_players cp_self ON cp_self.competition_id = r.competition_id
      JOIN competition_players cp_target ON cp_target.competition_id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND cp_self.player_id = auth.uid()
      AND cp_target.player_id = scorecards.player_id
    )
    OR
    -- Organizer can create scorecards for any player in their competition
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND c.organizer_id = auth.uid()
    )
  );

-- ============================================================================
-- scorecards: UPDATE
-- ============================================================================

DROP POLICY IF EXISTS "Users can update scorecards" ON scorecards;

CREATE POLICY "Users can update scorecards"
  ON scorecards FOR UPDATE
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
    -- Scorecard for player in same pairing (group scoring with pairings)
    EXISTS (
      SELECT 1 FROM pairings p
      WHERE p.round_id = scorecards.round_id
      AND auth.uid() = ANY(p.player_ids)
      AND scorecards.player_id = ANY(p.player_ids)
    )
    OR
    -- Scorecard for any player in the same competition (group scoring without pairings)
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competition_players cp_self ON cp_self.competition_id = r.competition_id
      JOIN competition_players cp_target ON cp_target.competition_id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND cp_self.player_id = auth.uid()
      AND cp_target.player_id = scorecards.player_id
    )
    OR
    -- Organizer can update scorecards
    EXISTS (
      SELECT 1 FROM rounds r
      JOIN competitions c ON c.id = r.competition_id
      WHERE r.id = scorecards.round_id
      AND c.organizer_id = auth.uid()
    )
  );

-- ============================================================================
-- score_entries: SELECT (in competitions)
-- ============================================================================

DROP POLICY IF EXISTS "Players can view score entries in their competitions" ON score_entries;

CREATE POLICY "Players can view score entries in their competitions"
  ON score_entries FOR SELECT
  USING (
    round_id IN (
      SELECT r.id FROM rounds r
      WHERE r.competition_id IN (
        SELECT cp.competition_id FROM competition_players cp
        WHERE cp.player_id = auth.uid()
      )
    )
  );
