/**
 * CreateCompetitionsStep - Second onboarding step
 *
 * Highlights how easy it is to create competitions and
 * invite friends to join.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { OnboardingCard } from './OnboardingCard';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { StepProps } from '../OnboardingScreen';

export function CreateCompetitionsStep({ onNext }: StepProps) {
  const colors = useThemeColors();

  return (
    <OnboardingCard
      illustration={
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.successLight },
          ]}
        >
          <Icon source="trophy-outline" size={80} color={colors.success} />
        </View>
      }
      title="Create Competitions in Minutes"
      description="Set up a competition with just a few taps. Invite your golf buddies via a simple code, manage rounds, and let the app handle the scoring and leaderboards."
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
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
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

export default CreateCompetitionsStep;
