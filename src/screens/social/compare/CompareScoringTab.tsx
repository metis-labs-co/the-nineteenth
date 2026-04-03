/**
 * CompareScoringTab - Scoring tab for Compare Stats screen
 *
 * Displays:
 * - Score Distribution: Eagles, Birdies, Pars, Bogeys, Double+
 * - Best Performances: Best Score, Best Stableford, Birdie Rate
 * - Par Type Comparison: Par 3, 4, 5 breakdowns
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import {
  ComparisonRow,
  DistributionComparison,
  SectionHeader,
  ParTypeComparison,
} from '@/components/social/comparison';
import type { PlayerStatistics } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

interface CompareScoringTabProps {
  stats1: PlayerStatistics;
  stats2: PlayerStatistics;
  player1Name: string;
  player2Name: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const CompareScoringTab = React.memo(function CompareScoringTab({
  stats1,
  stats2,
  player1Name,
  player2Name,
}: CompareScoringTabProps) {
  const colors = useThemeColors();

  return (
    <>
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

      {/* Best Performances */}
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
          diff={stats1.birdieOrBetterPercentage - stats2.birdieOrBetterPercentage}
          higherIsBetter
          suffix="%"
          decimals={1}
        />
      </View>

      {/* Par Type Comparison */}
      <ParTypeComparison
        player1Par3={stats1.par3Stats}
        player2Par3={stats2.par3Stats}
        player1Par4={stats1.par4Stats}
        player2Par4={stats2.par4Stats}
        player1Par5={stats1.par5Stats}
        player2Par5={stats2.par5Stats}
        player1Name={player1Name}
        player2Name={player2Name}
      />
    </>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  sectionHeader: {
    marginTop: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
});
