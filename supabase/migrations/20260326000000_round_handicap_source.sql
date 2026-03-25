-- Migration: Add handicap_source to rounds table
-- Allows standalone rounds to specify which handicap to use for daily handicap calculations.
-- Competition rounds inherit from their competition's handicap_source.
-- NULL means: use competition's setting (if exists), or default to 'profile'.

ALTER TABLE rounds
ADD COLUMN handicap_source handicap_source DEFAULT NULL;

COMMENT ON COLUMN rounds.handicap_source IS
  'Handicap source override for this round. NULL = inherit from competition or default to profile. Used primarily for standalone rounds.';
