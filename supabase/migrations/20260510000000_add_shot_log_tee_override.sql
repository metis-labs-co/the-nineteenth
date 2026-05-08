-- =====================================================
-- ADD shot_log.tee_override
-- Stores the player's tee origin choice for shot 1, so it
-- follows the user across devices (was previously local-only
-- in the AsyncStorage-backed teeOverrideStore).
-- =====================================================

ALTER TABLE shot_log
  ADD COLUMN tee_override TEXT NULL;

COMMENT ON COLUMN shot_log.tee_override IS
  'Tee origin chosen by the player for shot 1: ''back'' / ''front'' / a custom_hole_tees.id UUID. NULL = no override (use default tee). Only meaningful on rows where sequence = 1; ignored elsewhere.';
