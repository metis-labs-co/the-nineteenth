// src/components/common/FilterPill.tsx
import React from 'react';
import { type ViewStyle, type StyleProp } from 'react-native';
import { Badge, type BadgeVariant, type BadgeSize } from './Badge';

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
  /**
   * Color variant of the filter pill
   * @default 'default'
   */
  variant?: 'default' | 'primary';
  /**
   * Size variant of the filter pill
   * @default 'lg'
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * FilterPill - A pill-shaped toggle button used for filtering content
 *
 * Used in filter bars to toggle between different filter states.
 * Supports selected/unselected states with visual feedback.
 *
 * This component composes the unified Badge component.
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
  variant = 'default',
  size = 'lg',
}: FilterPillProps) {
  return (
    <Badge
      label={label}
      variant={variant as BadgeVariant}
      size={size as BadgeSize}
      interactive
      selected={selected}
      onPress={onPress}
      disabled={disabled}
      style={style}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
});
