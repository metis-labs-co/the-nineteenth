/**
 * MyStatisticsScreen - Display comprehensive player statistics
 *
 * Shows tier-appropriate stats:
 * - BasicStats: Always visible (rounds played, total points, competitions)
 * - ScoreDistribution: Locked for Free tier (Social+ required)
 * - AdvancedAnalytics: Locked for Free/Social (Premium required)
 *
 * Each locked section shows a FeatureLock overlay with upgrade prompt.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerStatistics } from '@/hooks/usePlayerStatistics';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useStatsVisibility } from '@/store/settingsStore';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { UpgradePrompt } from '@/components/subscription';
import {
  ParTypeStatsSection,
  ShortGameSection,
  PuttingAnalysisSection,
} from '@/components/statistics';

// Local components and hooks
import { useStatsUpgradePrompt } from './hooks';
import {
  StatisticsLoadingState,
  StatisticsErrorState,
  StatisticsEmptyState,
  OverviewStats,
  GameStats,
  ScoreDistributionSection,
  AdvancedAnalytics,
} from './components';

// =====================================================
// TYPES
// =====================================================

type Props = NativeStackScreenProps<RootStackParamList, 'MyStatistics'>;

// =====================================================
// COMPONENT
// =====================================================

export default function MyStatisticsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const colors = useThemeColors();
  const { checkFeature } = useSubscriptionContext();
  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = usePlayerStatistics(user?.id);

  // Get stats visibility settings
  const { showPutts, showFairwayHit, showGreenInRegulation } = useStatsVisibility();

  // Upgrade prompt handling
  const {
    upgradePromptConfig,
    handleScoreDistributionUpgrade,
    handleAdvancedStatsUpgrade,
    handleNavigateToSubscription,
    handleDismissPrompt,
  } = useStatsUpgradePrompt();

  // Check feature access (used to determine which sections to lock)
  checkFeature('score_distribution');
  checkFeature('advanced_stats');

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="My Statistics" showBack onBack={handleGoBack} />
        <StatisticsLoadingState />
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="My Statistics" showBack onBack={handleGoBack} />
        <StatisticsErrorState error={error} onRetry={handleRefresh} />
      </View>
    );
  }

  // Render empty state
  if (!stats || stats.roundsPlayed === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="My Statistics" showBack onBack={handleGoBack} />
        <StatisticsEmptyState />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="My Statistics"
        showBack
        onBack={handleGoBack}
        rightActions={[
          {
            icon: 'refresh',
            onPress: handleRefresh,
            accessibilityLabel: 'Refresh statistics',
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.textPrimary}
            colors={[colors.textPrimary]}
          />
        }
      >
        {/* Section 1: Basic Stats - Always visible */}
        <OverviewStats stats={stats} />

        {/* Section 1b: Game Stats (Putting, FIR, GIR) - Based on settings */}
        <GameStats
          stats={stats}
          showPutts={showPutts}
          showFairwayHit={showFairwayHit}
          showGreenInRegulation={showGreenInRegulation}
        />

        {/* Section 2: Par Type Stats - Social+ tier */}
        <ParTypeStatsSection
          par3Stats={stats.par3Stats}
          par4Stats={stats.par4Stats}
          par5Stats={stats.par5Stats}
        />

        {/* Section 3: Short Game - Social+ tier */}
        <ShortGameSection shortGame={stats.shortGame} />

        {/* Section 4: Putting Analysis - Social+ tier */}
        <PuttingAnalysisSection
          puttingDepth={stats.puttingDepth}
          averagePuttsPerHole={stats.averagePuttsPerHole}
          totalPuttsPerRound={stats.averagePuttsPerRound}
        />

        {/* Section 5: Score Distribution - Social+ tier */}
        <ScoreDistributionSection
          stats={stats}
          onUpgradePress={handleScoreDistributionUpgrade}
        />

        {/* Section 6: Advanced Analytics - Premium tier */}
        <AdvancedAnalytics
          stats={stats}
          onUpgradePress={handleAdvancedStatsUpgrade}
        />

        <View style={styles.footer} />
      </ScrollView>

      {/* Upgrade Prompt Modal */}
      {upgradePromptConfig && (
        <UpgradePrompt
          config={upgradePromptConfig}
          onUpgrade={handleNavigateToSubscription}
          onDismiss={handleDismissPrompt}
          visible={!!upgradePromptConfig}
        />
      )}
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
  },
  footer: {
    height: spacing.xxxl,
  },
});
