/**
 * WolfDisclaimerModal - Side game notice acknowledgment for Wolf game
 *
 * Modal that displays notice for the Wolf side game feature.
 * Users must acknowledge the terms before using the feature.
 * Stores acknowledgment in AsyncStorage to prevent repeated prompts.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <WolfDisclaimerModal
 *   visible={showDisclaimer}
 *   onAccept={() => {
 *     setShowDisclaimer(false);
 *     proceedWithWolf();
 *   }}
 *   onCancel={() => setShowDisclaimer(false)}
 * />
 *
 * // Check before showing
 * const showIfNeeded = async () => {
 *   const accepted = await hasAcceptedWolfDisclaimer();
 *   if (!accepted) {
 *     setShowDisclaimer(true);
 *   } else {
 *     proceedWithWolf();
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
import { spacing, typography, borderRadius, shadows, wolfColor } from '@/constants/theme';

// ============================================================================
// CONSTANTS
// ============================================================================

/** AsyncStorage key for tracking disclaimer acceptance */
const WOLF_DISCLAIMER_STORAGE_KEY = '@wolf_disclaimer_accepted';


/** Warning/amber color for the icon */
const WARNING_COLOR = '#f59e0b';

/** Disclaimer bullet points */
const DISCLAIMER_POINTS = [
  'This feature tracks Wolf game scores and decisions',
  'The app does not process, hold, or transfer any money',
  'Any settlements are arranged privately between players',
  'The Nineteenth is not responsible for any arrangements between players',
];

// ============================================================================
// TYPES
// ============================================================================

export interface WolfDisclaimerModalProps {
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
 * Check if the user has previously accepted the Wolf disclaimer
 * @returns Promise resolving to true if accepted, false otherwise
 */
export async function hasAcceptedWolfDisclaimer(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(WOLF_DISCLAIMER_STORAGE_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error reading Wolf disclaimer status:', error);
    return false;
  }
}

/**
 * Clear the Wolf disclaimer acceptance (for testing or user reset)
 * @returns Promise that resolves when cleared
 */
export async function clearWolfDisclaimerAcceptance(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WOLF_DISCLAIMER_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing Wolf disclaimer status:', error);
  }
}

/**
 * Store the Wolf disclaimer acceptance
 * @returns Promise that resolves when saved
 */
async function saveWolfDisclaimerAcceptance(): Promise<void> {
  try {
    await AsyncStorage.setItem(WOLF_DISCLAIMER_STORAGE_KEY, 'true');
  } catch (error) {
    console.error('Error saving Wolf disclaimer status:', error);
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WolfDisclaimerModal({
  visible,
  onAccept,
  onCancel,
  testID,
}: WolfDisclaimerModalProps) {
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
        'Side Game Notice. Please read and accept the terms to continue.'
      );
    } else {
      // Reset animations
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  // Handle accept press
  const handleAccept = async () => {
    await saveWolfDisclaimerAcceptance();
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
          accessibilityLabel="Side Game Notice"
        >
          {/* Wolf Icon Header */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${wolfColor}15` },
            ]}
          >
            <Icon
              source="dog-side"
              size={40}
              color={wolfColor}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Side Game Notice
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Wolf is a strategic side game where players compete hole-by-hole with partner selection.
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

          {/* Game Rules Brief */}
          <View style={[styles.rulesBox, { backgroundColor: `${wolfColor}10` }]}>
            <Text style={[styles.rulesTitle, { color: colors.textPrimary }]}>
              How Wolf Works
            </Text>
            <Text style={[styles.rulesText, { color: colors.textSecondary }]}>
              Each hole, a rotating &quot;Wolf&quot; chooses to partner with another player
              or go alone against the pack. Points are awarded based on the best
              ball outcome. Going &quot;Lone Wolf&quot; earns more points but is harder to win.
            </Text>
          </View>

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
            testID="wolf-disclaimer-checkbox"
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
              testID="wolf-disclaimer-cancel"
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
                  backgroundColor: isChecked ? wolfColor : colors.surfaceVariant,
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
                  ? 'Tap to continue with Wolf setup'
                  : 'Check the box above to enable this button'
              }
              testID="wolf-disclaimer-accept"
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
    maxHeight: '90%',
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
    maxHeight: 150,
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
  rulesBox: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  rulesTitle: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  rulesText: {
    ...typography.small,
    lineHeight: 20,
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

export default WolfDisclaimerModal;
