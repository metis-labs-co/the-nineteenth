/**
 * DistributionComparison - Visual bar comparison of score distribution
 *
 * Shows horizontal bars for two players with percentage labels.
 * Used for comparing score distributions (eagles, birdies, pars, etc.)
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
 * Format difference with +/- sign
 */
function formatDiff(diff: number): string {
  if (diff === 0) return '-';
  const formatted = Math.round(diff).toString();
  return diff > 0 ? `+${formatted}` : formatted;
}

// =====================================================
// TYPES
// =====================================================

export interface DistributionComparisonProps {
  /** Label for the score type (e.g., "Birdies", "Pars") */
  label: string;
  /** Count for player 1 */
  count1: number;
  /** Count for player 2 */
  count2: number;
  /** Total scores for player 1 (for percentage calculation) */
  total1: number;
  /** Total scores for player 2 (for percentage calculation) */
  total2: number;
  /** Bar color for this score type */
  color: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const DistributionComparison = React.memo(function DistributionComparison({
  label,
  count1,
  count2,
  total1,
  total2,
  color,
}: DistributionComparisonProps) {
  const colors = useThemeColors();

  const pct1 = total1 > 0 ? (count1 / total1) * 100 : 0;
  const pct2 = total2 > 0 ? (count2 / total2) * 100 : 0;
  const diff = pct1 - pct2;
  const diffColor = diff === 0 ? colors.textSecondary : diff > 0 ? colors.success : colors.error;

  return (
    <View style={styles.container}>
      {/* Player 1 Bar (right-aligned) */}
      <View style={styles.barLeft}>
        <View style={[styles.barContainerLeft, { backgroundColor: colors.gray100 }]}>
          <View
            style={[
              styles.barFillLeft,
              { width: `${Math.max(pct1, 2)}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={[styles.percent, { color: colors.textSecondary }]}>{pct1.toFixed(0)}%</Text>
      </View>

      {/* Label with dot */}
      <View style={styles.labelContainer}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.diff, { color: diffColor }]}>
          {formatDiff(diff)}%
        </Text>
      </View>

      {/* Player 2 Bar (left-aligned) */}
      <View style={styles.barRight}>
        <Text style={[styles.percent, { color: colors.textSecondary }]}>{pct2.toFixed(0)}%</Text>
        <View style={[styles.barContainerRight, { backgroundColor: colors.gray100 }]}>
          <View
            style={[
              styles.barFillRight,
              { width: `${Math.max(pct2, 2)}%`, backgroundColor: color },
            ]}
          />
        </View>
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
    paddingVertical: spacing.sm,
  },
  barLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  barContainerLeft: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  barContainerRight: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.xs,
    overflow: 'hidden',
  },
  barFillLeft: {
    height: '100%',
    borderRadius: 4,
  },
  barFillRight: {
    height: '100%',
    borderRadius: 4,
  },
  percent: {
    ...typography.caption,
    width: 32,
    textAlign: 'center',
  },
  labelContainer: {
    width: 100,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  label: {
    ...typography.caption,
    textAlign: 'center',
  },
  diff: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default DistributionComparison;
