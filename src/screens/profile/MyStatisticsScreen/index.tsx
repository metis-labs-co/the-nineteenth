/**
 * MyStatisticsScreen - Display comprehensive player statistics
 *
 * Shows tier-appropriate stats in a 3-tab layout:
 * - Overview: Basic stats, round breakdown, averages, recent rounds
 * - Scoring: Score distribution, par type stats, performance trend, best performances, courses
 * - Game Stats: Driving, approach, short game, putting, bunkers, hazards
 *
 * Each locked section shows a FeatureLock overlay with upgrade prompt.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerStatistics } from '@/hooks/usePlayerStatistics';
import { useSandSaveStats } from '@/hooks/queries/useSandSaveStats';
import { spacing } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { UpgradePrompt } from '@/components/subscription';

// Local components and hooks
import { useStatsUpgradePrompt } from './hooks';
import {
  StatisticsLoadingState,
  StatisticsErrorState,
  StatisticsEmptyState,
  StatisticsTabBar,
  type StatisticsTab,
  OverviewTab,
  ScoringTab,
  GameStatsTab,
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
  const [activeTab, setActiveTab] = useState<StatisticsTab>('overview');
  const {
    data: stats,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = usePlayerStatistics(user?.id);

  // Sand Save % is sourced from view-backed counts (v_sand_saves /
  // v_sand_save_attempts) rather than per-hole shot data, so we merge it
  // into bunkerStats before passing to the Game Stats tab.
  const sandSaveQuery = useSandSaveStats(user?.id);

  // Upgrade prompt handling
  const {
    upgradePromptConfig,
    handleScoreDistributionUpgrade,
    handleAdvancedStatsUpgrade,
    handleGameStatsUpgrade,
    handleNavigateToSubscription,
    handleDismissPrompt,
  } = useStatsUpgradePrompt();

  // Determine which upgrade handler to use based on active tab
  const onUpgradePress =
    activeTab === 'gameStats' ? handleGameStatsUpgrade
    : activeTab === 'scoring' ? handleScoreDistributionUpgrade
    : handleAdvancedStatsUpgrade;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Merge view-backed sand-save aggregates into bunkerStats. Memoize so the
  // GameStatsTab receives a stable reference when neither dependency changes.
  const gameStatsTabStats = useMemo(() => {
    if (!stats) return null;
    return {
      ...stats,
      bunkerStats: {
        ...stats.bunkerStats,
        sandSaves: sandSaveQuery.data?.sandSaves ?? 0,
        sandSaveAttempts: sandSaveQuery.data?.sandSaveAttempts ?? 0,
        sandSavePercentage: sandSaveQuery.data?.sandSavePercentage ?? null,
      },
    };
  }, [stats, sandSaveQuery.data]);

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

      <StatisticsTabBar selectedTab={activeTab} onTabChange={setActiveTab} />

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
        {activeTab === 'overview' && <OverviewTab stats={stats} />}
        {activeTab === 'scoring' && (
          <ScoringTab stats={stats} onUpgradePress={onUpgradePress} />
        )}
        {activeTab === 'gameStats' && gameStatsTabStats && (
          <GameStatsTab
            stats={gameStatsTabStats}
            onUpgradePress={onUpgradePress}
          />
        )}

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
