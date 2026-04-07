/**
 * ReviewItem - Reusable review item components for the wizard review step
 *
 * Provides:
 * - ReviewItem: Simple label-value pair
 * - ReviewItemWithBadge: Label with a chip/badge value
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import type { ColorPalette } from '@/context/ThemeContext';

export interface ReviewItemProps {
  label: string;
  value: string;
  colors: ColorPalette;
}

export function ReviewItem({ label, value, colors }: ReviewItemProps) {
  return (
    <View style={styles.item}>
      <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.itemValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

export function ReviewItemWithBadge({ label, value, colors }: ReviewItemProps) {
  return (
    <View style={styles.item}>
      <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Chip
        mode="flat"
        style={[styles.badge, { backgroundColor: colors.primary }]}
        textStyle={[styles.badgeText, { color: colors.white }]}
      >
        {value}
      </Chip>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemLabel: {
    ...typography.body,
    flex: 1,
  },
  itemValue: {
    ...typography.body,
    flex: 2,
    textAlign: 'right',
  },
  badge: {
    height: 28,
  },
  badgeText: {
    ...typography.captionBold,
  },
});
