-- Holes-to-play half of a match-play margin (the "5" in "6 & 5") for organiser
-- manual sub-match results. NULL = went the distance ("X UP"), halved, or not a
-- manually-entered match result. Stored so the margin survives re-finalization.
ALTER TABLE sub_matches
  ADD COLUMN final_holes_remaining SMALLINT
  CHECK (final_holes_remaining IS NULL OR final_holes_remaining BETWEEN 0 AND 17);

COMMENT ON COLUMN sub_matches.final_holes_remaining IS
  'Holes-to-play half of a match-play margin (the "5" in "6 & 5"); set for organiser manual results.';
