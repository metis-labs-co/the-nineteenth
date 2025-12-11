/**
 * LimitIndicator - Display usage vs limit progress
 *
 * Shows current usage against a maximum limit with an optional progress bar.
 * Handles unlimited limits (-1) by displaying infinity symbol.
 * Colors change to error when at limit.
 *
 * @example
 * ```tsx
 * // Basic usage with progress bar
 * <LimitIndicator current={3} max={5} label="Competitions" />
 *
 * // Unlimited limit (shows infinity symbol)
 * <LimitIndicator current={10} max={-1} label="Friends" />
 *
 * // Without progress bar
 * <LimitIndicator current={8} max={8} label="Players" showBar={false} />
 *
 * // At limit (shows error color)
 * <LimitIndicator current={5} max={5} label="Competitions" />
 * ```
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { isUnlimited, isNoLimit } from '@/types/subscription.types';

// ============================================================================
// TYPES
// ============================================================================

interface LimitIndicatorProps {
  /**
   * Current usage count
   */
  current: number;

  /**
   * Maximum allowed count
   * Use -1 for unlimited (UNLIMITED constant)
   * Use -2 for no system limit (NO_LIMIT constant)
   */
  max: number;

  /**
   * Label describing what is being counted
   * @example "Competitions", "Players", "Friends"
   */
  label: string;

  /**
   * Whether to show the progress bar below the text
   * @default true
   */
  showBar?: boolean;

  /**
   * Test ID for testing purposes
   */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INFINITY_SYMBOL = '\u221E'; // Unicode infinity symbol
const PROGRESS_BAR_HEIGHT = 6;

// ============================================================================
// COMPONENT
// ============================================================================

export const LimitIndicator = React.memo(function LimitIndicator({
  current,
  max,
  label,
  showBar = true,
  testID,
}: LimitIndicatorProps) {
  const colors = useThemeColors();

  // Check if limit is unlimited (-1 or -2)
  const hasUnlimitedMax = isUnlimited(max) || isNoLimit(max);

  // Calculate if at or over limit (only for limited cases)
  const isAtLimit = !hasUnlimitedMax && current >= max;
  const isOverLimit = !hasUnlimitedMax && current > max;

  // Calculate percentage for progress bar (clamped to 100%)
  const percentage = hasUnlimitedMax
    ? 0 // No fill for unlimited
    : Math.min((current / max) * 100, 100);

  // Determine colors based on limit status
  const valueColor = isAtLimit ? colors.error : colors.textPrimary;
  const barFillColor = isAtLimit ? colors.error : colors.primary;
  const barBackgroundColor = colors.gray200;

  // Format the value display
  const valueDisplay = hasUnlimitedMax
    ? `${current}/${INFINITY_SYMBOL}`
    : `${current}/${max}`;

  // Build accessibility label
  const accessibilityLabel = hasUnlimitedMax
    ? `Using ${current} ${label}, unlimited`
    : `Using ${current} of ${max} ${label}`;

  // Compact inline layout when bar is hidden
  if (!showBar) {
    return (
      <View
        style={styles.compactContainer}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        <Text
          style={[styles.compactLabel, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {label}:
        </Text>
        <Text
          style={[
            styles.compactValue,
            { color: valueColor },
            isOverLimit && styles.valueOverLimit,
          ]}
          numberOfLines={1}
        >
          {valueDisplay}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {/* Header row with label and value */}
      <View style={styles.headerRow}>
        <Text
          style={[styles.label, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            { color: valueColor },
            isOverLimit && styles.valueOverLimit,
          ]}
          numberOfLines={1}
        >
          {valueDisplay}
        </Text>
      </View>

      {/* Progress bar */}
      <View
        style={[
          styles.progressBar,
          { backgroundColor: barBackgroundColor },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: hasUnlimitedMax ? 100 : max,
          now: hasUnlimitedMax ? 0 : current,
        }}
      >
        {!hasUnlimitedMax && (
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
                backgroundColor: barFillColor,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.small,
    flex: 1,
  },
  compactLabel: {
    ...typography.small,
  },
  value: {
    ...typography.smallBold,
    textAlign: 'right',
    minWidth: 50,
  },
  compactValue: {
    ...typography.smallBold,
  },
  valueOverLimit: {
    fontWeight: '700',
  },
  progressBar: {
    height: PROGRESS_BAR_HEIGHT,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
});

export default LimitIndicator;
