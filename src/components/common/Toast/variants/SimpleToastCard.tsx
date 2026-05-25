/**
 * SimpleToastCard - Card content for success/error/info toasts
 *
 * A compact toast card with icon, title, and optional message.
 * Matches the visual style of NotificationToastCard for consistency.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { SimpleToastVariant } from '@/context/ToastContext';

interface SimpleToastCardProps {
  variant: SimpleToastVariant;
  title: string;
  message?: string;
  icon?: string;
  action?: { label: string; onPress: () => void };
  onDismiss?: () => void;
}

const DEFAULT_ICONS: Record<SimpleToastVariant, string> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'information',
};

export const SimpleToastCard = React.memo(function SimpleToastCard({
  variant,
  title,
  message,
  icon,
  action,
  onDismiss,
}: SimpleToastCardProps) {
  const colors = useThemeColors();

  const variantColorMap: Record<SimpleToastVariant, string> = {
    success: colors.success,
    error: colors.error,
    info: colors.primary,
  };

  const iconColor = variantColorMap[variant];
  const iconName = icon ?? DEFAULT_ICONS[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
        },
        shadows.lg,
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`${title}${message ? `. ${message}` : ''}`}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: iconColor },
        ]}
      >
        <Icon source={iconName} size={20} color={colors.white} />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {message && (
          <Text
            style={[styles.message, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {message}
          </Text>
        )}
      </View>

      {action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            action.onPress();
            onDismiss?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.actionLabel, { color: iconColor }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 56,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.smallBold,
  },
  message: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  actionButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionLabel: {
    ...typography.smallBold,
  },
});
