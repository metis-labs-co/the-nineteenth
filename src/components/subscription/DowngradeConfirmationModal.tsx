/**
 * DowngradeConfirmationModal - Modal for confirming subscription downgrades
 *
 * Displays a confirmation dialog when user wants to downgrade their subscription.
 * Shows what features they'll lose, reassures that content is preserved,
 * and provides buttons to manage in App Store or cancel.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <DowngradeConfirmationModal
 *   visible={showModal}
 *   currentTier="premium"
 *   targetTier="social"
 *   onConfirm={() => Linking.openURL('app-settings://subscription')}
 *   onDismiss={() => setShowModal(false)}
 * />
 *
 * // Premium to Free downgrade
 * <DowngradeConfirmationModal
 *   visible={true}
 *   currentTier="premium"
 *   targetTier="free"
 *   onConfirm={handleOpenAppStoreSettings}
 *   onDismiss={handleDismiss}
 *   testID="downgrade-modal"
 * />
 * ```
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { SubscriptionTier } from '@/types/subscription.types';
import { TIER_CONFIGS, type PaywallTier } from './tierConfig';

// ============================================================================
// TYPES
// ============================================================================

interface DowngradeConfirmationModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;

  /**
   * Current subscription tier
   */
  currentTier: SubscriptionTier;

  /**
   * Target tier to downgrade to
   */
  targetTier: SubscriptionTier;

  /**
   * Callback when user confirms (opens App Store settings)
   */
  onConfirm: () => void;

  /**
   * Callback when user dismisses the modal
   */
  onDismiss: () => void;

  /**
   * Test ID for testing
   */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Display names for tiers
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
 * Tier colors (matches TierBadge and UpgradePrompt)
 */
const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: '#6b7280',
  social: '#3b82f6',
  premium: '#f59e0b',
  enterprise: '#8b5cf6',
  super_admin: '#dc2626',
  developer: '#06b6d4',
};

/**
 * Free tier features (for comparison, since tierConfig only has social/premium)
 */
const FREE_TIER_FEATURES: string[] = [
  'Up to 3 competitions',
  'Up to 10 players per competition',
  'Stableford scoring only',
  'Basic statistics',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get features for a tier
 */
function getTierFeatures(tier: SubscriptionTier): string[] {
  if (tier === 'free') {
    return FREE_TIER_FEATURES;
  }
  if (tier === 'social' || tier === 'premium' || tier === 'enterprise') {
    return TIER_CONFIGS[tier as PaywallTier].features;
  }
  // super_admin or developer - return all enterprise features
  return TIER_CONFIGS.enterprise.features;
}

/**
 * Calculate features that will be lost when downgrading
 */
function getLostFeatures(
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier
): string[] {
  const currentFeatures = getTierFeatures(currentTier);
  const targetFeatures = getTierFeatures(targetTier);

  // Features in current tier but not in target tier
  return currentFeatures.filter(
    (feature) =>
      !targetFeatures.some(
        (targetFeature) =>
          targetFeature.toLowerCase().includes(feature.toLowerCase()) ||
          feature.toLowerCase().includes(targetFeature.toLowerCase())
      )
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const DowngradeConfirmationModal = React.memo(
  function DowngradeConfirmationModal({
    visible,
    currentTier,
    targetTier,
    onConfirm,
    onDismiss,
    testID,
  }: DowngradeConfirmationModalProps) {
    const colors = useThemeColors();
    const { height: windowHeight } = useWindowDimensions();

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // Get tier display info
    const currentTierName = TIER_DISPLAY_NAMES[currentTier];
    const targetTierName = TIER_DISPLAY_NAMES[targetTier];
    const currentTierColor = TIER_COLORS[currentTier];
    const targetTierColor = TIER_COLORS[targetTier];

    // Calculate lost features
    const lostFeatures = useMemo(
      () => getLostFeatures(currentTier, targetTier),
      [currentTier, targetTier]
    );

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
          `Downgrade confirmation. You are about to downgrade from ${currentTierName} to ${targetTierName}.`
        );
      } else {
        // Reset animations
        scaleAnim.setValue(0.85);
        opacityAnim.setValue(0);
      }
    }, [visible, currentTierName, targetTierName, scaleAnim, opacityAnim]);

    // Handle confirm press
    const handleConfirm = () => {
      AccessibilityInfo.announceForAccessibility(
        'Opening App Store subscription management'
      );
      onConfirm();
    };

    // Handle dismiss press
    const handleDismiss = () => {
      AccessibilityInfo.announceForAccessibility('Dismissed downgrade prompt');
      onDismiss();
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
            accessibilityLabel="Close downgrade confirmation"
          />
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: colors.surfaceElevated,
                maxHeight: windowHeight * 0.9,
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
              shadows.xl,
            ]}
            accessibilityRole="alert"
            accessibilityLabel={`Downgrade from ${currentTierName} to ${targetTierName}`}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header Icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${colors.warning}15` },
                ]}
              >
                <Icon
                  source="arrow-down-circle"
                  size={40}
                  color={colors.warning}
                />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Downgrade Plan?
              </Text>

              {/* Tier Change Display */}
              <View style={styles.tierChangeRow}>
                <Text style={[styles.tierName, { color: currentTierColor }]}>
                  {currentTierName}
                </Text>
                <Icon
                  source="arrow-right"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={[styles.tierName, { color: targetTierColor }]}>
                  {targetTierName}
                </Text>
              </View>

              {/* Warning Section */}
              {lostFeatures.length > 0 && (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: `${colors.warning}10` },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <Icon
                      source="alert-circle-outline"
                      size={20}
                      color={colors.warning}
                    />
                    <Text
                      style={[styles.sectionTitle, { color: colors.warning }]}
                    >
                      You&apos;ll lose access to:
                    </Text>
                  </View>
                  <View style={styles.featureList}>
                    {lostFeatures.map((feature, index) => (
                      <View
                        key={index}
                        style={styles.featureRow}
                        accessibilityLabel={feature}
                      >
                        <Icon
                          source="minus-circle-outline"
                          size={16}
                          color={colors.error}
                        />
                        <Text
                          style={[
                            styles.featureText,
                            { color: colors.textPrimary },
                          ]}
                          numberOfLines={2}
                        >
                          {feature}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Reassurance Section */}
              <View
                style={[
                  styles.section,
                  { backgroundColor: `${colors.success}10` },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <Icon source="check-circle" size={20} color={colors.success} />
                  <Text style={[styles.sectionTitle, { color: colors.success }]}>
                    Your existing content is safe:
                  </Text>
                </View>
                <View style={styles.featureList}>
                  <View style={styles.featureRow}>
                    <Icon
                      source="check"
                      size={16}
                      color={colors.success}
                    />
                    <Text
                      style={[styles.featureText, { color: colors.textPrimary }]}
                    >
                      Current competitions preserved
                    </Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Icon
                      source="check"
                      size={16}
                      color={colors.success}
                    />
                    <Text
                      style={[styles.featureText, { color: colors.textPrimary }]}
                    >
                      All historical data kept
                    </Text>
                  </View>
                </View>
              </View>

              {/* Timing Note */}
              <View style={styles.timingNote}>
                <Icon
                  source="clock-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text
                  style={[styles.timingText, { color: colors.textSecondary }]}
                >
                  Changes take effect at end of billing period
                </Text>
              </View>
            </ScrollView>

            {/* Action buttons stay pinned outside the scroll so they're always
                reachable even when the lost-features list is long. */}
            <View style={styles.actions}>
              {/* Primary Button - Manage in App Store */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleConfirm}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Manage in App Store"
                accessibilityHint="Opens your subscription settings in the App Store"
              >
                <Icon source="store" size={20} color={colors.white} />
                <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                  Manage in App Store
                </Text>
              </TouchableOpacity>

              {/* Secondary Button - Keep Current Tier */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDismiss}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Keep ${currentTierName}`}
                accessibilityHint="Closes this prompt and keeps your current plan"
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Keep {currentTierName}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

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
    width: '90%',
    maxWidth: 360,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  actions: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
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
    marginBottom: spacing.md,
  },
  tierChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  tierName: {
    ...typography.bodyBold,
  },
  section: {
    width: '100%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.smallBold,
  },
  featureList: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.small,
    flex: 1,
  },
  timingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  timingText: {
    ...typography.small,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  primaryButtonText: {
    ...typography.bodyBold,
  },
  secondaryButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44, // Minimum touch target
  },
  secondaryButtonText: {
    ...typography.body,
  },
});

export default DowngradeConfirmationModal;
