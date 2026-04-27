-- =====================================================
-- Scorecards realtime publication
-- =====================================================
--
-- Adds the `scorecards` table to the `supabase_realtime` publication so
-- clients can subscribe to INSERT/UPDATE/DELETE events on scorecards via
-- Supabase Realtime.
--
-- Used by the View Round, Competition Detail, and Review Scorecard
-- screens (via the `useScorecardsRealtime` hook) to refresh leaderboards
-- the moment a scorecard is submitted, instead of waiting for the
-- 30-second TanStack Query poll.
--
-- Existing RLS policies on `scorecards` already restrict reads to
-- players in the round / pairing — Realtime respects RLS, so no
-- additional policy work is required.

ALTER PUBLICATION supabase_realtime ADD TABLE scorecards;
