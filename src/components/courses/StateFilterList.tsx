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
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
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

interface FilterPillButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  /** Show a star icon before the label (Favourites pill) */
  showStar?: boolean;
}

/** Design-spec filter pill: active = primary filled, inactive = bordered surface */
function FilterPillButton({
  label,
  selected,
  onPress,
  accessibilityLabel,
  showStar = false,
}: FilterPillButtonProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        selected
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
    >
      {showStar && (
        <Icon
          source={selected ? 'star' : 'star-outline'}
          size={14}
          color={selected ? colors.textInverse : colors.textSecondary}
        />
      )}
      <Text
        style={[
          styles.pillLabel,
          { color: selected ? colors.textInverse : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
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
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Favourites toggle */}
        <FilterPillButton
          label="Favourites"
          selected={showFavoritesOnly}
          onPress={onFavoritesToggle}
          accessibilityLabel="Show favourites only"
          showStar
        />

        {/* Region filters */}
        {regionPills.map((region) => (
          <FilterPillButton
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm + 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.lg,
  },
  clearText: {
    ...typography.small,
    fontWeight: '700',
  },
});
