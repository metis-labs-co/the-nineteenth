-- =====================================================
-- claim_competition_placeholder RPC
-- =====================================================
-- Lets a joining player claim the next unclaimed placeholder slot in a
-- competition. Used by the invite-code join flow when the organizer set
-- max_players (and the comp was auto-filled with placeholders on create).
--
-- This is different from link_placeholder_player, which is invoked by the
-- placeholder's creator. This RPC is invoked by the joining user, so it
-- runs as SECURITY DEFINER and does its own authorization (placeholder
-- must be in the named competition; caller must not already be a member).
--
-- The function:
--   1. Locks the first unclaimed placeholder in the comp
--   2. Swaps competition_players.player_id from placeholder -> caller
--   3. Updates pairings that reference the placeholder
--   4. Transfers scorecards / team_members
--   5. Marks the placeholder as linked
-- Returns the placeholder's UUID, or NULL if none available.
-- =====================================================

CREATE OR REPLACE FUNCTION public.claim_competition_placeholder(
  p_competition_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_caller UUID;
  v_placeholder_id UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Caller must not already be a member of this competition
  IF EXISTS (
    SELECT 1 FROM competition_players
    WHERE competition_id = p_competition_id
      AND player_id = v_caller
  ) THEN
    RAISE EXCEPTION 'You have already joined this competition';
  END IF;

  -- Caller must exist as a real player (not a placeholder)
  IF NOT EXISTS (
    SELECT 1 FROM players
    WHERE id = v_caller
      AND is_placeholder = FALSE
  ) THEN
    RAISE EXCEPTION 'Calling user is not a real player';
  END IF;

  -- Find and lock the first unclaimed placeholder in this comp.
  -- Ordered by competition_players.invited_at then players.created_at so
  -- the lowest-numbered slot fills first.
  SELECT p.id
    INTO v_placeholder_id
    FROM competition_players cp
    JOIN players p ON p.id = cp.player_id
   WHERE cp.competition_id = p_competition_id
     AND cp.status = 'accepted'
     AND p.is_placeholder = TRUE
     AND p.linked_player_id IS NULL
   ORDER BY cp.invited_at ASC NULLS LAST, p.created_at ASC
   LIMIT 1
   FOR UPDATE OF cp;

  IF v_placeholder_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Swap competition_players.player_id from placeholder -> caller.
  -- The capacity trigger short-circuits on UPDATEs where OLD.status = 'accepted',
  -- so the cap is preserved without blocking the swap.
  UPDATE competition_players
     SET player_id = v_caller,
         responded_at = NOW()
   WHERE competition_id = p_competition_id
     AND player_id = v_placeholder_id;

  -- Replace placeholder id in pairings.player_ids arrays for this comp
  UPDATE pairings pa
     SET player_ids = array_replace(pa.player_ids, v_placeholder_id, v_caller)
    FROM rounds r
   WHERE pa.round_id = r.id
     AND r.competition_id = p_competition_id
     AND v_placeholder_id = ANY(pa.player_ids);

  -- Transfer scorecards for this comp (defensive — placeholders shouldn't
  -- have scored yet, but if they did, carry results to the real user).
  UPDATE scorecards s
     SET player_id = v_caller
    FROM rounds r
   WHERE s.round_id = r.id
     AND r.competition_id = p_competition_id
     AND s.player_id = v_placeholder_id
     AND NOT EXISTS (
       SELECT 1 FROM scorecards s2
        WHERE s2.round_id = s.round_id
          AND s2.player_id = v_caller
     );
  -- Drop any duplicates left behind
  DELETE FROM scorecards s
   USING rounds r
   WHERE s.round_id = r.id
     AND r.competition_id = p_competition_id
     AND s.player_id = v_placeholder_id;

  -- Swap team memberships for teams owned by this comp
  UPDATE team_members tm
     SET player_id = v_caller
    FROM teams t
   WHERE tm.team_id = t.id
     AND t.competition_id = p_competition_id
     AND tm.player_id = v_placeholder_id
     AND NOT EXISTS (
       SELECT 1 FROM team_members tm2
        WHERE tm2.team_id = tm.team_id
          AND tm2.player_id = v_caller
     );
  DELETE FROM team_members tm
   USING teams t
   WHERE tm.team_id = t.id
     AND t.competition_id = p_competition_id
     AND tm.player_id = v_placeholder_id;

  -- Mark the placeholder as linked to the real user
  UPDATE players
     SET linked_player_id = v_caller,
         updated_at = NOW()
   WHERE id = v_placeholder_id;

  RETURN v_placeholder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_competition_placeholder(UUID) TO authenticated;

COMMENT ON FUNCTION public.claim_competition_placeholder IS
  'Atomically claim the next unclaimed placeholder slot in a competition for the calling user. Returns the placeholder id that was claimed, or NULL if no slots are available. Used by the join-by-invite-code flow to replace auto-generated slot placeholders with real players.';
