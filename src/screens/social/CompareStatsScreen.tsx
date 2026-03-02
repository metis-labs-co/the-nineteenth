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

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Icon } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { usePlayerStatistics } from '@/hooks/usePlayerStatistics';
import { usePlayer } from '@/hooks/usePlayer';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useStatsVisibility } from '@/store/settingsStore';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
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
  ComparisonRow,
  DistributionComparison,
  PlayerCompareHeader,
  SectionHeader,
  ComparisonLegend,
  ParTypeComparison,
} from '@/components/social/comparison';

type Props = NativeStackScreenProps<RootStackParamList, 'CompareStats'>;

// =====================================================
// TYPES
// =====================================================

interface StatsDiff {
  rounds: number;
  competitions: number;
  wins: number;
  holes: number;
  avgScore: number;
  avgPoints: number;
  avgPerHole: number;
  parOrBetter: number;
  birdieRate: number;
  // Putting, FIR, GIR diffs (nullable since stats may not be available)
  avgPuttsPerHole: number | null;
  fairwayPercentage: number | null;
  girPercentage: number | null;
}

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

  // Calculate differences
  const diffs = useMemo((): StatsDiff | null => {
    if (!stats1 || !stats2) return null;

    // Calculate putting diff only if both players have data
    const avgPuttsPerHoleDiff =
      stats1.averagePuttsPerHole !== null && stats2.averagePuttsPerHole !== null
        ? stats1.averagePuttsPerHole - stats2.averagePuttsPerHole
        : null;

    // Calculate FIR diff only if both players have data
    const fairwayPercentageDiff =
      stats1.fairwayPercentage !== null && stats2.fairwayPercentage !== null
        ? stats1.fairwayPercentage - stats2.fairwayPercentage
        : null;

    // Calculate GIR diff only if both players have data
    const girPercentageDiff =
      stats1.girPercentage !== null && stats2.girPercentage !== null
        ? stats1.girPercentage - stats2.girPercentage
        : null;

    return {
      rounds: stats1.roundsPlayed - stats2.roundsPlayed,
      competitions: stats1.competitionsEntered - stats2.competitionsEntered,
      wins: stats1.competitionsWon - stats2.competitionsWon,
      holes: stats1.holesPlayed - stats2.holesPlayed,
      avgScore: stats1.averageGrossScore - stats2.averageGrossScore,
      avgPoints: stats1.averageStablefordPoints - stats2.averageStablefordPoints,
      avgPerHole: stats1.averageScorePerHole - stats2.averageScorePerHole,
      parOrBetter: stats1.parOrBetterPercentage - stats2.parOrBetterPercentage,
      birdieRate: stats1.birdieOrBetterPercentage - stats2.birdieOrBetterPercentage,
      avgPuttsPerHole: avgPuttsPerHoleDiff,
      fairwayPercentage: fairwayPercentageDiff,
      girPercentage: girPercentageDiff,
    };
  }, [stats1, stats2]);

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

          {/* Stats comparison sections */}
          {hasStats1 && hasStats2 && stats1 && stats2 && diffs && (
            <>
              {/* Overview Comparison */}
              <SectionHeader title="Overview" icon="golf" primaryIcon={false} style={styles.sectionHeader} />
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <ComparisonRow
                  label="Rounds"
                  value1={stats1.roundsPlayed}
                  value2={stats2.roundsPlayed}
                  diff={diffs.rounds}
                  higherIsBetter
                />
                {!leagueId && (
                  <ComparisonRow
                    label="Competitions"
                    value1={stats1.competitionsEntered}
                    value2={stats2.competitionsEntered}
                    diff={diffs.competitions}
                    higherIsBetter
                  />
                )}
                {!leagueId && (
                  <ComparisonRow
                    label="Wins"
                    value1={stats1.competitionsWon}
                    value2={stats2.competitionsWon}
                    diff={diffs.wins}
                    higherIsBetter
                  />
                )}
                <ComparisonRow
                  label="Holes"
                  value1={stats1.holesPlayed}
                  value2={stats2.holesPlayed}
                  diff={diffs.holes}
                  higherIsBetter
                />
              </View>

              {/* Averages Comparison */}
              <SectionHeader title="Averages" icon="chart-line" primaryIcon={false} style={styles.sectionHeader} />
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <ComparisonRow
                  label="Avg Score"
                  value1={stats1.averageGrossScore || '-'}
                  value2={stats2.averageGrossScore || '-'}
                  diff={stats1.averageGrossScore && stats2.averageGrossScore ? diffs.avgScore : undefined}
                  higherIsBetter={false}
                  decimals={1}
                />
                <ComparisonRow
                  label="Avg Points"
                  value1={stats1.averageStablefordPoints || '-'}
                  value2={stats2.averageStablefordPoints || '-'}
                  diff={stats1.averageStablefordPoints && stats2.averageStablefordPoints ? diffs.avgPoints : undefined}
                  higherIsBetter
                  decimals={1}
                />
                <ComparisonRow
                  label="Per Hole"
                  value1={stats1.averageScorePerHole?.toFixed(2) || '-'}
                  value2={stats2.averageScorePerHole?.toFixed(2) || '-'}
                  diff={stats1.averageScorePerHole && stats2.averageScorePerHole ? diffs.avgPerHole : undefined}
                  higherIsBetter={false}
                  decimals={2}
                />
                <ComparisonRow
                  label="Par or Better"
                  value1={`${stats1.parOrBetterPercentage}`}
                  value2={`${stats2.parOrBetterPercentage}`}
                  diff={diffs.parOrBetter}
                  higherIsBetter
                  suffix="%"
                  decimals={1}
                />
              </View>

              {/* Score Distribution Comparison */}
              <SectionHeader title="Score Distribution" icon="chart-bar" primaryIcon={false} style={styles.sectionHeader} />
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <DistributionComparison
                  label="Eagles"
                  count1={stats1.scoreDistribution.eagles}
                  count2={stats2.scoreDistribution.eagles}
                  total1={stats1.totalScoreDistribution}
                  total2={stats2.totalScoreDistribution}
                  color={colors.eagle}
                />
                <DistributionComparison
                  label="Birdies"
                  count1={stats1.scoreDistribution.birdies}
                  count2={stats2.scoreDistribution.birdies}
                  total1={stats1.totalScoreDistribution}
                  total2={stats2.totalScoreDistribution}
                  color={colors.birdie}
                />
                <DistributionComparison
                  label="Pars"
                  count1={stats1.scoreDistribution.pars}
                  count2={stats2.scoreDistribution.pars}
                  total1={stats1.totalScoreDistribution}
                  total2={stats2.totalScoreDistribution}
                  color={colors.par}
                />
                <DistributionComparison
                  label="Bogeys"
                  count1={stats1.scoreDistribution.bogeys}
                  count2={stats2.scoreDistribution.bogeys}
                  total1={stats1.totalScoreDistribution}
                  total2={stats2.totalScoreDistribution}
                  color={colors.bogey}
                />
                <DistributionComparison
                  label="Double+"
                  count1={stats1.scoreDistribution.doubleBogeys + stats1.scoreDistribution.triplePlus}
                  count2={stats2.scoreDistribution.doubleBogeys + stats2.scoreDistribution.triplePlus}
                  total1={stats1.totalScoreDistribution}
                  total2={stats2.totalScoreDistribution}
                  color={colors.doubleBogey}
                />
              </View>

              {/* Performance Records */}
              <SectionHeader title="Best Performances" icon="medal" primaryIcon={false} style={styles.sectionHeader} />
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <ComparisonRow
                  label="Best Score"
                  value1={stats1.lowestGrossScore ?? '-'}
                  value2={stats2.lowestGrossScore ?? '-'}
                  diff={
                    stats1.lowestGrossScore && stats2.lowestGrossScore
                      ? stats1.lowestGrossScore - stats2.lowestGrossScore
                      : undefined
                  }
                  higherIsBetter={false}
                />
                <ComparisonRow
                  label="Best Stableford"
                  value1={stats1.highestStablefordPoints ?? '-'}
                  value2={stats2.highestStablefordPoints ?? '-'}
                  diff={
                    stats1.highestStablefordPoints && stats2.highestStablefordPoints
                      ? stats1.highestStablefordPoints - stats2.highestStablefordPoints
                      : undefined
                  }
                  higherIsBetter
                  suffix=" pts"
                />
                <ComparisonRow
                  label="Birdie Rate"
                  value1={`${stats1.birdieOrBetterPercentage}`}
                  value2={`${stats2.birdieOrBetterPercentage}`}
                  diff={diffs.birdieRate}
                  higherIsBetter
                  suffix="%"
                  decimals={1}
                />
              </View>

              {/* Game Stats (Putting, FIR, GIR) - Shown based on settings */}
              {(showPutts || showFairwayHit || showGreenInRegulation) && (
                <>
                  <SectionHeader title="Game Stats" icon="golf" primaryIcon={false} style={styles.sectionHeader} />
                  <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    {/* Putting Comparison */}
                    {showPutts && (
                      <ComparisonRow
                        label="Avg Putts/Hole"
                        value1={stats1.averagePuttsPerHole?.toFixed(2) ?? '-'}
                        value2={stats2.averagePuttsPerHole?.toFixed(2) ?? '-'}
                        diff={diffs.avgPuttsPerHole ?? undefined}
                        higherIsBetter={false}
                        decimals={2}
                      />
                    )}

                    {/* FIR Comparison */}
                    {showFairwayHit && (
                      <ComparisonRow
                        label="Fairways Hit"
                        value1={stats1.fairwayPercentage !== null ? `${stats1.fairwayPercentage}` : '-'}
                        value2={stats2.fairwayPercentage !== null ? `${stats2.fairwayPercentage}` : '-'}
                        diff={diffs.fairwayPercentage ?? undefined}
                        higherIsBetter
                        suffix="%"
                        decimals={1}
                      />
                    )}

                    {/* GIR Comparison */}
                    {showGreenInRegulation && (
                      <ComparisonRow
                        label="Greens in Reg"
                        value1={stats1.girPercentage !== null ? `${stats1.girPercentage}` : '-'}
                        value2={stats2.girPercentage !== null ? `${stats2.girPercentage}` : '-'}
                        diff={diffs.girPercentage ?? undefined}
                        higherIsBetter
                        suffix="%"
                        decimals={1}
                      />
                    )}
                  </View>
                </>
              )}

              {/* Par Type Comparison */}
              <ParTypeComparison
                player1Par3={stats1.par3Stats}
                player2Par3={stats2.par3Stats}
                player1Par4={stats1.par4Stats}
                player2Par4={stats2.par4Stats}
                player1Par5={stats1.par5Stats}
                player2Par5={stats2.par5Stats}
                player1Name={player1.name}
                player2Name={player2.name}
              />

              {/* Short Game Comparison */}
              <SectionHeader title="Short Game" icon="golf" primaryIcon={false} style={styles.sectionHeader} />
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <ComparisonRow
                  label="Scrambling"
                  value1={stats1.shortGame.scramblingPercentage !== null ? `${stats1.shortGame.scramblingPercentage}` : '-'}
                  value2={stats2.shortGame.scramblingPercentage !== null ? `${stats2.shortGame.scramblingPercentage}` : '-'}
                  diff={
                    stats1.shortGame.scramblingPercentage !== null && stats2.shortGame.scramblingPercentage !== null
                      ? stats1.shortGame.scramblingPercentage - stats2.shortGame.scramblingPercentage
                      : undefined
                  }
                  higherIsBetter
                  suffix="%"
                  decimals={1}
                />
                <ComparisonRow
                  label="Bogey Avoidance"
                  value1={`${stats1.shortGame.bogeyAvoidanceRate}`}
                  value2={`${stats2.shortGame.bogeyAvoidanceRate}`}
                  diff={stats1.shortGame.bogeyAvoidanceRate - stats2.shortGame.bogeyAvoidanceRate}
                  higherIsBetter
                  suffix="%"
                  decimals={1}
                />
                <ComparisonRow
                  label="Double+ Rate"
                  value1={`${stats1.shortGame.doubleBogeyOrWorseRate}`}
                  value2={`${stats2.shortGame.doubleBogeyOrWorseRate}`}
                  diff={stats1.shortGame.doubleBogeyOrWorseRate - stats2.shortGame.doubleBogeyOrWorseRate}
                  higherIsBetter={false}
                  suffix="%"
                  decimals={1}
                />
              </View>

              {/* Putting Depth Comparison */}
              {showPutts && (
                <>
                  <SectionHeader title="Putting Analysis" icon="golf" primaryIcon={false} style={styles.sectionHeader} />
                  <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <ComparisonRow
                      label="One-Putt %"
                      value1={stats1.puttingDepth.onePuttPercentage !== null ? `${stats1.puttingDepth.onePuttPercentage}` : '-'}
                      value2={stats2.puttingDepth.onePuttPercentage !== null ? `${stats2.puttingDepth.onePuttPercentage}` : '-'}
                      diff={
                        stats1.puttingDepth.onePuttPercentage !== null && stats2.puttingDepth.onePuttPercentage !== null
                          ? stats1.puttingDepth.onePuttPercentage - stats2.puttingDepth.onePuttPercentage
                          : undefined
                      }
                      higherIsBetter
                      suffix="%"
                      decimals={1}
                    />
                    <ComparisonRow
                      label="Three-Putt %"
                      value1={stats1.puttingDepth.threePuttPercentage !== null ? `${stats1.puttingDepth.threePuttPercentage}` : '-'}
                      value2={stats2.puttingDepth.threePuttPercentage !== null ? `${stats2.puttingDepth.threePuttPercentage}` : '-'}
                      diff={
                        stats1.puttingDepth.threePuttPercentage !== null && stats2.puttingDepth.threePuttPercentage !== null
                          ? stats1.puttingDepth.threePuttPercentage - stats2.puttingDepth.threePuttPercentage
                          : undefined
                      }
                      higherIsBetter={false}
                      suffix="%"
                      decimals={1}
                    />
                    <ComparisonRow
                      label="Putts per GIR"
                      value1={stats1.puttingDepth.puttsPerGIR !== null ? stats1.puttingDepth.puttsPerGIR.toFixed(2) : '-'}
                      value2={stats2.puttingDepth.puttsPerGIR !== null ? stats2.puttingDepth.puttsPerGIR.toFixed(2) : '-'}
                      diff={
                        stats1.puttingDepth.puttsPerGIR !== null && stats2.puttingDepth.puttsPerGIR !== null
                          ? stats1.puttingDepth.puttsPerGIR - stats2.puttingDepth.puttsPerGIR
                          : undefined
                      }
                      higherIsBetter={false}
                      decimals={2}
                    />
                  </View>
                </>
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
  sectionHeader: {
    marginTop: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
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
