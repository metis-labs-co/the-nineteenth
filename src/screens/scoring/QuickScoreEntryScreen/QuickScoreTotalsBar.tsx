/**
 * QuickScoreTotalsBar - Running totals display for quick score entry
 *
 * Header totals tiles per the Score & Round redesign: neutral tiles on
 * surfaceVariant, Points highlighted on primaryBackground/primary.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

interface QuickScoreTotalsBarProps {
  totalGross: number;
  totalNet: number;
  totalPoints: number;
  holesEntered: number;
  totalHoles: number;
}

export const QuickScoreTotalsBar = React.memo(function QuickScoreTotalsBar({
  totalGross,
  totalNet,
  totalPoints,
  holesEntered,
  totalHoles,
}: QuickScoreTotalsBarProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={[styles.tile, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{totalGross || '–'}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Gross</Text>
      </View>
      <View style={[styles.tile, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{totalNet || '–'}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Net</Text>
      </View>
      <View style={[styles.tile, { backgroundColor: colors.primaryBackground }]}>
        <Text style={[styles.value, { color: colors.primary }]}>{totalPoints || '–'}</Text>
        <Text style={[styles.label, { color: colors.primary }]}>Points</Text>
      </View>
      <View style={[styles.tile, { backgroundColor: colors.surfaceVariant }]}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{holesEntered}/{totalHoles}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Holes</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 1,
    borderRadius: borderRadius.lg,
  },
  value: {
    ...typography.bodyBold,
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 26,
  },
  label: {
    ...typography.small,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.xxs,
  },
});

export default QuickScoreTotalsBar;
