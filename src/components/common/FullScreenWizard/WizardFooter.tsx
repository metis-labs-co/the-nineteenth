import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '@/constants/theme';
import type { UseWizardReturn } from './types';

interface WizardFooterProps {
  wizard: UseWizardReturn;
  isSubmitting?: boolean;
}

export const WizardFooter = React.memo(function WizardFooter({
  wizard,
  isSubmitting = false,
}: WizardFooterProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { currentStep, isFirstStep, isLastStep, goBack, goNext } = wizard;

  const nextLabel =
    currentStep.nextLabel ?? (currentStep.isSubmit || isLastStep ? 'Submit' : 'Next');
  const canProceed = currentStep.canProceed && !isSubmitting;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing.md),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={styles.buttonRow}>
        {!isFirstStep && (
          <TouchableOpacity
            onPress={goBack}
            style={[styles.backButton, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            disabled={isSubmitting}
          >
            <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={goNext}
          style={[
            styles.nextButton,
            { backgroundColor: colors.primary },
            !canProceed && styles.nextButtonDisabled,
            isFirstStep && styles.nextButtonFull,
          ]}
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          accessibilityState={{ disabled: !canProceed }}
          disabled={!canProceed}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={[styles.nextButtonText, { color: colors.white }]}>{nextLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...shadows.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  backButtonText: {
    ...typography.bodyBold,
  },
  nextButton: {
    flex: 2,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    ...typography.bodyBold,
  },
});
