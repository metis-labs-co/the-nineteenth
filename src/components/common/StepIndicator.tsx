/**
 * StepIndicator - Reusable wizard step indicator component
 *
 * Displays numbered step circles with connecting lines and a progress bar.
 * Perfect for multi-step forms, wizards, and onboarding flows.
 *
 * @example
 * const steps = [
 *   { number: 1, title: 'Venue' },
 *   { number: 2, title: 'Course' },
 *   { number: 3, title: 'Holes' },
 * ];
 *
 * <StepIndicator
 *   steps={steps}
 *   currentStep={2}
 *   showProgress
 * />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar as PaperProgressBar } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface Step {
  number: number;
  title: string;
}

export interface StepIndicatorProps {
  /**
   * Array of steps to display
   */
  steps: readonly Step[];
  /**
   * Current active step (1-indexed)
   */
  currentStep: number;
  /**
   * Show progress bar below step circles
   * @default true
   */
  showProgress?: boolean;
  /**
   * Show step titles below circles
   * @default false
   */
  showTitles?: boolean;
}

export const StepIndicator = React.memo(function StepIndicator({
  steps,
  currentStep,
  showProgress = true,
  showTitles = false,
}: StepIndicatorProps) {
  const colors = useThemeColors();

  // Calculate progress as a decimal (0-1)
  const progress = currentStep / steps.length;

  return (
    <View style={styles.container}>
      {/* Step Circles and Lines */}
      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep >= step.number;

          return (
            <React.Fragment key={step.number}>
              {/* Step Circle */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    { backgroundColor: colors.gray200 },
                    isActive && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepCircleText,
                      { color: colors.textSecondary },
                      isActive && { color: colors.white },
                    ]}
                  >
                    {step.number}
                  </Text>
                </View>
                {showTitles && (
                  <Text
                    style={[
                      styles.stepTitle,
                      { color: colors.textSecondary },
                      isActive && { color: colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {step.title}
                  </Text>
                )}
              </View>

              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: colors.gray200 },
                    isCompleted && { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Progress Bar */}
      {showProgress && (
        <PaperProgressBar
          progress={progress}
          color={colors.primary}
          style={[styles.progressBar, { backgroundColor: colors.gray100 }]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleText: {
    ...typography.smallBold,
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: spacing.xs,
  },
  stepTitle: {
    ...typography.caption,
    marginTop: spacing.xs,
    maxWidth: 60,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
});

export default StepIndicator;
