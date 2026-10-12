-- =====================================================
-- Round roster RPCs (round options menu)
-- =====================================================
-- Owner-only add/remove of players on an in-progress social round.
-- Both run an unlocked owner/competition preflight, then lock the round row
-- FOR UPDATE (same order as end_round_early) so a concurrent end-early or
-- submission can't interleave.
-- Spec: docs/superpowers/specs/2026-10-12-round-options-menu-design.md §2

CREATE OR REPLACE FUNCTION public.assert_round_roster_editable(p_round_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_owner UUID;
  v_competition_id UUID;
  v_status TEXT;
  v_holes_played INT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Unlocked preflight (mirrors end_round_early): reject outsiders and
  -- competition rounds without taking a lock that could delay ordinary scoring.
  SELECT user_id, competition_id
    INTO v_owner, v_competition_id
  FROM rounds
  WHERE id = p_round_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round % not found', p_round_id USING ERRCODE = 'P0002';
  END IF;
  IF v_owner IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'Only the round owner can change players' USING ERRCODE = '42501', HINT = 'not_owner';
  END IF;
  IF v_competition_id IS NOT NULL THEN
    RAISE EXCEPTION 'Players can only be changed on a social round in play'
      USING ERRCODE = '22023', HINT = 'round_not_editable';
  END IF;

  -- Re-read and recheck under lock: the round may have changed since preflight.
  SELECT user_id, competition_id, status, holes_played
    INTO v_owner, v_competition_id, v_status, v_holes_played
  FROM rounds
  WHERE id = p_round_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Round % not found', p_round_id USING ERRCODE = 'P0002';
  END IF;
  IF v_owner IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'Only the round owner can change players' USING ERRCODE = '42501', HINT = 'not_owner';
  END IF;
  IF v_competition_id IS NOT NULL OR v_status = 'completed' THEN
    RAISE EXCEPTION 'Players can only be changed on a social round in play'
      USING ERRCODE = '22023', HINT = 'round_not_editable';
  END IF;
  IF v_holes_played IS NOT NULL THEN
    RAISE EXCEPTION 'Round has been ended' USING ERRCODE = '22023', HINT = 'round_ended';
  END IF;

  BEGIN
    PERFORM sc.id FROM public.scorecards sc
     WHERE sc.round_id = p_round_id ORDER BY sc.id FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RAISE EXCEPTION 'Round scores are changing; try again'
      USING ERRCODE = '22023', HINT = 'round_scorecards_busy';
  END;

  IF EXISTS (SELECT 1 FROM public.scorecards sc
              WHERE sc.round_id = p_round_id AND sc.status IN ('completed', 'confirmed')) THEN
    RAISE EXCEPTION 'Scores have been submitted'
      USING ERRCODE = '22023', HINT = 'round_has_submitted_scorecards';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_round_roster_editable(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_round_player(p_round_id UUID, p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_round_roster_editable(p_round_id);

  IF EXISTS (SELECT 1 FROM round_players WHERE round_id = p_round_id AND player_id = p_player_id) THEN
    RAISE EXCEPTION 'Player is already in this round'
      USING ERRCODE = '23505', HINT = 'player_already_in_round';
  END IF;
  IF (SELECT COUNT(*) FROM round_players WHERE round_id = p_round_id) >= 4 THEN
    RAISE EXCEPTION 'This round is full' USING ERRCODE = '22023', HINT = 'round_full';
  END IF;
  -- SECURITY DEFINER bypasses RLS, so honour 1.15.0 blocking explicitly.
  IF is_blocked_pair(auth.uid(), p_player_id) THEN
    RAISE EXCEPTION 'This player can''t be added' USING ERRCODE = '42501', HINT = 'player_blocked';
  END IF;

  -- Transaction-local flag read by notify_round_player_invited so only this
  -- path gets "added you to a round" copy. Normal round creation also inserts
  -- accepted rows into an in-progress round and must keep "invited you to play".
  PERFORM set_config('app.round_player_added_mid_round', 'on', true);
  INSERT INTO round_players (round_id, player_id, added_by, invitation_status, responded_at)
  VALUES (p_round_id, p_player_id, auth.uid(), 'accepted', NOW());
  PERFORM set_config('app.round_player_added_mid_round', 'off', true);
END;
$$;
REVOKE ALL ON FUNCTION public.add_round_player(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_round_player(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_round_player(p_round_id UUID, p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.assert_round_roster_editable(p_round_id);

  IF p_player_id = auth.uid() THEN
    RAISE EXCEPTION 'The round owner cannot be removed'
      USING ERRCODE = '22023', HINT = 'cannot_remove_owner';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM round_players WHERE round_id = p_round_id AND player_id = p_player_id) THEN
    RAISE EXCEPTION 'Player is not in this round'
      USING ERRCODE = 'P0002', HINT = 'player_not_in_round';
  END IF;

  -- None of these reference scorecards, so nothing cascades from the card.
  DELETE FROM score_entries
   WHERE round_id = p_round_id AND (player_id = p_player_id OR scorer_id = p_player_id);
  DELETE FROM score_mismatches
   WHERE round_id = p_round_id
     AND (player_id = p_player_id OR self_scorer_id = p_player_id OR partner_scorer_id = p_player_id);
  DELETE FROM score_submission_status
   WHERE round_id = p_round_id AND (player_id = p_player_id OR partner_id = p_player_id);
  DELETE FROM shot_log WHERE round_id = p_round_id AND player_id = p_player_id;
  -- Hard delete: unique_scorecard_per_player_round is a full constraint, so a
  -- soft-deleted card would block re-adding the same player.
  DELETE FROM scorecards WHERE round_id = p_round_id AND player_id = p_player_id;
  -- Must go too, or any participant device could re-insert the card.
  DELETE FROM round_players WHERE round_id = p_round_id AND player_id = p_player_id;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_round_player(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_round_player(UUID, UUID) TO authenticated;

-- =====================================================
-- Notification wording: "added you to a round" for add_round_player only
-- =====================================================
-- Copied from 20260327000000 with only the added_mid_round edits.

CREATE OR REPLACE FUNCTION notify_round_player_invited()
RETURNS TRIGGER AS $$
DECLARE
  inviter_name TEXT;
  course_name TEXT;
  club_name TEXT;
  round_date DATE;
  round_game_type TEXT;
  round_owner_id UUID;
  added_mid_round BOOLEAN := COALESCE(current_setting('app.round_player_added_mid_round', true), '') = 'on';
BEGIN
  -- Get round details (using 'clubs' table)
  SELECT
    r.user_id,
    r.date,
    r.game_type,
    c.name,
    cl.name
  INTO
    round_owner_id,
    round_date,
    round_game_type,
    course_name,
    club_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  JOIN clubs cl ON cl.id = c.club_id
  WHERE r.id = NEW.round_id;

  -- Don't notify if player is the round owner (added themselves)
  IF NEW.player_id = round_owner_id THEN
    RETURN NEW;
  END IF;

  -- Get inviter name (the round owner or added_by)
  SELECT name INTO inviter_name
  FROM players
  WHERE id = COALESCE(NEW.added_by, round_owner_id);

  -- Create in-app notification for the invited player
  PERFORM create_notification(
    NEW.player_id,
    'social_round_invitation',
    jsonb_build_object(
      'inviter_name', inviter_name,
      'course_name', course_name,
      'club_name', club_name,
      'venue_name', club_name,
      'date', round_date,
      'game_type', round_game_type,
      'added_mid_round', added_mid_round
    ),
    NULL,  -- no competition_id
    NEW.round_id,
    COALESCE(NEW.added_by, round_owner_id),  -- player_id = inviter
    NULL   -- no friendship_id
  );

  -- Send push notification (previously missing!)
  PERFORM send_push_notification(
    NEW.player_id,
    'social_round_invitation',
    CASE WHEN added_mid_round THEN 'Added to a Round' ELSE 'Round Invitation' END,
    CASE WHEN added_mid_round
      THEN inviter_name || ' added you to a round at ' || COALESCE(club_name, course_name)
      ELSE inviter_name || ' invited you to play at ' || COALESCE(club_name, course_name)
    END,
    jsonb_build_object(
      'type', 'social_round_invitation',
      'inviter_name', inviter_name,
      'course_name', course_name,
      'club_name', club_name,
      'venue_name', club_name,
      'date', round_date,
      'game_type', round_game_type,
      'added_mid_round', added_mid_round,
      'roundId', NEW.round_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION notify_round_player_invited IS 'Sends in-app notification AND push notification when a player is invited to a social round.';
