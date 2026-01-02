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
      if (__DEV__) {
        console.log('[useAuthUser] User query executing...');
      }
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error('[useAuthUser] Error fetching user:', error);
        throw error;
      }

      if (__DEV__) {
        console.log('[useAuthUser] User query result:', {
          hasUser: !!data.user,
          userId: data.user?.id,
        });
      }
      return data.user;
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
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
      if (__DEV__) {
        console.log('[useAuthUser] Player query executing for userId:', user?.id);
      }
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        if (error) {
          console.error('[useAuthUser] Error fetching player profile:', error);
        }
        return null;
      }

      const playerData = data as Player;
      if (__DEV__) {
        console.log('[useAuthUser] Player query result:', {
          playerId: playerData.id,
          handicap: playerData.handicap,
        });
      }
      return playerData;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
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
