/**
 * TabBar - Reusable segmented tab control
 *
 * Provides a consistent tab/segment control pattern for switching between views.
 * Supports customizable styling and accessibility.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface Tab<T extends string> {
  /** Unique key for the tab */
  key: T;
  /** Display label for the tab */
  label: string;
  /** Optional badge count to show next to label */
  badge?: number;
}

export interface TabBarProps<T extends string> {
  /** Array of tab definitions */
  tabs: Tab<T>[];
  /** Currently active tab key */
  activeTab: T;
  /** Callback when tab is changed */
  onTabChange: (tab: T) => void;
  /** Container style override */
  style?: ViewStyle;
  /** Variant: 'filled' (default) or 'underline' */
  variant?: 'filled' | 'underline';
}

/**
 * TabBar component for switching between views
 *
 * @example
 * ```tsx
 * type TabKey = 'my' | 'joined';
 *
 * const [activeTab, setActiveTab] = useState<TabKey>('my');
 *
 * <TabBar<TabKey>
 *   tabs={[
 *     { key: 'my', label: 'My Comps', badge: 5 },
 *     { key: 'joined', label: 'Joined', badge: 3 },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * ```
 */
export function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  style,
  variant = 'filled',
}: TabBarProps<T>) {
  const colors = useThemeColors();
  const isFilled = variant === 'filled';

  return (
    <View
      style={[
        styles.container,
        isFilled && { backgroundColor: colors.gray200, borderRadius: borderRadius.lg, padding: spacing.xs },
        !isFilled && { borderBottomWidth: 1, borderBottomColor: colors.border },
        style,
      ]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              isFilled && styles.tabFilled,
              isFilled && isActive && { backgroundColor: colors.surface },
              !isFilled && styles.tabUnderline,
              !isFilled && isActive && { borderBottomColor: colors.primary },
            ]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Text
              style={[
                styles.tabText,
                isFilled && { color: colors.textSecondary },
                isFilled && isActive && { ...typography.bodyBold, color: colors.textPrimary },
                !isFilled && { color: colors.textSecondary },
                !isFilled && isActive && { ...typography.bodyBold, color: colors.primary },
              ]}
            >
              {tab.label}
              {tab.badge !== undefined && ` (${tab.badge})`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * FilterChips - Horizontal filter chip row (variant of TabBar)
 * Good for filter states like "Active" / "Completed"
 */
export interface FilterChip<T extends string> {
  key: T;
  label: string;
}

export interface FilterChipsProps<T extends string> {
  chips: FilterChip<T>[];
  activeChip: T;
  onChipChange: (chip: T) => void;
  style?: ViewStyle;
}

export function FilterChips<T extends string>({
  chips,
  activeChip,
  onChipChange,
  style,
}: FilterChipsProps<T>) {
  const colors = useThemeColors();

  return (
    <View style={[styles.filterContainer, style]}>
      {chips.map((chip) => {
        const isActive = chip.key === activeChip;

        return (
          <TouchableOpacity
            key={chip.key}
            style={[
              styles.filterChip,
              { backgroundColor: colors.gray100, borderColor: colors.gray200 },
              isActive && { backgroundColor: colors.primaryLighter, borderColor: colors.primary },
            ]}
            onPress={() => onChipChange(chip.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter by ${chip.label}`}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: colors.textSecondary },
                isActive && { ...typography.smallBold, color: colors.primaryDark },
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container styles
  container: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  // Tab styles
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  tabFilled: {
    borderRadius: borderRadius.md,
  },
  tabUnderline: {
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  // Tab text styles
  tabText: {
    ...typography.body,
  },

  // Filter chip styles
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    ...typography.small,
  },
});

export default TabBar;
