/**
 * WelcomeStep - First onboarding step
 *
 * Displays the app logo and welcome message introducing
 * The Nineteenth as the social golf competition app.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { AppIcon } from '@/components/common/AppIcon';
import { OnboardingCard } from './OnboardingCard';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { StepProps } from '../OnboardingScreen';

export function WelcomeStep({ onNext }: StepProps) {
  const colors = useThemeColors();

  return (
    <OnboardingCard
      illustration={<AppIcon size={120} />}
      title="Welcome to The Nineteenth"
      description="The number one social golf competition and scoring app. Create competitions, track scores, and compete with your friends - all from your phone."
      actions={
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={onNext}
          accessibilityLabel="Continue to next step"
          accessibilityRole="button"
        >
          <Text style={[styles.nextButtonText, { color: colors.textInverse }]}>
            Next
          </Text>
          <Icon source="arrow-right" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  nextButtonText: {
    ...typography.bodyBold,
  },
});

export default WelcomeStep;
