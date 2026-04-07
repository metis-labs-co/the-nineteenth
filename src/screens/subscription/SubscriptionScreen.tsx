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

import React, { useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LoadingSpinner, ConfirmationDialog, PageHeader } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import {
  TierBadge,
  UpgradePrompt,
  Paywall,
  TrialBadge,
  InfoBanner,
  PlanSummaryCard,
  UsageSection,
  DebugInfoSection,
  DowngradeConfirmationModal,
} from '@/components/subscription';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';

import { useSubscriptionState } from './useSubscriptionState';
import { PlansComparison } from './PlansComparison';
import { UpgradeSection } from './UpgradeSection';

// ============================================================================
// TYPES
// ============================================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Subscription'>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function SubscriptionScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const {
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
  } = useSubscriptionState();

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
          <PlansComparison
            tier={tier}
            allTierLimits={allTierLimits}
            isDevSimulationMode={isDevSimulationMode}
            onPlanPress={handlePlanCardPress}
          />
        )}

        {/* Upgrade Button */}
        {!isPremium && !isSuperAdmin && (
          <UpgradeSection
            purchasesEnabled={purchasesEnabled}
            onUpgradePress={handleUpgradePress}
          />
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
  tierBadgeSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  trialBadgeContainer: {
    marginTop: spacing.md,
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
