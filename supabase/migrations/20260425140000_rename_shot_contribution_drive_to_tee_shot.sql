-- Migration: Rename shot contribution `drive` -> `teeShot`
--
-- Scramble shot contributions stored in `scorecards.scores` (JSONB) historically
-- used the key `drive` for the tee shot contributor. We're renaming it to
-- `teeShot` to match the new vocabulary (par 3 = tee shot, par 4 = tee shot,
-- par 5 = tee shot + second shot + approach).
--
-- For every scorecard whose `scores` JSON references the old `drive` key:
--   - rebuild the scores object hole-by-hole,
--   - for each hole whose `shotContributions` contains `drive`, copy that
--     value to `teeShot` and drop the `drive` key.

UPDATE scorecards
SET scores = (
  SELECT jsonb_object_agg(
    hole_key,
    CASE
      WHEN hole_value -> 'shotContributions' ? 'drive' THEN
        jsonb_set(
          hole_value,
          '{shotContributions}',
          (hole_value -> 'shotContributions') - 'drive'
            || jsonb_build_object('teeShot', hole_value -> 'shotContributions' -> 'drive')
        )
      ELSE hole_value
    END
  )
  FROM jsonb_each(scores) AS s(hole_key, hole_value)
)
WHERE scores::text LIKE '%"drive"%';
