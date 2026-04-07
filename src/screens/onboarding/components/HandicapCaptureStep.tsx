/**
 * HandicapCaptureStep - Final onboarding step for handicap capture
 *
 * Collects the user's golf handicap for accurate Stableford scoring.
 * Validates handicap is between 0-54 (WHS max).
 * Defaults to 54 if skipped or left empty.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { FormInput } from '@/components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
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
    if (isNaN(num) || num < 0 || num > 54) {
      setError('Handicap must be between 0 and 54');
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
              { backgroundColor: colors.infoLight },
            ]}
          >
            <Icon source="golf" size={80} color={colors.info} />
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
              hint={!error ? 'Enter a value between 0 and 54 (or skip to use 54)' : undefined}
              disabled={isSubmitting}
              leftAffix="HC:"
              accessibilityHint="Enter your golf handicap between 0 and 54"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>

        {/* Next Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary },
              isSubmitting && { opacity: 0.7 },
            ]}
            onPress={handleContinue}
            disabled={isSubmitting}
            accessibilityLabel="Continue to next step"
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
              Next
            </Text>
            <Icon source="arrow-right" size={20} color={colors.textInverse} />
          </TouchableOpacity>
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
    paddingHorizontal: spacing.xl,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    width: '100%',
    marginTop: spacing.xl,
  },
  buttonContainer: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  buttonText: {
    ...typography.bodyBold,
  },
});

export default HandicapCaptureStep;
