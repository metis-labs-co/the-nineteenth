-- True when an organiser set the sub-match result by hand. A manual result
-- takes precedence over hole-by-hole scoring in the display and tally, and the
-- scoring flow must not overwrite it.
ALTER TABLE sub_matches
  ADD COLUMN manual_result BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN sub_matches.manual_result IS
  'True when the result was set manually by an organiser; takes precedence over hole-score computation and is not overwritten by the scoring flow.';
