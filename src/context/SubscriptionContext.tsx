/**
 * SubscriptionContext - Provides subscription state and feature checks to the app
 *
 * This context provides:
 * - Current subscription and tier information
 * - Tier limits for the user's subscription
 * - Feature access checking with convenience methods
 * - Computed tier state (isPremium, isSocial, isFree)
 *
 * Usage:
 * ```tsx
 * import { useSubscriptionContext, useTier, useIsPremium } from '@/context/SubscriptionContext';
 *
 * // Get full subscription context
 * const { tier, checkFeature, checkCanCreateCompetition } = useSubscriptionContext();
 *
 * // Get just the tier (most common use case)
 * const tier = useTier();
 *
 * // Check if premium
 * const isPremium = useIsPremium();
 * ```
 */

import React, { createContext, useContext, useMemo, useCallback, useEffect, useState, ReactNode } from 'react';
import { useSubscription, FeatureCheckContext } from '@/hooks/useSubscription';
import { subscriptionService, currentProviderType } from '@/services/subscription/SubscriptionService';
import type {
  SubscriptionTier,
  TierLimits,
  FeatureId,
  FeatureAccess,
  UserSubscription,
} from '@/types/subscription.types';
import type { GameType } from '@/types/database.types';

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionContextValue {
  // State from useSubscription
  /** Current user's subscription */
  subscription: UserSubscription | null;

  /** Limits for user's current tier */
  limits: TierLimits | null;

  /** All tier limits for comparison */
  allTierLimits: Record<SubscriptionTier, TierLimits> | null;

  /** Whether subscription data is loading */
  isLoading: boolean;

  /** Whether there was an error loading subscription */
  isError: boolean;

  /** Error object if loading failed */
  error: Error | null;

  // Computed tier values
  /** User's current subscription tier */
  tier: SubscriptionTier;

  /** Whether user has premium tier or higher */
  isPremium: boolean;

  /** Whether user has social tier or higher */
  isSocial: boolean;

  /** Whether user is on free tier */
  isFree: boolean;

  /** Whether user is a super admin */
  isSuperAdmin: boolean;

  // Feature checking (from useSubscription)
  /** Check if a feature is accessible based on tier and context */
  checkFeature: (featureId: FeatureId, context?: FeatureCheckContext) => FeatureAccess;

  // Convenience methods
  /** Check if user can create a new competition */
  checkCanCreateCompetition: (currentCount: number) => FeatureAccess;

  /** Check if user can add a round to a competition */
  checkCanAddRound: (competitionId: string, currentCount: number) => FeatureAccess;

  /** Check if user can add a player to a competition */
  checkCanAddPlayer: (competitionId: string, currentCount: number) => FeatureAccess;

  /** Check if user can use a specific game type */
  checkGameType: (gameType: GameType) => FeatureAccess;

  // Actions
  /** Manually refresh subscription data */
  refresh: () => Promise<void>;

  // In-app purchases
  /** Whether in-app purchases are available (RevenueCat initialized) */
  purchasesEnabled: boolean;

  /** The current subscription provider type (for debugging) */
  providerType: 'manual' | 'revenuecat';
}

// ============================================================================
// CONTEXT
// ============================================================================

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const subscriptionData = useSubscription();

  // Track whether in-app purchases are available
  const [purchasesEnabled, setPurchasesEnabled] = useState(false);

  // ============================================================================
  // INITIALIZE SUBSCRIPTION SERVICE
  // ============================================================================

  /**
   * Initialize the subscription service (RevenueCat) on mount
   * This is required for in-app purchases to work on TestFlight/App Store builds
   */
  useEffect(() => {
    let mounted = true;

    const initService = async () => {
      console.log('[SubscriptionProvider] Starting initialization...');
      console.log('[SubscriptionProvider] Current provider type:', currentProviderType);
      console.log('[SubscriptionProvider] Service type:', subscriptionService.type);

      try {
        const result = await subscriptionService.initialize();
        console.log('[SubscriptionProvider] Init result:', result);

        if (mounted) {
          if (result.success) {
            console.log('[SubscriptionProvider] Subscription service initialized successfully');
            // Check if purchases are supported after initialization
            const canPurchase = subscriptionService.supportsPurchases();
            console.log('[SubscriptionProvider] Purchases enabled:', canPurchase);
            setPurchasesEnabled(canPurchase);
          } else {
            console.warn('[SubscriptionProvider] Subscription service init failed:', result.error, result.errorCode);
            // Even if init fails, check supportsPurchases - it might still work
            const canPurchase = subscriptionService.supportsPurchases();
            console.log('[SubscriptionProvider] Purchases enabled after failed init:', canPurchase);
            setPurchasesEnabled(canPurchase);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('[SubscriptionProvider] Error initializing subscription service:', error);
          // Even on error, check if purchases might work
          const canPurchase = subscriptionService.supportsPurchases();
          console.log('[SubscriptionProvider] Purchases enabled after error:', canPurchase);
          setPurchasesEnabled(canPurchase);
        }
      }
    };

    initService();

    return () => {
      mounted = false;
      // Cleanup subscription service on unmount
      subscriptionService.cleanup?.();
    };
  }, []);

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Check if user can create a new competition
   * @param currentCount - Current number of competitions owned
   */
  const checkCanCreateCompetition = useCallback(
    (currentCount: number): FeatureAccess => {
      return subscriptionData.checkFeature('create_competition', { currentCount });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscriptionData object changes on every render, but checkFeature is memoized
    [subscriptionData.checkFeature]
  );

  /**
   * Check if user can add a round to a competition
   * @param _competitionId - Competition ID (for future use with per-competition limits)
   * @param currentCount - Current number of rounds in competition
   */
  const checkCanAddRound = useCallback(
    (_competitionId: string, currentCount: number): FeatureAccess => {
      return subscriptionData.checkFeature('add_round', { roundCount: currentCount });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscriptionData object changes on every render, but checkFeature is memoized
    [subscriptionData.checkFeature]
  );

  /**
   * Check if user can add a player to a competition
   * @param _competitionId - Competition ID (for future use with per-competition limits)
   * @param currentCount - Current number of players in competition
   */
  const checkCanAddPlayer = useCallback(
    (_competitionId: string, currentCount: number): FeatureAccess => {
      return subscriptionData.checkFeature('add_player', { playerCount: currentCount });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscriptionData object changes on every render, but checkFeature is memoized
    [subscriptionData.checkFeature]
  );

  /**
   * Check if user can use a specific game type
   * @param gameType - The game type to check
   */
  const checkGameType = useCallback(
    (gameType: GameType): FeatureAccess => {
      return subscriptionData.checkFeature('game_type', { gameType });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscriptionData object changes on every render, but checkFeature is memoized
    [subscriptionData.checkFeature]
  );

  // ============================================================================
  // MEMOIZED VALUE
  // ============================================================================

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      // State from useSubscription
      subscription: subscriptionData.subscription,
      limits: subscriptionData.limits,
      allTierLimits: subscriptionData.allTierLimits,
      isLoading: subscriptionData.isLoading,
      isError: subscriptionData.isError,
      error: subscriptionData.error,

      // Computed tier values
      tier: subscriptionData.tier,
      isPremium: subscriptionData.isPremium,
      isSocial: subscriptionData.isSocial,
      isFree: subscriptionData.isFree,
      isSuperAdmin: subscriptionData.isSuperAdmin,

      // Feature checking
      checkFeature: subscriptionData.checkFeature,

      // Convenience methods
      checkCanCreateCompetition,
      checkCanAddRound,
      checkCanAddPlayer,
      checkGameType,

      // Actions
      refresh: subscriptionData.refresh,

      // In-app purchases
      purchasesEnabled,
      providerType: currentProviderType,
    }),
    [
      subscriptionData.subscription,
      subscriptionData.limits,
      subscriptionData.allTierLimits,
      subscriptionData.isLoading,
      subscriptionData.isError,
      subscriptionData.error,
      subscriptionData.tier,
      subscriptionData.isPremium,
      subscriptionData.isSocial,
      subscriptionData.isFree,
      subscriptionData.isSuperAdmin,
      subscriptionData.checkFeature,
      subscriptionData.refresh,
      purchasesEnabled,
      checkCanCreateCompetition,
      checkCanAddRound,
      checkCanAddPlayer,
      checkGameType,
    ]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get the full subscription context including all state and methods
 * Throws if used outside SubscriptionProvider
 *
 * @example
 * const { tier, checkFeature, checkCanCreateCompetition } = useSubscriptionContext();
 */
export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}

/**
 * Get just the current subscription tier - most common use case
 *
 * @example
 * const tier = useTier();
 * if (tier === 'premium') { ... }
 */
export function useTier(): SubscriptionTier {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useTier must be used within a SubscriptionProvider');
  }
  return context.tier;
}

/**
 * Get the tier limits for the current user
 *
 * @example
 * const limits = useTierLimits();
 * if (limits?.maxCompetitionsOwned) { ... }
 */
export function useTierLimits(): TierLimits | null {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useTierLimits must be used within a SubscriptionProvider');
  }
  return context.limits;
}

/**
 * Get just the isPremium boolean
 *
 * @example
 * const isPremium = useIsPremium();
 * if (isPremium) { showPremiumFeatures(); }
 */
export function useIsPremium(): boolean {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useIsPremium must be used within a SubscriptionProvider');
  }
  return context.isPremium;
}

/**
 * Get just the isSocial boolean (Social tier or above)
 *
 * @example
 * const isSocial = useIsSocial();
 * if (isSocial) { showSocialFeatures(); }
 */
export function useIsSocial(): boolean {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useIsSocial must be used within a SubscriptionProvider');
  }
  return context.isSocial;
}

/**
 * Get just the isSuperAdmin boolean (super_admin or developer tier).
 * Use for gating internal-only UI such as quick score flows.
 *
 * @example
 * const isSuperAdmin = useIsSuperAdmin();
 * if (isSuperAdmin) { showInternalTools(); }
 */
export function useIsSuperAdmin(): boolean {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useIsSuperAdmin must be used within a SubscriptionProvider');
  }
  return context.isSuperAdmin;
}

/**
 * Get the checkFeature function for feature access checks
 *
 * @example
 * const checkFeature = useCheckFeature();
 * const access = checkFeature('export_data');
 * if (!access.allowed) { showUpgradePrompt(); }
 */
export function useCheckFeature(): (
  featureId: FeatureId,
  context?: FeatureCheckContext
) => FeatureAccess {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useCheckFeature must be used within a SubscriptionProvider');
  }
  return context.checkFeature;
}

/**
 * Check if in-app purchases are available
 * Returns true when RevenueCat is initialized and ready for purchases
 *
 * @example
 * const purchasesEnabled = usePurchasesEnabled();
 * if (purchasesEnabled) { showPaywall(); }
 */
export function usePurchasesEnabled(): boolean {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('usePurchasesEnabled must be used within a SubscriptionProvider');
  }
  return context.purchasesEnabled;
}
