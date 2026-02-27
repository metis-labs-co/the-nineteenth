/**
 * StateFilterList - Horizontal scrollable region filter
 *
 * Features:
 * - Favourites toggle filter
 * - Australian state filters (NSW, VIC, QLD, etc.) for AU users
 * - New Zealand region filters (Auckland, Canterbury, etc.) for NZ users
 * - Favourites-only for users outside AU/NZ
 * - Clear filters button when filters are active
 * - Dark mode support
 */

import React, { useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { FilterPill } from '@/components/common/FilterPill';
import { getRegionsForCountry } from '@/constants/countries';

interface StateFilterListProps {
  selectedState: string | undefined;
  onStateChange: (state: string | undefined) => void;
  showFavoritesOnly: boolean;
  onFavoritesToggle: () => void;
  showClearButton: boolean;
  onClear: () => void;
  /** Detected user country — determines which region pills to show */
  country?: string | null;
}

export function StateFilterList({
  selectedState,
  onStateChange,
  showFavoritesOnly,
  onFavoritesToggle,
  showClearButton,
  onClear,
  country,
}: StateFilterListProps) {
  const colors = useThemeColors();

  // Data-driven region pills from country config
  const regionPills = useMemo(
    () => getRegionsForCountry(country).map((r) => ({ value: r.value, label: r.label })),
    [country]
  );

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

        {/* Region filters */}
        {regionPills.map((region) => (
          <FilterPill
            key={region.value}
            label={region.label}
            selected={selectedState === region.value}
            onPress={() =>
              onStateChange(selectedState === region.value ? undefined : region.value)
            }
            accessibilityLabel={`Filter by ${region.label}`}
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
