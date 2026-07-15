/**
 * HandicapCaptureStep - Final onboarding step for handicap capture
 *
 * Collects the user's golf handicap for accurate Stableford scoring.
 * Validates handicap is between -5 and 54.
 * Defaults to 54 if skipped or left empty.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { isHandicapInRange, HANDICAP_RANGE_ERROR } from '@/constants/scoring';
import { FormInput } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';
import { OnboardingPrimaryButton } from './OnboardingPrimaryButton';
import type { StepProps } from '../OnboardingScreen';

export function HandicapCaptureStep({
  onNext,
  handicap,
  setHandicap,
  isSubmitting,
}: StepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [localHandicap, setLocalHandicap] = useState(handicap || '');
  const [error, setError] = useState<string | null>(null);

  const validateHandicap = (value: string): boolean => {
    if (!value) {
      // Empty is valid - will default to 54
      return true;
    }
    const num = parseFloat(value);
    if (!isHandicapInRange(num)) {
      setError(HANDICAP_RANGE_ERROR);
      return false;
    }
    setError(null);
    return true;
  };

  const handleChangeText = (text: string) => {
    setLocalHandicap(text);
    setHandicap(text);
    // Clear error when typing
    if (error) {
      setError(null);
    }
  };

  const handleContinue = () => {
    Keyboard.dismiss();

    if (!validateHandicap(localHandicap)) {
      return;
    }

    onNext();
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: withOpacity(colors.primary, 0.16) },
            ]}
          >
            <Icon source="golf" size={38} color={colors.primary} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            What&apos;s your handicap?
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            This helps us calculate your Stableford points accurately. You can
            update this anytime in your profile.
          </Text>

          {/* Handicap Input */}
          <View style={styles.inputContainer}>
            <FormInput
              value={localHandicap}
              onChangeText={handleChangeText}
              placeholder="e.g., 18.5"
              keyboardType="decimal"
              error={error || undefined}
              hint={!error ? 'Enter a value between -5 and 54 (or skip to use 54)' : undefined}
              disabled={isSubmitting}
              leftAffix="HC:"
              accessibilityHint="Enter your golf handicap between -5 and 54"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>

        {/* Next Button */}
        <View style={styles.buttonContainer}>
          <OnboardingPrimaryButton
            onPress={handleContinue}
            disabled={isSubmitting}
            accessibilityLabel="Continue to next step"
          >
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
              Next
            </Text>
            <Icon source="arrow-right" size={20} color={colors.textInverse} />
          </OnboardingPrimaryButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  illustrationContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  iconContainer: {
    // Design: 74px icon chip, radius 22, primary tint
    width: 74,
    height: 74,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  title: {
    // Design: big 800-weight step title, left-aligned
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 31,
    letterSpacing: -0.5,
    textAlign: 'left',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    fontSize: 15,
    textAlign: 'left',
    lineHeight: 23,
  },
  inputContainer: {
    width: '100%',
    marginTop: spacing.xl,
  },
  buttonContainer: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});

export default HandicapCaptureStep;
