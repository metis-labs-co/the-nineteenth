-- Display offset for hole numbers on combo/cross-nine courses.
--
-- Some 27- and 36-hole facilities expose 18-hole "combo" courses where the
-- holes are signed using the parent facility's numbering (e.g. Yering
-- Meadows' Valley course is the second + third nines, signed 10..27).
-- Internally we keep `holes.number` as 1..18 so scoring keys, sync payloads
-- and stroke-index lookups stay simple — `start_hole` is purely an offset
-- applied at render time:
--
--     displayedHoleNumber = hole.number + start_hole - 1
--
-- 1 (default) preserves today's behaviour: holes display as 1..18.
ALTER TABLE courses
  ADD COLUMN start_hole INT NOT NULL DEFAULT 1
  CHECK (start_hole BETWEEN 1 AND 90);

COMMENT ON COLUMN courses.start_hole IS
  'Display offset for hole numbers. 1 = standard 1..18. 10 = combo course '
  'starting at facility hole 10 (e.g. Valley/Lake at a 27-hole facility, '
  'displaying 10..27). Internal hole.number stays 1..18.';
