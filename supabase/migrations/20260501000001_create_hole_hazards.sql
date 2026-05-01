-- =====================================================
-- CREATE HOLE_HAZARDS TABLE
-- Bunker and water polygons for the hole-map view.
-- Phase C1 of the tiered hole-map roadmap.
-- =====================================================

CREATE TABLE hole_hazards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number  SMALLINT NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  hazard_type  TEXT NOT NULL CHECK (hazard_type IN ('bunker', 'water')),
  polygon      GEOGRAPHY(POLYGON, 4326) NOT NULL,
  source       TEXT NOT NULL CHECK (source IN ('golfapi', 'osm', 'manual')),
  external_id  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (course_id, hole_number, hazard_type, external_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX hole_hazards_course_hole_idx
  ON hole_hazards (course_id, hole_number);

CREATE INDEX hole_hazards_polygon_idx
  ON hole_hazards USING GIST (polygon);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE hole_hazards ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read hazards (course data is shared).
CREATE POLICY hole_hazards_select ON hole_hazards FOR SELECT
USING (auth.role() = 'authenticated');

-- Inserts/updates/deletes only via service-role backfill.
-- No client-facing INSERT/UPDATE/DELETE policies are created.

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE hole_hazards IS 'Bunker and water polygons used by the hole-map view (Premium tier feature). Populated by service-role backfill from GolfAPI.io extended endpoint or OSM Overpass.';
COMMENT ON COLUMN hole_hazards.external_id IS 'Upstream feature identifier (GolfAPI feature id, OSM way/relation id) for de-dupe on backfill replays.';
