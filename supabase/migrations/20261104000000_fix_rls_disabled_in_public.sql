-- Migration: fix_rls_disabled_in_public
-- Description: Fix Supabase linter rls_disabled_in_public (ERROR) on
--   public.tee_time_reminder_sent. Created in 20260422000000 without RLS,
--   so anon/authenticated could read, insert, update and delete it via
--   PostgREST (deleting rows would re-trigger tee-time reminder pushes).
--
-- Only send_tee_time_reminders() touches this table. It is SECURITY DEFINER
-- and owned by postgres, which also owns the table, so RLS does not apply to
-- it (no FORCE ROW LEVEL SECURITY). No policies are added: the table is not
-- meant to be reachable through the API.
-- Date: 2026-11-04

ALTER TABLE public.tee_time_reminder_sent ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tee_time_reminder_sent FROM anon, authenticated;

-- =====================================================
-- Ad-hoc backup tables -> private, non-API schema
-- =====================================================
-- backup_scorecards_cc183cb9_sm1/_sm2 were hand-created on PROD (not by a
-- migration) and sat in public with no RLS. Move them to ops_backups, which
-- PostgREST does not expose. Use ops_backups for future manual backups too.
-- Guarded so it is a no-op on staging/local where the tables don't exist.

CREATE SCHEMA IF NOT EXISTS ops_backups;
REVOKE ALL ON SCHEMA ops_backups FROM PUBLIC, anon, authenticated;
COMMENT ON SCHEMA ops_backups IS
  'Manual backup/rollback tables. Not exposed via the API. Never add to PostgREST exposed schemas.';

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['backup_scorecards_cc183cb9_sm1', 'backup_scorecards_cc183cb9_sm2']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA ops_backups', t);
      EXECUTE format('REVOKE ALL ON ops_backups.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
