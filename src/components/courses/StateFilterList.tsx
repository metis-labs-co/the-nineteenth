/**
 * StateFilterList - Horizontal scrollable filter for Australian states
 *
 * Features:
 * - Favourites toggle filter
 * - Australian state filters (NSW, VIC, QLD, etc.)
 * - Clear filters button when filters are active
 * - Dark mode support
 */

import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { FilterPill } from '@/components/common/FilterPill';
import type { AustralianState } from '@/types/database.types';

// Australian states for filter
const AUSTRALIAN_STATES: { value: AustralianState; label: string }[] = [
  { value: 'NSW', label: 'NSW' },
  { value: 'VIC', label: 'VIC' },
  { value: 'QLD', label: 'QLD' },
  { value: 'SA', label: 'SA' },
  { value: 'WA', label: 'WA' },
  { value: 'TAS', label: 'TAS' },
  { value: 'NT', label: 'NT' },
  { value: 'ACT', label: 'ACT' },
];

interface StateFilterListProps {
  selectedState: AustralianState | undefined;
  onStateChange: (state: AustralianState | undefined) => void;
  showFavoritesOnly: boolean;
  onFavoritesToggle: () => void;
  showClearButton: boolean;
  onClear: () => void;
}

export function StateFilterList({
  selectedState,
  onStateChange,
  showFavoritesOnly,
  onFavoritesToggle,
  showClearButton,
  onClear,
}: StateFilterListProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Favourites toggle */}
        <FilterPill
          label="Favourites"
          selected={showFavoritesOnly}
          onPress={onFavoritesToggle}
          accessibilityLabel="Show favourites only"
        />

        {/* State filters */}
        {AUSTRALIAN_STATES.map((state) => (
          <FilterPill
            key={state.value}
            label={state.label}
            selected={selectedState === state.value}
            onPress={() =>
              onStateChange(selectedState === state.value ? undefined : state.value)
            }
            accessibilityLabel={`Filter by ${state.label}`}
          />
        ))}
      </ScrollView>

      {/* Clear filters button */}
      {showClearButton && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClear}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Clear all filters"
        >
          <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.lg,
  },
  clearText: {
    ...typography.small,
    fontWeight: '600',
  },
});
