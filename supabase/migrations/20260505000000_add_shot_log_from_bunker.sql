-- =====================================================
-- ADD from_bunker TO shot_log + DETECTION TRIGGER
-- Auto-tag shots whose GPS origin lies inside a
-- hole_hazards bunker polygon for the same course+hole.
-- See: docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md
-- =====================================================

ALTER TABLE shot_log
  ADD COLUMN from_bunker BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN shot_log.from_bunker IS
  'True when the shot origin GPS point lies inside a hole_hazards bunker polygon for this round''s course+hole. Set automatically by the shot_log_detect_bunker BEFORE INSERT trigger.';

-- =====================================================
-- DETECTION TRIGGER FUNCTION
-- SECURITY DEFINER so it can read hole_hazards even
-- though hole_hazards has no client-facing INSERT/SELECT
-- escalation surface — this trigger only reads.
-- =====================================================

CREATE OR REPLACE FUNCTION shot_log_detect_bunker()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_course_id UUID;
BEGIN
  -- Resolve course via the round. Standalone rounds without a course are no-ops.
  SELECT course_id INTO v_course_id FROM rounds WHERE id = NEW.round_id;
  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM hole_hazards
    WHERE course_id   = v_course_id
      AND hole_number = NEW.hole_number
      AND hazard_type = 'bunker'
      AND ST_Covers(
            polygon,
            ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography
          )
    LIMIT 1
  ) THEN
    NEW.from_bunker := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER shot_log_detect_bunker_before_insert
  BEFORE INSERT ON shot_log
  FOR EACH ROW
  EXECUTE FUNCTION shot_log_detect_bunker();
