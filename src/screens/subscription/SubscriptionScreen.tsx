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

import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { LoadingSpinner } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { TierBadge } from '@/components/subscription/TierBadge';
import { LimitIndicator } from '@/components/subscription/LimitIndicator';
import { UpgradePrompt, UpgradePromptConfig } from '@/components/subscription/UpgradePrompt';
import { Paywall } from '@/components/subscription/Paywall';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { SubscriptionTier } from '@/types/subscription.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
 * Feature labels for plan comparison
 */
const FEATURE_LABELS: Record<string, string> = {
  maxCompetitionsOwned: 'Competitions',
  maxRoundsPerCompetition: 'Rounds per competition',
  maxPlayersPerCompetition: 'Players per competition',
  maxFriends: 'Friends',
  allowedGameTypes: 'Game types',
  canUseTeamFormats: 'Team formats',
  canUseScoringPairs: 'Scoring pairs',
  canViewScoreDistribution: 'Score distribution',
  canViewAdvancedStats: 'Advanced analytics',
  canCompareStats: 'Compare stats',
};

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

  // Refresh subscription data when screen gains focus
  // This ensures we always show current user's subscription, not cached data
  useFocusEffect(
    useCallback(() => {
      // Refresh subscription context data
      refresh();
      // Also invalidate the usage count queries
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['competitions', 'count', user.id] });
        queryClient.invalidateQueries({ queryKey: ['friends', 'count', user.id] });
        queryClient.invalidateQueries({ queryKey: ['standaloneRoundsPlayedCount', user.id] });
      }
    }, [refresh, queryClient, user?.id])
  );

  // Fetch competition count for usage display
  // Count ALL competitions owned by user (regardless of status)
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

  // Check if user has unlimited rounds
  const maxRoundsPlayed = limits?.maxRoundsPlayed ?? 20;
  const hasUnlimitedRounds = isUnlimited(maxRoundsPlayed) || isNoLimit(maxRoundsPlayed);

  // Fetch standalone rounds played count for usage display
  // Only counts standalone/social rounds, NOT competition rounds
  const { data: roundsPlayedCount = 0 } = useQuery({
    queryKey: ['standaloneRoundsPlayedCount', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // Count completed/confirmed scorecards for standalone rounds only
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

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  // Upgrade prompt config - dynamic based on selected tier
  const upgradeConfig: UpgradePromptConfig = useMemo(() => {
    const targetLimits = allTierLimits?.[selectedUpgradeTier];
    const benefits: string[] = [];

    if (selectedUpgradeTier === 'social') {
      benefits.push(
        'Up to 5 competitions',
        'Up to 16 players per competition',
        'Unlimited social rounds',
        'Stroke play format',
        'Score distribution analytics'
      );
    } else if (selectedUpgradeTier === 'premium') {
      benefits.push(
        'Unlimited competitions',
        'Up to 40 players per competition',
        'All game types including team formats',
        'Advanced analytics',
        'Scoring pairs for tournaments'
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

  // Handle upgrade press - show paywall if available, otherwise show prompt
  const handleUpgradePress = useCallback(() => {
    // Default to social if free, otherwise premium
    setSelectedUpgradeTier(tier === 'free' ? 'social' : 'premium');
    if (purchasesEnabled) {
      setShowPaywall(true);
    } else {
      setShowUpgradePrompt(true);
    }
  }, [purchasesEnabled, tier]);

  // Handle plan card press - show upgrade prompt for that tier
  const handlePlanCardPress = useCallback((selectedTier: SubscriptionTier) => {
    // Don't show prompt for current tier or downgrade
    const tierOrder: Record<SubscriptionTier, number> = {
      free: 0,
      social: 1,
      premium: 2,
      super_admin: 3,
    };

    if (tierOrder[selectedTier] <= tierOrder[tier]) {
      // Current tier or downgrade - do nothing
      return;
    }

    setSelectedUpgradeTier(selectedTier);
    if (purchasesEnabled) {
      setShowPaywall(true);
    } else {
      setShowUpgradePrompt(true);
    }
  }, [tier, purchasesEnabled]);

  // Handle upgrade action from prompt - opens paywall or contact support
  const handleUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
    if (purchasesEnabled) {
      setShowPaywall(true);
    } else {
      // Show an alert explaining IAP isn't available with debug info
      const debugInfo = __DEV__
        ? '\n\n[Debug] This may be because RevenueCat failed to initialize. Check logs for details.'
        : '';
      Alert.alert(
        'Purchases Not Available',
        `In-app purchases are not currently available. This could be because:\n\n` +
        `• The app is running in Expo Go (use TestFlight instead)\n` +
        `• RevenueCat is still initializing (try again in a moment)\n` +
        `• There was an initialization error\n\n` +
        `If you're in TestFlight and this persists, please contact support.${debugInfo}`,
        [{ text: 'OK' }]
      );
    }
  }, [purchasesEnabled]);

  // Handle successful purchase - refresh subscription data
  const handlePurchaseSuccess = useCallback((newTier: SubscriptionTier) => {
    refresh();
    console.log(`[SubscriptionScreen] Purchase successful, new tier: ${newTier}`);
  }, [refresh]);

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
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            paddingTop: insets.top + spacing.md,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon source="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Subscription
        </Text>
        <View style={styles.headerSpacer} />
      </View>

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
          />
        }
      >
        {/* Tier Badge Section */}
        <View style={[styles.section, styles.tierBadgeSection]}>
          <TierBadge size="large" />
          {isOnTrial && (
            <View
              style={[
                styles.trialBadge,
                { backgroundColor: colors.warningBackground },
              ]}
            >
              <Icon source="clock-outline" size={16} color={colors.warning} />
              <Text style={[styles.trialText, { color: colors.warning }]}>
                {trialDaysRemaining} {trialDaysRemaining === 1 ? 'day' : 'days'} left in trial
              </Text>
            </View>
          )}
        </View>

        {/* Super Admin Banner */}
        {isSuperAdmin && (
          <View
            style={[
              styles.superAdminBanner,
              {
                backgroundColor: colors.errorBackground,
                borderColor: colors.error,
              },
            ]}
          >
            <Icon source="shield-account" size={24} color={colors.error} />
            <View style={styles.superAdminTextContainer}>
              <Text style={[styles.superAdminTitle, { color: colors.error }]}>
                Internal Account
              </Text>
              <Text style={[styles.superAdminDescription, { color: colors.textSecondary }]}>
                This is a company account with full access to all features.
              </Text>
            </View>
          </View>
        )}

        {/* Your Plan Section */}
        <View style={[styles.section, styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Your Plan
          </Text>
          <Text style={[styles.planName, { color: colors.textPrimary }]}>
            {limits?.displayName ?? 'Free'}
          </Text>
          {limits?.description && (
            <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
              {limits.description}
            </Text>
          )}
        </View>

        {/* Usage Section */}
        <View style={[styles.section, styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Usage
          </Text>

          {isSuperAdmin ? (
            <View style={styles.noLimitsContainer}>
              <Icon source="infinity" size={32} color={colors.primary} />
              <Text style={[styles.noLimitsText, { color: colors.textSecondary }]}>
                No limits - you have full access to all features
              </Text>
            </View>
          ) : (
            <View style={styles.usageGrid}>
              <LimitIndicator
                current={competitionCount}
                max={limits?.maxCompetitionsOwned ?? 1}
                label="Competitions"
                testID="competitions-limit"
              />
              <LimitIndicator
                current={friendsCount}
                max={limits?.maxFriends ?? 10}
                label="Friends"
                testID="friends-limit"
              />
              <LimitIndicator
                current={roundsPlayedCount}
                max={maxRoundsPlayed}
                label="Social Rounds"
                testID="social-rounds-limit"
              />
            </View>
          )}
        </View>

        {/* All Plans Section */}
        {!isSuperAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: spacing.lg }]}>
              All Plans
            </Text>

            {COMPARISON_TIERS.map((comparisonTier) => {
              const tierLimits = allTierLimits?.[comparisonTier];
              if (!tierLimits) return null;

              const isCurrentTier = tier === comparisonTier;
              const tierColor = tierLimits.badgeColor ?? colors.gray400;

              // Check if this is an upgrade option
              const tierOrder: Record<SubscriptionTier, number> = {
                free: 0,
                social: 1,
                premium: 2,
                super_admin: 3,
              };
              const isUpgradeOption = tierOrder[comparisonTier] > tierOrder[tier];

              return (
                <TouchableOpacity
                  key={comparisonTier}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isCurrentTier ? tierColor : colors.border,
                      borderWidth: isCurrentTier ? 2 : 1,
                    },
                  ]}
                  onPress={() => handlePlanCardPress(comparisonTier)}
                  activeOpacity={isUpgradeOption ? 0.7 : 1}
                  accessibilityRole="button"
                  accessibilityLabel={`${tierLimits.displayName} plan${isCurrentTier ? ' (current)' : isUpgradeOption ? ' - tap to upgrade' : ''}`}
                >
                  {/* Plan Header */}
                  <View style={styles.planCardHeader}>
                    <View style={styles.planCardTitleRow}>
                      <Icon
                        source={TIER_ICONS[comparisonTier]}
                        size={24}
                        color={tierColor}
                      />
                      <Text style={[styles.planCardTitle, { color: colors.textPrimary }]}>
                        {tierLimits.displayName}
                      </Text>
                      {isCurrentTier && (
                        <View
                          style={[
                            styles.currentBadge,
                            { backgroundColor: tierColor },
                          ]}
                        >
                          <Text style={[styles.currentBadgeText, { color: colors.textOnColored }]}>Current</Text>
                        </View>
                      )}
                    </View>
                    {tierLimits.description && (
                      <Text style={[styles.planCardDescription, { color: colors.textSecondary }]}>
                        {tierLimits.description}
                      </Text>
                    )}
                  </View>

                  <Divider style={{ backgroundColor: colors.border }} />

                  {/* Plan Features */}
                  <View style={styles.planFeatures}>
                    <PlanFeatureRow
                      label="Competitions"
                      value={formatLimitValue(tierLimits.maxCompetitionsOwned)}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Social rounds"
                      value={formatLimitValue(
                        tierLimits.maxRoundsPlayed ?? (comparisonTier === 'free' ? 20 : -1)
                      )}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Rounds per competition"
                      value={formatLimitValue(tierLimits.maxRoundsPerCompetition)}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Players per competition"
                      value={formatLimitValue(tierLimits.maxPlayersPerCompetition)}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Friends"
                      value={formatLimitValue(tierLimits.maxFriends)}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Game types"
                      value={formatGameTypes(tierLimits.allowedGameTypes)}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Team formats"
                      value={tierLimits.canUseTeamFormats}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Scoring pairs"
                      value={tierLimits.canUseScoringPairs}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Score distribution"
                      value={tierLimits.canViewScoreDistribution}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Advanced analytics"
                      value={tierLimits.canViewAdvancedStats}
                      colors={colors}
                    />
                    <PlanFeatureRow
                      label="Compare stats"
                      value={tierLimits.canCompareStats}
                      colors={colors}
                    />
                  </View>

                  {/* Upgrade hint for upgrade options */}
                  {isUpgradeOption && (
                    <View style={[styles.upgradeHintRow, { borderTopColor: colors.border }]}>
                      <Icon source="arrow-up-circle" size={16} color={colors.primary} />
                      <Text style={[styles.upgradeHintText, { color: colors.primary }]}>
                        Tap to upgrade
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
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

        {/* Debug Info (visible in all builds for troubleshooting) */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surfaceVariant,
              marginTop: spacing.lg,
              padding: spacing.sm,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Text style={[styles.debugTitle, { color: colors.textSecondary }]}>
            Debug Info
          </Text>
          <Text style={[styles.debugText, { color: colors.textSecondary }]}>
            Provider: {providerType} | Purchases: {purchasesEnabled ? 'enabled' : 'disabled'} | DEV: {__DEV__ ? 'yes' : 'no'}
          </Text>
        </View>
      </ScrollView>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        config={upgradeConfig}
        onUpgrade={handleUpgrade}
        onDismiss={() => setShowUpgradePrompt(false)}
      />

      {/* Paywall Modal (for in-app purchases) */}
      <Paywall
        visible={showPaywall}
        onPurchaseSuccess={handlePurchaseSuccess}
        onDismiss={() => setShowPaywall(false)}
        initialTier={tier === 'free' ? 'social' : 'premium'}
      />
    </View>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PlanFeatureRowProps {
  label: string;
  value: string | boolean;
  colors: ReturnType<typeof useThemeColors>;
}

function PlanFeatureRow({ label, value, colors }: PlanFeatureRowProps) {
  const isBoolean = typeof value === 'boolean';

  return (
    <View style={styles.featureRow}>
      <Text style={[styles.featureLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      {isBoolean ? (
        <Icon
          source={value ? 'check-circle' : 'close-circle'}
          size={20}
          color={value ? colors.success : colors.gray400}
        />
      ) : (
        <Text style={[styles.featureValue, { color: colors.textPrimary }]}>
          {value}
        </Text>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h3,
  },
  headerSpacer: {
    width: 40,
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
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
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
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  trialText: {
    ...typography.small,
    fontWeight: '600',
  },
  superAdminBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  superAdminTextContainer: {
    flex: 1,
  },
  superAdminTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  superAdminDescription: {
    ...typography.small,
  },
  planName: {
    ...typography.h2,
  },
  planDescription: {
    ...typography.body,
  },
  usageGrid: {
    gap: spacing.lg,
  },
  noLimitsContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  noLimitsText: {
    ...typography.body,
    textAlign: 'center',
  },
  planCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  planCardHeader: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  planCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planCardTitle: {
    ...typography.h4,
    flex: 1,
  },
  planCardDescription: {
    ...typography.small,
  },
  currentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  currentBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  planFeatures: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  upgradeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  upgradeHintText: {
    ...typography.smallBold,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureLabel: {
    ...typography.small,
    flex: 1,
  },
  featureValue: {
    ...typography.smallBold,
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
  debugTitle: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  debugText: {
    ...typography.caption,
    fontSize: 11,
  },
});
