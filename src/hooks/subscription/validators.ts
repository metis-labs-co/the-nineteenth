/**
 * Subscription Validators
 *
 * Pure functions for validating subscription limits and feature access.
 * No React hooks - just validation logic.
 */

import type { FeatureAccess, TierLimits, SubscriptionTier, FeatureCheckContext } from './types';
import type { GameType } from '@/types/database.types';
import { isUnlimited, NO_LIMIT, UNLIMITED } from '@/types/subscription.types';
import { getGameTypeLabel } from '@/constants/statusConfig';

/**
 * Check a limit-based feature (competitions, rounds, players, friends)
 */
export function checkLimitFeature(
  currentValue: number,
  limitValue: number,
  featureName: string,
  upgradeToTier: SubscriptionTier,
  currentTier: SubscriptionTier
): FeatureAccess {
  // Unlimited or no limit
  if (isUnlimited(limitValue)) {
    return {
      allowed: true,
      upgradeRequired: false,
      currentValue,
      limitValue,
    };
  }

  // Check against limit
  if (currentValue < limitValue) {
    return {
      allowed: true,
      upgradeRequired: false,
      currentValue,
      limitValue,
    };
  }

  // At or over limit
  return {
    allowed: false,
    upgradeRequired: true,
    reason: `You've reached the maximum of ${limitValue} ${featureName} on your ${currentTier} plan`,
    requiredTier: upgradeToTier,
    currentValue,
    limitValue,
  };
}

/**
 * Check if a game type is accessible
 */
export function checkGameTypeFeature(
  gameType: GameType | undefined,
  allowedTypes: GameType[]
): FeatureAccess {
  // No game type specified - allow
  if (!gameType) {
    return {
      allowed: true,
      upgradeRequired: false,
      currentValue: 0,
      limitValue: allowedTypes.length,
    };
  }

  // Check if game type is allowed
  if (allowedTypes.includes(gameType)) {
    return {
      allowed: true,
      upgradeRequired: false,
      currentValue: 0,
      limitValue: allowedTypes.length,
    };
  }

  // Determine required tier for this game type
  const requiredTier = getRequiredTierForGameType(gameType);

  return {
    allowed: false,
    upgradeRequired: true,
    reason: `${getGameTypeLabel(gameType)} requires a ${requiredTier} subscription`,
    requiredTier,
    currentValue: 0,
    limitValue: allowedTypes.length,
  };
}

/**
 * Check a boolean feature flag
 */
export function checkBooleanFeature(
  isAllowed: boolean,
  featureName: string,
  requiredTier: SubscriptionTier
): FeatureAccess {
  if (isAllowed) {
    return {
      allowed: true,
      upgradeRequired: false,
      currentValue: 1,
      limitValue: 1,
    };
  }

  return {
    allowed: false,
    upgradeRequired: true,
    reason: `${featureName} requires a ${requiredTier} subscription`,
    requiredTier,
    currentValue: 0,
    limitValue: 1,
  };
}

/**
 * Create a super admin access result (always allowed)
 */
export function createSuperAdminAccess(context: FeatureCheckContext): FeatureAccess {
  return {
    allowed: true,
    upgradeRequired: false,
    currentValue: context.currentCount ?? 0,
    limitValue: NO_LIMIT,
  };
}

/**
 * Create a default access result when limits not loaded (fail open)
 */
export function createDefaultAccess(context: FeatureCheckContext): FeatureAccess {
  return {
    allowed: true,
    upgradeRequired: false,
    currentValue: context.currentCount ?? 0,
    limitValue: UNLIMITED,
    reason: 'Limits not loaded',
  };
}

/**
 * Create a denied access result for unknown features
 */
export function createUnknownFeatureAccess(featureId: string): FeatureAccess {
  return {
    allowed: false,
    upgradeRequired: true,
    reason: `Unknown feature: ${featureId}`,
    currentValue: 0,
    limitValue: 0,
  };
}

/**
 * Get required tier for a specific game type
 */
export function getRequiredTierForGameType(gameType: GameType): SubscriptionTier {
  switch (gameType) {
    case 'stableford':
      return 'free';
    case 'stroke':
      return 'social';
    case 'match-play':
    case 'ambrose':
    case 'best-ball':
    case 'scramble':
      return 'premium';
    default:
      return 'premium';
  }
}


/**
 * Check feature access based on feature ID and limits
 */
export function validateFeatureAccess(
  featureId: string,
  limits: TierLimits,
  tier: SubscriptionTier,
  context: FeatureCheckContext
): FeatureAccess {
  switch (featureId) {
    case 'create_competition':
      return checkLimitFeature(
        context.currentCount ?? 0,
        limits.maxCompetitionsOwned,
        'competitions',
        'social',
        tier
      );

    case 'add_round':
      return checkLimitFeature(
        context.roundCount ?? 0,
        limits.maxRoundsPerCompetition,
        'rounds per competition',
        'social',
        tier
      );

    case 'add_player':
      return checkLimitFeature(
        context.playerCount ?? 0,
        limits.maxPlayersPerCompetition,
        'players per competition',
        'social',
        tier
      );

    case 'add_friend':
      return checkLimitFeature(
        context.friendCount ?? 0,
        limits.maxFriends,
        'friends',
        'social',
        tier
      );

    case 'game_type':
      return checkGameTypeFeature(context.gameType, limits.allowedGameTypes);

    case 'team_formats':
      return checkBooleanFeature(limits.canUseTeamFormats, 'Team formats', 'premium');

    case 'scoring_pairs':
      return checkBooleanFeature(limits.canUseScoringPairs, 'Scoring pairs', 'premium');

    case 'compare_stats':
      return checkBooleanFeature(limits.canCompareStats, 'Stats comparison', 'social');

    case 'basic_stats':
      return checkBooleanFeature(limits.canViewBasicStats, 'Basic statistics', 'free');

    case 'score_distribution':
      return checkBooleanFeature(limits.canViewScoreDistribution, 'Score distribution', 'social');

    case 'advanced_stats':
      return checkBooleanFeature(limits.canViewAdvancedStats, 'Advanced statistics', 'premium');

    case 'fir_gir_tracking':
      return checkBooleanFeature(limits.canViewAdvancedStats, 'FIR/GIR tracking', 'premium');

    case 'export_data':
      return checkBooleanFeature(limits.canExportData, 'Data export', 'social');

    case 'admin_tools':
      return checkBooleanFeature(limits.canAccessAdminTools, 'Admin tools', 'super_admin');

    default:
      return createUnknownFeatureAccess(featureId);
  }
}
