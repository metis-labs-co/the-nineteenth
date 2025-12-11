/**
 * useSubscription - Subscription Management Hook
 *
 * Provides comprehensive subscription functionality using TanStack Query:
 * - Fetch current user's subscription
 * - Fetch all tier limits configuration
 * - Check feature access with context (competition count, player count, etc.)
 * - Computed tier state (isPremium, isSocial, isFree)
 * - Sync to Zustand store for offline access
 *
 * Features:
 * - Automatic cache persistence via Zustand
 * - Real-time tier validation
 * - Context-aware feature checks
 * - Type-safe with full TypeScript support
 *
 * @example
 * ```tsx
 * function CreateCompetitionButton() {
 *   const { checkFeature, tier } = useSubscription();
 *
 *   const access = checkFeature('create_competition', { currentCount: 3 });
 *
 *   if (!access.allowed) {
 *     return <UpgradePrompt message={access.reason} />;
 *   }
 *
 *   return <Button>Create Competition</Button>;
 * }
 * ```
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { subscriptionKeys } from './queryKeys';
import { useAuth } from './useAuth';
import {
  useSubscriptionStore,
  useSubscriptionTier,
  useIsPremium,
  useIsSocial,
  useIsSuperAdmin,
} from '@/store/subscriptionStore';
import {
  mapDBUserSubscription,
  mapDBTierLimits,
  isUnlimited,
  isNoLimit,
  hasTierOrHigher,
  getNextTier,
  UNLIMITED,
  NO_LIMIT,
} from '@/types/subscription.types';
import type {
  UserSubscription,
  TierLimits,
  SubscriptionTier,
  FeatureId,
  FeatureAccess,
} from '@/types/subscription.types';
import type {
  UserSubscription as DBUserSubscription,
  TierLimits as DBTierLimits,
  GameType,
} from '@/types/database.types';

// =====================================================
// TYPES
// =====================================================

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
 * Return type for useSubscription hook
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

// =====================================================
// REQUIRED TIER MAPPING
// =====================================================

/**
 * Maps feature IDs to their minimum required tier
 */
const FEATURE_REQUIRED_TIER: Record<FeatureId, SubscriptionTier> = {
  // Competition features - checked via limits
  create_competition: 'free',
  add_round: 'free',
  add_player: 'free',
  game_type: 'free', // Depends on specific game type
  team_formats: 'premium',
  scoring_pairs: 'premium',

  // Social features
  add_friend: 'free', // Limit varies by tier
  compare_stats: 'social',

  // Statistics features
  basic_stats: 'free',
  score_distribution: 'social',
  advanced_stats: 'premium',
  export_data: 'social',

  // Admin features
  admin_tools: 'super_admin',
};

// =====================================================
// HOOK
// =====================================================

export function useSubscription(): UseSubscriptionReturn {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Zustand store - unused variables removed, using individual selectors in sync section

  // =====================================================
  // QUERIES
  // =====================================================

  /**
   * Query: Current user's subscription
   * Only fetches if user is authenticated
   */
  const {
    data: subscription = null,
    isLoading: isLoadingSubscription,
    isError: isSubscriptionError,
    error: subscriptionError,
  } = useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // PGRST116 = no rows found - user has no subscription yet
        if (error.code === 'PGRST116') {
          console.log('No subscription found for user, using default free tier');
          return null;
        }
        console.error('Error fetching subscription:', error);
        throw new Error(error.message);
      }

      return mapDBUserSubscription(data as DBUserSubscription);
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  /**
   * Query: All tier limits configuration
   * Fetches all tiers for comparison and UI display
   * Long stale time as tier config rarely changes
   */
  const {
    data: allTierLimits = null,
    isLoading: isLoadingLimits,
    isError: isLimitsError,
    error: limitsError,
  } = useQuery({
    queryKey: subscriptionKeys.allTierLimits(),
    queryFn: async (): Promise<Record<SubscriptionTier, TierLimits>> => {
      const { data, error } = await supabase
        .from('tier_limits')
        .select('*')
        .order('tier');

      if (error) {
        console.error('Error fetching tier limits:', error);
        throw new Error(error.message);
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

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  /**
   * Get the user's effective tier
   * Falls back to 'free' if no subscription
   */
  const tier: SubscriptionTier = subscription?.tier ?? 'free';

  /**
   * Get limits for current tier
   */
  const limits = useMemo(() => {
    if (!allTierLimits) return null;
    return allTierLimits[tier] ?? null;
  }, [allTierLimits, tier]);

  /**
   * Computed tier booleans
   */
  const isPremium = tier === 'premium' || tier === 'super_admin';
  const isSocial = tier === 'social' || tier === 'premium' || tier === 'super_admin';
  const isFree = tier === 'free';
  const isSuperAdmin = tier === 'super_admin';

  // =====================================================
  // SYNC TO ZUSTAND STORE
  // =====================================================

  // Get stable references to store actions (these don't change)
  const setSubscription = useSubscriptionStore((state) => state.setSubscription);
  const setLimits = useSubscriptionStore((state) => state.setLimits);
  const setAllTierLimits = useSubscriptionStore((state) => state.setAllTierLimits);
  const setLoading = useSubscriptionStore((state) => state.setLoading);

  /**
   * Sync subscription to Zustand store for offline access
   */
  useEffect(() => {
    setSubscription(subscription);
  }, [subscription, setSubscription]);

  /**
   * Sync limits to Zustand store
   */
  useEffect(() => {
    setLimits(limits);
  }, [limits, setLimits]);

  /**
   * Sync all tier limits to Zustand store
   */
  useEffect(() => {
    setAllTierLimits(allTierLimits);
  }, [allTierLimits, setAllTierLimits]);

  /**
   * Update loading state
   */
  useEffect(() => {
    setLoading(isLoadingSubscription || isLoadingLimits);
  }, [isLoadingSubscription, isLoadingLimits, setLoading]);

  // =====================================================
  // FEATURE CHECKING
  // =====================================================

  /**
   * Check if a feature is accessible based on tier and context
   *
   * @param featureId - The feature to check
   * @param context - Optional context with current counts
   * @returns FeatureAccess object with allowed, reason, etc.
   */
  const checkFeature = useCallback(
    (featureId: FeatureId, context: FeatureCheckContext = {}): FeatureAccess => {
      // Super admin always has access
      if (isSuperAdmin) {
        return {
          allowed: true,
          upgradeRequired: false,
          currentValue: context.currentCount ?? 0,
          limitValue: NO_LIMIT,
        };
      }

      // No limits loaded yet - allow by default (fail open)
      if (!limits) {
        return {
          allowed: true,
          upgradeRequired: false,
          currentValue: context.currentCount ?? 0,
          limitValue: UNLIMITED,
          reason: 'Limits not loaded',
        };
      }

      // Check based on feature type
      switch (featureId) {
        case 'create_competition':
          return checkLimitFeature(
            context.currentCount ?? 0,
            limits.maxCompetitionsOwned,
            'competitions',
            'social'
          );

        case 'add_round':
          return checkLimitFeature(
            context.roundCount ?? 0,
            limits.maxRoundsPerCompetition,
            'rounds per competition',
            'social'
          );

        case 'add_player':
          return checkLimitFeature(
            context.playerCount ?? 0,
            limits.maxPlayersPerCompetition,
            'players per competition',
            'social'
          );

        case 'add_friend':
          return checkLimitFeature(
            context.friendCount ?? 0,
            limits.maxFriends,
            'friends',
            'social'
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
          return checkBooleanFeature(
            limits.canViewScoreDistribution,
            'Score distribution',
            'social'
          );

        case 'advanced_stats':
          return checkBooleanFeature(limits.canViewAdvancedStats, 'Advanced statistics', 'premium');

        case 'export_data':
          return checkBooleanFeature(limits.canExportData, 'Data export', 'social');

        case 'admin_tools':
          return checkBooleanFeature(limits.canAccessAdminTools, 'Admin tools', 'super_admin');

        default:
          // Unknown feature - deny by default
          return {
            allowed: false,
            upgradeRequired: true,
            reason: `Unknown feature: ${featureId}`,
            currentValue: 0,
            limitValue: 0,
          };
      }
    },
    [limits, isSuperAdmin]
  );

  /**
   * Helper: Check limit-based feature (competitions, rounds, players, friends)
   */
  function checkLimitFeature(
    currentValue: number,
    limitValue: number,
    featureName: string,
    upgradeToTier: SubscriptionTier
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
      reason: `You've reached the maximum of ${limitValue} ${featureName} on your ${tier} plan`,
      requiredTier: upgradeToTier,
      currentValue,
      limitValue,
    };
  }

  /**
   * Helper: Check game type access
   */
  function checkGameTypeFeature(
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
      reason: `${formatGameType(gameType)} requires a ${requiredTier} subscription`,
      requiredTier,
      currentValue: 0,
      limitValue: allowedTypes.length,
    };
  }

  /**
   * Helper: Check boolean feature flag
   */
  function checkBooleanFeature(
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

  // =====================================================
  // ACTIONS
  // =====================================================

  /**
   * Manually refresh subscription data
   */
  const refresh = useCallback(async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() }),
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.allTierLimits() }),
    ]);
  }, [queryClient]);

  // =====================================================
  // RETURN
  // =====================================================

  return {
    // State
    subscription,
    limits,
    allTierLimits,
    isLoading: isLoadingSubscription || isLoadingLimits,
    isError: isSubscriptionError || isLimitsError,
    error: subscriptionError ?? limitsError ?? null,

    // Computed tier values
    tier,
    isPremium,
    isSocial,
    isFree,
    isSuperAdmin,

    // Feature checking
    checkFeature,

    // Actions
    refresh,
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get required tier for a specific game type
 */
function getRequiredTierForGameType(gameType: GameType): SubscriptionTier {
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
 * Format game type for display
 */
function formatGameType(gameType: GameType): string {
  const formatted: Record<GameType, string> = {
    stableford: 'Stableford',
    stroke: 'Stroke Play',
    'match-play': 'Match Play',
    ambrose: 'Ambrose',
    'best-ball': 'Best Ball',
    scramble: 'Scramble',
  };
  return formatted[gameType] ?? gameType;
}

// =====================================================
// ADDITIONAL HOOKS
// =====================================================

/**
 * Hook: useCheckFeature
 * Lightweight hook for checking a single feature
 *
 * @example
 * ```tsx
 * const canExport = useCheckFeature('export_data');
 * if (!canExport.allowed) {
 *   return <UpgradePrompt />;
 * }
 * ```
 */
export function useCheckFeature(
  featureId: FeatureId,
  context?: FeatureCheckContext
): FeatureAccess {
  const { checkFeature } = useSubscription();
  return useMemo(
    () => checkFeature(featureId, context),
    [checkFeature, featureId, context]
  );
}

/**
 * Hook: useCanCreateCompetition
 * Check if user can create a new competition
 *
 * @param currentCount - Current number of competitions owned
 */
export function useCanCreateCompetition(currentCount: number): FeatureAccess {
  return useCheckFeature('create_competition', { currentCount });
}

/**
 * Hook: useCanAddRound
 * Check if user can add a round to competition
 *
 * @param roundCount - Current number of rounds in competition
 */
export function useCanAddRound(roundCount: number): FeatureAccess {
  return useCheckFeature('add_round', { roundCount });
}

/**
 * Hook: useCanAddPlayer
 * Check if user can add a player to competition
 *
 * @param playerCount - Current number of players in competition
 */
export function useCanAddPlayer(playerCount: number): FeatureAccess {
  return useCheckFeature('add_player', { playerCount });
}

/**
 * Hook: useCanAddFriend
 * Check if user can add more friends
 *
 * @param friendCount - Current number of friends
 */
export function useCanAddFriend(friendCount: number): FeatureAccess {
  return useCheckFeature('add_friend', { friendCount });
}

/**
 * Hook: useCanUseGameType
 * Check if user can use a specific game type
 *
 * @param gameType - The game type to check
 */
export function useCanUseGameType(gameType: GameType): FeatureAccess {
  return useCheckFeature('game_type', { gameType });
}

/**
 * Hook: useCompetitionCount
 * Get the count of active competitions owned by the current user
 *
 * @returns Query result with competition count
 *
 * @example
 * ```tsx
 * const { data: count = 0, isLoading } = useCompetitionCount();
 * const access = checkCanCreateCompetition(count);
 * ```
 */
export function useCompetitionCount() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: subscriptionKeys.competitionCount(user?.id ?? ''),
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('competitions')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .not('status', 'in', '("completed","cancelled")');

      if (error) {
        console.error('Error counting competitions:', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
