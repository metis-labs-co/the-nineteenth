-- Organizer-controlled competition-wide notification emission flags.
-- Defaults preserve existing notification behaviour.

ALTER TABLE competitions
  ADD COLUMN round_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN results_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN competitions.round_reminders_enabled IS
  'When false, this competition emits no tee-time reminder notification (in-app or push).';

COMMENT ON COLUMN competitions.results_summary_enabled IS
  'When false, this competition emits no round-completed notification (in-app or push).';
