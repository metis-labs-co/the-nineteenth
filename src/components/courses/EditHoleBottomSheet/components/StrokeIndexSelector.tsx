/**
 * StrokeIndexSelector - Increment/decrement control for stroke index
 */

import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface StrokeIndexSelectorProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  error?: string;
}

export const StrokeIndexSelector = memo(function StrokeIndexSelector({
  value,
  onIncrement,
  onDecrement,
  error,
}: StrokeIndexSelectorProps) {
  const colors = useThemeColors();

  const isAtMin = value <= 1;
  const isAtMax = value >= 18;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Stroke Index (SI)
      </Text>
      <View style={styles.controlRow}>
        <TouchableOpacity
          onPress={onDecrement}
          style={[styles.stepButton, { backgroundColor: colors.surfaceVariant }]}
          disabled={isAtMin}
          accessibilityRole="button"
          accessibilityLabel="Decrease stroke index"
        >
          <Icon
            source="minus"
            size={24}
            color={isAtMin ? colors.textDisabled : colors.textPrimary}
          />
        </TouchableOpacity>
        <View
          style={[
            styles.valueContainer,
            { backgroundColor: colors.surfaceVariant },
            error && { borderWidth: 2, borderColor: colors.error },
          ]}
        >
          <Text style={[styles.valueText, { color: colors.textPrimary }]}>
            {value}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onIncrement}
          style={[styles.stepButton, { backgroundColor: colors.surfaceVariant }]}
          disabled={isAtMax}
          accessibilityRole="button"
          accessibilityLabel="Increase stroke index"
        >
          <Icon
            source="plus"
            size={24}
            color={isAtMax ? colors.textDisabled : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.smallBold,
    marginBottom: spacing.sm,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    ...typography.h2,
  },
  errorText: {
    ...typography.small,
    marginTop: spacing.xs,
  },
});
