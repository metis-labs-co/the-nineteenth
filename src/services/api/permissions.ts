/**
 * API Permission Functions
 * Functions for checking tier-based permissions
 */

import { supabase } from '@/services/supabase/client';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { isUnlimited } from '@/types/subscription.types';
import type { PermissionCheckResult } from './types';

/**
 * Check if the current user can create a new competition
 * Calls the database function to verify against tier limits
 */
export async function checkCompetitionCreationPermission(): Promise<PermissionCheckResult> {

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      allowed: false,
      error: 'You must be logged in to create a competition',
    };
  }

  // Call database function to check permission
  // Note: Using type assertion because the database function types may not be perfectly aligned
  const { data: canCreate, error: rpcError } = await supabase
    .rpc('user_can_create_competition' as unknown as never, { p_user_id: user.id } as never);


  if (rpcError) {
    console.error('[API] Error checking competition creation permission:', JSON.stringify(rpcError));
    console.error('[API] RPC error code:', rpcError.code, 'hint:', rpcError.hint);
    // Fail open - if we can't check, allow (better UX, DB will still enforce)
    return { allowed: true };
  }

  if (canCreate) {
    return { allowed: true };
  }


  // Get current count and limit for better error message
  const limits = useSubscriptionStore.getState().limits;
  const { count } = await supabase
    .from('competitions')
    .select('*', { count: 'exact', head: true })
    .eq('organizer_id', user.id)
    .not('status', 'in', '("completed","cancelled")');

  const currentCount = count ?? 0;
  const limit = limits?.maxCompetitionsOwned ?? 1;

  return {
    allowed: false,
    error: `You've reached your competition limit (${currentCount}/${limit}). Upgrade your plan to create more competitions.`,
    currentCount,
    limit,
  };
}

/**
 * Validate that an organizer-chosen player slot capacity does not exceed the
 * user's tier limit. NULL/0/unlimited is always allowed.
 */
export function checkMaxPlayersWithinTier(maxPlayers: number | null | undefined): PermissionCheckResult {
  if (maxPlayers == null || maxPlayers <= 0) {
    return { allowed: true };
  }

  const limits = useSubscriptionStore.getState().limits;
  if (!limits) {
    return { allowed: true };
  }

  const tierMax = limits.maxPlayersPerCompetition;
  if (isUnlimited(tierMax)) {
    return { allowed: true, limit: tierMax };
  }

  if (maxPlayers > tierMax) {
    return {
      allowed: false,
      error: `Player limit ${maxPlayers} exceeds your plan's maximum of ${tierMax} players per competition. Upgrade your plan to set a higher limit.`,
      limit: tierMax,
    };
  }

  return { allowed: true, limit: tierMax };
}

/**
 * Check if a round can be added to a competition based on tier limits
 * Uses cached tier limits from the subscription store
 */
export function checkCanAddRound(competitionId: string, currentCount: number): PermissionCheckResult {

  const limits = useSubscriptionStore.getState().limits;

  // If limits aren't loaded yet, allow (fail open)
  if (!limits) {
    return { allowed: true };
  }

  const maxRounds = limits.maxRoundsPerCompetition;

  // Check for unlimited (-1) or no limit (-2 for super admin)
  if (isUnlimited(maxRounds)) {
    return { allowed: true, limit: maxRounds };
  }

  if (currentCount >= maxRounds) {
    return {
      allowed: false,
      error: `You've reached the maximum rounds for this competition (${currentCount}/${maxRounds}). Upgrade your plan to add more rounds.`,
      currentCount,
      limit: maxRounds,
    };
  }

  return {
    allowed: true,
    currentCount,
    limit: maxRounds,
  };
}

/**
 * Check if a player can be added to a competition based on tier limits
 * Uses cached tier limits from the subscription store
 */
export function checkCanAddPlayer(competitionId: string, currentCount: number): PermissionCheckResult {

  const limits = useSubscriptionStore.getState().limits;

  // If limits aren't loaded yet, allow (fail open)
  if (!limits) {
    return { allowed: true };
  }

  const maxPlayers = limits.maxPlayersPerCompetition;

  // Check for unlimited (-1) or no limit (-2 for super admin)
  if (isUnlimited(maxPlayers)) {
    return { allowed: true, limit: maxPlayers };
  }

  if (currentCount >= maxPlayers) {
    return {
      allowed: false,
      error: `You've reached the maximum players for this competition (${currentCount}/${maxPlayers}). Upgrade your plan to add more players.`,
      currentCount,
      limit: maxPlayers,
    };
  }

  return {
    allowed: true,
    currentCount,
    limit: maxPlayers,
  };
}
