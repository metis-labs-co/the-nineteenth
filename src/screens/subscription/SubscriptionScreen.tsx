/**
 * SubscriptionScreen - View and manage subscription
 *
 * Displays the user's current subscription tier and usage limits.
 * Allows users to view all available plans and upgrade.
 *
 * Layout:
 * 1. Header with current TierBadge (large)
 * 2. 'Your Plan' section showing tier displayName and description
 * 3. 'Usage' section with LimitIndicators (Super Admin shows 'No limits')
 * 4. 'All Plans' comparison cards (Free, Social, Premium - hides Super Admin)
 * 5. Upgrade button for non-premium users
 * 6. Super Admin 'Internal Account' banner
 * 7. Trial days remaining (if on trial)
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, ConfirmationDialog, PageHeader } from '@/components/common';
import { useConfirmationDialog } from '@/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import {
  TierBadge,
  UpgradePrompt,
  Paywall,
  TrialBadge,
  InfoBanner,
  PlanSummaryCard,
  UsageSection,
  PlanComparisonCard,
  DebugInfoSection,
  DowngradeConfirmationModal,
} from '@/components/subscription';
import { openAppStoreSubscriptionSettings } from '@/utils/appStore';
import type { UpgradePromptConfig } from '@/components/subscription';
import type { PlanFeature } from '@/components/subscription/PlanComparisonCard';
import type { UsageItem } from '@/components/subscription/UsageSection';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { SubscriptionTier } from '@/types/subscription.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ============================================================================
// TYPES
// ============================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Display order for tiers in comparison (excludes super_admin)
 */
const COMPARISON_TIERS: SubscriptionTier[] = ['free', 'social', 'premium'];

/**
 * Icons for each tier
 */
const TIER_ICONS: Record<SubscriptionTier, string> = {
  free: 'account-outline',
  social: 'account-group-outline',
  premium: 'crown-outline',
  super_admin: 'shield-crown-outline',
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
 * Build plan features array for PlanComparisonCard
 */
function buildPlanFeatures(tierLimits: {
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
// COMPONENT
// ============================================================================

export default function SubscriptionScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
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
        .is('rounds.competition_id', null);

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
        'Up to 16 players per competition',
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
    }

    return {
      feature: 'create_competition',
      title: `Upgrade to ${targetLimits?.displayName ?? selectedUpgradeTier}`,
      message: targetLimits?.description ?? 'Get access to more features and higher limits',
      targetTier: selectedUpgradeTier,
      benefits,
    };
  }, [selectedUpgradeTier, allTierLimits]);

  // Handle upgrade press
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

  const handleUpgradePress = useCallback(() => {
    const targetTier = tier === 'free' ? 'social' : 'premium';
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
      super_admin: 3,
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

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <LoadingSpinner size="lg" />
      </View>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon source="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Error loading subscription
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error?.message ?? 'Please try again'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={handleRefresh}
          accessibilityRole="button"
          accessibilityLabel="Retry loading subscription"
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader
        title="Subscription"
        showBack
        onBack={handleBack}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        {/* Tier Badge Section */}
        <View style={[styles.section, styles.tierBadgeSection]}>
          <TierBadge size="large" />
          {isOnTrial && trialDaysRemaining !== null && (
            <View style={styles.trialBadgeContainer}>
              <TrialBadge daysRemaining={trialDaysRemaining} />
            </View>
          )}
        </View>

        {/* Super Admin Banner */}
        {isSuperAdmin && (
          <InfoBanner
            icon="shield-account"
            title="Internal Account"
            description="This is a company account with full access to all features."
            variant="error"
          />
        )}

        {/* Your Plan Section */}
        <PlanSummaryCard
          planName={limits?.displayName ?? 'Free'}
          description={limits?.description}
        />

        {/* Usage Section */}
        <UsageSection
          usage={usageItems}
          isSuperAdmin={isSuperAdmin}
        />

        {/* All Plans Section */}
        {(!isSuperAdmin || isDevSimulationMode) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: isDevSimulationMode ? spacing.xs : spacing.lg }]}>
              All Plans
            </Text>
            {isDevSimulationMode && (
              <Text style={[styles.devHint, { color: colors.warning }]}>
                DEV MODE: Tap any plan to switch tier instantly (staging DB)
              </Text>
            )}

            {(isDevSimulationMode ? (['free', 'social', 'premium', 'super_admin'] as SubscriptionTier[]) : COMPARISON_TIERS).map((comparisonTier) => {
              const tierLimits = allTierLimits?.[comparisonTier];
              if (!tierLimits) return null;

              const isCurrentTier = tier === comparisonTier;
              const tierColor = tierLimits.badgeColor ?? colors.gray400;

              const tierOrder: Record<SubscriptionTier, number> = {
                free: 0,
                social: 1,
                premium: 2,
                super_admin: 3,
              };
              const isUpgradeOption = tierOrder[comparisonTier] > tierOrder[tier];
              const isDowngradeOption = tierOrder[comparisonTier] < tierOrder[tier];

              return (
                <PlanComparisonCard
                  key={comparisonTier}
                  planName={tierLimits.displayName}
                  description={tierLimits.description}
                  icon={TIER_ICONS[comparisonTier]}
                  badgeColor={tierColor}
                  features={buildPlanFeatures(tierLimits, comparisonTier)}
                  isCurrentPlan={isCurrentTier}
                  isUpgradeOption={isDevSimulationMode ? !isCurrentTier : isUpgradeOption}
                  isDowngradeOption={isDevSimulationMode ? false : isDowngradeOption}
                  onPress={() => handlePlanCardPress(comparisonTier)}
                />
              );
            })}
          </View>
        )}

        {/* Upgrade Button */}
        {!isPremium && !isSuperAdmin && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
              onPress={handleUpgradePress}
              accessibilityRole="button"
              accessibilityLabel="Upgrade your subscription"
            >
              <Icon source="arrow-up-circle" size={24} color={colors.white} />
              <Text style={[styles.upgradeButtonText, { color: colors.white }]}>
                Upgrade Plan
              </Text>
            </TouchableOpacity>
            <Text style={[styles.upgradeHint, { color: colors.textSecondary }]}>
              {purchasesEnabled
                ? 'Start your 7-day free trial'
                : 'Contact support to upgrade your plan'}
            </Text>
          </View>
        )}

        {/* Debug Info */}
        <View style={styles.debugSection}>
          <DebugInfoSection
            provider={providerType}
            purchasesEnabled={purchasesEnabled}
            isDev={__DEV__}
          />
        </View>
      </ScrollView>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        config={upgradeConfig}
        onUpgrade={handleUpgrade}
        onDismiss={() => setShowUpgradePrompt(false)}
      />

      {/* Paywall Modal */}
      <Paywall
        visible={showPaywall}
        onPurchaseSuccess={handlePurchaseSuccess}
        onDismiss={() => setShowPaywall(false)}
        initialTier={tier === 'free' ? 'social' : 'premium'}
      />

      {/* Downgrade Confirmation Modal */}
      <DowngradeConfirmationModal
        visible={showDowngradeModal}
        currentTier={tier}
        targetTier={downgradeTier}
        onConfirm={handleDowngradeConfirm}
        onDismiss={handleDowngradeDismiss}
      />

      {/* Confirmation/Alert Dialog */}
      <ConfirmationDialog {...dialogConfig} onCancel={dismissDialog} />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierBadgeSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  trialBadgeContainer: {
    marginTop: spacing.md,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  upgradeButtonText: {
    ...typography.bodyBold,
  },
  upgradeHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  devHint: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  debugSection: {
    marginTop: spacing.lg,
  },
  errorTitle: {
    ...typography.h4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.bodyBold,
  },
});
