/**
 * HandicapIndexCard - Displays the player's Social Handicap Index
 *
 * Shows the calculated index prominently with supporting stats
 * about how it was calculated (rounds used, best X count).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { formatHandicapIndex } from '@/utils/displayHelpers';

interface HandicapIndexCardProps {
  handicapIndex: number | null;
  totalRounds: number;
  qualifyingCount: number;
}

export function HandicapIndexCard({
  handicapIndex,
  totalRounds,
  qualifyingCount,
}: HandicapIndexCardProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, shadows.md]}>
      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Social Handicap Index
      </Text>

      {/* Main Index Display */}
      <Text style={[styles.indexValue, { color: colors.textPrimary }]}>
        {formatHandicapIndex(handicapIndex)}
      </Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {totalRounds}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Rounds
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {qualifyingCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Best Count
          </Text>
        </View>
      </View>

      {/* Formula Text */}
      {totalRounds > 0 && (
        <Text style={[styles.formula, { color: colors.textTertiary }]}>
          Best {qualifyingCount} of {totalRounds} × 0.96
        </Text>
      )}

      {/* Hint for low round count */}
      {totalRounds > 0 && totalRounds < 3 && (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          Complete more rounds to improve accuracy
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  indexValue: {
    ...typography.display,
    fontSize: 48,
    lineHeight: 56,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  statValue: {
    ...typography.h4,
  },
  statLabel: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  divider: {
    width: 1,
    height: 32,
  },
  formula: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  hint: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
