/**
 * SkinsDisclaimerModal - Gambling disclaimer acknowledgment
 *
 * Modal that displays legal disclaimer for the skins gambling feature.
 * Users must acknowledge the terms before using the feature.
 * Stores acknowledgment in AsyncStorage to prevent repeated prompts.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SkinsDisclaimerModal
 *   visible={showDisclaimer}
 *   onAccept={() => {
 *     setShowDisclaimer(false);
 *     proceedWithSkins();
 *   }}
 *   onCancel={() => setShowDisclaimer(false)}
 * />
 *
 * // Check before showing
 * const showIfNeeded = async () => {
 *   const accepted = await hasAcceptedSkinsDisclaimer();
 *   if (!accepted) {
 *     setShowDisclaimer(true);
 *   } else {
 *     proceedWithSkins();
 *   }
 * };
 * ```
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  TouchableOpacity,
  AccessibilityInfo,
  Modal,
  ScrollView,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';

// ============================================================================
// CONSTANTS
// ============================================================================

/** AsyncStorage key for tracking disclaimer acceptance */
const SKINS_DISCLAIMER_STORAGE_KEY = '@skins_disclaimer_accepted';

/** Warning/amber color for the icon */
const WARNING_COLOR = '#f59e0b';

/** Disclaimer bullet points */
const DISCLAIMER_POINTS = [
  'This feature is for social entertainment only',
  'All players must be of legal gambling age in your jurisdiction',
  'The app does not process real money or payments',
  'Settlement of bets is handled between players',
  'Please check local laws regarding gambling activities',
];

// ============================================================================
// TYPES
// ============================================================================

export interface SkinsDisclaimerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when user accepts the disclaimer */
  onAccept: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Test ID for testing */
  testID?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if the user has previously accepted the skins disclaimer
 * @returns Promise resolving to true if accepted, false otherwise
 */
export async function hasAcceptedSkinsDisclaimer(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SKINS_DISCLAIMER_STORAGE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error reading skins disclaimer status:', error);
    return false;
  }
}

/**
 * Clear the skins disclaimer acceptance (for testing or user reset)
 * @returns Promise that resolves when cleared
 */
export async function clearSkinsDisclaimerAcceptance(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SKINS_DISCLAIMER_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing skins disclaimer status:', error);
  }
}

/**
 * Store the skins disclaimer acceptance
 * @returns Promise that resolves when saved
 */
async function saveSkinsDisclaimerAcceptance(): Promise<void> {
  try {
    await AsyncStorage.setItem(SKINS_DISCLAIMER_STORAGE_KEY, 'true');
  } catch (error) {
    console.error('Error saving skins disclaimer status:', error);
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SkinsDisclaimerModal({
  visible,
  onAccept,
  onCancel,
  testID,
}: SkinsDisclaimerModalProps) {
  const colors = useThemeColors();
  const [isChecked, setIsChecked] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Reset checkbox when modal closes
  useEffect(() => {
    if (!visible) {
      setIsChecked(false);
    }
  }, [visible]);

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
        'Gambling Feature Notice. Please read and accept the terms to continue.'
      );
    } else {
      // Reset animations
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Handle accept press
  const handleAccept = async () => {
    await saveSkinsDisclaimerAcceptance();
    AccessibilityInfo.announceForAccessibility('Terms accepted');
    onAccept();
  };

  // Handle cancel press
  const handleCancel = () => {
    AccessibilityInfo.announceForAccessibility('Cancelled');
    onCancel();
  };

  // Toggle checkbox
  const toggleCheckbox = () => {
    setIsChecked(!isChecked);
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
      onRequestClose={onCancel}
    >
      <View
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        testID={testID}
      >
        <TouchableOpacity
          style={styles.backdropPressable}
          onPress={onCancel}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close disclaimer"
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
          accessibilityLabel="Gambling Feature Notice"
        >
          {/* Warning Icon Header */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${WARNING_COLOR}15` },
            ]}
          >
            <Icon
              source="alert-circle"
              size={40}
              color={WARNING_COLOR}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Gambling Feature Notice
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Skins is a betting feature for friendly wagers between players.
            Please be aware:
          </Text>

          {/* Disclaimer Points */}
          <ScrollView
            style={styles.pointsScroll}
            contentContainerStyle={styles.pointsContainer}
            showsVerticalScrollIndicator={false}
          >
            {DISCLAIMER_POINTS.map((point, index) => (
              <View
                key={index}
                style={styles.pointRow}
                accessibilityLabel={point}
              >
                <View
                  style={[
                    styles.bulletContainer,
                    { backgroundColor: `${WARNING_COLOR}20` },
                  ]}
                >
                  <Icon
                    source="information"
                    size={14}
                    color={WARNING_COLOR}
                  />
                </View>
                <Text
                  style={[styles.pointText, { color: colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {point}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Checkbox */}
          <TouchableOpacity
            style={[
              styles.checkboxRow,
              {
                backgroundColor: isChecked ? `${colors.primary}10` : 'transparent',
                borderColor: isChecked ? colors.primary : colors.border,
              },
            ]}
            onPress={toggleCheckbox}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isChecked }}
            accessibilityLabel="I understand and accept these terms"
            testID="skins-disclaimer-checkbox"
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isChecked ? colors.primary : 'transparent',
                  borderColor: isChecked ? colors.primary : colors.border,
                },
              ]}
            >
              {isChecked && (
                <Icon source="check" size={14} color={colors.white} />
              )}
            </View>
            <Text
              style={[
                styles.checkboxLabel,
                { color: isChecked ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              I understand and accept these terms
            </Text>
          </TouchableOpacity>

          {/* Buttons */}
          <View style={styles.buttonsRow}>
            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: colors.border },
              ]}
              onPress={handleCancel}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              testID="skins-disclaimer-cancel"
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.acceptButton,
                {
                  backgroundColor: isChecked ? colors.primary : colors.surfaceVariant,
                },
              ]}
              onPress={handleAccept}
              disabled={!isChecked}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="I Understand, Continue"
              accessibilityState={{ disabled: !isChecked }}
              accessibilityHint={
                isChecked
                  ? 'Tap to continue with skins setup'
                  : 'Check the box above to enable this button'
              }
              testID="skins-disclaimer-accept"
            >
              <Text
                style={[
                  styles.acceptButtonText,
                  { color: isChecked ? colors.white : colors.textDisabled },
                ]}
              >
                I Understand, Continue
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

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
    maxWidth: 380,
    maxHeight: '85%',
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
    marginBottom: spacing.lg,
  },
  pointsScroll: {
    maxHeight: 180,
    width: '100%',
  },
  pointsContainer: {
    paddingBottom: spacing.sm,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bulletContainer: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  pointText: {
    ...typography.small,
    flex: 1,
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkboxLabel: {
    ...typography.small,
    flex: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    ...typography.bodyBold,
  },
  acceptButton: {
    ...shadows.sm,
  },
  acceptButtonText: {
    ...typography.smallBold,
  },
});

export default SkinsDisclaimerModal;
