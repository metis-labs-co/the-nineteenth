/**
 * FeatureLockToggle - Compact inline lock for settings toggles
 *
 * Designed for small spaces like settings rows where the full FeatureLock
 * overlay would be too large. Replaces the toggle switch with a compact
 * lock badge and makes the entire row tappable to trigger upgrade.
 *
 * @example
 * ```tsx
 * <FeatureLockToggle
 *   feature="fir_gir_tracking"
 *   onUpgradePress={() => navigation.navigate('Subscription')}
 * >
 *   <SettingRow ... />
 * </FeatureLockToggle>
 * ```
 */

import React, { ReactNode, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { FeatureId, FeatureAccess } from '@/types/subscription.types';
import type { FeatureCheckContext } from '@/hooks/useSubscription';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureLockToggleProps {
  /** The feature ID to check access for */
  feature: FeatureId;

  /** Optional context for limit-based features */
  context?: FeatureCheckContext;

  /** The setting row(s) to render */
  children: ReactNode;

  /** Callback when user taps the locked row to upgrade */
  onUpgradePress?: () => void;

  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// HELPER
// ============================================================================

function formatTierName(tier: string): string {
  const names: Record<string, string> = {
    free: 'Free',
    social: 'Social',
    premium: 'Premium',
    enterprise: 'Enterprise',
    super_admin: 'Super Admin',
    developer: 'Developer',
  };
  return names[tier] || tier;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FeatureLockToggle = React.memo(function FeatureLockToggle({
  feature,
  context,
  children,
  onUpgradePress,
  testID,
}: FeatureLockToggleProps) {
  const colors = useThemeColors();
  const checkFeature = useCheckFeature();
  const access: FeatureAccess = checkFeature(feature, context);

  const handlePress = useCallback(() => {
    if (onUpgradePress) {
      AccessibilityInfo.announceForAccessibility(
        `This feature requires ${access.requiredTier ? formatTierName(access.requiredTier) : 'an upgrade'}. Opening upgrade options.`
      );
      onUpgradePress();
    }
  }, [onUpgradePress, access.requiredTier]);

  // If allowed, render children normally
  if (access.allowed) {
    return <>{children}</>;
  }

  const tierLabel = access.requiredTier
    ? formatTierName(access.requiredTier)
    : 'Upgrade';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onUpgradePress ? handlePress : undefined}
      disabled={!onUpgradePress}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Locked. Requires ${tierLabel}. Tap to upgrade.`}
    >
      {/* Dimmed children */}
      <View style={styles.dimmed} pointerEvents="none" importantForAccessibility="no-hide-descendants">
        {children}
      </View>

      {/* Inline badge overlay - positioned at the right side */}
      <View style={styles.badgeContainer}>
        <View style={[styles.badge, { backgroundColor: colors.primaryBackground }]}>
          <Icon source="lock-outline" size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {tierLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dimmed: {
    opacity: 0.35,
  },
  badgeContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.smallBold,
  },
});

export default FeatureLockToggle;
