/**
 * useSubscriptionStatus - Fetch user's subscription status
 *
 * Focused hook for fetching the current user's subscription data.
 * Syncs to Zustand store for offline access.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { subscriptionKeys } from '../queryKeys';
import { useAuth } from '../useAuth';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { mapDBUserSubscription } from '@/types/subscription.types';
import type { UserSubscription as DBUserSubscription } from '@/types/database.types';
import type { UseSubscriptionStatusReturn, SubscriptionTier, UserSubscription } from './types';

/**
 * Hook to fetch the current user's subscription status
 *
 * @returns Subscription status, tier, loading state, and error
 *
 * @example
 * ```tsx
 * const { tier, isLoading } = useSubscriptionStatus();
 * if (tier === 'premium') {
 *   // Show premium features
 * }
 * ```
 */
export function useSubscriptionStatus(): UseSubscriptionStatusReturn {
  const { user, isAuthenticated } = useAuth();
  const setSubscription = useSubscriptionStore((state) => state.setSubscription);

  const {
    data: subscription = null,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!user?.id) return null;

      const { data, error: queryError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (queryError) {
        // PGRST116 = no rows found - user has no subscription yet
        if (queryError.code === 'PGRST116') {
          return null;
        }
        throw new Error(queryError.message);
      }

      return mapDBUserSubscription(data as DBUserSubscription);
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Sync to Zustand store for offline access
  useEffect(() => {
    setSubscription(subscription);
  }, [subscription, setSubscription]);

  const tier: SubscriptionTier = subscription?.tier ?? 'free';

  return {
    subscription,
    tier,
    isLoading,
    isError,
    error: error as Error | null,
  };
}
