/**
 * useAuthSession - Session Management Hook
 *
 * Handles Supabase auth session state:
 * - Session query with caching
 * - Session refresh
 * - Token retrieval
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { authKeys } from '../queryKeys';
import type { Session } from '@supabase/supabase-js';

/**
 * Hook for session management
 *
 * @returns Session state and utility functions
 */
export function useAuthSession() {
  const queryClient = useQueryClient();

  /**
   * Query: Current session
   * Initial session is populated by onAuthStateChange listener in AuthProvider.
   * This query handles refetches on focus/reconnect.
   */
  const {
    data: session = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: authKeys.session(),
    queryFn: async () => {
      if (__DEV__) {
        console.log('[useAuthSession] Session query executing...');
      }
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[useAuthSession] Error fetching session:', error);
        throw error;
      }

      if (__DEV__) {
        console.log('[useAuthSession] Session query result:', {
          hasSession: !!data.session,
          userId: data.session?.user?.id,
        });
      }
      return data.session;
    },
    initialData: undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  /**
   * Get auth token for API calls
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    return data.session.access_token;
  }, []);

  /**
   * Manually refresh session
   */
  const refreshSession = useCallback(async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('[useAuthSession] Error refreshing session:', error);
      return null;
    }

    // Update cache
    if (data.session) {
      queryClient.setQueryData(authKeys.session(), data.session);
    }

    return data.session;
  }, [queryClient]);

  return {
    session,
    isLoading,
    error,
    getToken,
    refreshSession,
  };
}
