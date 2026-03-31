/**
 * QuickScoreTotalsBar - Running totals display for quick score entry
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
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Gross</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{totalGross || '–'}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Net</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{totalNet || '–'}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Points</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{totalPoints || '–'}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Holes</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{holesEntered}/{totalHoles}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    ...typography.small,
    fontSize: 11,
  },
  value: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});

export default QuickScoreTotalsBar;
