-- Migration: Fix incorrect total_points and total_net for Stableford scorecards
--
-- Bug: The app was writing total_points = totalNet (which for Stableford was
-- calculated using the raw WHS handicap instead of the daily handicap adjusted
-- for course slope/rating). This caused the round list card to show incorrect
-- Stableford points while the scorecard tab (which recalculates client-side
-- using daily handicap) showed the correct values.
--
-- This migration recalculates total_points for all completed Stableford
-- scorecards using the daily_handicap_used and hole data from the course.
-- It also fixes total_net which was incorrectly set to Stableford points
-- instead of the actual net score (gross - daily handicap).

-- Step 1: Create a function to calculate Stableford points for a scorecard
CREATE OR REPLACE FUNCTION calculate_stableford_points(
  p_scores JSONB,
  p_holes JSONB,
  p_daily_handicap INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER := 0;
  hole JSONB;
  hole_number TEXT;
  hole_score JSONB;
  strokes INTEGER;
  par INTEGER;
  stroke_index INTEGER;
  base_strokes INTEGER;
  additional_stroke INTEGER;
  strokes_received INTEGER;
  net_strokes INTEGER;
  relative_to_par INTEGER;
  hole_points INTEGER;
BEGIN
  -- Guard against null inputs
  IF p_scores IS NULL OR p_holes IS NULL OR p_daily_handicap IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate strokes received base
  base_strokes := FLOOR(p_daily_handicap::NUMERIC / 18);

  -- Iterate through each hole in the course
  FOR hole IN SELECT * FROM jsonb_array_elements(p_holes)
  LOOP
    hole_number := (hole->>'number')::TEXT;
    par := (hole->>'par')::INTEGER;
    stroke_index := (hole->>'strokeIndex')::INTEGER;

    -- Get the score for this hole
    hole_score := p_scores->hole_number;
    IF hole_score IS NULL THEN
      CONTINUE;
    END IF;

    -- Get strokes (handle both single-ball and multi-ball formats)
    strokes := (hole_score->>'strokes')::INTEGER;
    IF strokes IS NULL OR strokes <= 0 THEN
      CONTINUE;
    END IF;

    -- Calculate strokes received for this hole
    IF stroke_index <= (p_daily_handicap % 18) THEN
      additional_stroke := 1;
    ELSE
      additional_stroke := 0;
    END IF;
    strokes_received := base_strokes + additional_stroke;

    -- Calculate net strokes and Stableford points
    net_strokes := strokes - strokes_received;
    relative_to_par := net_strokes - par;

    -- Stableford points scale (extended with albatross)
    IF relative_to_par <= -3 THEN
      hole_points := 5;  -- Albatross or better
    ELSIF relative_to_par = -2 THEN
      hole_points := 4;  -- Eagle
    ELSIF relative_to_par = -1 THEN
      hole_points := 3;  -- Birdie
    ELSIF relative_to_par = 0 THEN
      hole_points := 2;  -- Par
    ELSIF relative_to_par = 1 THEN
      hole_points := 1;  -- Bogey
    ELSE
      hole_points := 0;  -- Double bogey or worse
    END IF;

    total_points := total_points + hole_points;
  END LOOP;

  RETURN total_points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Update total_points and total_net for all completed Stableford scorecards
UPDATE scorecards sc
SET
  total_points = calculate_stableford_points(sc.scores, c.holes, sc.daily_handicap_used),
  total_net = sc.total_gross - COALESCE(sc.daily_handicap_used, 0)
FROM rounds r
JOIN courses c ON c.id = r.course_id
WHERE sc.round_id = r.id
  AND r.game_type = 'stableford'
  AND sc.status IN ('completed', 'confirmed')
  AND sc.daily_handicap_used IS NOT NULL
  AND c.holes IS NOT NULL
  AND jsonb_array_length(c.holes) > 0;

-- Step 3: Drop the helper function (not needed at runtime)
DROP FUNCTION IF EXISTS calculate_stableford_points(JSONB, JSONB, INTEGER);
