/**
 * ParTypeComparison - Side-by-side comparison of par type statistics
 *
 * Compares Par 3, Par 4, and Par 5 stats between two players.
 * Shows average score, score-to-par, GIR%, and birdie% for each par type.
 *
 * @example
 * ```tsx
 * <ParTypeComparison
 *   player1Stats={player1.par3Stats}
 *   player2Stats={player2.par3Stats}
 *   player1Name="John"
 *   player2Name="Jane"
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ComparisonRow } from './ComparisonRow';
import type { ParTypeStats } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface ParTypeComparisonProps {
  /** Par 3 stats for player 1 */
  player1Par3: ParTypeStats;
  /** Par 3 stats for player 2 */
  player2Par3: ParTypeStats;
  /** Par 4 stats for player 1 */
  player1Par4: ParTypeStats;
  /** Par 4 stats for player 2 */
  player2Par4: ParTypeStats;
  /** Par 5 stats for player 1 */
  player1Par5: ParTypeStats;
  /** Par 5 stats for player 2 */
  player2Par5: ParTypeStats;
  /** Name of player 1 */
  player1Name: string;
  /** Name of player 2 */
  player2Name: string;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface ParTypeBlockProps {
  label: string;
  stats1: ParTypeStats;
  stats2: ParTypeStats;
}

const ParTypeBlock = React.memo(function ParTypeBlock({
  label,
  stats1,
  stats2,
}: ParTypeBlockProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.parTypeBlock}>
      <Text style={[styles.parTypeLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>

      {/* Average Score - lower is better */}
      <ComparisonRow
        label="Avg Score"
        value1={stats1.holesPlayed > 0 ? stats1.averageScore.toFixed(1) : '-'}
        value2={stats2.holesPlayed > 0 ? stats2.averageScore.toFixed(1) : '-'}
        diff={stats1.holesPlayed > 0 && stats2.holesPlayed > 0 ? stats1.averageScore - stats2.averageScore : undefined}
        higherIsBetter={false}
        decimals={1}
      />

      {/* Score to Par - lower is better */}
      <ComparisonRow
        label="To Par"
        value1={stats1.holesPlayed > 0 ? (stats1.scoreToPar >= 0 ? `+${stats1.scoreToPar.toFixed(1)}` : stats1.scoreToPar.toFixed(1)) : '-'}
        value2={stats2.holesPlayed > 0 ? (stats2.scoreToPar >= 0 ? `+${stats2.scoreToPar.toFixed(1)}` : stats2.scoreToPar.toFixed(1)) : '-'}
        diff={stats1.holesPlayed > 0 && stats2.holesPlayed > 0 ? stats1.scoreToPar - stats2.scoreToPar : undefined}
        higherIsBetter={false}
        decimals={1}
      />

      {/* GIR Percentage - higher is better */}
      <ComparisonRow
        label="GIR"
        value1={stats1.girPercentage !== null ? stats1.girPercentage.toFixed(1) : '-'}
        value2={stats2.girPercentage !== null ? stats2.girPercentage.toFixed(1) : '-'}
        diff={stats1.girPercentage !== null && stats2.girPercentage !== null ? stats1.girPercentage - stats2.girPercentage : undefined}
        higherIsBetter={true}
        suffix="%"
        decimals={1}
      />

      {/* Birdie Percentage - higher is better */}
      <ComparisonRow
        label="Birdies"
        value1={stats1.holesPlayed > 0 ? stats1.birdiePercentage.toFixed(1) : '-'}
        value2={stats2.holesPlayed > 0 ? stats2.birdiePercentage.toFixed(1) : '-'}
        diff={stats1.holesPlayed > 0 && stats2.holesPlayed > 0 ? stats1.birdiePercentage - stats2.birdiePercentage : undefined}
        higherIsBetter={true}
        suffix="%"
        decimals={1}
      />
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ParTypeComparison = React.memo(function ParTypeComparison({
  player1Par3,
  player2Par3,
  player1Par4,
  player2Par4,
  player1Par5,
  player2Par5,
}: ParTypeComparisonProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <SectionHeader title="Scoring by Hole Type" icon="golf-tee" />

      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        <ParTypeBlock label="Par 3s" stats1={player1Par3} stats2={player2Par3} />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <ParTypeBlock label="Par 4s" stats1={player1Par4} stats2={player2Par4} />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <ParTypeBlock label="Par 5s" stats1={player1Par5} stats2={player2Par5} />
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  parTypeBlock: {
    paddingVertical: spacing.sm,
  },
  parTypeLabel: {
    ...typography.smallBold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
});

export default ParTypeComparison;
