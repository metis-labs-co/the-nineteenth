-- Migration: Backfill null handicap_differential on completed scorecards
--
-- Bug: The app's scorecardSync.ts was passing a TeeBox (camelCase: courseRating,
-- slopeRating) to getRatingsForGender() which expects snake_case (course_rating,
-- slope_rating). This property naming mismatch caused getRatingsForGender to
-- always return null, so handicap_differential was never calculated.
--
-- This migration recalculates handicap_differential for all completed scorecards
-- that have a null differential but the round's tee has valid ratings.
--
-- Formula: handicap_differential = ROUND((113 / slope) * (gross - course_rating), 1)

-- Step 1: Backfill using tee_id from selected_tee JSONB (most common case)
-- Handles both round-level and player-level tee selections
WITH affected_scorecards AS (
  SELECT
    sc.id AS scorecard_id,
    sc.player_id,
    sc.total_gross,
    r.id AS round_id,
    r.selected_tee,
    p.gender
  FROM scorecards sc
  JOIN rounds r ON r.id = sc.round_id
  JOIN players p ON p.id = sc.player_id
  WHERE sc.handicap_differential IS NULL
    AND sc.status IN ('completed', 'confirmed')
    AND sc.total_gross > 0
),
-- Try to resolve tee from selected_tee->>'tee_id'
resolved_tees AS (
  SELECT
    asc2.scorecard_id,
    asc2.player_id,
    asc2.total_gross,
    asc2.gender,
    t.slope,
    t.course_rating,
    t.slope_women,
    t.course_rating_women
  FROM affected_scorecards asc2
  JOIN tees t ON t.id = (asc2.selected_tee->>'tee_id')::uuid
  WHERE asc2.selected_tee->>'tee_id' IS NOT NULL
),
-- Calculate differential with gender-aware ratings
calculated AS (
  SELECT
    scorecard_id,
    CASE
      WHEN gender = 'female' AND slope_women > 0 AND course_rating_women > 0
        THEN ROUND((113.0 / slope_women) * (total_gross - course_rating_women), 1)
      WHEN slope > 0 AND course_rating > 0
        THEN ROUND((113.0 / slope) * (total_gross - course_rating), 1)
      ELSE NULL
    END AS handicap_differential,
    CASE
      WHEN gender = 'female' AND slope_women > 0 AND course_rating_women > 0
        THEN course_rating_women
      WHEN slope > 0 AND course_rating > 0
        THEN course_rating
      ELSE NULL
    END AS course_rating_used,
    CASE
      WHEN gender = 'female' AND slope_women > 0 AND course_rating_women > 0
        THEN slope_women
      WHEN slope > 0 AND course_rating > 0
        THEN slope
      ELSE NULL
    END AS slope_rating_used
  FROM resolved_tees
)
UPDATE scorecards sc
SET
  handicap_differential = c.handicap_differential,
  course_rating_used = c.course_rating_used,
  slope_rating_used = c.slope_rating_used
FROM calculated c
WHERE sc.id = c.scorecard_id
  AND c.handicap_differential IS NOT NULL;

-- Step 2: Backfill remaining scorecards by matching tee name/color from selected_tee
-- For cases where selected_tee has no tee_id but has name/color
WITH still_null AS (
  SELECT
    sc.id AS scorecard_id,
    sc.total_gross,
    r.course_id,
    r.selected_tee,
    p.gender
  FROM scorecards sc
  JOIN rounds r ON r.id = sc.round_id
  JOIN players p ON p.id = sc.player_id
  WHERE sc.handicap_differential IS NULL
    AND sc.status IN ('completed', 'confirmed')
    AND sc.total_gross > 0
    AND r.course_id IS NOT NULL
    AND r.selected_tee IS NOT NULL
),
matched_tees AS (
  SELECT
    sn.scorecard_id,
    sn.total_gross,
    sn.gender,
    t.slope,
    t.course_rating,
    t.slope_women,
    t.course_rating_women
  FROM still_null sn
  JOIN tees t ON t.course_id = sn.course_id
    AND (
      LOWER(t.name) = LOWER(sn.selected_tee->>'name')
      OR LOWER(t.color) = LOWER(sn.selected_tee->>'color')
    )
),
calculated2 AS (
  SELECT
    scorecard_id,
    CASE
      WHEN gender = 'female' AND slope_women > 0 AND course_rating_women > 0
        THEN ROUND((113.0 / slope_women) * (total_gross - course_rating_women), 1)
      WHEN slope > 0 AND course_rating > 0
        THEN ROUND((113.0 / slope) * (total_gross - course_rating), 1)
      ELSE NULL
    END AS handicap_differential,
    CASE
      WHEN gender = 'female' AND slope_women > 0 AND course_rating_women > 0
        THEN course_rating_women
      WHEN slope > 0 AND course_rating > 0
        THEN course_rating
      ELSE NULL
    END AS course_rating_used,
    CASE
      WHEN gender = 'female' AND slope_women > 0 AND course_rating_women > 0
        THEN slope_women
      WHEN slope > 0 AND course_rating > 0
        THEN slope
      ELSE NULL
    END AS slope_rating_used
  FROM matched_tees
)
UPDATE scorecards sc
SET
  handicap_differential = c.handicap_differential,
  course_rating_used = c.course_rating_used,
  slope_rating_used = c.slope_rating_used
FROM calculated2 c
WHERE sc.id = c.scorecard_id
  AND c.handicap_differential IS NOT NULL;
