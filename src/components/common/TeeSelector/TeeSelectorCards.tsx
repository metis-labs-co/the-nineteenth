/**
 * TeeSelectorCards - Grid layout card variant
 *
 * Used in EditRoundScreen for tee selection with course rating info.
 */

import React, { memo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useTeeSelector } from './hooks/useTeeSelector';
import type { TeeSelectorCardsProps } from './types';

// ===========================================================================
// COMPONENT
// ===========================================================================

export const TeeSelectorCards = memo(function TeeSelectorCards({
  tees,
  selectedTee,
  onSelectTee,
  disabled,
  testID,
}: TeeSelectorCardsProps) {
  const colors = useThemeColors();
  const { isSelected, handleSelect, getTeeColor, getCardAccessibilityLabel } =
    useTeeSelector({ selectedTee, onSelectTee });

  // Empty state
  if (tees.length === 0) {
    return (
      <View
        style={[styles.emptyState, { backgroundColor: colors.surfaceVariant }]}
        testID={testID}
      >
        <Icon source="golf-tee" size={24} color={colors.textDisabled} />
        <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
          No tees configured for this course
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid} testID={testID}>
      {tees.map((tee, index) => {
        const selected = isSelected(tee);
        return (
          <TouchableOpacity
            key={`${tee.name}-${index}`}
            style={[
              styles.card,
              {
                backgroundColor: selected
                  ? colors.primaryLighter
                  : colors.surfaceVariant,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => handleSelect(tee)}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={getCardAccessibilityLabel(tee)}
            testID={testID ? `${testID}-card-${index}` : undefined}
          >
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: getTeeColor(tee.color, colors.textDisabled) },
              ]}
            />
            <Text
              style={[
                styles.teeName,
                { color: selected ? colors.primary : colors.textPrimary },
              ]}
            >
              {tee.name}
            </Text>
            {tee.courseRating && (
              <Text style={[styles.teeRating, { color: colors.textSecondary }]}>
                CR: {tee.courseRating}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

// ===========================================================================
// STYLES
// ===========================================================================

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teeName: {
    ...typography.smallBold,
  },
  teeRating: {
    ...typography.caption,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emptyStateText: {
    ...typography.small,
    flex: 1,
  },
});

export default TeeSelectorCards;
