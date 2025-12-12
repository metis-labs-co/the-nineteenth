/**
 * TeeSelector - Horizontal scrollable tee box chips
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { getTeeColor } from '../utils';
import type { TeeSelectorProps } from '../types';

export function TeeSelector({ tees, selectedTee, onSelectTee }: TeeSelectorProps) {
  const colors = useThemeColors();

  if (tees.length === 0) return null;

  return (
    <View style={styles.teeSelectorContainer}>
      <Text style={[styles.teeSelectorLabel, { color: colors.textSecondary }]}>
        Select Tee:
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.teeChipsContainer}
      >
        {tees.map((tee) => {
          const isSelected = selectedTee === tee.name;
          return (
            <TouchableOpacity
              key={tee.name}
              style={[
                styles.teeChip,
                { borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => onSelectTee(tee.name)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${tee.name} tee, ${tee.totalYardage} yards`}
            >
              <View
                style={[
                  styles.teeColorDot,
                  { backgroundColor: getTeeColor(tee.color, colors.gray400) },
                ]}
              />
              <Text
                style={[
                  styles.teeChipText,
                  { color: isSelected ? colors.white : colors.textPrimary },
                ]}
              >
                {tee.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  teeSelectorContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  teeSelectorLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  teeChipsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  teeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  teeColorDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  teeChipText: {
    ...typography.small,
  },
});

export default TeeSelector;
