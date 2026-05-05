-- =====================================================
-- ADD course_id PROJECTION TO SAND-SAVE VIEWS
-- Allows course-scoped filtering for CourseStatisticsScreen
-- (V2 follow-up). Views already join 'rounds' for the
-- green_centers lookup, so course_id is in scope without
-- additional joins.
--
-- NOTE: course_id is appended to the END of each view's
-- SELECT list. CREATE OR REPLACE VIEW in Postgres rejects
-- changes that alter the column list in a way that breaks
-- consumers (e.g. inserting columns mid-list). Appending
-- new columns at the end is safe.
--
-- See: docs/superpowers/plans/2026-05-05-auto-bunker-detection-v2.md A2
-- =====================================================

CREATE OR REPLACE VIEW v_sand_save_attempts
  WITH (security_invoker = true)
AS
WITH shot_chain AS (
  SELECT
    s.id,
    s.round_id,
    s.hole_number,
    s.player_id,
    s.sequence,
    s.from_bunker,
    LEAD(s.location, 1) OVER (
      PARTITION BY s.round_id, s.hole_number, s.player_id ORDER BY s.sequence
    ) AS next_location
  FROM shot_log s
),
green_centers AS (
  SELECT course_id, hole_number, location AS green_location
  FROM hole_coordinates
  WHERE poi_type = 'green_center'
)
SELECT
  sc.id          AS bunker_shot_id,
  sc.round_id,
  sc.hole_number,
  sc.player_id,
  TRUE           AS is_attempt,
  r.course_id
FROM shot_chain sc
JOIN rounds r        ON r.id = sc.round_id
JOIN green_centers gc
  ON gc.course_id = r.course_id AND gc.hole_number = sc.hole_number
WHERE sc.from_bunker = true
  AND sc.next_location IS NOT NULL
  AND ST_DWithin(sc.next_location, gc.green_location, 10);

COMMENT ON VIEW v_sand_save_attempts IS
  'Sand-save attempts: bunker shot whose next shot reached the green. Denominator for sand-save %. Successful saves are a strict subset.';

CREATE OR REPLACE VIEW v_sand_saves
  WITH (security_invoker = true)
AS
SELECT
  a.bunker_shot_id,
  a.round_id,
  a.hole_number,
  a.player_id,
  TRUE AS is_sand_save,
  a.course_id
FROM v_sand_save_attempts a
JOIN shot_log s ON s.id = a.bunker_shot_id
WHERE (
  SELECT COUNT(*)
  FROM shot_log s2
  WHERE s2.round_id    = a.round_id
    AND s2.hole_number = a.hole_number
    AND s2.player_id   = a.player_id
) - s.sequence <= 2;

COMMENT ON VIEW v_sand_saves IS
  'PGA-style sand saves: bunker shot whose next shot reached the green AND was within 2 strokes of the final stroke. One row per save.';
