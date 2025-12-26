/**
 * InfoBanner - Displays an informational banner with icon and text
 *
 * A versatile banner component for displaying important information with
 * an icon, title, and optional description. Supports different variants
 * for different contexts (info, warning, error, success).
 *
 * @example
 * ```tsx
 * // Super Admin banner
 * <InfoBanner
 *   icon="shield-account"
 *   title="Internal Account"
 *   description="This is a company account with full access to all features."
 *   variant="error"
 * />
 *
 * // Info banner
 * <InfoBanner
 *   icon="information-outline"
 *   title="Feature Update"
 *   description="New scoring options are now available."
 *   variant="info"
 * />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography } from '@/constants/theme';

export type InfoBannerVariant = 'info' | 'warning' | 'error' | 'success';

export interface InfoBannerProps {
  /** Icon name from MaterialCommunityIcons */
  icon: string;
  /** Banner title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Visual variant determining colors */
  variant?: InfoBannerVariant;
  /** Optional testID for testing */
  testID?: string;
}

export const InfoBanner = React.memo(function InfoBanner({
  icon,
  title,
  description,
  variant = 'info',
  testID,
}: InfoBannerProps) {
  const colors = useThemeColors();

  // Get variant-specific colors
  const getVariantColors = () => {
    switch (variant) {
      case 'error':
        return {
          background: colors.errorBackground,
          border: colors.error,
          iconColor: colors.error,
          titleColor: colors.error,
        };
      case 'warning':
        return {
          background: colors.warningBackground,
          border: colors.warning,
          iconColor: colors.warning,
          titleColor: colors.warning,
        };
      case 'success':
        return {
          background: colors.successBackground,
          border: colors.success,
          iconColor: colors.success,
          titleColor: colors.success,
        };
      case 'info':
      default:
        return {
          background: colors.primaryLight,
          border: colors.primary,
          iconColor: colors.primary,
          titleColor: colors.primary,
        };
    }
  };

  const variantColors = getVariantColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantColors.background,
          borderColor: variantColors.border,
        },
      ]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={`${title}${description ? `. ${description}` : ''}`}
    >
      <Icon source={icon} size={24} color={variantColors.iconColor} />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: variantColors.titleColor }]}>
          {title}
        </Text>
        {description && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.small,
  },
});
