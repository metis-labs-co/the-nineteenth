-- Round owners can update round_players rows for rounds they own.
--
-- Context: the only pre-existing round_players UPDATE policy is
-- "Players can respond to their round invitation" (20260612000000_scheduled_rounds),
-- which restricts updates to player_id = auth.uid() — a participant can update
-- only their OWN row. The score-entry "change tees" feature needs the round
-- OWNER to set a per-player tee override (round_players.selected_tee) for ANY
-- participant in a standalone round. Without this policy that update silently
-- affects zero rows under RLS (Postgres skips non-matching rows without error).
--
-- This ADDS an owner policy; the self-update policy from 20260612000000 stays in
-- place so invitees can still respond to invitations. Mirrors the round-owner
-- checks already used for round_players INSERT/DELETE (20250131000000) and the
-- rounds owner-update policies.

DROP POLICY IF EXISTS "Round owners can update their round_players" ON round_players;

CREATE POLICY "Round owners can update their round_players"
  ON round_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
        AND r.user_id = auth.uid()
    )
  );
