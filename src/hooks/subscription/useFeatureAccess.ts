/**
 * useFeatureAccess - Convenience hook combining subscription status + feature gate
 *
 * Provides a simple `checkAccess(featureId)` API without requiring
 * the caller to wire up tier and limits manually.
 */

import { useSubscriptionStatus } from './useSubscriptionStatus';
import { useSubscriptionLimits } from './useSubscriptionLimits';
import { useFeatureGate } from './useFeatureGate';
import type { FeatureId, FeatureAccess, FeatureCheckContext } from './types';

export function useFeatureAccess() {
  const { tier } = useSubscriptionStatus();
  const { limits } = useSubscriptionLimits(tier);
  const { checkFeature, isSuperAdmin } = useFeatureGate(tier, limits);

  const checkAccess = (featureId: FeatureId, context?: FeatureCheckContext): FeatureAccess =>
    checkFeature(featureId, context);

  return { checkAccess, isSuperAdmin, tier };
}
