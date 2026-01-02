/**
 * useSubscriptionLimits - Fetch and manage tier limits
 *
 * Focused hook for fetching tier limits configuration.
 * Provides limits for the current user's tier and all tiers for comparison.
 */

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { subscriptionKeys } from '../queryKeys';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { mapDBTierLimits } from '@/types/subscription.types';
import type { TierLimits as DBTierLimits } from '@/types/database.types';
import type { UseSubscriptionLimitsReturn, SubscriptionTier, TierLimits } from './types';

/**
 * Hook to fetch tier limits configuration
 *
 * @param tier - The user's current tier to get limits for
 * @returns Limits for current tier, all tier limits, loading state, and error
 *
 * @example
 * ```tsx
 * const { limits, allTierLimits } = useSubscriptionLimits('social');
 * console.log(limits.maxCompetitionsOwned); // 8
 * ```
 */
export function useSubscriptionLimits(tier: SubscriptionTier = 'free'): UseSubscriptionLimitsReturn {
  const setLimits = useSubscriptionStore((state) => state.setLimits);
  const setAllTierLimits = useSubscriptionStore((state) => state.setAllTierLimits);
  const setLoading = useSubscriptionStore((state) => state.setLoading);

  const {
    data: allTierLimits = null,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: subscriptionKeys.allTierLimits(),
    queryFn: async (): Promise<Record<SubscriptionTier, TierLimits>> => {
      const { data, error: queryError } = await supabase
        .from('tier_limits')
        .select('*')
        .order('tier');

      if (queryError) {
        throw new Error(queryError.message);
      }

      // Transform array to Record keyed by tier
      const limitsMap: Record<SubscriptionTier, TierLimits> = {} as Record<
        SubscriptionTier,
        TierLimits
      >;

      for (const row of data as DBTierLimits[]) {
        const mapped = mapDBTierLimits(row);
        limitsMap[mapped.tier] = mapped;
      }

      return limitsMap;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Get limits for current tier
  const limits = useMemo(() => {
    if (!allTierLimits) return null;
    return allTierLimits[tier] ?? null;
  }, [allTierLimits, tier]);

  // Sync limits to Zustand store
  useEffect(() => {
    setLimits(limits);
  }, [limits, setLimits]);

  // Sync all tier limits to Zustand store
  useEffect(() => {
    setAllTierLimits(allTierLimits);
  }, [allTierLimits, setAllTierLimits]);

  // Update loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  return {
    limits,
    allTierLimits,
    isLoading,
    isError,
    error: error as Error | null,
  };
}
