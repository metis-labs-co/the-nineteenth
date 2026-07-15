/**
 * ScoreInputStepper Component
 *
 * A +/- stepper for score entry with current score display.
 * Large touch targets for on-course use.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { ScaledText } from '@/components/common/ScaledText';

interface ScoreInputStepperProps {
  score: number | undefined;
  isPickedUp: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  disabled?: boolean;
  minScore?: number;
  maxScore?: number;
}

export const ScoreInputStepper = React.memo(function ScoreInputStepper({
  score,
  isPickedUp,
  onDecrement,
  onIncrement,
  disabled = false,
  minScore = 1,
  maxScore = 12,
}: ScoreInputStepperProps) {
  const colors = useThemeColors();

  const canDecrement = !disabled && (score === undefined || score > minScore || isPickedUp);
  const canIncrement = !disabled && !isPickedUp && (score === undefined || score < maxScore);

  return (
    <View style={styles.container}>
      {/* Minus Button */}
      <TouchableOpacity
        style={[
          styles.stepperButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
          !canDecrement && styles.buttonDisabled,
        ]}
        onPress={onDecrement}
        disabled={!canDecrement}
        activeOpacity={0.7}
        accessibilityLabel="Decrease score"
        accessibilityRole="button"
      >
        <ScaledText category="critical" style={[styles.stepperButtonText, { color: colors.textPrimary }]}>−</ScaledText>
      </TouchableOpacity>

      {/* Current Score Display */}
      <View style={styles.scoreDisplay}>
        <ScaledText category="critical" style={[styles.scoreDisplayText, { color: colors.textPrimary }]}>
          {isPickedUp ? 'P' : (score ?? '-')}
        </ScaledText>
      </View>

      {/* Plus Button */}
      <TouchableOpacity
        style={[
          styles.stepperButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
          !canIncrement && styles.buttonDisabled,
        ]}
        onPress={onIncrement}
        disabled={!canIncrement}
        activeOpacity={0.7}
        accessibilityLabel="Increase score"
        accessibilityRole="button"
      >
        <ScaledText
          category="critical"
          style={[
            styles.stepperButtonText,
            { color: colors.textPrimary },
            isPickedUp && styles.disabledText,
          ]}
        >
          +
        </ScaledText>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  stepperButton: {
    width: 58,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 29,
    fontWeight: '500',
  },
  scoreDisplay: {
    width: 52,
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDisplayText: {
    fontSize: 40,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.4,
  },
});

export default ScoreInputStepper;
