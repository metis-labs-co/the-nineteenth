/**
 * DifferentialBadge - Displays a handicap differential value in a styled badge
 *
 * Used across league screens for tagged round differentials.
 *
 * @example
 * // Inline badge (small, pill-shaped)
 * <DifferentialBadge value={12.3} />
 *
 * // Block badge (larger, square-rounded for cards)
 * <DifferentialBadge value={12.3} variant="block" />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface Props {
  /** Handicap differential value */
  value: number;
  /** 'inline' = small pill, 'block' = larger square card badge */
  variant?: 'inline' | 'block';
}

export const DifferentialBadge = React.memo(function DifferentialBadge({
  value,
  variant = 'inline',
}: Props) {
  const colors = useThemeColors();

  if (variant === 'block') {
    return (
      <View style={[styles.blockBadge, { backgroundColor: colors.primaryBackground }]}>
        <Text style={[styles.blockValue, { color: colors.primary }]}>
          {value.toFixed(1)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.inlineBadge, { backgroundColor: colors.primaryBackground }]}>
      <Text style={[styles.inlineValue, { color: colors.primary }]}>
        {value.toFixed(1)}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  inlineBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  inlineValue: {
    ...typography.smallBold,
  },
  blockBadge: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockValue: {
    ...typography.h3,
    fontSize: 18,
  },
});

export default DifferentialBadge;
