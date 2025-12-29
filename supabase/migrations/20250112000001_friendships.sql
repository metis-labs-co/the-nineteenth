-- =====================================================
-- Friendships Schema
-- The Nineteenth - Golf Competition App
-- =====================================================
-- This migration adds friend functionality:
-- - Friendships table for player connections
-- - RLS policies for secure access
-- - Indexes for efficient queries
-- =====================================================

-- -----------------------------------------------------
-- Friendships Table
-- -----------------------------------------------------
-- Represents friend relationships between players
-- Each friendship has a requester (who sent the request) and addressee (who received it)
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Status of the friendship
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Find friendships by requester
CREATE INDEX idx_friendships_requester ON friendships(requester_id);

-- Find friendships by addressee
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);

-- Find friendships by status
CREATE INDEX idx_friendships_status ON friendships(status);

-- Composite index for finding accepted friends quickly
CREATE INDEX idx_friendships_accepted ON friendships(requester_id, addressee_id) WHERE status = 'accepted';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Apply updated_at trigger
CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- Friendships Policies
-- -----------------------------------------------------

-- Users can view friendships where they are either requester or addressee
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can create friend requests (as requester)
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships where they are the addressee (to accept/decline)
-- Or where they are the requester (to cancel a pending request)
CREATE POLICY "Users can update own friendships"
  ON friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can delete friendships they are part of
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- Get Friends List
-- -----------------------------------------------------
-- Returns all accepted friends for a user with their player details
CREATE OR REPLACE FUNCTION get_friends(user_id UUID)
RETURNS TABLE (
  friendship_id UUID,
  friend_id UUID,
  friend_name TEXT,
  friend_email TEXT,
  friend_handicap NUMERIC,
  friend_photo_url TEXT,
  is_requester BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS friendship_id,
    CASE
      WHEN f.requester_id = user_id THEN f.addressee_id
      ELSE f.requester_id
    END AS friend_id,
    p.name AS friend_name,
    p.email AS friend_email,
    p.handicap AS friend_handicap,
    p.photo_url AS friend_photo_url,
    (f.requester_id = user_id) AS is_requester,
    f.created_at
  FROM friendships f
  JOIN players p ON p.id = CASE
    WHEN f.requester_id = user_id THEN f.addressee_id
    ELSE f.requester_id
  END
  WHERE (f.requester_id = user_id OR f.addressee_id = user_id)
    AND f.status = 'accepted'
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- -----------------------------------------------------
-- Get Pending Friend Requests
-- -----------------------------------------------------
-- Returns pending friend requests received by a user
CREATE OR REPLACE FUNCTION get_pending_friend_requests(user_id UUID)
RETURNS TABLE (
  request_id UUID,
  requester_id UUID,
  requester_name TEXT,
  requester_email TEXT,
  requester_handicap NUMERIC,
  requester_photo_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS request_id,
    f.requester_id,
    p.name AS requester_name,
    p.email AS requester_email,
    p.handicap AS requester_handicap,
    p.photo_url AS requester_photo_url,
    f.created_at
  FROM friendships f
  JOIN players p ON p.id = f.requester_id
  WHERE f.addressee_id = user_id
    AND f.status = 'pending'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE friendships IS 'Friend relationships between players';
COMMENT ON FUNCTION get_friends IS 'Get all accepted friends for a user with player details';
COMMENT ON FUNCTION get_pending_friend_requests IS 'Get pending friend requests received by a user';
