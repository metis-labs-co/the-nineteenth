/**
 * CompareOverviewTab - Overview tab for Compare Stats screen
 *
 * Displays:
 * - Overview section: Rounds, Competitions*, Wins*, Holes (*hidden in league context)
 * - Averages section: Avg Score, Avg Points, Per Hole, Par or Better
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import { ComparisonRow, SectionHeader } from '@/components/social/comparison';
import type { PlayerStatistics } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

interface CompareOverviewTabProps {
  stats1: PlayerStatistics;
  stats2: PlayerStatistics;
  isLeagueContext: boolean;
}

// =====================================================
// COMPONENT
// =====================================================

export const CompareOverviewTab = React.memo(function CompareOverviewTab({
  stats1,
  stats2,
  isLeagueContext,
}: CompareOverviewTabProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Overview Section */}
      <SectionHeader title="Overview" icon="golf" primaryIcon={false} style={styles.sectionHeader} />
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ComparisonRow
          label="Rounds"
          value1={stats1.roundsPlayed}
          value2={stats2.roundsPlayed}
          diff={stats1.roundsPlayed - stats2.roundsPlayed}
          higherIsBetter
        />
        {!isLeagueContext && (
          <ComparisonRow
            label="Competitions"
            value1={stats1.competitionsEntered}
            value2={stats2.competitionsEntered}
            diff={stats1.competitionsEntered - stats2.competitionsEntered}
            higherIsBetter
          />
        )}
        {!isLeagueContext && (
          <ComparisonRow
            label="Wins"
            value1={stats1.competitionsWon}
            value2={stats2.competitionsWon}
            diff={stats1.competitionsWon - stats2.competitionsWon}
            higherIsBetter
          />
        )}
        <ComparisonRow
          label="Holes"
          value1={stats1.holesPlayed}
          value2={stats2.holesPlayed}
          diff={stats1.holesPlayed - stats2.holesPlayed}
          higherIsBetter
        />
      </View>

      {/* Averages Section */}
      <SectionHeader title="Averages" icon="chart-line" primaryIcon={false} style={styles.sectionHeader} />
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <ComparisonRow
          label="Avg Score"
          value1={stats1.averageGrossScore || '-'}
          value2={stats2.averageGrossScore || '-'}
          diff={
            stats1.averageGrossScore && stats2.averageGrossScore
              ? stats1.averageGrossScore - stats2.averageGrossScore
              : undefined
          }
          higherIsBetter={false}
          decimals={1}
        />
        <ComparisonRow
          label="Avg Points"
          value1={stats1.averageStablefordPoints || '-'}
          value2={stats2.averageStablefordPoints || '-'}
          diff={
            stats1.averageStablefordPoints && stats2.averageStablefordPoints
              ? stats1.averageStablefordPoints - stats2.averageStablefordPoints
              : undefined
          }
          higherIsBetter
          decimals={1}
        />
        <ComparisonRow
          label="Per Hole"
          value1={stats1.averageScorePerHole?.toFixed(2) || '-'}
          value2={stats2.averageScorePerHole?.toFixed(2) || '-'}
          diff={
            stats1.averageScorePerHole && stats2.averageScorePerHole
              ? stats1.averageScorePerHole - stats2.averageScorePerHole
              : undefined
          }
          higherIsBetter={false}
          decimals={2}
        />
        <ComparisonRow
          label="Par or Better"
          value1={`${stats1.parOrBetterPercentage}`}
          value2={`${stats2.parOrBetterPercentage}`}
          diff={stats1.parOrBetterPercentage - stats2.parOrBetterPercentage}
          higherIsBetter
          suffix="%"
          decimals={1}
        />
      </View>
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
