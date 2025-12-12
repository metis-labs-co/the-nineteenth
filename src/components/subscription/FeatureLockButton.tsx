/**
 * FeatureLockButton - Button wrapper that shows upgrade modal when feature is locked
 *
 * Unlike FeatureLock which overlays content, this component is designed for small
 * buttons (like header buttons) where an overlay would look awkward. Instead, it:
 * - Shows the button normally (optionally with a lock badge)
 * - When tapped and feature is locked, shows UpgradePrompt modal
 * - When tapped and feature is allowed, calls onPress
 *
 * @example
 * ```tsx
 * // Basic usage - button that may be tier-restricted
 * <FeatureLockButton
 *   feature="create_competition"
 *   context={{ currentCount: 5 }}
 *   onPress={() => navigation.navigate('CreateCompetition')}
 *   onUpgradePress={() => navigation.navigate('Subscription')}
 *   upgradeConfig={{
 *     feature: 'create_competition',
 *     title: 'Competition Limit Reached',
 *     message: 'Upgrade to create more competitions',
 *     targetTier: 'social',
 *     benefits: ['Up to 5 competitions', 'More players', 'Stroke play format'],
 *   }}
 * >
 *   <Text>+ New</Text>
 * </FeatureLockButton>
 * ```
 */

import React, { useState, useCallback, ReactNode } from 'react';
import { StyleSheet, View, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { Icon } from 'react-native-paper';
import { useCheckFeature } from '@/context/SubscriptionContext';
import { useThemeColors } from '@/context/ThemeContext';
import { borderRadius } from '@/constants/theme';
import { UpgradePrompt, type UpgradePromptConfig } from './UpgradePrompt';
import type { FeatureId, FeatureAccess } from '@/types/subscription.types';
import type { FeatureCheckContext } from '@/hooks/useSubscription';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureLockButtonProps {
  /**
   * The feature ID to check access for
   */
  feature: FeatureId;

  /**
   * Optional context for limit-based features
   */
  context?: FeatureCheckContext;

  /**
   * The button content to render
   */
  children: ReactNode;

  /**
   * Callback when button is pressed and feature is allowed
   */
  onPress: () => void;

  /**
   * Callback when user taps upgrade in the modal
   */
  onUpgradePress: () => void;

  /**
   * Configuration for the upgrade prompt modal
   */
  upgradeConfig: UpgradePromptConfig;

  /**
   * Whether to show a small lock badge on the button when locked
   * @default true
   */
  showLockBadge?: boolean;

  /**
   * Whether the button is disabled (independent of lock state)
   * @default false
   */
  disabled?: boolean;

  /**
   * Test ID for testing
   */
  testID?: string;

  /**
   * Accessibility label for the button
   */
  accessibilityLabel?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const FeatureLockButton = React.memo(function FeatureLockButton({
  feature,
  context,
  children,
  onPress,
  onUpgradePress,
  upgradeConfig,
  showLockBadge = true,
  disabled = false,
  testID,
  accessibilityLabel,
}: FeatureLockButtonProps) {
  const colors = useThemeColors();
  const checkFeature = useCheckFeature();

  // Track modal visibility
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check feature access
  const access: FeatureAccess = checkFeature(feature, context);
  const isLocked = !access.allowed;

  // Handle button press
  const handlePress = useCallback(() => {
    if (disabled) return;

    if (isLocked) {
      // Show upgrade modal
      AccessibilityInfo.announceForAccessibility(
        access.reason || 'Feature locked. Showing upgrade options.'
      );
      setShowUpgradeModal(true);
    } else {
      // Feature allowed - call onPress
      onPress();
    }
  }, [disabled, isLocked, access.reason, onPress]);

  // Handle upgrade press from modal
  const handleUpgrade = useCallback(() => {
    setShowUpgradeModal(false);
    onUpgradePress();
  }, [onUpgradePress]);

  // Handle modal dismiss
  const handleDismiss = useCallback(() => {
    setShowUpgradeModal(false);
  }, []);

  // Build accessibility label
  const a11yLabel = accessibilityLabel
    ? isLocked
      ? `${accessibilityLabel}. Locked. Tap to see upgrade options.`
      : accessibilityLabel
    : isLocked
      ? 'Locked feature. Tap to see upgrade options.'
      : undefined;

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ disabled }}
        style={styles.container}
      >
        {children}

        {/* Lock badge overlay */}
        {isLocked && showLockBadge && (
          <View
            style={[
              styles.lockBadge,
              { backgroundColor: colors.error, borderColor: colors.surface },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon source="lock" size={10} color={colors.white} />
          </View>
        )}
      </TouchableOpacity>

      {/* Upgrade Modal */}
      <UpgradePrompt
        visible={showUpgradeModal}
        config={upgradeConfig}
        onUpgrade={handleUpgrade}
        onDismiss={handleDismiss}
        testID={testID ? `${testID}-upgrade-modal` : undefined}
      />
    </>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    // borderColor applied dynamically for theme support
  },
});

export default FeatureLockButton;
