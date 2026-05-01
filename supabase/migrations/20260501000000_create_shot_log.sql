-- =====================================================
-- CREATE SHOT_LOG TABLE
-- Per-shot positions logged by premium-tier solo-round players.
-- Phase C2 of the tiered hole-map roadmap.
-- =====================================================

CREATE TABLE shot_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  hole_number  SMALLINT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sequence     SMALLINT NOT NULL CHECK (sequence > 0),

  latitude     NUMERIC(10, 7) NOT NULL,
  longitude    NUMERIC(10, 7) NOT NULL,
  location     GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
                 ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
               ) STORED,

  -- Reserved nullable columns for v2 (no UI today).
  club_used    TEXT,
  shot_type    TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (round_id, hole_number, player_id, sequence)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX shot_log_round_hole_idx
  ON shot_log (round_id, hole_number, player_id, sequence);

CREATE INDEX shot_log_player_round_idx
  ON shot_log (player_id, round_id);

CREATE INDEX shot_log_location_idx
  ON shot_log USING GIST (location);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE shot_log ENABLE ROW LEVEL SECURITY;

-- Read: own shots, OR any participant on the same round (matches scorecards policy).
CREATE POLICY shot_log_select ON shot_log FOR SELECT
USING (
  auth.uid() = player_id
  OR EXISTS (
    SELECT 1 FROM round_players rp
    WHERE rp.round_id = shot_log.round_id AND rp.player_id = auth.uid()
  )
);

-- Insert: only own shots, only on in-progress rounds.
CREATE POLICY shot_log_insert ON shot_log FOR INSERT
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = shot_log.round_id AND r.status = 'in_progress'
  )
);

-- Update: own shots, in-progress rounds.
CREATE POLICY shot_log_update ON shot_log FOR UPDATE
USING (auth.uid() = player_id)
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = shot_log.round_id AND r.status = 'in_progress'
  )
);

-- Delete: own shots, in-progress rounds.
CREATE POLICY shot_log_delete ON shot_log FOR DELETE
USING (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.id = shot_log.round_id AND r.status = 'in_progress'
  )
);

-- =====================================================
-- SEQUENCE COMPACTION TRIGGER
-- After deletion, renumber remaining shots in the
-- (round, hole, player) group to keep sequences contiguous.
-- =====================================================

CREATE OR REPLACE FUNCTION compact_shot_log_sequence()
RETURNS TRIGGER AS $$
BEGIN
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sequence) AS new_seq
    FROM shot_log
    WHERE round_id = OLD.round_id
      AND hole_number = OLD.hole_number
      AND player_id = OLD.player_id
  )
  UPDATE shot_log
  SET sequence = ranked.new_seq
  FROM ranked
  WHERE shot_log.id = ranked.id
    AND shot_log.sequence != ranked.new_seq;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shot_log_compact_after_delete
  AFTER DELETE ON shot_log
  FOR EACH ROW EXECUTE FUNCTION compact_shot_log_sequence();

-- =====================================================
-- updated_at TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION shot_log_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shot_log_updated_at
  BEFORE UPDATE ON shot_log
  FOR EACH ROW EXECUTE FUNCTION shot_log_set_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE shot_log IS 'Per-shot positions logged by premium-tier solo-round players. One row = one shot, scoped by (round, hole, player, sequence).';
COMMENT ON COLUMN shot_log.sequence IS 'Per-(round, hole, player) shot ordinal, starting at 1. Compacted automatically on delete via trigger.';
COMMENT ON COLUMN shot_log.club_used IS 'Reserved for v2 — currently unused.';
COMMENT ON COLUMN shot_log.shot_type IS 'Reserved for v2 — currently unused.';
