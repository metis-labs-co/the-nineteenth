-- Competition notification emission flags - catalog verification.
-- Run after migrations 20260727000000 through 20260727000002.

DO $$
DECLARE
  reminder_definition TEXT;
  completion_definition TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'competitions'
      AND column_name = 'round_reminders_enabled'
      AND is_nullable = 'NO'
      AND column_default = 'true'
  ) THEN
    RAISE EXCEPTION 'round_reminders_enabled is missing or has the wrong default/nullability';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'competitions'
      AND column_name = 'results_summary_enabled'
      AND is_nullable = 'NO'
      AND column_default = 'true'
  ) THEN
    RAISE EXCEPTION 'results_summary_enabled is missing or has the wrong default/nullability';
  END IF;

  SELECT pg_get_functiondef(p.oid)
  INTO reminder_definition
  FROM pg_proc p
  WHERE p.proname = 'send_tee_time_reminders'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF reminder_definition NOT LIKE '%r.deleted_at IS NULL%'
    OR reminder_definition NOT LIKE '%comp.round_reminders_enabled IS NOT FALSE%'
    OR reminder_definition NOT LIKE '%cr.competition_id IS NULL%'
  THEN
    RAISE EXCEPTION 'send_tee_time_reminders lost a required guard or standalone path';
  END IF;

  SELECT pg_get_functiondef(p.oid)
  INTO completion_definition
  FROM pg_proc p
  WHERE p.proname = 'notify_round_completed'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF completion_definition NOT LIKE '%SET completion_notified = TRUE%'
    OR completion_definition NOT LIKE '%c.results_summary_enabled = FALSE%'
    OR completion_definition NOT LIKE '%IF v_competition_id IS NULL%'
  THEN
    RAISE EXCEPTION 'notify_round_completed lost its claim, gate, or standalone path';
  END IF;
END;
$$;
