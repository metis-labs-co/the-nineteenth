-- =====================================================
-- CREATE PLAYER_BAG TABLE
-- Per-user "What's in the Bag" — list of clubs the player carries.
-- Used as the source list when picking a club for a logged shot.
-- =====================================================

CREATE TABLE player_bag (
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  club_key   TEXT NOT NULL,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, club_key)
);

CREATE INDEX player_bag_player_idx ON player_bag (player_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE player_bag ENABLE ROW LEVEL SECURITY;

-- Read: own bag only.
CREATE POLICY player_bag_select ON player_bag FOR SELECT
USING (auth.uid() = player_id);

-- Insert: only own rows.
CREATE POLICY player_bag_insert ON player_bag FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- Delete: only own rows. (No update — bag changes are insert/delete only.)
CREATE POLICY player_bag_delete ON player_bag FOR DELETE
USING (auth.uid() = player_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE player_bag IS 'Per-user list of clubs in the bag. Acts as the source list when picking a club for a logged shot. Soft cap of 14 enforced in app.';
COMMENT ON COLUMN player_bag.club_key IS 'Canonical club key (see src/constants/clubs.ts). e.g. "driver", "7-iron", "putter".';
