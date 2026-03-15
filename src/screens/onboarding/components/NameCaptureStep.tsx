/**
 * NameCaptureStep - Onboarding step for name capture
 *
 * Collects the user's first and last name.
 * Pre-populates from player profile if available (e.g., from social login).
 * Validates names are non-empty and at least 2 characters each.
 */

import React, { useState, useEffect } from 'react';
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

export function NameCaptureStep({
  onNext,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  playerName,
  isSubmitting,
}: StepProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [localFirstName, setLocalFirstName] = useState(firstName || '');
  const [localLastName, setLocalLastName] = useState(lastName || '');
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);

  // Pre-populate from player name (social login provides name via OAuth)
  useEffect(() => {
    if (playerName && !localFirstName && !localLastName) {
      const parts = playerName.trim().split(/\s+/);
      if (parts.length >= 2) {
        const first = parts[0];
        const last = parts.slice(1).join(' ');
        setLocalFirstName(first);
        setLocalLastName(last);
        setFirstName?.(first);
        setLastName?.(last);
      } else if (parts.length === 1 && parts[0]) {
        setLocalFirstName(parts[0]);
        setFirstName?.(parts[0]);
      }
    }
  }, [playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateFirstName = (value: string): boolean => {
    if (!value.trim()) {
      setFirstNameError('First name is required');
      return false;
    }
    if (value.trim().length < 2) {
      setFirstNameError('First name must be at least 2 characters');
      return false;
    }
    setFirstNameError(null);
    return true;
  };

  const validateLastName = (value: string): boolean => {
    if (!value.trim()) {
      setLastNameError('Last name is required');
      return false;
    }
    if (value.trim().length < 2) {
      setLastNameError('Last name must be at least 2 characters');
      return false;
    }
    setLastNameError(null);
    return true;
  };

  const handleFirstNameChange = (text: string) => {
    setLocalFirstName(text);
    setFirstName?.(text);
    if (firstNameError) setFirstNameError(null);
  };

  const handleLastNameChange = (text: string) => {
    setLocalLastName(text);
    setLastName?.(text);
    if (lastNameError) setLastNameError(null);
  };

  const handleContinue = () => {
    Keyboard.dismiss();

    const isFirstValid = validateFirstName(localFirstName);
    const isLastValid = validateLastName(localLastName);

    if (!isFirstValid || !isLastValid) return;

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
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <Icon source="account" size={80} color={colors.primary} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            What&apos;s your name?
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            This is how other players will see you in competitions and leaderboards.
          </Text>

          {/* Name Inputs */}
          <View style={styles.inputContainer}>
            <FormInput
              label="First Name"
              floatingLabel
              value={localFirstName}
              onChangeText={handleFirstNameChange}
              onBlur={() => validateFirstName(localFirstName)}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              error={firstNameError || undefined}
              disabled={isSubmitting}
              accessibilityHint="Enter your first name"
              returnKeyType="next"
            />
            <FormInput
              label="Last Name"
              floatingLabel
              value={localLastName}
              onChangeText={handleLastNameChange}
              onBlur={() => validateLastName(localLastName)}
              autoCapitalize="words"
              autoComplete="family-name"
              textContentType="familyName"
              error={lastNameError || undefined}
              disabled={isSubmitting}
              accessibilityHint="Enter your last name"
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
    gap: spacing.sm,
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

export default NameCaptureStep;
