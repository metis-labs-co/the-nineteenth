-- Migration: fix_round_player_notification_trigger
-- Description: Update notify_round_player_invited() function to use 'clubs' table instead of 'venues'
--              The venues table was renamed to clubs in 20260117122305_rename_venues_to_clubs.sql
--              but this trigger function was missed
-- Date: 2026-01-18

-- =====================================================
-- FIX: Update trigger function to use 'clubs' table
-- =====================================================

CREATE OR REPLACE FUNCTION notify_round_player_invited()
RETURNS TRIGGER AS $$
DECLARE
  inviter_name TEXT;
  course_name TEXT;
  club_name TEXT;
  round_date DATE;
  round_game_type TEXT;
  round_owner_id UUID;
BEGIN
  -- Get round details (now using 'clubs' instead of 'venues')
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

  -- Create notification for the invited player
  -- Note: Using 'club_name' in notification data (renamed from 'venue_name' for consistency)
  PERFORM create_notification(
    NEW.player_id,
    'social_round_invitation',
    jsonb_build_object(
      'inviter_name', inviter_name,
      'course_name', course_name,
      'club_name', club_name,
      'venue_name', club_name,  -- Keep for backwards compatibility with existing notification displays
      'date', round_date,
      'game_type', round_game_type
    ),
    NULL,  -- no competition_id
    NEW.round_id,
    COALESCE(NEW.added_by, round_owner_id),  -- player_id = inviter
    NULL   -- no friendship_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION notify_round_player_invited IS 'Sends notification when a player is invited to a social round. Updated to use clubs table.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
