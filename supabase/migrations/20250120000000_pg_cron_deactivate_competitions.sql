-- =====================================================
-- pg_cron: Auto-deactivate Expired Event Competitions
-- =====================================================
-- Schedules a daily job to mark event-type competitions as
-- 'completed' when their end_date has passed.
--
-- IMPORTANT: pg_cron must be enabled in Supabase Dashboard first:
-- 1. Go to Database > Extensions
-- 2. Search for "pg_cron"
-- 3. Enable it
--
-- The job runs at 14:00 UTC daily (midnight AEST / 1am AEDT)
-- =====================================================

-- Enable pg_cron extension (if not already enabled via dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role (required for Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the job to run daily at 14:00 UTC (midnight AEST)
-- Job name: 'deactivate-expired-competitions'
SELECT cron.schedule(
  'deactivate-expired-competitions',  -- job name
  '0 14 * * *',                       -- cron expression: daily at 14:00 UTC
  $$SELECT deactivate_expired_competitions()$$
);

-- Add comment for documentation
COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for auto-deactivating expired event competitions';

-- =====================================================
-- Verification & Management Queries (for reference)
-- =====================================================
--
-- View all scheduled jobs:
--   SELECT * FROM cron.job;
--
-- View job run history:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- Manually run the deactivation:
--   SELECT deactivate_expired_competitions();
--
-- Unschedule the job:
--   SELECT cron.unschedule('deactivate-expired-competitions');
--
-- Reschedule for different time (e.g., 3am AEST = 17:00 UTC):
--   SELECT cron.unschedule('deactivate-expired-competitions');
--   SELECT cron.schedule('deactivate-expired-competitions', '0 17 * * *',
--     $$SELECT deactivate_expired_competitions()$$);
--
-- =====================================================
