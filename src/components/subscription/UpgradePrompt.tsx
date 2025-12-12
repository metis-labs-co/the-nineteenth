/**
 * UpgradePrompt - Modal/bottom sheet for upgrade CTA
 *
 * Displays an attractive upgrade prompt with:
 * - Rocket icon header
 * - Feature-specific title and message
 * - Benefits list with checkmarks
 * - Primary upgrade button
 * - Optional dismiss button
 *
 * Animates in with scale effect. Future: will trigger IAP flow.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <UpgradePrompt
 *   config={{
 *     feature: 'scoring_pairs',
 *     title: 'Unlock Scoring Pairs',
 *     message: 'Get designated markers for competitive rounds',
 *     targetTier: 'premium',
 *     benefits: [
 *       'Designated scoring pairs',
 *       'Official marker assignments',
 *       'Tournament-style verification',
 *     ],
 *   }}
 *   onUpgrade={() => navigation.navigate('Subscription')}
 * />
 *
 * // With dismiss option
 * <UpgradePrompt
 *   config={{
 *     feature: 'create_competition',
 *     title: 'Need More Competitions?',
 *     message: 'Upgrade to create unlimited competitions',
 *     targetTier: 'social',
 *     benefits: ['Up to 5 competitions', '16 players per comp', 'Stroke play format'],
 *   }}
 *   onUpgrade={handleUpgrade}
 *   onDismiss={() => setShowPrompt(false)}
 * />
 * ```
 */

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
  Modal,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { FeatureId, SubscriptionTier } from '@/types/subscription.types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for an upgrade prompt
 */
export interface UpgradePromptConfig {
  /**
   * The feature that triggered the upgrade prompt
   */
  feature: FeatureId;

  /**
   * Title text for the prompt
   * @example "Unlock Match Play"
   */
  title: string;

  /**
   * Descriptive message explaining the upgrade benefit
   * @example "Get access to match play scoring and more game types"
   */
  message: string;

  /**
   * The tier the user should upgrade to
   */
  targetTier: SubscriptionTier;

  /**
   * List of benefits included in the target tier
   * Each item will be displayed with a checkmark
   */
  benefits: string[];
}

interface UpgradePromptProps {
  /**
   * Configuration for the upgrade prompt content
   */
  config: UpgradePromptConfig;

  /**
   * Callback when user taps the upgrade button
   * Future: will trigger IAP flow
   */
  onUpgrade: () => void;

  /**
   * Optional callback for dismiss action
   * If provided, shows "Maybe later" button
   */
  onDismiss?: () => void;

  /**
   * Whether the modal is visible
   * @default true
   */
  visible?: boolean;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Display names for tiers (for button text)
 */
const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  social: 'Social',
  premium: 'Premium',
  super_admin: 'Super Admin',
};

/**
 * Tier colors for gradient/accent (matches TierBadge)
 */
const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: '#6b7280',
  social: '#3b82f6',
  premium: '#f59e0b',
  super_admin: '#dc2626',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const UpgradePrompt = React.memo(function UpgradePrompt({
  config,
  onUpgrade,
  onDismiss,
  visible = true,
  testID,
}: UpgradePromptProps) {
  const colors = useThemeColors();

  // Animation value for scale effect
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Get tier-specific values
  const tierName = TIER_DISPLAY_NAMES[config.targetTier];
  const tierColor = TIER_COLORS[config.targetTier];

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 80,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Announce for accessibility
      AccessibilityInfo.announceForAccessibility(
        `Upgrade prompt: ${config.title}. ${config.message}`
      );
    } else {
      // Reset animations
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, config.title, config.message, scaleAnim, opacityAnim]);

  // Handle upgrade press
  const handleUpgrade = () => {
    AccessibilityInfo.announceForAccessibility(
      `Upgrading to ${tierName}`
    );
    onUpgrade();
  };

  // Handle dismiss press
  const handleDismiss = () => {
    if (onDismiss) {
      AccessibilityInfo.announceForAccessibility('Dismissed upgrade prompt');
      onDismiss();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        testID={testID}
      >
        <TouchableOpacity
          style={styles.backdropPressable}
          onPress={onDismiss}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close upgrade prompt"
        />
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
            shadows.xl,
          ]}
          accessibilityRole="alert"
          accessibilityLabel={`${config.title}. ${config.message}`}
        >
          {/* Rocket Icon Header */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${tierColor}15` },
            ]}
          >
            <Icon
              source="rocket-launch"
              size={40}
              color={tierColor}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {config.title}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {config.message}
          </Text>

          {/* Benefits List */}
          {config.benefits.length > 0 && (
            <View style={styles.benefitsList}>
              {config.benefits.map((benefit, index) => (
                <View
                  key={index}
                  style={styles.benefitRow}
                  accessibilityLabel={benefit}
                >
                  <View
                    style={[
                      styles.checkIconContainer,
                      { backgroundColor: `${colors.success}20` },
                    ]}
                  >
                    <Icon
                      source="check"
                      size={14}
                      color={colors.success}
                    />
                  </View>
                  <Text
                    style={[styles.benefitText, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Upgrade Button */}
          <TouchableOpacity
            style={[
              styles.upgradeButton,
              { backgroundColor: tierColor },
            ]}
            onPress={handleUpgrade}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Upgrade to ${tierName}`}
            accessibilityHint="Opens subscription options"
          >
            <Icon source="arrow-up-circle" size={20} color={colors.textOnColored} />
            <Text style={[styles.upgradeButtonText, { color: colors.textOnColored }]}>
              Upgrade to {tierName}
            </Text>
          </TouchableOpacity>

          {/* Dismiss Button (optional) */}
          {onDismiss && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Maybe later"
              accessibilityHint="Closes this prompt"
            >
              <Text
                style={[styles.dismissButtonText, { color: colors.textSecondary }]}
              >
                Maybe later
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '85%',
    maxWidth: 340,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  benefitsList: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkIconContainer: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  benefitText: {
    ...typography.body,
    flex: 1,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  upgradeButtonText: {
    ...typography.bodyBold,
  },
  dismissButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44, // Minimum touch target
  },
  dismissButtonText: {
    ...typography.body,
  },
});

export default UpgradePrompt;
