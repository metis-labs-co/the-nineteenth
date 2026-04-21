/**
 * useFeatureGate - Feature access checking
 *
 * Focused hook for checking if features are available to the user.
 * Uses validators for pure logic.
 */

import { useCallback } from 'react';
import {
  validateFeatureAccess,
  createSuperAdminAccess,
  createDefaultAccess,
} from './validators';
import type {
  UseFeatureGateReturn,
  FeatureId,
  FeatureAccess,
  FeatureCheckContext,
  TierLimits,
  SubscriptionTier,
} from './types';

/**
 * Hook to check feature access based on subscription tier
 *
 * @param tier - The user's current tier
 * @param limits - The limits for the user's tier
 * @returns checkFeature function and isSuperAdmin flag
 *
 * @example
 * ```tsx
 * const { checkFeature, isSuperAdmin } = useFeatureGate('premium', limits);
 * const access = checkFeature('create_competition', { currentCount: 5 });
 * if (!access.allowed) {
 *   showUpgradePrompt(access.reason);
 * }
 * ```
 */
export function useFeatureGate(
  tier: SubscriptionTier,
  limits: TierLimits | null
): UseFeatureGateReturn {
  // Developer sits above super_admin in the hierarchy and inherits its bypass.
  const isSuperAdmin = tier === 'super_admin' || tier === 'developer';

  const checkFeature = useCallback(
    (featureId: FeatureId, context: FeatureCheckContext = {}): FeatureAccess => {
      // Super admin always has access
      if (isSuperAdmin) {
        return createSuperAdminAccess(context);
      }

      // No limits loaded yet - allow by default (fail open)
      if (!limits) {
        return createDefaultAccess(context);
      }

      return validateFeatureAccess(featureId, limits, tier, context);
    },
    [limits, isSuperAdmin, tier]
  );

  return {
    checkFeature,
    isSuperAdmin,
  };
}
