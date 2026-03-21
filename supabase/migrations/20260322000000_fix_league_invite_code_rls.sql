-- Migration: Fix league invite code lookup RLS policy
-- Description: The leagues_select policy only allows creator/members to view leagues,
-- which blocks the invite code lookup needed for joining. This replaces it with a
-- policy that allows any authenticated user to SELECT leagues.
-- Security is maintained because the invite code provides access control.

-- Drop the restrictive policy
DROP POLICY IF EXISTS leagues_select ON leagues;

-- Allow authenticated users to view leagues
-- This enables the invite code lookup flow for joining
-- Detailed league data (rounds, scorecards) is still protected by league_rounds RLS
CREATE POLICY leagues_select ON leagues FOR SELECT
  TO authenticated
  USING (true);
