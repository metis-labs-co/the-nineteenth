/**
 * FeatureLockCompact - Compact inline lock for small buttons/cards
 *
 * Designed for compact elements like FeatureButton where the full FeatureLock
 * overlay would be too large. Shows a centered lock badge over dimmed content
 * and makes the entire area tappable to trigger upgrade.
 *
 * @example
 * ```tsx
 * <FeatureLockCompact
 *   feature="ai_competition"
 *   onUpgradePress={() => navigation.navigate('Subscription')}
 * >
 *   <FeatureButton ... />
 * </FeatureLockCompact>
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
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { FeatureId, FeatureAccess } from '@/types/subscription.types';
import type { FeatureCheckContext } from '@/hooks/useSubscription';
import { formatTierName } from './tierConfig';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureLockCompactProps {
  /** The feature ID to check access for */
  feature: FeatureId;

  /** Optional context for limit-based features */
  context?: FeatureCheckContext;

  /** The content to render (shown dimmed when locked) */
  children: ReactNode;

  /** Callback when user taps the locked area to upgrade */
  onUpgradePress?: () => void;

  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FeatureLockCompact = React.memo(function FeatureLockCompact({
  feature,
  context,
  children,
  onUpgradePress,
  testID,
}: FeatureLockCompactProps) {
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
      <View
        style={styles.dimmed}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        {children}
      </View>

      {/* Centered compact badge overlay */}
      <View style={styles.badgeContainer}>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.surface },
            shadows.sm,
          ]}
        >
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
    alignItems: 'center',
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

export default FeatureLockCompact;
