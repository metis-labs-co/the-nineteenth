// src/components/common/EmptyState.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { spacing, typography, iconSizes } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

type EmptyStateIcon =
  | 'golf'
  | 'trophy-outline'
  | 'account-group-outline'
  | 'clipboard-list-outline'
  | 'calendar-blank-outline'
  | 'magnify'
  | 'inbox-outline'
  | string;

interface EmptyStateProps {
  /**
   * Title for the empty state
   */
  title: string;
  /**
   * Descriptive message explaining the empty state
   */
  message: string;
  /**
   * Icon name from Material Community Icons (defaults to inbox-outline)
   */
  icon?: EmptyStateIcon;
  /**
   * Label for the action button (if not provided, button is hidden)
   */
  actionLabel?: string;
  /**
   * Callback when action button is pressed
   */
  onAction?: () => void;
  /**
   * Whether to show a compact version (smaller icon and spacing)
   */
  compact?: boolean;
  /**
   * Custom icon color (defaults to gray400)
   */
  iconColor?: string;
}

/**
 * EmptyState - Reusable empty state component
 *
 * Displays a friendly icon, title, message, and optional action button.
 * Use for empty lists, no search results, or first-time user states.
 *
 * @example
 * ```tsx
 * // Basic empty list
 * <EmptyState
 *   title="No competitions yet"
 *   message="Create your first competition to get started"
 *   icon="trophy-outline"
 *   actionLabel="Create Competition"
 *   onAction={handleCreate}
 * />
 *
 * // Empty search results
 * <EmptyState
 *   title="No results found"
 *   message="Try a different search term"
 *   icon="magnify"
 * />
 *
 * // Compact version for inline states
 * <EmptyState
 *   title="No players added"
 *   message="Add players to your competition"
 *   icon="account-group-outline"
 *   compact
 * />
 * ```
 */
export const EmptyState = React.memo(function EmptyState({
  title,
  message,
  icon = 'inbox-outline',
  actionLabel,
  onAction,
  compact = false,
  iconColor,
}: EmptyStateProps) {
  const colors = useThemeColors();
  const resolvedIconColor = iconColor ?? colors.gray400;

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityRole="none"
      accessibilityLabel={`${title}. ${message}`}
    >
      {/* Empty State Icon */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.gray100 },
          compact && styles.iconContainerCompact,
        ]}
      >
        <Icon
          source={icon}
          size={compact ? iconSizes.xl : iconSizes.xxl}
          color={resolvedIconColor}
        />
      </View>

      {/* Title */}
      <Text
        variant={compact ? 'titleSmall' : 'titleMedium'}
        style={[styles.title, { color: colors.gray900 }]}
        accessibilityRole="header"
      >
        {title}
      </Text>

      {/* Message */}
      <Text
        variant="bodyMedium"
        style={[styles.message, { color: colors.gray600 }, compact && styles.messageCompact]}
        numberOfLines={compact ? 2 : 4}
      >
        {message}
      </Text>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          style={[styles.actionButton, { backgroundColor: colors.primary }, compact && styles.actionButtonCompact]}
          contentStyle={styles.actionButtonContent}
          labelStyle={[styles.actionButtonLabel, { color: colors.white }]}
          accessibilityLabel={actionLabel}
          accessibilityHint={`Tap to ${actionLabel.toLowerCase()}`}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
});

export type { EmptyStateProps, EmptyStateIcon };

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
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainerCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  actionButton: {
    borderRadius: 12,
    minWidth: 160,
  },
  actionButtonCompact: {
    minWidth: 140,
  },
  actionButtonContent: {
    height: 44, // Minimum touch target
    paddingHorizontal: spacing.lg,
  },
  actionButtonLabel: {
    ...typography.bodyBold,
  },
});
