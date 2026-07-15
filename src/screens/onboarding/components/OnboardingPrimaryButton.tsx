/**
 * OnboardingPrimaryButton - Gradient-green primary CTA for onboarding steps
 *
 * Design language (app-wide polish): 50px tall, radius 14, green gradient
 * [primaryLight -> primary] — same recipe as the Score CTA on ViewRound.
 * Purely presentational wrapper: callers keep their own inner content
 * (label / icon / loader) and all press handlers.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface OnboardingPrimaryButtonProps {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  /** Style for the outer touchable (width/margins). Stretches by default. */
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function OnboardingPrimaryButton({
  onPress,
  disabled,
  accessibilityLabel,
  style,
  children,
}: OnboardingPrimaryButtonProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      activeOpacity={0.8}
      style={[styles.touchable, disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={[colors.primaryLight, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        {children}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    alignSelf: 'stretch',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Design: 50px gradient CTA, radius 14 (between lg 12 / xl 16 tokens)
    height: 50,
    borderRadius: 14,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
  },
  disabled: {
    opacity: 0.7,
  },
});

export default OnboardingPrimaryButton;
