/**
 * Push Notifications Hooks - Query Hooks
 *
 * Lightweight TanStack Query hooks for push notification data.
 *
 * Hooks:
 * - usePushPermissionStatus: Get current permission status
 * - usePushPreferences: Get user's push preferences
 * - useIsPushRegistered: Check if user has registered push notifications
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { pushService, type PermissionStatus } from '@/services/notifications';
import { pushKeys } from '@/hooks/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { CACHE_TIMES } from '@/constants/cacheConfig';
import { STALE_TIME } from './types';
import type { PushPreferences } from '@/types/push.types';

// =====================================================
// DATABASE TYPES
// =====================================================

type PushPrefsRow = {
  push_enabled: boolean;
  push_competition_updates: boolean;
  push_friend_requests: boolean;
  push_scorecard_updates: boolean;
  push_league_updates: boolean;
  push_side_game_updates: boolean;
  push_round_reminders: boolean;
};

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Hook: usePushPermissionStatus
 * Lightweight hook for accessing only permission status
 */
export function usePushPermissionStatus() {
  const { data: permissionStatus, isLoading } = useQuery({
    queryKey: pushKeys.permissionStatus(),
    queryFn: async (): Promise<PermissionStatus> => {
      return pushService.getPermissionStatus();
    },
    staleTime: CACHE_TIMES.FREQUENT,
  });

  return { permissionStatus, isLoading };
}

/**
 * Hook: usePushPreferences
 * Lightweight hook for accessing only push preferences
 */
export function usePushPreferences(userId: string) {
  const { data: preferences, isLoading } = useQuery({
    queryKey: pushKeys.preferences(userId),
    queryFn: async (): Promise<PushPreferences | null> => {
      if (!userId) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await (supabase as any)
        .from('user_preferences')
        .select(
          'push_enabled, push_competition_updates, push_friend_requests, push_scorecard_updates, push_league_updates, push_side_game_updates, push_round_reminders'
        )
        .eq('user_id', userId)
        .maybeSingle()) as { data: PushPrefsRow | null; error: Error | null };

      if (error || !data) return null;

      return {
        pushEnabled: data.push_enabled,
        pushCompetitionUpdates: data.push_competition_updates,
        pushFriendRequests: data.push_friend_requests,
        pushScorecardUpdates: data.push_scorecard_updates,
        pushLeagueUpdates: data.push_league_updates,
        pushSideGameUpdates: data.push_side_game_updates,
        pushRoundReminders: data.push_round_reminders,
      };
    },
    enabled: !!userId,
    staleTime: STALE_TIME,
  });

  return { preferences, isLoading };
}

/**
 * Hook: useIsPushRegistered
 * Lightweight hook to check if user has registered push notifications
 */
export function useIsPushRegistered() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data: tokens, isLoading } = useQuery({
    queryKey: pushKeys.tokens(userId),
    queryFn: async (): Promise<number> => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('push_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('enabled', true);

      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: STALE_TIME,
  });

  return {
    isRegistered: (tokens ?? 0) > 0,
    isLoading,
  };
}
