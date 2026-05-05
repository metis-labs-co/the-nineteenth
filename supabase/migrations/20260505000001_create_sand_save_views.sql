-- =====================================================
-- SAND-SAVE DERIVATION VIEWS
-- Pure-derived views over shot_log + hole_coordinates.
-- PGA-style: greenside bunker shot, holed within ≤ 1 putt.
-- See: docs/superpowers/specs/2026-05-05-auto-bunker-detection-design.md §6.3
-- =====================================================
-- Both views use security_invoker = true so SELECTs are evaluated under the
-- calling user's RLS (shot_log_select + rounds policies), preventing players
-- from seeing each other's sand-save events via PostgREST.

-- A sand-save attempt: bunker shot whose next shot landed on/near
-- the green (regardless of putts after — includes missed saves).
-- This is the denominator for sand-save %.
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
  sc.id        AS bunker_shot_id,
  sc.round_id,
  sc.hole_number,
  sc.player_id,
  TRUE         AS is_attempt
FROM shot_chain sc
JOIN rounds r        ON r.id = sc.round_id
JOIN green_centers gc
  ON gc.course_id = r.course_id AND gc.hole_number = sc.hole_number
WHERE sc.from_bunker = true
  AND sc.next_location IS NOT NULL
  AND ST_DWithin(sc.next_location, gc.green_location, 10);

COMMENT ON VIEW v_sand_save_attempts IS
  'Sand-save attempts: bunker shot whose next shot reached the green. Denominator for sand-save %. Successful saves are a strict subset.';

-- A successful sand save: an attempt that was holed within 2 strokes
-- of the bunker shot (i.e., bunker → green → ≤ 1 putt, or bunker → hole-out).
-- Defined as a structural filter on v_sand_save_attempts so the
-- "saves ⊂ attempts" invariant holds by construction (not just by test).
CREATE OR REPLACE VIEW v_sand_saves
  WITH (security_invoker = true)
AS
SELECT
  a.bunker_shot_id,
  a.round_id,
  a.hole_number,
  a.player_id,
  TRUE AS is_sand_save
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
  'PGA-style sand saves: bunker shot whose next shot reached the green AND was within 2 strokes of the final stroke. Strict subset of v_sand_save_attempts by construction. One row per save.';
