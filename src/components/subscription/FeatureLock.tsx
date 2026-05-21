/**
 * FeatureLock - Wrap features that may be tier-restricted
 *
 * Provides graceful degradation for tier-gated features:
 * - If allowed: renders children normally
 * - If not allowed: renders children with reduced opacity, lock overlay, and upgrade prompt
 *
 * The locked content remains visible but interaction is blocked, allowing users
 * to see what they're missing before upgrading.
 *
 * @example
 * ```tsx
 * // Basic usage - wrap a premium feature
 * <FeatureLock feature="scoring_pairs">
 *   <ScoringPairsSection />
 * </FeatureLock>
 *
 * // With upgrade handler and custom message
 * <FeatureLock
 *   feature="create_competition"
 *   context={{ currentCount: 5 }}
 *   lockedMessage="You've reached your competition limit"
 *   onUpgradePress={() => navigation.navigate('Subscription')}
 * >
 *   <CreateCompetitionButton />
 * </FeatureLock>
 *
 * // Check game type access
 * <FeatureLock
 *   feature="game_type"
 *   context={{ gameType: 'match-play' }}
 * >
 *   <MatchPlayOption />
 * </FeatureLock>
 * ```
 */

import React, { ReactNode, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, AccessibilityInfo } from 'react-native';
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

interface FeatureLockProps {
  /**
   * The feature ID to check access for
   */
  feature: FeatureId;

  /**
   * Optional context for limit-based features
   * Pass current counts for features like create_competition, add_round, etc.
   */
  context?: FeatureCheckContext;

  /**
   * The content to render (shown with reduced opacity if locked)
   */
  children: ReactNode;

  /**
   * Callback when user taps the upgrade button/overlay
   * If not provided, no "Tap to upgrade" text is shown
   */
  onUpgradePress?: () => void;

  /**
   * Custom message to display when feature is locked
   * @default 'Upgrade to unlock'
   */
  lockedMessage?: string;

  /**
   * Opacity to apply to locked content
   * @default 0.5
   */
  lockedOpacity?: number;

  /**
   * Whether to show the lock icon overlay
   * @default true
   */
  showLockIcon?: boolean;

  /**
   * Whether to completely hide children when locked (instead of showing dimmed)
   * @default false
   */
  hideWhenLocked?: boolean;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FeatureLock = React.memo(function FeatureLock({
  feature,
  context,
  children,
  onUpgradePress,
  lockedMessage = 'Upgrade to unlock',
  lockedOpacity = 0.5,
  showLockIcon = true,
  hideWhenLocked = false,
  testID,
}: FeatureLockProps) {
  const colors = useThemeColors();
  const checkFeature = useCheckFeature();

  // Check feature access
  const access: FeatureAccess = checkFeature(feature, context);

  // Handle upgrade press with accessibility announcement
  const handleUpgradePress = useCallback(() => {
    if (onUpgradePress) {
      AccessibilityInfo.announceForAccessibility(
        `Opening upgrade options for ${lockedMessage}`
      );
      onUpgradePress();
    }
  }, [onUpgradePress, lockedMessage]);

  // If allowed, render children normally
  if (access.allowed) {
    return <>{children}</>;
  }

  // If hideWhenLocked is true, don't render anything
  if (hideWhenLocked) {
    return null;
  }

  // Build the message to display
  const displayMessage = access.reason || lockedMessage;

  // Determine accessibility label
  const accessibilityLabel = `${displayMessage}. ${
    onUpgradePress ? 'Tap to upgrade.' : 'This feature is locked.'
  }`;

  // Render locked state with overlay
  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      accessibilityHint={
        onUpgradePress
          ? 'Double tap to open upgrade options'
          : 'Feature is locked and requires upgrade'
      }
    >
      {/* Dimmed children content */}
      <View
        style={[styles.contentContainer, { opacity: lockedOpacity }]}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        {children}
      </View>

      {/* Lock overlay */}
      <TouchableOpacity
        style={[
          styles.overlay,
          {
            backgroundColor: colors.overlay,
          },
        ]}
        onPress={onUpgradePress ? handleUpgradePress : undefined}
        disabled={!onUpgradePress}
        activeOpacity={0.7}
        accessibilityRole={onUpgradePress ? 'button' : 'text'}
        accessibilityLabel={accessibilityLabel}
      >
        <View
          style={[
            styles.overlayContent,
            {
              backgroundColor: colors.surface,
            },
            shadows.lg,
          ]}
        >
          {/* Lock icon */}
          {showLockIcon && (
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: colors.primaryBackground,
                },
              ]}
            >
              <Icon source="lock-outline" size={24} color={colors.primary} />
            </View>
          )}

          {/* Locked message */}
          <Text
            style={[styles.message, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {displayMessage}
          </Text>

          {/* Upgrade prompt */}
          {onUpgradePress && (
            <View
              style={[
                styles.upgradeButton,
                {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Icon source="arrow-up-circle" size={16} color={colors.white} />
              <Text style={[styles.upgradeText, { color: colors.white }]}>
                Tap to upgrade
              </Text>
            </View>
          )}

          {/* Required tier indicator */}
          {access.requiredTier && (
            <Text
              style={[styles.requiredTier, { color: colors.textSecondary }]}
            >
              Requires {formatTierName(access.requiredTier)} or higher
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  contentContainer: {
    // Opacity applied dynamically
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    zIndex: 1,
  },
  overlayContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    maxWidth: '85%',
    minWidth: 200,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  message: {
    ...typography.bodyBold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    marginTop: spacing.sm,
    minHeight: 44, // Minimum touch target
  },
  upgradeText: {
    ...typography.smallBold,
  },
  requiredTier: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default FeatureLock;
