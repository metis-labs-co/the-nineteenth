// src/components/common/Pill.tsx
import React from 'react';
import { type ViewStyle, type StyleProp } from 'react-native';
import { Badge, type BadgeVariant, type BadgeSize } from './Badge';

/**
 * Size variants for the Pill component
 * Maps to Badge sizes for backward compatibility
 */
export type PillSize = 'sm' | 'md' | 'lg';

/**
 * Color variants for the Pill component
 * Maps to Badge variants for backward compatibility
 */
export type PillVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'birdie'
  | 'par'
  | 'bogey'
  | 'doubleBogey';

/**
 * Props for the Pill component
 */
export interface PillProps {
  /**
   * The text label displayed inside the pill
   */
  label: string;
  /**
   * Size variant of the pill
   * @default 'md'
   */
  size?: PillSize;
  /**
   * Color variant of the pill
   * @default 'default'
   */
  variant?: PillVariant;
  /**
   * Whether to use a filled background style (more prominent)
   * @default false
   */
  filled?: boolean;
  /**
   * Optional custom styles for the container
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Accessibility label (defaults to label if not provided)
   */
  accessibilityLabel?: string;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Pill - A non-interactive pill-shaped badge for displaying informational text
 *
 * Use this component for displaying static information like:
 * - Round numbers ("Round 2 of 4")
 * - Categories or tags
 * - Informational labels
 *
 * For interactive/toggle pills, use FilterPill instead.
 *
 * This component composes the unified Badge component.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Pill label="Round 2 of 4" />
 *
 * // With variant
 * <Pill label="Birdie" variant="birdie" />
 *
 * // Filled style
 * <Pill label="Active" variant="success" filled />
 *
 * // Different sizes
 * <Pill label="Small" size="sm" />
 * <Pill label="Large" size="lg" />
 * ```
 */
export const Pill = React.memo(function Pill({
  label,
  size = 'md',
  variant = 'default',
  filled = false,
  style,
  accessibilityLabel,
  testID,
}: PillProps) {
  return (
    <Badge
      label={label}
      variant={variant as BadgeVariant}
      size={size as BadgeSize}
      filled={filled}
      interactive={false}
      style={style}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
});
