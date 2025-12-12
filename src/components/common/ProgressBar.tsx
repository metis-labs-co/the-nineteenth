/**
 * ProgressBar Component
 *
 * A reusable progress bar component that displays completion progress.
 * Supports customizable colors, sizes, and optional label text.
 *
 * @example
 * // Basic usage
 * <ProgressBar value={5} max={18} />
 *
 * @example
 * // With label
 * <ProgressBar value={5} max={18} label="5/18 holes" />
 *
 * @example
 * // Custom colors and size
 * <ProgressBar
 *   value={75}
 *   max={100}
 *   fillColor={colors.primary}
 *   size="lg"
 * />
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

type ProgressBarSize = 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  /**
   * Current progress value
   */
  value: number;
  /**
   * Maximum value (default: 100)
   */
  max?: number;
  /**
   * Optional label to display next to the progress bar
   */
  label?: string;
  /**
   * Size variant of the progress bar
   * - sm: 4px height
   * - md: 6px height (default)
   * - lg: 8px height
   */
  size?: ProgressBarSize;
  /**
   * Custom fill color (defaults to success color)
   */
  fillColor?: string;
  /**
   * Custom background color (defaults to gray200)
   */
  backgroundColor?: string;
  /**
   * Whether to show percentage text instead of custom label
   */
  showPercentage?: boolean;
  /**
   * Whether to animate the progress fill
   */
  animated?: boolean;
  /**
   * Custom container style
   */
  style?: ViewStyle;
  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;
}

const SIZE_MAP: Record<ProgressBarSize, number> = {
  sm: 4,
  md: 6,
  lg: 8,
};

export const ProgressBar = React.memo(function ProgressBar({
  value,
  max = 100,
  label,
  size = 'sm',
  fillColor,
  backgroundColor,
  showPercentage = false,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const colors = useThemeColors();

  // Calculate percentage (clamped between 0-100)
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const barHeight = SIZE_MAP[size];

  // Determine label text
  const labelText = showPercentage ? `${Math.round(percentage)}%` : label;

  // Determine colors
  const barBackgroundColor = backgroundColor || colors.gray200;
  const barFillColor = fillColor || colors.success;

  const accessibilityValue = accessibilityLabel || `${Math.round(percentage)}% complete`;

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityValue}
      accessibilityValue={{
        min: 0,
        max: max,
        now: value,
      }}
    >
      <View
        style={[
          styles.progressBar,
          {
            height: barHeight,
            borderRadius: barHeight / 2,
            backgroundColor: barBackgroundColor,
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
              borderRadius: barHeight / 2,
              backgroundColor: barFillColor,
            },
          ]}
        />
      </View>
      {labelText && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {labelText}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  label: {
    ...typography.caption,
    minWidth: 60,
  },
});

export default ProgressBar;
