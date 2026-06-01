/**
 * useSubscriptionState - Hook for subscription tier computation, usage formatting,
 * plan comparison logic, and all subscription-related business logic.
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useConfirmationDialog } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { openAppStoreSubscriptionSettings } from '@/utils/appStore';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import type { SubscriptionTier } from '@/types/subscription.types';
import type { UpgradePromptConfig } from '@/components/subscription';
import type { PlanFeature } from '@/components/subscription/PlanComparisonCard';
import type { UsageItem } from '@/components/subscription/UsageSection';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Display order for tiers in comparison (excludes internal-only tiers).
 * Enterprise is intentionally hidden until the feature is launched —
 * dev simulation mode in PlansComparison still surfaces it for testing.
 */
export const COMPARISON_TIERS: SubscriptionTier[] = ['free', 'social', 'premium'];

/**
 * Icons for each tier
 */
export const TIER_ICONS: Record<SubscriptionTier, string> = {
  free: 'account-outline',
  social: 'account-group-outline',
  premium: 'crown-outline',
  enterprise: 'domain',
  super_admin: 'shield-crown-outline',
  developer: 'code-tags',
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format a limit value for display
 */
function formatLimitValue(value: number): string {
  if (isUnlimited(value) || isNoLimit(value)) {
    return 'Unlimited';
  }
  return value.toString();
}

/**
 * Format game types array for display
 */
function formatGameTypes(types: string[]): string {
  if (types.length === 0) return 'None';
  if (types.length >= 6) return 'All types';
  return types.map(t => t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')).join(', ');
}

/**
 * Calculate days remaining in trial
 */
function getTrialDaysRemaining(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) return null;
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * A lifetime purchase is an active, paid subscription that never expires
 * (expires_at is NULL). Free tier also has no expiry, so it is excluded.
 */
export function computeIsLifetime(
  subscription: { status: string; expiresAt: Date | string | null } | null | undefined,
  tier: SubscriptionTier
): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (subscription.expiresAt != null) return false;
  return tier === 'social' || tier === 'premium' || tier === 'enterprise';
}

/**
 * Build plan features array for PlanComparisonCard
 */
export function buildPlanFeatures(tierLimits: {
  maxCompetitionsOwned: number;
  maxLeaguesOwned?: number;
  maxRoundsPlayed?: number;
  maxRoundsPerCompetition: number;
  maxPlayersPerCompetition: number;
  maxFriends: number;
  allowedGameTypes: string[];
  canUseTeamFormats: boolean;
  canUseScoringPairs: boolean;
  canViewScoreDistribution: boolean;
  canViewAdvancedStats: boolean;
  canCompareStats: boolean;
  canViewDetailedStats?: boolean;
  canViewHandicapHistory?: boolean;
  canViewAchievementLeaderboard?: boolean;
  canUseAiCompetition?: boolean;
  canManageGuests?: boolean;
  canUseSkinsGame?: boolean;
  canUseWolfGame?: boolean;
  canUsePrizePool?: boolean;
}, tier: SubscriptionTier): PlanFeature[] {
  return [
    { label: 'Competitions', value: formatLimitValue(tierLimits.maxCompetitionsOwned) },
    { label: 'Leagues', value: formatLimitValue(tierLimits.maxLeaguesOwned ?? 0) },
    { label: 'Social rounds', value: formatLimitValue(tierLimits.maxRoundsPlayed ?? (tier === 'free' ? 20 : -1)) },
    { label: 'Rounds per competition', value: formatLimitValue(tierLimits.maxRoundsPerCompetition) },
    { label: 'Players per competition', value: formatLimitValue(tierLimits.maxPlayersPerCompetition) },
    { label: 'Friends', value: formatLimitValue(tierLimits.maxFriends) },
    { label: 'Game types', value: formatGameTypes(tierLimits.allowedGameTypes) },
    { label: 'Team formats', value: tierLimits.canUseTeamFormats },
    { label: 'Detailed stats', value: tierLimits.canViewDetailedStats ?? false },
    { label: 'Score distribution', value: tierLimits.canViewScoreDistribution },
    { label: 'Handicap history', value: tierLimits.canViewHandicapHistory ?? false },
    { label: 'Achievement leaderboard', value: tierLimits.canViewAchievementLeaderboard ?? false },
    { label: 'Compare stats', value: tierLimits.canCompareStats },
    { label: 'Advanced analytics', value: tierLimits.canViewAdvancedStats },
    { label: 'AI competition creation', value: tierLimits.canUseAiCompetition ?? false },
    { label: 'Guest management', value: tierLimits.canManageGuests ?? false },
    { label: 'Scoring pairs', value: tierLimits.canUseScoringPairs },
    { label: 'Skins side-game', value: tierLimits.canUseSkinsGame ?? false },
    { label: 'Wolf side-game', value: tierLimits.canUseWolfGame ?? false },
    { label: 'Prize pools', value: tierLimits.canUsePrizePool ?? false },
  ];
}

// ============================================================================
// HOOK
// ============================================================================

export function useSubscriptionState() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    subscription,
    limits,
    allTierLimits,
    tier,
    isSuperAdmin,
    isPremium,
    isLoading,
    isError,
    error,
    refresh,
    purchasesEnabled,
    providerType,
  } = useSubscriptionContext();

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<SubscriptionTier>('social');
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgradeTier, setDowngradeTier] = useState<SubscriptionTier>('free');

  // Dialog state
  const { dialogConfig, showAlert, dismissDialog } = useConfirmationDialog();

  // Refresh subscription data when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refresh();
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['competitions', 'count', user.id] });
        queryClient.invalidateQueries({ queryKey: ['friends', 'count', user.id] });
        queryClient.invalidateQueries({ queryKey: ['standaloneRoundsPlayedCount', user.id] });
        queryClient.invalidateQueries({ queryKey: ['leagues', 'count', user.id] });
      }
    }, [refresh, queryClient, user?.id])
  );

  // Fetch competition count for usage display
  const { data: competitionCount = 0 } = useQuery({
    queryKey: ['competitions', 'count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error: countError } = await supabase
        .from('competitions')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id);

      if (countError) {
        console.error('Error fetching competition count:', countError);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  // Fetch friends count for usage display
  const { data: friendsCount = 0 } = useQuery({
    queryKey: ['friends', 'count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error: countError } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (countError) {
        console.error('Error fetching friends count:', countError);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  // Fetch leagues count for usage display
  const { data: leaguesCount = 0 } = useQuery({
    queryKey: ['leagues', 'count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error: countError } = await supabase
        .from('leagues')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('status', 'active');

      if (countError) {
        console.error('Error fetching leagues count:', countError);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  // Check if user has unlimited rounds
  const maxRoundsPlayed = limits?.maxRoundsPlayed ?? 20;
  const hasUnlimitedRounds = isUnlimited(maxRoundsPlayed) || isNoLimit(maxRoundsPlayed);

  // Fetch standalone rounds played count for usage display
  const { data: roundsPlayedCount = 0 } = useQuery({
    queryKey: ['standaloneRoundsPlayedCount', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error: countError } = await supabase
        .from('scorecards')
        .select('round_id, rounds!inner(competition_id)', { count: 'exact', head: true })
        .eq('player_id', user.id)
        .in('status', ['completed', 'confirmed'])
        .is('rounds.competition_id', null)
        .is('rounds.deleted_at', null);

      if (countError) {
        console.error('Error fetching standalone rounds played count:', countError);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!user?.id && !hasUnlimitedRounds,
  });

  // Trial days remaining
  const trialDaysRemaining = useMemo(() => {
    if (!subscription?.trialEndsAt) return null;
    return getTrialDaysRemaining(subscription.trialEndsAt);
  }, [subscription?.trialEndsAt]);

  const isOnTrial = subscription?.status === 'trial' && trialDaysRemaining !== null && trialDaysRemaining > 0;

  const isLifetime = useMemo(
    () => computeIsLifetime(subscription, tier),
    [subscription, tier]
  );

  // Build usage items for UsageSection
  const usageItems: UsageItem[] = useMemo(() => [
    { current: competitionCount, max: limits?.maxCompetitionsOwned ?? 1, label: 'Competitions', testID: 'competitions-limit' },
    { current: leaguesCount, max: limits?.maxLeaguesOwned ?? 0, label: 'Leagues', testID: 'leagues-limit' },
    { current: friendsCount, max: limits?.maxFriends ?? 10, label: 'Friends', testID: 'friends-limit' },
    { current: roundsPlayedCount, max: maxRoundsPlayed, label: 'Social Rounds', testID: 'social-rounds-limit' },
  ], [competitionCount, leaguesCount, friendsCount, roundsPlayedCount, limits, maxRoundsPlayed]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // Upgrade prompt config
  const upgradeConfig: UpgradePromptConfig = useMemo(() => {
    const targetLimits = allTierLimits?.[selectedUpgradeTier];
    const benefits: string[] = [];

    if (selectedUpgradeTier === 'social') {
      benefits.push(
        'Up to 8 competitions',
        'Up to 12 players per competition',
        'Unlimited social rounds',
        'Stroke Play & Match Play formats',
        'Detailed stats, handicap history & achievements',
        'AI competition creation & guest management'
      );
    } else if (selectedUpgradeTier === 'premium') {
      benefits.push(
        'Unlimited competitions',
        'Up to 40 players per competition',
        'All game types including team formats',
        'Advanced analytics & trends',
        'Skins, Wolf & Prize pools',
        'Scoring pairs for competitive rounds'
      );
    } else if (selectedUpgradeTier === 'enterprise') {
      benefits.push(
        'Up to 200 competitions',
        'Up to 200 leagues',
        'Up to 100 players per competition',
        'Up to 20 rounds per competition',
        'All premium features',
        'Priority support'
      );
    }

    return {
      feature: 'create_competition',
      title: `Upgrade to ${targetLimits?.displayName ?? selectedUpgradeTier}`,
      message: targetLimits?.description ?? 'Get access to more features and higher limits',
      targetTier: selectedUpgradeTier,
      benefits,
    };
  }, [selectedUpgradeTier, allTierLimits]);

  // Dev-only: simulate tier switch by updating Supabase directly (staging DB only)
  const devSwitchingRef = useRef(false);
  const isDevSimulationMode = __DEV__ && isExpoGo;

  const handleDevTierSwitch = useCallback(async (selectedTier: SubscriptionTier) => {
    if (!user?.id || selectedTier === tier || devSwitchingRef.current) {
      return;
    }

    devSwitchingRef.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase.rpc as any)('set_own_subscription_tier', {
        p_tier: selectedTier,
      });

      if (rpcError) {
        showAlert('Error', `Failed to switch tier: ${rpcError.message}`);
        return;
      }

      await refresh();
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'Failed to switch tier');
    } finally {
      devSwitchingRef.current = false;
    }
  }, [user?.id, tier, refresh, showAlert]);

  // Handle upgrade press
  const handleUpgradePress = useCallback(() => {
    const targetTier: SubscriptionTier =
      tier === 'free' ? 'social' : tier === 'social' ? 'premium' : 'enterprise';
    // Dev mode: directly switch tier via Supabase (staging only)
    if (isDevSimulationMode) {
      handleDevTierSwitch(targetTier);
      return;
    }
    setSelectedUpgradeTier(targetTier);
    if (purchasesEnabled) {
      setShowPaywall(true);
    } else {
      setShowUpgradePrompt(true);
    }
  }, [purchasesEnabled, tier, isDevSimulationMode, handleDevTierSwitch]);

  // Handle plan card press
  const handlePlanCardPress = useCallback((selectedTier: SubscriptionTier) => {
    // Dev mode: directly switch tier via Supabase (staging only)
    if (isDevSimulationMode) {
      handleDevTierSwitch(selectedTier);
      return;
    }

    const tierOrder: Record<SubscriptionTier, number> = {
      free: 0,
      social: 1,
      premium: 2,
      enterprise: 3,
      super_admin: 4,
      developer: 5,
    };

    const selectedOrder = tierOrder[selectedTier];
    const currentOrder = tierOrder[tier];

    // Same tier - do nothing
    if (selectedOrder === currentOrder) {
      return;
    }

    // Upgrade flow
    if (selectedOrder > currentOrder) {
      setSelectedUpgradeTier(selectedTier);
      if (purchasesEnabled) {
        setShowPaywall(true);
      } else {
        setShowUpgradePrompt(true);
      }
      return;
    }

    // Downgrade flow
    setDowngradeTier(selectedTier);
    setShowDowngradeModal(true);
  }, [tier, purchasesEnabled, isDevSimulationMode, handleDevTierSwitch]);

  // Handle upgrade action from prompt
  const handleUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
    // Dev mode: directly switch tier via Supabase (staging only)
    if (isDevSimulationMode) {
      handleDevTierSwitch(selectedUpgradeTier);
      return;
    }
    if (purchasesEnabled) {
      setShowPaywall(true);
    } else {
      const debugInfo = __DEV__
        ? '\n\n[Debug] This may be because RevenueCat failed to initialize. Check logs for details.'
        : '';
      showAlert(
        'Purchases Not Available',
        `In-app purchases are not currently available. This could be because:\n\n` +
        `• The app is running in Expo Go (use TestFlight instead)\n` +
        `• RevenueCat is still initializing (try again in a moment)\n` +
        `• There was an initialization error\n\n` +
        `If you're in TestFlight and this persists, please contact support.${debugInfo}`
      );
    }
  }, [purchasesEnabled, showAlert, isDevSimulationMode, handleDevTierSwitch, selectedUpgradeTier]);

  // Handle successful purchase
  const handlePurchaseSuccess = useCallback((_newTier: SubscriptionTier) => {
    refresh();
  }, [refresh]);

  // Handle downgrade confirmation
  const handleDowngradeConfirm = useCallback(async () => {
    setShowDowngradeModal(false);
    await openAppStoreSubscriptionSettings();
  }, []);

  // Handle downgrade dismiss
  const handleDowngradeDismiss = useCallback(() => {
    setShowDowngradeModal(false);
  }, []);

  return {
    // Subscription context data
    tier,
    limits,
    allTierLimits,
    isSuperAdmin,
    isPremium,
    isLoading,
    isError,
    error,
    purchasesEnabled,
    providerType,

    // Computed state
    trialDaysRemaining,
    isOnTrial,
    isLifetime,
    usageItems,
    upgradeConfig,
    isDevSimulationMode,

    // UI state
    showUpgradePrompt,
    setShowUpgradePrompt,
    showPaywall,
    setShowPaywall,
    isRefreshing,
    selectedUpgradeTier,
    showDowngradeModal,
    downgradeTier,

    // Dialog
    dialogConfig,
    dismissDialog,

    // Handlers
    handleRefresh,
    handleUpgradePress,
    handlePlanCardPress,
    handleUpgrade,
    handlePurchaseSuccess,
    handleDowngradeConfirm,
    handleDowngradeDismiss,
  };
}
