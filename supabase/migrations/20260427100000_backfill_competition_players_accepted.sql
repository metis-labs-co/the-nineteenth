-- =====================================================
-- Backfill competition_players.status = 'accepted'
-- =====================================================
--
-- The schema permits 'invited' / 'accepted' / 'declined' but no app code
-- path ever creates a row in any state other than 'accepted' (see
-- src/services/api/competitions.ts, AddPlayersBottomSheet, JoinCompetitionScreen).
-- The DB default is also 'accepted'.
--
-- However, ~30 RLS policies and queries gate functionality on
-- `cp.status = 'accepted'`, so any historical row with a different status
-- (created before the default was set, by an old migration, or by a
-- one-off manual insert) becomes invisible to RLS — silently breaking
-- features like per-hole scorecard sync.
--
-- This is a one-time fix to bring those rows into line with the rest of
-- the system. A companion migration relaxes the affected RLS policies so
-- this class of bug can't recur.

UPDATE competition_players
SET status = 'accepted',
    responded_at = COALESCE(responded_at, NOW())
WHERE status IS DISTINCT FROM 'accepted';
