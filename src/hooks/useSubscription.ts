/**
 * useSubscription - Composed Subscription Hook
 *
 * Thin wrapper that composes focused subscription hooks for backward compatibility.
 * For granular control, use the individual hooks from @/hooks/subscription.
 */

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscriptionKeys } from './queryKeys';
import { useSubscriptionStatus } from './subscription/useSubscriptionStatus';
import { useSubscriptionLimits } from './subscription/useSubscriptionLimits';
import { useFeatureGate } from './subscription/useFeatureGate';

export type { FeatureCheckContext, UseSubscriptionReturn } from './subscription/types';
export { useCompetitionCount } from './useSubscriptionHelpers';

export function useSubscription() {
  const queryClient = useQueryClient();
  const status = useSubscriptionStatus();
  const limitsData = useSubscriptionLimits(status.tier);
  const { checkFeature, isSuperAdmin } = useFeatureGate(status.tier, limitsData.limits);

  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() }),
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.allTierLimits() }),
    ]);
  }, [queryClient]);

  return useMemo(() => ({
    subscription: status.subscription,
    limits: limitsData.limits,
    allTierLimits: limitsData.allTierLimits,
    isLoading: status.isLoading || limitsData.isLoading,
    isError: status.isError || limitsData.isError,
    error: status.error ?? limitsData.error ?? null,
    tier: status.tier,
    isPremium: status.tier === 'premium' || status.tier === 'super_admin',
    isSocial: status.tier !== 'free',
    isFree: status.tier === 'free',
    isSuperAdmin,
    checkFeature,
    refresh,
  }), [status, limitsData, isSuperAdmin, checkFeature, refresh]);
}
