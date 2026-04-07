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
import type { Session } from '@supabase/supabase-js';
import type { Player } from '@/types/database.types';

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
  } = useQuery({
    queryKey: authKeys.player(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Player;
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.STANDARD,
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
    refreshProfile,
  };
}
