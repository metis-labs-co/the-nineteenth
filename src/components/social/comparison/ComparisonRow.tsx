/**
 * ComparisonRow - Side-by-side stat comparison between two players
 *
 * Displays values for both players with a difference indicator.
 * Color-coded to show which player has the better value.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get color based on comparison (player1 vs player2)
 * For stats where higher is better (wins, points, etc.)
 */
function getComparisonColor(
  diff: number,
  higherIsBetter: boolean,
  colors: { success: string; error: string; textSecondary: string }
): string {
  if (diff === 0) return colors.textSecondary;
  const isBetter = higherIsBetter ? diff > 0 : diff < 0;
  return isBetter ? colors.success : colors.error;
}

/**
 * Format difference with +/- sign
 */
function formatDiff(diff: number, decimals: number = 0): string {
  if (diff === 0) return '-';
  const formatted = decimals > 0 ? diff.toFixed(decimals) : Math.round(diff).toString();
  return diff > 0 ? `+${formatted}` : formatted;
}

// =====================================================
// TYPES
// =====================================================

export interface ComparisonRowProps {
  /** Label for the stat being compared */
  label: string;
  /** Value for player 1 (left side) */
  value1: number | string;
  /** Value for player 2 (right side) */
  value2: number | string;
  /** Difference between values (value1 - value2) */
  diff?: number;
  /** Whether higher values are better (true) or lower is better (false) */
  higherIsBetter?: boolean;
  /** Optional suffix for values (e.g., '%', ' pts') */
  suffix?: string;
  /** Number of decimal places for the difference */
  decimals?: number;
}

// =====================================================
// COMPONENT
// =====================================================

export const ComparisonRow = React.memo(function ComparisonRow({
  label,
  value1,
  value2,
  diff,
  higherIsBetter = true,
  suffix = '',
  decimals = 0,
}: ComparisonRowProps) {
  const colors = useThemeColors();
  const diffColor = diff !== undefined ? getComparisonColor(diff, higherIsBetter, colors) : colors.textSecondary;
  const diffText = diff !== undefined ? formatDiff(diff, decimals) : '-';

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.value}>
        <Text style={[styles.valueText, { color: colors.textPrimary }]}>
          {value1}{suffix}
        </Text>
      </View>
      <View style={styles.label}>
        <Text style={[styles.labelText, { color: colors.textSecondary }]}>{label}</Text>
        {diff !== undefined && (
          <Text style={[styles.diff, { color: diffColor }]}>
            {diffText}{suffix && diff !== 0 ? suffix : ''}
          </Text>
        )}
      </View>
      <View style={styles.value}>
        <Text style={[styles.valueText, { color: colors.textPrimary }]}>
          {value2}{suffix}
        </Text>
      </View>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  value: {
    width: 70,
    alignItems: 'center',
  },
  valueText: {
    ...typography.h4,
  },
  label: {
    flex: 1,
    alignItems: 'center',
  },
  labelText: {
    ...typography.small,
  },
  diff: {
    ...typography.caption,
    marginTop: 2,
  },
});

export default ComparisonRow;
