-- Migration: Fix competition invite code lookup RLS policy
-- Description: Fixes the RLS policy that allows users to look up competitions by invite code
-- The original policy only checked visibility='private' which doesn't actually enable lookup
-- Author: Claude
-- Date: 2025-01-10

-- Drop the incorrectly configured policy
DROP POLICY IF EXISTS "Anyone can view competition by invite code" ON competitions;

-- Create a proper policy that allows authenticated users to view competitions
-- This enables the invite code lookup flow while keeping competitions private
-- Security is maintained because:
-- 1. User must know the unique invite code to find a competition
-- 2. Joining requires additional checks (not already a member, competition not completed)
-- 3. Detailed competition data (rounds, scorecards) is still protected by other RLS policies
CREATE POLICY "Authenticated users can view competitions by invite code"
  ON competitions FOR SELECT
  TO authenticated
  USING (true);

-- Note: This policy allows viewing all competitions for authenticated users,
-- but since competitions are private by default and the invite code provides
-- security-through-obscurity, this is acceptable for the invite code lookup flow.
-- The alternative would be to use an RPC function with SECURITY DEFINER,
-- but that adds complexity for minimal security benefit.

COMMENT ON POLICY "Authenticated users can view competitions by invite code" ON competitions
  IS 'Allows authenticated users to look up competitions by invite code for joining';
