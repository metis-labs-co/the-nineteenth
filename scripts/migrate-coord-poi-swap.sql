-- =====================================================================
-- One-shot migration: swap mis-labelled poi_type values in
-- hole_coordinates after correcting the GolfAPI.io transformer.
--
-- BACKGROUND
-- The GolfAPI.io coordinate `poi` codes were originally read as
-- 1=Tee, 11=GreenFront, 12=GreenCenter. On-course testing
-- (Cobram-Barooga Old Course among others) showed every coord
-- was landing on the wrong end of the hole. The codes are actually
-- inverted from the labels in the API docs:
--   poi=1   carries GREEN positions (loc 1/2/3 = front/center/back)
--   poi=11  carries TEE_FRONT
--   poi=12  carries TEE_BACK
-- See src/services/api/golfApiTransformers.ts:mapPoiToPoiType
-- for the corrected mapping. Tests have been updated to match.
--
-- WHAT THIS SCRIPT DOES
-- Renames every existing hole_coordinates row from the old
-- (wrong) poi_type to the new (correct) poi_type:
--   tee_back     → green_back     (was poi=1 loc=3)
--   tee_front    → green_center   (was poi=1 loc=1 OR loc=2; best guess)
--   green_front  → tee_front      (was poi=11)
--   green_center → tee_back       (was poi=12)
--
-- KNOWN LIMITATION
-- The old `tee_front` poi_type was overloaded — it could have come from
-- API location=1 (true green_front) OR location=2 (true green_center).
-- Both got squashed into one DB row. After this migration, every old
-- `tee_front` becomes `green_center`, which prioritises distance-to-pin
-- correctness (green_center is what DistanceToPin uses). Some holes will
-- be off by ~5-10m as a result — typically the spread of a tee box.
--
-- For pixel-perfect data, re-ingest each course after the migration:
--   pnpm tsx scripts/seed-featured-coordinates.ts --force
-- (the new transformer mapping in that script is already correct).
--
-- HOW THE SWAP IS DONE
-- The poi_type column has both a CHECK constraint (only the 5 enum
-- values are permitted) and a UNIQUE constraint on
-- (course_id, hole_number, poi_type). Together they rule out the usual
-- "rename to sentinel, then back" trick. Instead we do four ordered
-- in-place renames where each step only writes to a poi_type that the
-- previous step has just emptied — so no two rows ever share a
-- (course_id, hole_number, poi_type) tuple mid-flight.
--
-- Required order:
--   1. tee_back     → green_back     (must run first; assumes no
--                                     pre-existing green_back rows)
--   2. green_center → tee_back       (frees the green_center slot AND
--                                     fills the now-empty tee_back slot)
--   3. tee_front    → green_center   (fills the just-freed green_center)
--   4. green_front  → tee_front      (fills the just-freed tee_front)
--
-- SAFETY
-- - Idempotent: re-running has no further effect because the source
--   poi_types in each step are already empty.
-- - The pre-flight `green_back` collision check halts the whole
--   transaction if any pre-existing green_back rows would conflict.
-- - Run against staging first, verify the in-app map, then run on prod.
-- =====================================================================

BEGIN;

-- BEFORE counts so you can sanity-check after.
SELECT poi_type, COUNT(*) AS rows
FROM hole_coordinates
GROUP BY poi_type
ORDER BY poi_type;

-- Pre-flight: step 1 (tee_back → green_back) requires that no
-- (course_id, hole_number) currently has BOTH tee_back and green_back.
-- If any such conflicts exist, fail loudly so they can be reviewed
-- manually instead of silently dropping data.
DO $$
DECLARE
  conflict_count integer;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM hole_coordinates a
  JOIN hole_coordinates b
    ON a.course_id = b.course_id
   AND a.hole_number = b.hole_number
  WHERE a.poi_type = 'tee_back'
    AND b.poi_type = 'green_back';

  IF conflict_count > 0 THEN
    RAISE EXCEPTION
      'Aborting: % (course_id, hole_number) pairs already have both tee_back and green_back rows. Resolve manually before running this migration.',
      conflict_count;
  END IF;
END $$;

-- Step 1: tee_back → green_back
UPDATE hole_coordinates SET poi_type = 'green_back'
WHERE poi_type = 'tee_back';

-- Step 2: green_center → tee_back
UPDATE hole_coordinates SET poi_type = 'tee_back'
WHERE poi_type = 'green_center';

-- Step 3: tee_front → green_center
UPDATE hole_coordinates SET poi_type = 'green_center'
WHERE poi_type = 'tee_front';

-- Step 4: green_front → tee_front
UPDATE hole_coordinates SET poi_type = 'tee_front'
WHERE poi_type = 'green_front';

-- AFTER counts. The post-migration totals per poi_type should match
-- the pre-migration totals but moved across labels:
--   BEFORE tee_back     COUNT == AFTER green_back   COUNT
--   BEFORE green_center COUNT == AFTER tee_back     COUNT
--   BEFORE tee_front    COUNT == AFTER green_center COUNT
--   BEFORE green_front  COUNT == AFTER tee_front    COUNT
SELECT poi_type, COUNT(*) AS rows
FROM hole_coordinates
GROUP BY poi_type
ORDER BY poi_type;

-- Eyeball a known course (Cobram-Barooga Old Course, holes 1-3) to
-- sanity-check the swap. Distance from tee_back to green_center should
-- be a sensible hole length (250-500m) AND green_center should land on
-- the actual green when pasted into Google Maps.
SELECT
  c.name AS course,
  hc.hole_number,
  hc.poi_type,
  hc.latitude,
  hc.longitude
FROM hole_coordinates hc
JOIN courses c ON c.id = hc.course_id
JOIN clubs cl ON cl.id = c.club_id
WHERE cl.name ILIKE '%Cobram%'
  AND c.name ILIKE '%Old%'
  AND hc.hole_number <= 3
ORDER BY hc.hole_number, hc.poi_type;

-- COMMIT is the default — Supabase's SQL Editor closes the connection
-- at the end of each "Run" and rolls back any open transaction unless
-- explicitly committed. If the eyeball check above looks WRONG, change
-- this to `ROLLBACK;` instead and re-run.
COMMIT;
