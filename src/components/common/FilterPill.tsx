// src/components/common/FilterPill.tsx
import React from 'react';
import { StyleSheet, TouchableOpacity, type ViewStyle, type StyleProp } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

/**
 * Props for the FilterPill component
 */
export interface FilterPillProps {
  /**
   * The text label displayed inside the pill
   */
  label: string;
  /**
   * Whether the pill is currently selected/active
   */
  selected?: boolean;
  /**
   * Callback when the pill is pressed
   */
  onPress: () => void;
  /**
   * Whether the pill is disabled
   */
  disabled?: boolean;
  /**
   * Accessibility label for the pill (defaults to label if not provided)
   */
  accessibilityLabel?: string;
  /**
   * Optional custom styles for the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * FilterPill - A pill-shaped toggle button used for filtering content
 *
 * Used in filter bars to toggle between different filter states.
 * Supports selected/unselected states with visual feedback.
 *
 * @example
 * ```tsx
 * <FilterPill
 *   label="Active"
 *   selected={filter === 'active'}
 *   onPress={() => setFilter('active')}
 *   accessibilityLabel="Show active competitions"
 * />
 * ```
 */
export const FilterPill = React.memo(function FilterPill({
  label,
  selected = false,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: FilterPillProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        {
          backgroundColor: selected ? `${colors.primary}15` : colors.surfaceVariant,
          borderColor: selected ? colors.primary : colors.gray200,
        },
        disabled && styles.pillDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ selected, disabled }}
      testID={testID}
    >
      <Text
        style={[
          styles.pillText,
          {
            color: selected ? colors.primary : colors.textSecondary,
          },
          disabled && { color: colors.textDisabled },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillDisabled: {
    opacity: 0.5,
  },
  pillText: {
    ...typography.small,
    fontWeight: '500',
  },
});
