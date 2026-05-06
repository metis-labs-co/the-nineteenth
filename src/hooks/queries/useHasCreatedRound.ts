/**
 * useHasCreatedRound — boolean signal for whether the user has ever created
 * a round of their own (vs. only being added to one by a friend). Used by
 * the home-screen Getting Started card to decide which onboarding tasks
 * remain.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

export const hasCreatedRoundKeys = {
  byUser: (userId: string | undefined) =>
    ['hasCreatedRound', userId ?? 'anon'] as const,
};

export function useHasCreatedRound(userId: string | undefined) {
  return useQuery({
    queryKey: hasCreatedRoundKeys.byUser(userId),
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      const { count, error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase generated types restriction workaround
        .from('rounds') as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!userId,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
  });
}
