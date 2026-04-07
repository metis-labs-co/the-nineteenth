/**
 * Skins Hooks - useCanUseSkins
 *
 * Query hook to check if a user has access to the skins feature
 * based on their subscription tier.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { skinsKeys } from '@/hooks/queryKeys';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

/**
 * Utility hook to check if user can use skins feature
 */
export function useCanUseSkins(userId: string | undefined) {
  return useQuery({
    queryKey: skinsKeys.canUseSkins(userId ?? ''),
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;

      const { data, error } = await supabase.rpc('user_has_feature' as never, {
        p_user_id: userId,
        p_feature: 'skins',
      } as never);

      if (error) {
        console.error('[useCanUseSkins] RPC error:', error);
        return false;
      }

      return data === true;
    },
    enabled: !!userId,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
    retry: 1,
  });
}
