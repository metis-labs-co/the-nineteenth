/**
 * TeeSelectorPills - Horizontal scrollable pill/chip variant
 *
 * Used in CourseDetailScreen for tee selection with optional yardage display.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTeeSelector } from './hooks/useTeeSelector';
import type { TeeSelectorPillsProps } from './types';

// ===========================================================================
// COMPONENT
// ===========================================================================

export const TeeSelectorPills = memo(function TeeSelectorPills({
  tees,
  selectedTee,
  onSelectTee,
  showYardage = false,
  label = 'Select Tee:',
  testID,
}: TeeSelectorPillsProps) {
  const colors = useThemeColors();
  const {
    isSelected,
    handleSelect,
    formatDistance,
    getTeeColor,
    getPillAccessibilityLabel,
  } = useTeeSelector({ selectedTee, onSelectTee });

  if (tees.length === 0) return null;

  return (
    <View style={styles.container} testID={testID}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tees.map((tee, index) => {
          const selected = isSelected(tee);
          return (
            <TouchableOpacity
              key={`${tee.name}-${index}`}
              style={[
                styles.chip,
                { borderColor: colors.border },
                selected && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => handleSelect(tee)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={getPillAccessibilityLabel(tee, showYardage)}
              testID={testID ? `${testID}-pill-${index}` : undefined}
            >
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: getTeeColor(tee.color, colors.textDisabled) },
                ]}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? colors.white : colors.textPrimary },
                ]}
              >
                {tee.name}
              </Text>
              {showYardage && tee.totalYardage && (
                <Text
                  style={[
                    styles.yardageText,
                    { color: selected ? colors.white : colors.textSecondary },
                  ]}
                >
                  {formatDistance(tee.totalYardage)}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  chipText: {
    ...typography.small,
  },
  yardageText: {
    ...typography.caption,
  },
});

export default TeeSelectorPills;
