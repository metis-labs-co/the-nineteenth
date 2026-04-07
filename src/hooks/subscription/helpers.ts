/**
 * Subscription Helper Hooks
 *
 * Data-fetching hooks for subscription-related functionality.
 * For feature checking, use `useSubscription().checkFeature()` directly
 * or `useCheckFeature()` from SubscriptionContext.
 *
 * @example
 * ```tsx
 * // For checking feature access (preferred)
 * const { checkFeature } = useSubscription();
 * const access = checkFeature('create_competition', { currentCount: 5 });
 *
 * // For getting competition count
 * const { data: count = 0, isLoading } = useCompetitionCount();
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { subscriptionKeys } from '../queryKeys';
import { useAuth } from '../useAuth';
import { CACHE_TIMES } from '@/constants/cacheConfig';

/**
 * Hook: useCompetitionCount
 * Get the count of active competitions owned by the current user
 *
 * @returns Query result with competition count
 *
 * @example
 * ```tsx
 * const { data: count = 0, isLoading } = useCompetitionCount();
 * const { checkFeature } = useSubscription();
 * const access = checkFeature('create_competition', { currentCount: count });
 * ```
 */
export function useCompetitionCount() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: subscriptionKeys.competitionCount(user?.id ?? ''),
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('competitions')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .not('status', 'in', '("completed","cancelled")');

      if (error) {
        return 0;
      }

      return count ?? 0;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: CACHE_TIMES.FREQUENT,
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
