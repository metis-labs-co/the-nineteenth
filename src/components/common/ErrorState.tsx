// src/components/common/ErrorState.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { spacing, typography, iconSizes } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface ErrorStateProps {
  /**
   * Error to display - can be a string message or Error object
   */
  error: string | Error | null;
  /**
   * Callback when retry button is pressed
   */
  onRetry?: () => void;
  /**
   * Custom title for the error state (defaults to "Something went wrong")
   */
  title?: string;
  /**
   * Label for the retry button (defaults to "Try Again")
   */
  retryLabel?: string;
  /**
   * Whether to show a compact version (smaller icon and spacing)
   */
  compact?: boolean;
}

/**
 * ErrorState - Reusable error display component
 *
 * Displays a friendly error icon, message, and optional retry button.
 * Use for API errors, network failures, or any recoverable error state.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ErrorState
 *   error="Failed to load competition data"
 *   onRetry={refetch}
 * />
 *
 * // With Error object
 * <ErrorState
 *   error={queryError}
 *   onRetry={refetch}
 *   title="Couldn't load leaderboard"
 * />
 *
 * // Compact version for inline errors
 * <ErrorState
 *   error="Score submission failed"
 *   onRetry={handleRetry}
 *   compact
 * />
 * ```
 */
export const ErrorState = React.memo(function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  retryLabel = 'Try Again',
  compact = false,
}: ErrorStateProps) {
  const colors = useThemeColors();

  // Extract error message from string or Error object
  const errorMessage = React.useMemo(() => {
    if (!error) return 'An unexpected error occurred';
    if (typeof error === 'string') return error;
    return error.message || 'An unexpected error occurred';
  }, [error]);

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${errorMessage}`}
    >
      {/* Error Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.errorLight },
          compact && styles.iconContainerCompact,
        ]}
      >
        <Icon
          source="alert-circle-outline"
          size={compact ? iconSizes.lg : iconSizes.xxl}
          color={colors.error}
        />
      </View>

      {/* Error Title */}
      <Text
        variant={compact ? 'titleSmall' : 'titleMedium'}
        style={[styles.title, { color: colors.gray900 }]}
        accessibilityRole="header"
      >
        {title}
      </Text>

      {/* Error Message */}
      <Text
        variant="bodyMedium"
        style={[styles.message, { color: colors.gray600 }, compact && styles.messageCompact]}
        numberOfLines={compact ? 2 : 4}
      >
        {errorMessage}
      </Text>

      {/* Retry Button */}
      {onRetry && (
        <Button
          mode="contained"
          onPress={onRetry}
          style={[styles.retryButton, { backgroundColor: colors.primary }, compact && styles.retryButtonCompact]}
          contentStyle={styles.retryButtonContent}
          labelStyle={[styles.retryButtonLabel, { color: colors.white }]}
          icon="refresh"
          accessibilityLabel={retryLabel}
          accessibilityHint="Tap to retry the failed operation"
        >
          {retryLabel}
        </Button>
      )}
    </View>
  );
});

export type { ErrorStateProps };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  containerCompact: {
    flex: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainerCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 300,
  },
  messageCompact: {
    marginBottom: spacing.lg,
    maxWidth: 250,
  },
  retryButton: {
    borderRadius: 12,
    minWidth: 140,
  },
  retryButtonCompact: {
    minWidth: 120,
  },
  retryButtonContent: {
    height: 44, // Minimum touch target
    paddingHorizontal: spacing.md,
  },
  retryButtonLabel: {
    ...typography.bodyBold,
  },
});
