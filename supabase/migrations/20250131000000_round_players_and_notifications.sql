-- =====================================================
-- Round Players and Social Round Notifications
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds:
-- - round_players table for tracking players in standalone rounds
-- - social_round_invitation notification type
-- - Trigger to notify friends when added to a round
-- =====================================================

-- -----------------------------------------------------
-- Round Players Table
-- -----------------------------------------------------
-- Tracks players in standalone (social) rounds
-- Similar to competition_players but for casual rounds
CREATE TABLE round_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  added_by UUID REFERENCES players(id) ON DELETE SET NULL, -- who invited them (NULL if self)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure each player only appears once per round
  UNIQUE(round_id, player_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup: get players for a round
CREATE INDEX idx_round_players_round ON round_players(round_id);

-- Find all rounds a player is in
CREATE INDEX idx_round_players_player ON round_players(player_id);

-- Find who added a player
CREATE INDEX idx_round_players_added_by ON round_players(added_by);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE round_players ENABLE ROW LEVEL SECURITY;

-- Users can view round_players for rounds they own or are part of
-- Note: We avoid self-referencing the round_players table to prevent infinite recursion
CREATE POLICY "Users can view round_players"
  ON round_players FOR SELECT
  USING (
    -- Player is the record owner (self)
    player_id = auth.uid()
    OR
    -- Player added this person
    added_by = auth.uid()
    OR
    -- Player owns the round
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
      AND r.user_id = auth.uid()
    )
  );

-- Users can insert round_players for rounds they own
CREATE POLICY "Users can add players to their rounds"
  ON round_players FOR INSERT
  WITH CHECK (
    -- User owns the round
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
      AND r.user_id = auth.uid()
    )
  );

-- Users can delete round_players for rounds they own
CREATE POLICY "Users can remove players from their rounds"
  ON round_players FOR DELETE
  USING (
    -- User owns the round
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
      AND r.user_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATE NOTIFICATIONS TYPE CHECK
-- =====================================================

-- Add 'social_round_invitation' to the valid notification types
-- First drop the existing check constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recreate with the new type included
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'competition_player_added',
  'competition_player_joined',
  'new_round_created',
  'competition_status_changed',
  'scorecard_submitted',
  'friend_request_received',
  'friend_request_accepted',
  'social_round_invitation'
));

-- =====================================================
-- NOTIFICATION TRIGGER
-- =====================================================

-- -----------------------------------------------------
-- Social Round Invitation Notification Trigger
-- -----------------------------------------------------
-- Sends notification when a player is added to a social round
-- Does NOT notify if player added themselves (round owner)
CREATE OR REPLACE FUNCTION notify_round_player_invited()
RETURNS TRIGGER AS $$
DECLARE
  inviter_name TEXT;
  course_name TEXT;
  venue_name TEXT;
  round_date DATE;
  round_game_type TEXT;
  round_owner_id UUID;
BEGIN
  -- Get round details
  SELECT
    r.user_id,
    r.date,
    r.game_type,
    c.name,
    v.name
  INTO
    round_owner_id,
    round_date,
    round_game_type,
    course_name,
    venue_name
  FROM rounds r
  JOIN courses c ON c.id = r.course_id
  JOIN venues v ON v.id = c.venue_id
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
  PERFORM create_notification(
    NEW.player_id,
    'social_round_invitation',
    jsonb_build_object(
      'inviter_name', inviter_name,
      'course_name', course_name,
      'venue_name', venue_name,
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

CREATE TRIGGER trigger_notify_round_player_invited
  AFTER INSERT ON round_players
  FOR EACH ROW EXECUTE FUNCTION notify_round_player_invited();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE round_players IS 'Tracks players participating in standalone/social rounds';
COMMENT ON COLUMN round_players.round_id IS 'The round this player is part of';
COMMENT ON COLUMN round_players.player_id IS 'The player participating in the round';
COMMENT ON COLUMN round_players.added_by IS 'Who added this player to the round (NULL if self-added, i.e., round owner)';
COMMENT ON FUNCTION notify_round_player_invited IS 'Sends notification when a player is invited to a social round';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
