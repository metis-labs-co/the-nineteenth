/**
 * Subscription Hooks Module
 *
 * Re-exports all subscription-related hooks and types.
 *
 * @example
 * ```tsx
 * import { useSubscriptionStatus, useFeatureGate } from '@/hooks/subscription';
 *
 * function MyComponent() {
 *   const { tier } = useSubscriptionStatus();
 *   const { checkFeature } = useFeatureGate(tier, limits);
 * }
 * ```
 */

// Hooks
export { useSubscriptionStatus } from './useSubscriptionStatus';
export { useSubscriptionLimits } from './useSubscriptionLimits';
export { useFeatureGate } from './useFeatureGate';
export { useFeatureAccess } from './useFeatureAccess';

// Validators (pure functions)
export {
  validateFeatureAccess,
  checkLimitFeature,
  checkBooleanFeature,
  checkGameTypeFeature,
  getRequiredTierForGameType,
} from './validators';

// Types
export type {
  SubscriptionTier,
  UserSubscription,
  TierLimits,
  FeatureId,
  FeatureAccess,
  FeatureCheckContext,
  UseSubscriptionStatusReturn,
  UseSubscriptionLimitsReturn,
  UseFeatureGateReturn,
  UseSubscriptionReturn,
} from './types';

// Subscription helper hooks
export { useCompetitionCount } from './helpers';

// Stats visibility with tier
export { useStatsVisibilityWithTier } from './statsVisibility';
