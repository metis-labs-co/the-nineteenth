import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import type { WizardStepConfig } from './types';

interface WizardProgressBarProps {
  steps: WizardStepConfig[];
  currentStepIndex: number;
}

export const WizardProgressBar = React.memo(function WizardProgressBar({
  steps,
  currentStepIndex,
}: WizardProgressBarProps) {
  const colors = useThemeColors();
  const currentStep = steps[currentStepIndex];

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        {steps.map((step, index) => (
          <View
            key={step.key}
            style={[
              styles.segment,
              {
                backgroundColor:
                  index <= currentStepIndex ? colors.primary : colors.surfaceVariant,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.labelRow}>
        <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
          {currentStep?.title}
        </Text>
        <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
          {currentStepIndex + 1} of {steps.length}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  stepTitle: {
    ...typography.body,
  },
  stepCount: {
    ...typography.caption,
  },
});
