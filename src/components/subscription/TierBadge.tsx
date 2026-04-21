/**
 * TierBadge - Display user's subscription tier as a pill badge
 *
 * Shows the current subscription tier with an icon and colored background.
 * Super Admin tier gets a special glow/border effect to distinguish it.
 *
 * @example
 * ```tsx
 * // Default medium size with icon
 * <TierBadge />
 *
 * // Small size without icon
 * <TierBadge size="small" showIcon={false} />
 *
 * // Large size for profile header
 * <TierBadge size="large" />
 * ```
 */

import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useTier, useTierLimits } from '@/context/SubscriptionContext';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { SubscriptionTier } from '@/types/subscription.types';

// ============================================================================
// TYPES
// ============================================================================

type BadgeSize = 'small' | 'medium' | 'large';

interface TierBadgeProps {
  /**
   * Size variant affecting padding and font size
   * @default 'medium'
   */
  size?: BadgeSize;

  /**
   * Whether to show the tier icon
   * @default true
   */
  showIcon?: boolean;

  /**
   * Override the tier to display (useful for comparison views)
   * If not provided, uses current user's tier
   */
  tier?: SubscriptionTier;

  /**
   * Override the badge color (hex)
   * If not provided, uses tier's badge color from limits
   */
  badgeColor?: string;

  /**
   * Override the display name
   * If not provided, uses tier's display name from limits
   */
  displayName?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Icon names for each subscription tier
 */
const TIER_ICONS: Record<SubscriptionTier, string> = {
  free: 'account-outline',
  social: 'account-group-outline',
  premium: 'crown-outline',
  enterprise: 'domain',
  super_admin: 'shield-crown-outline',
  developer: 'code-tags',
};

/**
 * Fallback display names if limits not loaded
 */
const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  social: 'Social',
  premium: 'Premium',
  enterprise: 'Enterprise',
  super_admin: 'Super Admin',
  developer: 'Developer',
};

/**
 * Fallback badge colors if limits not loaded
 */
const TIER_BADGE_COLORS: Record<SubscriptionTier, string> = {
  free: '#6b7280', // Gray
  social: '#3b82f6', // Blue
  premium: '#f59e0b', // Amber
  enterprise: '#8b5cf6', // Violet
  super_admin: '#dc2626', // Red
  developer: '#06b6d4', // Cyan
};

/**
 * Size configurations for badge variants
 */
const SIZE_CONFIG: Record<
  BadgeSize,
  {
    paddingHorizontal: number;
    paddingVertical: number;
    iconSize: number;
    fontSize: number;
    fontWeight: '400' | '500' | '600' | '700';
    gap: number;
  }
> = {
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    iconSize: 14,
    fontSize: 11,
    fontWeight: '600',
    gap: spacing.xs,
  },
  medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    iconSize: 16,
    fontSize: 13,
    fontWeight: '600',
    gap: spacing.sm,
  },
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    iconSize: 20,
    fontSize: 15,
    fontWeight: '700',
    gap: spacing.sm,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const TierBadge = React.memo(function TierBadge({
  size = 'medium',
  showIcon = true,
  tier: overrideTier,
  badgeColor: overrideBadgeColor,
  displayName: overrideDisplayName,
}: TierBadgeProps) {
  const colors = useThemeColors();
  const currentTier = useTier();
  const limits = useTierLimits();

  // Use override values or get from context/defaults
  const tier = overrideTier ?? currentTier;
  const badgeColor =
    overrideBadgeColor ?? limits?.badgeColor ?? TIER_BADGE_COLORS[tier];
  const displayName =
    overrideDisplayName ?? limits?.displayName ?? TIER_DISPLAY_NAMES[tier];

  // Get size configuration
  const config = SIZE_CONFIG[size];

  // Get icon for tier
  const iconName = TIER_ICONS[tier];

  // Check if internal tier for special glow styling (super_admin or developer)
  const isSuperAdmin = tier === 'super_admin' || tier === 'developer';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: badgeColor,
          paddingHorizontal: config.paddingHorizontal,
          paddingVertical: config.paddingVertical,
          gap: config.gap,
        },
        // Super Admin glow effect
        isSuperAdmin && styles.superAdminGlow,
        isSuperAdmin && {
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          // iOS shadow for glow effect
          ...Platform.select({
            ios: {
              shadowColor: badgeColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
            },
            android: {
              elevation: 4,
            },
          }),
        },
      ]}
      accessibilityLabel={`Subscription tier: ${displayName}`}
      accessibilityRole="text"
    >
      {showIcon && (
        <Icon source={iconName} size={config.iconSize} color={colors.white} />
      )}
      <Text
        style={[
          styles.text,
          {
            color: colors.white,
            fontSize: config.fontSize,
            fontWeight: config.fontWeight,
          },
        ]}
        numberOfLines={1}
      >
        {displayName}
      </Text>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.small,
    textTransform: 'capitalize',
  },
  superAdminGlow: {
    // Additional styling applied inline for dynamic values
  },
});

export default TierBadge;
