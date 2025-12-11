/**
 * ScoreDistributionBar - Horizontal bar showing score distribution
 *
 * Displays a labeled bar with count and percentage for score types
 * (eagles, birdies, pars, bogeys, etc.)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// =====================================================
// TYPES
// =====================================================

export interface ScoreDistributionBarProps {
  /** Score type label (e.g., "Eagles", "Birdies") */
  label: string;
  /** Number of scores of this type */
  count: number;
  /** Total scores for percentage calculation */
  total: number;
  /** Bar color */
  color: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const ScoreDistributionBar = React.memo(function ScoreDistributionBar({
  label,
  count,
  total,
  color,
}: ScoreDistributionBarProps) {
  const colors = useThemeColors();
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <View style={styles.row}>
      <View style={styles.labelContainer}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View style={[styles.barContainer, { backgroundColor: colors.gray200 }]}>
        <View
          style={[
            styles.bar,
            { width: `${Math.max(percentage, 2)}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.count, { color: colors.textPrimary }]}>{count}</Text>
      <Text style={[styles.percentage, { color: colors.textSecondary }]}>
        {percentage.toFixed(1)}%
      </Text>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  label: {
    ...typography.small,
  },
  barContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  count: {
    ...typography.smallBold,
    width: 30,
    textAlign: 'right',
  },
  percentage: {
    ...typography.caption,
    width: 50,
    textAlign: 'right',
  },
});

export default ScoreDistributionBar;
