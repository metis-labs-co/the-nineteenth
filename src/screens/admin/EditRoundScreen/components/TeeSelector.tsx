/**
 * TeeSelector - Selectable grid of tee options
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { TeeSelectorProps } from '../types';

export function TeeSelector({ tees, selectedTee, onSelect, disabled }: TeeSelectorProps) {
  const colors = useThemeColors();

  if (tees.length === 0) {
    return (
      <View style={[styles.emptyTees, { backgroundColor: colors.gray100 }]}>
        <Icon source="golf-tee" size={24} color={colors.gray400} />
        <Text style={[styles.emptyTeesText, { color: colors.textSecondary }]}>
          No tees configured for this course
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.teeGrid}>
      {tees.map((tee) => {
        const isSelected = selectedTee?.name === tee.name;
        return (
          <TouchableOpacity
            key={tee.name}
            style={[
              styles.teeCard,
              {
                backgroundColor: isSelected ? colors.primaryLighter : colors.gray100,
                borderColor: isSelected ? colors.primary : colors.gray200,
              },
            ]}
            onPress={() => onSelect(tee)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.teeColorIndicator,
                { backgroundColor: tee.color || colors.gray400 },
              ]}
            />
            <Text
              style={[
                styles.teeName,
                { color: isSelected ? colors.primary : colors.textPrimary },
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
}

const styles = StyleSheet.create({
  teeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  teeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  teeColorIndicator: {
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
  emptyTees: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emptyTeesText: {
    ...typography.small,
    flex: 1,
  },
});

export default TeeSelector;
