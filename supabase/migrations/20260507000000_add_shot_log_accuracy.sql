-- =====================================================
-- ADD accuracy_meters TO shot_log
-- Persist the GPS-reported accuracy for each logged
-- shot so the UI can flag low-confidence positions and
-- the user can revisit them with the move-on-map flow.
-- See: docs/superpowers/specs/2026-05-07-shot-edit-and-gps-accuracy-design.md
-- =====================================================

ALTER TABLE shot_log
  ADD COLUMN accuracy_meters DECIMAL NULL;

COMMENT ON COLUMN shot_log.accuracy_meters IS
  'Reported GPS accuracy in metres at log time, from expo-location getCurrentPositionAsync. NULL for legacy rows and for rows whose position has been manually overridden via the move-on-map flow (overrides are user-trusted).';
