/**
 * OnboardingDots - Progress indicator for onboarding steps
 *
 * Shows visual dots indicating current position in the onboarding flow.
 * Active dot is wider (24px) while inactive dots are smaller (8px).
 * Dots are clickable for direct navigation.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface OnboardingDotsProps {
  /** Total number of steps */
  totalSteps: number;
  /** Current active step (0-indexed) */
  currentStep: number;
  /** Callback when a dot is pressed */
  onDotPress?: (index: number) => void;
}

export function OnboardingDots({
  totalSteps,
  currentStep,
  onDotPress,
}: OnboardingDotsProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === currentStep;

        return (
          <TouchableOpacity
            key={index}
            onPress={() => onDotPress?.(index)}
            style={[
              styles.dot,
              {
                backgroundColor: isActive ? colors.primary : colors.border,
                width: isActive ? 24 : 8,
              },
            ]}
            accessibilityLabel={`Step ${index + 1} of ${totalSteps}${isActive ? ', current step' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: borderRadius.sm,
  },
});

export default OnboardingDots;
