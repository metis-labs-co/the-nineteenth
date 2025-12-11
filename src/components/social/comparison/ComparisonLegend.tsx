/**
 * ComparisonLegend - Color legend explaining comparison indicators
 *
 * Shows what green, red, and gray colors mean in the comparison.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

// =====================================================
// TYPES
// =====================================================

export interface ComparisonLegendProps {
  /** Custom labels for legend items */
  labels?: {
    better?: string;
    worse?: string;
    same?: string;
  };
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

interface LegendRowProps {
  color: string;
  label: string;
  textColor: string;
}

const LegendRow = React.memo(function LegendRow({ color, label, textColor }: LegendRowProps) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: textColor }]}>{label}</Text>
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ComparisonLegend = React.memo(function ComparisonLegend({
  labels,
}: ComparisonLegendProps) {
  const colors = useThemeColors();

  const betterLabel = labels?.better ?? 'Better than opponent';
  const worseLabel = labels?.worse ?? 'Worse than opponent';
  const sameLabel = labels?.same ?? 'Same as opponent';

  return (
    <View style={[styles.container, { backgroundColor: colors.gray100 }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Legend</Text>
      <LegendRow color={colors.success} label={betterLabel} textColor={colors.textSecondary} />
      <LegendRow color={colors.error} label={worseLabel} textColor={colors.textSecondary} />
      <LegendRow color={colors.textSecondary} label={sameLabel} textColor={colors.textSecondary} />
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  title: {
    ...typography.smallBold,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  legendText: {
    ...typography.small,
  },
});

export default ComparisonLegend;
