/**
 * ParTypeStatsSection - Scoring breakdown by hole par type
 *
 * Displays statistics for Par 3s, Par 4s, and Par 5s in a three-column layout.
 * Each column shows average score, score to par, GIR percentage, and birdie percentage.
 *
 * @example
 * ```tsx
 * <ParTypeStatsSection
 *   par3Stats={stats.par3Stats}
 *   par4Stats={stats.par4Stats}
 *   par5Stats={stats.par5Stats}
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { SectionHeader } from '@/components/social';
import { FeatureLock } from '@/components/subscription';
import type { ParTypeStats } from '@/hooks/usePlayerStatistics';

// =====================================================
// TYPES
// =====================================================

export interface ParTypeStatsSectionProps {
  /** Statistics for Par 3 holes */
  par3Stats: ParTypeStats;
  /** Statistics for Par 4 holes */
  par4Stats: ParTypeStats;
  /** Statistics for Par 5 holes */
  par5Stats: ParTypeStats;
}

interface ParTypeColumnProps {
  /** Label for the column (e.g., "Par 3s") */
  label: string;
  /** Par value for score-to-par coloring */
  par: number;
  /** Statistics for this par type */
  stats: ParTypeStats;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

/**
 * Single column displaying stats for one par type
 */
const ParTypeColumn = React.memo(function ParTypeColumn({
  label,
  par: _par,
  stats,
}: ParTypeColumnProps) {
  const colors = useThemeColors();

  // Determine color for score-to-par (negative is good/green, positive is bad/red)
  const getScoreToParColor = () => {
    if (stats.holesPlayed === 0) return colors.textSecondary;
    if (stats.scoreToPar < 0) return colors.success;
    if (stats.scoreToPar > 0) return colors.error;
    return colors.par; // Exactly par
  };

  // Format score-to-par text
  const formatScoreToPar = () => {
    if (stats.holesPlayed === 0) return '-';
    if (stats.scoreToPar < 0) return `${stats.scoreToPar.toFixed(1)} under`;
    if (stats.scoreToPar > 0) return `+${stats.scoreToPar.toFixed(1)} over`;
    return 'Even';
  };

  const accessibilityLabel = `${label}: Average ${stats.averageScore.toFixed(1)}, ${formatScoreToPar()}, GIR ${stats.girPercentage !== null ? `${stats.girPercentage}%` : 'not tracked'}, Birdies ${stats.birdiePercentage}%`;

  return (
    <View
      style={[styles.column, { backgroundColor: colors.surface }, shadows.sm]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Column Header */}
      <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>

      {/* Average Score (prominent) */}
      <View style={[styles.scoreCircle, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.avgScore, { color: colors.textPrimary }]}>
          {stats.holesPlayed > 0 ? stats.averageScore.toFixed(1) : '-'}
        </Text>
        <Text style={[styles.avgLabel, { color: colors.textSecondary }]}>avg</Text>
      </View>

      {/* Score to Par */}
      <Text style={[styles.scoreToPar, { color: getScoreToParColor() }]}>
        {formatScoreToPar()}
      </Text>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* GIR Percentage */}
      <View style={styles.statRow}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>GIR:</Text>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
          {stats.girPercentage !== null ? `${stats.girPercentage}%` : 'N/A'}
        </Text>
      </View>

      {/* Birdie Percentage */}
      <View style={styles.statRow}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Birdies:</Text>
        <Text style={[styles.statValue, { color: colors.birdie }]}>
          {stats.holesPlayed > 0 ? `${stats.birdiePercentage}%` : '-'}
        </Text>
      </View>

      {/* Holes Played */}
      <Text style={[styles.holesPlayed, { color: colors.textTertiary }]}>
        {stats.holesPlayed} holes
      </Text>
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ParTypeStatsSection = React.memo(function ParTypeStatsSection({
  par3Stats,
  par4Stats,
  par5Stats,
}: ParTypeStatsSectionProps) {
  return (
    <FeatureLock feature="score_distribution">
      <View style={styles.container}>
        <SectionHeader title="Scoring by Hole Type" icon="golf-tee" />
        <View style={styles.columnsContainer}>
          <ParTypeColumn label="Par 3s" par={3} stats={par3Stats} />
          <ParTypeColumn label="Par 4s" par={4} stats={par4Stats} />
          <ParTypeColumn label="Par 5s" par={5} stats={par5Stats} />
        </View>
      </View>
    </FeatureLock>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  columnsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  columnLabel: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avgScore: {
    ...typography.h2,
    lineHeight: 28,
  },
  avgLabel: {
    ...typography.caption,
    marginTop: -2,
  },
  scoreToPar: {
    ...typography.small,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  divider: {
    width: '80%',
    height: 1,
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
  },
  statValue: {
    ...typography.caption,
    fontWeight: '600',
  },
  holesPlayed: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

export default ParTypeStatsSection;
