// src/components/common/LoadingSpinner.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { GolfBallLoader, GolfBallSize } from './GolfBallLoader';

type SpinnerSize = GolfBallSize;

interface LoadingSpinnerProps {
  /**
   * Size of the spinner: 'sm' (24dp), 'md' (36dp), 'lg' (48dp)
   */
  size?: SpinnerSize;
  /**
   * Optional loading text to display below the spinner
   */
  message?: string;
  /**
   * Color of the spinner (not used with GolfBallLoader, kept for API compatibility)
   */
  color?: string;
  /**
   * Whether the spinner should fill its container and center itself
   * If false, renders inline without centering
   */
  fullScreen?: boolean;
}

// Custom sizes for each variant (used for container sizing)
const spinnerSizes: Record<SpinnerSize, number> = {
  sm: 24,
  md: 36,
  lg: 48,
};

/**
 * LoadingSpinner - Reusable centered loading indicator
 *
 * Displays a spinning indicator with optional message.
 * Use for loading states, data fetching, or processing.
 *
 * @example
 * ```tsx
 * // Full screen loading (default)
 * <LoadingSpinner />
 *
 * // With message
 * <LoadingSpinner
 *   size="lg"
 *   message="Loading competition..."
 * />
 *
 * // Inline small spinner
 * <LoadingSpinner size="sm" fullScreen={false} />
 *
 * // Custom color
 * <LoadingSpinner color={colors.success} message="Syncing..." />
 * ```
 */
export const LoadingSpinner = React.memo(function LoadingSpinner({
  size = 'md',
  message,
  color: _color,
  fullScreen = true,
}: LoadingSpinnerProps) {
  const colors = useThemeColors();
  const containerSize = spinnerSizes[size];

  const spinner = (
    <View
      style={[
        styles.spinnerContainer,
        { width: containerSize, height: containerSize },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={message || 'Loading'}
      accessibilityState={{ busy: true }}
    >
      <GolfBallLoader size={size} />
    </View>
  );

  if (!fullScreen) {
    return message ? (
      <View style={styles.inlineContainer}>
        {spinner}
        <Text
          variant="bodySmall"
          style={[styles.message, styles.messageInline, { color: colors.gray600 }]}
        >
          {message}
        </Text>
      </View>
    ) : (
      spinner
    );
  }

  return (
    <View style={styles.container}>
      {spinner}
      {message && (
        <Text
          variant="bodyMedium"
          style={[styles.message, { color: colors.gray600 }]}
        >
          {message}
        </Text>
      )}
    </View>
  );
});

export type { LoadingSpinnerProps, SpinnerSize };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  messageInline: {
    marginTop: 0,
    ...typography.small,
  },
});
