/**
 * GameTypeFilter - Horizontal filter tabs for game type
 *
 * Allows filtering between All, Skins, and Wolf game history.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { GameTypeFilter as GameTypeFilterValue } from '@/hooks/useGameResults';

interface GameTypeFilterProps {
  value: GameTypeFilterValue;
  onChange: (filter: GameTypeFilterValue) => void;
}

const FILTERS: { label: string; value: GameTypeFilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Skins', value: 'skins' },
  { label: 'Wolf', value: 'wolf' },
];

export const GameTypeFilter = React.memo(function GameTypeFilter({
  value,
  onChange,
}: GameTypeFilterProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {FILTERS.map((filter) => {
        const isActive = value === filter.value;
        return (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.tab,
              {
                backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
              },
            ]}
            onPress={() => onChange(filter.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter by ${filter.label}`}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? colors.white : colors.textSecondary },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  tabText: {
    ...typography.smallBold,
  },
});
