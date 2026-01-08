/**
 * RoundCountSelector - Stepper component for selecting number of rounds
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface RoundCountSelectorProps {
  count: number;
  minCount?: number;
  maxCount: number;
  onChange: (count: number) => void;
}

export function RoundCountSelector({
  count,
  minCount = 1,
  maxCount,
  onChange,
}: RoundCountSelectorProps) {
  const colors = useThemeColors();

  const handleDecrement = () => {
    if (count > minCount) {
      onChange(count - 1);
    }
  };

  const handleIncrement = () => {
    if (count < maxCount) {
      onChange(count + 1);
    }
  };

  const isAtMin = count <= minCount;
  const isAtMax = count >= maxCount;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.labelRow}>
        <Icon source="golf" size={20} color={colors.primary} />
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          How many rounds?
        </Text>
      </View>

      <View style={styles.stepperRow}>
        <TouchableOpacity
          onPress={handleDecrement}
          disabled={isAtMin}
          style={[
            styles.stepperButton,
            {
              backgroundColor: isAtMin ? colors.gray100 : colors.primaryLighter,
              borderColor: isAtMin ? colors.gray200 : colors.primary,
            },
          ]}
          activeOpacity={0.7}
        >
          <Icon
            source="minus"
            size={24}
            color={isAtMin ? colors.gray400 : colors.primary}
          />
        </TouchableOpacity>

        <View style={[styles.countDisplay, { backgroundColor: colors.background }]}>
          <Text style={[styles.countText, { color: colors.textPrimary }]}>
            {count}
          </Text>
          <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
            {count === 1 ? 'round' : 'rounds'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleIncrement}
          disabled={isAtMax}
          style={[
            styles.stepperButton,
            {
              backgroundColor: isAtMax ? colors.gray100 : colors.primaryLighter,
              borderColor: isAtMax ? colors.gray200 : colors.primary,
            },
          ]}
          activeOpacity={0.7}
        >
          <Icon
            source="plus"
            size={24}
            color={isAtMax ? colors.gray400 : colors.primary}
          />
        </TouchableOpacity>
      </View>

      {isAtMax && (
        <View style={[styles.limitWarning, { backgroundColor: colors.warningLight }]}>
          <Icon source="information" size={16} color={colors.warning} />
          <Text style={[styles.limitText, { color: colors.warning }]}>
            Maximum {maxCount} rounds on your plan
          </Text>
        </View>
      )}

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        You can add or remove rounds later from the competition settings
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodyBold,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countDisplay: {
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  countText: {
    ...typography.h1,
    fontWeight: '700',
  },
  countLabel: {
    ...typography.caption,
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  limitText: {
    ...typography.small,
    fontWeight: '500',
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
  },
});
