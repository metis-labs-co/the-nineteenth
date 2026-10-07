/**
 * useAuthUser - User Profile Hook
 *
 * Handles fetching user and player profile data:
 * - Supabase auth user
 * - Player profile from players table
 * - Profile refresh
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import { authKeys } from '../queryKeys';
import { fetchMyPlayer } from './utils';
import type { Session } from '@supabase/supabase-js';
import type { Player } from '@/types/database.types';

/**
 * Fetch a player profile by id.
 *
 * Returns `null` ONLY when the row genuinely does not exist (maybeSingle yields
 * no row and no error) — that is a real "new user → onboarding" signal. Any
 * other failure (network / timeout / RLS / transient) THROWS, so React Query
 * retries it and callers can tell "fetch failed" apart from "no account".
 *
 * Extracted (and exported) so this branch is unit-testable without React Query:
 * the previous inline version swallowed every error to `null`, which the
 * onboarding gate misread as "no account" and used to drop real, signed-in
 * users into onboarding on a single cold-start blip.
 */
export async function fetchPlayerProfile(userId: string): Promise<Player | null> {
  // Own row only: private columns are readable solely via get_my_player
  const player = await fetchMyPlayer();
  if (player && player.id !== userId) return null;
  return player;
}

/**
 * Hook for user and player profile data
 *
 * @param session - Current auth session (from useAuthSession)
 * @returns User and player data with loading states
 */
export function useAuthUser(session: Session | null) {
  const queryClient = useQueryClient();

  /**
   * Query: Current user from Supabase Auth
   * Only fetches if session exists
   */
  const {
    data: user = null,
    isLoading: isLoadingUser,
  } = useQuery({
    queryKey: authKeys.user(),
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      return data.user;
    },
    enabled: !!session,
    staleTime: CACHE_TIMES.STANDARD,
    refetchOnMount: 'always',
  });

  /**
   * Query: Player profile from players table
   * Fetches extended player data
   * Only fetches if user exists
   */
  const {
    data: player = null,
    isLoading: isLoadingPlayer,
    isError: isPlayerError,
  } = useQuery({
    queryKey: authKeys.player(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return null;
      return fetchPlayerProfile(user.id);
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.STANDARD,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  /**
   * Manually refresh player profile
   */
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;

    await queryClient.invalidateQueries({
      queryKey: authKeys.player(user.id),
    });
  }, [user?.id, queryClient]);

  return {
    user,
    player,
    isLoadingUser,
    isLoadingPlayer,
    isLoading: isLoadingUser || isLoadingPlayer,
    /** True when the player-profile fetch failed (vs. a genuinely absent row). */
    isPlayerError,
    refreshProfile,
  };
}
