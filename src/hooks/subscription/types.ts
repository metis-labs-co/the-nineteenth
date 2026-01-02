/**
 * Subscription Hook Types
 *
 * Local types for the subscription hooks module.
 * Re-exports core types from @/types/subscription.types for convenience.
 */

import type { GameType } from '@/types/database.types';
import type {
  SubscriptionTier,
  UserSubscription,
  TierLimits,
  FeatureId,
  FeatureAccess,
} from '@/types/subscription.types';

// Re-export core types for convenience
export type {
  SubscriptionTier,
  UserSubscription,
  TierLimits,
  FeatureId,
  FeatureAccess,
  GameType,
};

/**
 * Context for feature access checks
 * Provides current values for limit comparisons
 */
export interface FeatureCheckContext {
  /** Current count of competitions owned (for create_competition) */
  currentCount?: number;
  /** Current count of rounds in competition (for add_round) */
  roundCount?: number;
  /** Current count of players in competition (for add_player) */
  playerCount?: number;
  /** Current count of friends (for add_friend) */
  friendCount?: number;
  /** Game type being checked (for game_type) */
  gameType?: GameType;
}

/**
 * Return type for useSubscriptionStatus hook
 */
export interface UseSubscriptionStatusReturn {
  subscription: UserSubscription | null;
  tier: SubscriptionTier;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Return type for useSubscriptionLimits hook
 */
export interface UseSubscriptionLimitsReturn {
  limits: TierLimits | null;
  allTierLimits: Record<SubscriptionTier, TierLimits> | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Return type for useFeatureGate hook
 */
export interface UseFeatureGateReturn {
  checkFeature: (featureId: FeatureId, context?: FeatureCheckContext) => FeatureAccess;
  isSuperAdmin: boolean;
}

/**
 * Return type for the composed useSubscription hook
 */
export interface UseSubscriptionReturn {
  // State
  subscription: UserSubscription | null;
  limits: TierLimits | null;
  allTierLimits: Record<SubscriptionTier, TierLimits> | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Computed tier values
  tier: SubscriptionTier;
  isPremium: boolean;
  isSocial: boolean;
  isFree: boolean;
  isSuperAdmin: boolean;

  // Feature checking
  checkFeature: (featureId: FeatureId, context?: FeatureCheckContext) => FeatureAccess;

  // Actions
  refresh: () => Promise<void>;
}
