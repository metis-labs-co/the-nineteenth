/**
 * HandicapRoundRow - Displays a single round in the handicap history
 *
 * Shows course name, date, gross score, and differential.
 * Qualifying rounds are highlighted with a primary-colored left border.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';
import type { HandicapRound } from '@/types';

interface HandicapRoundRowProps {
  round: HandicapRound;
}

/**
 * Format a date string for display using device locale
 */
function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function HandicapRoundRow({ round }: HandicapRoundRowProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        round.isQualifying && styles.qualifyingContainer,
        round.isQualifying && { borderLeftColor: colors.primary },
      ]}
    >
      {/* Left Section: Course & Date */}
      <View style={styles.leftSection}>
        <Text
          style={[styles.courseName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {round.courseName}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {formatDate(round.roundDate)}
        </Text>
      </View>

      {/* Center Section: Gross Score */}
      <View style={styles.centerSection}>
        <Text style={[styles.scoreValue, { color: colors.textPrimary }]}>
          {round.totalGross}
        </Text>
        <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
          Gross
        </Text>
        {round.dailyHandicapUsed > 0 && (
          <Text style={[styles.handicapUsed, { color: colors.textTertiary }]}>
            HC: {round.dailyHandicapUsed}
          </Text>
        )}
      </View>

      {/* Right Section: Differential */}
      <View style={styles.rightSection}>
        <View style={styles.differentialRow}>
          <Text style={[styles.differentialValue, { color: colors.textPrimary }]}>
            {round.handicapDifferential.toFixed(1)}
          </Text>
          {round.isQualifying && (
            <Icon source="check-circle" size={16} color={colors.primary} />
          )}
        </View>
        <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
          Differential
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  qualifyingContainer: {
    borderLeftWidth: 3,
  },
  leftSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  courseName: {
    ...typography.bodyBold,
    marginBottom: spacing.xxs,
  },
  date: {
    ...typography.caption,
  },
  centerSection: {
    alignItems: 'center',
    minWidth: 60,
    marginRight: spacing.md,
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  scoreValue: {
    ...typography.h4,
  },
  scoreLabel: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  handicapUsed: {
    ...typography.caption,
    fontSize: 10,
    marginTop: spacing.xxs,
  },
  differentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  differentialValue: {
    ...typography.h4,
  },
});
