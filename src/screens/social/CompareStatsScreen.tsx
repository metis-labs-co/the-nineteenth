/**
 * CompareStatsScreen - Compare statistics between two players
 *
 * Shows side-by-side comparison with:
 * - Player headers with avatars
 * - Overview stats comparison
 * - Score distribution comparison (bar chart)
 * - Performance metrics with +/- differences
 * - Color-coded indicators (green = better, red = worse)
 *
 * Tier-gated: Requires Social tier or higher (compare_stats feature)
 * Free tier users see an UpgradePrompt instead of the comparison.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Icon } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { usePlayerStatistics } from '@/hooks/usePlayerStatistics';
import { usePlayer } from '@/hooks/usePlayer';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useStatsVisibility } from '@/store/settingsStore';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';

// Common components
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';

// Subscription components
import { FeatureLock, UpgradePrompt } from '@/components/subscription';
import type { UpgradePromptConfig } from '@/components/subscription';

// Comparison components
import {
  PlayerCompareHeader,
  ComparisonLegend,
} from '@/components/social/comparison';

// Compare tab components
import {
  CompareTabBar,
  CompareOverviewTab,
  CompareScoringTab,
  CompareGameStatsTab,
} from './compare';
import type { CompareTab } from './compare';

type Props = NativeStackScreenProps<RootStackParamList, 'CompareStats'>;

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function CompareStatsScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const { playerId1, playerId2, leagueId, competitionId, filterLabel } = route.params;
  const { checkFeature } = useSubscriptionContext();

  // Get stats visibility settings
  const { showPutts, showFairwayHit, showGreenInRegulation } = useStatsVisibility();

  // Check feature access - use filtered gate when filters are present
  const hasFilters = !!leagueId || !!competitionId;
  const featureId = hasFilters ? 'compare_stats_filtered' : 'compare_stats';
  const compareStatsAccess = checkFeature(featureId);

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(!compareStatsAccess.allowed);

  // Build filter options for statistics hooks
  const statsOptions = hasFilters ? { leagueId, competitionId } : {};

  // Fetch player profiles
  const { data: player1, isLoading: isLoadingPlayer1 } = usePlayer(playerId1);
  const { data: player2, isLoading: isLoadingPlayer2 } = usePlayer(playerId2);

  // Fetch player statistics (filtered when league/competition params present)
  const { data: stats1, isLoading: isLoadingStats1 } = usePlayerStatistics(playerId1, statsOptions);
  const { data: stats2, isLoading: isLoadingStats2 } = usePlayerStatistics(playerId2, statsOptions);

  const isLoading = isLoadingPlayer1 || isLoadingPlayer2 || isLoadingStats1 || isLoadingStats2;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Navigate to subscription screen
  const handleNavigateToSubscription = useCallback(() => {
    setShowUpgradePrompt(false);
    navigation.navigate('Subscription');
  }, [navigation]);

  // Handle dismiss - just close the prompt, they can see blurred content
  const handleDismissUpgrade = useCallback(() => {
    setShowUpgradePrompt(false);
  }, []);

  // Handler to re-show upgrade prompt when tapping on locked content
  const handleShowUpgradePrompt = useCallback(() => {
    setShowUpgradePrompt(true);
  }, []);

  // Active tab state
  const [activeTab, setActiveTab] = useState<CompareTab>('overview');

  // Upgrade prompt configuration
  const upgradePromptConfig: UpgradePromptConfig = hasFilters
    ? {
        feature: 'compare_stats_filtered',
        title: 'Filtered Stats Comparison',
        message: 'Upgrade to Premium to compare stats within a specific league or competition.',
        targetTier: 'premium',
        benefits: [
          'Compare stats within leagues',
          'Compare stats within competitions',
          'See head-to-head performance',
          'Detailed filtered breakdowns',
        ],
      }
    : {
        feature: 'compare_stats',
        title: 'Compare Stats with Friends',
        message: 'Upgrade to Social tier to compare your statistics with other players.',
        targetTier: 'social',
        benefits: [
          'Side-by-side stats comparison',
          'See who performs better',
          'Track progress against friends',
          'Detailed score breakdowns',
        ],
      };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
        <PageHeader
          variant="centered"
          title="Compare Stats"
          showBack
          onBack={handleGoBack}
        />
        <LoadingSpinner size="lg" message="Loading comparison..." />
      </SafeAreaView>
    );
  }

  // Error state
  if (!player1 || !player2) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
        <PageHeader
          variant="centered"
          title="Compare Stats"
          showBack
          onBack={handleGoBack}
        />
        <ErrorState
          error="Could not load player data for comparison."
          title="Unable to load players"
          retryLabel="Go Back"
          onRetry={handleGoBack}
        />
      </SafeAreaView>
    );
  }

  // Check if either player has no stats
  const hasStats1 = stats1 && stats1.roundsPlayed > 0;
  const hasStats2 = stats2 && stats2.roundsPlayed > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
      <PageHeader
        variant="centered"
        title="Compare Stats"
        showBack
        onBack={handleGoBack}
      />

      <FeatureLock
        feature={featureId}
        onUpgradePress={handleShowUpgradePrompt}
        lockedMessage={hasFilters ? 'Upgrade to Premium for filtered comparison' : 'Upgrade to compare stats with friends'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Player Headers */}
          <PlayerCompareHeader
            player1={player1}
            player2={player2}
            isPlayer1You
          />

          {/* Filter context badge */}
          {filterLabel && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primaryBackground }]}>
              <Icon
                source={leagueId ? 'trophy-outline' : 'flag-outline'}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.filterBadgeText, { color: colors.primary }]}>
                {filterLabel}
              </Text>
            </View>
          )}

          {/* No stats warning */}
          {(!hasStats1 || !hasStats2) && (
            <View style={[styles.noStatsCard, { backgroundColor: withOpacity(colors.warningLight, 0.19) }]}>
              <Icon source="information" size={24} color={colors.warning} />
              <Text style={[styles.noStatsText, { color: colors.warningDark }]}>
                {!hasStats1 && !hasStats2
                  ? 'Neither player has completed any rounds yet.'
                  : !hasStats1
                    ? "You haven't completed any rounds yet."
                    : `${player2.name} hasn't completed any rounds yet.`}
              </Text>
            </View>
          )}

          {/* Tab Bar */}
          {hasStats1 && hasStats2 && stats1 && stats2 && (
            <CompareTabBar selectedTab={activeTab} onTabChange={setActiveTab} />
          )}

          {/* Tab Content */}
          {hasStats1 && hasStats2 && stats1 && stats2 && (
            <>
              {activeTab === 'overview' && (
                <CompareOverviewTab
                  stats1={stats1}
                  stats2={stats2}
                  isLeagueContext={!!leagueId}
                />
              )}
              {activeTab === 'scoring' && (
                <CompareScoringTab
                  stats1={stats1}
                  stats2={stats2}
                  player1Name={player1.name}
                  player2Name={player2.name}
                />
              )}
              {activeTab === 'gameStats' && (
                <CompareGameStatsTab
                  stats1={stats1}
                  stats2={stats2}
                  player1Name={player1.name}
                  player2Name={player2.name}
                  showPutts={showPutts}
                  showFairwayHit={showFairwayHit}
                  showGreenInRegulation={showGreenInRegulation}
                />
              )}
            </>
          )}

          {/* Legend */}
          <ComparisonLegend />

          {/* Footer spacing */}
          <View style={styles.footer} />
        </ScrollView>
      </FeatureLock>

      {/* Upgrade Prompt for Free tier users */}
      {!compareStatsAccess.allowed && showUpgradePrompt && (
        <UpgradePrompt
          config={upgradePromptConfig}
          onUpgrade={handleNavigateToSubscription}
          onDismiss={handleDismissUpgrade}
          visible={showUpgradePrompt}
        />
      )}
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
  },
  noStatsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  noStatsText: {
    flex: 1,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  filterBadgeText: {
    ...typography.smallBold,
  },
  footer: {
    height: spacing.xxxl,
  },
});
