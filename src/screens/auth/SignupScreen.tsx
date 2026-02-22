import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconMail } from '@tabler/icons-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PageHeader, FormInput, AppIcon, LogoHorizontal } from '@/components/common';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

/**
 * SignupScreen - Email + password signup with name fields
 *
 * @description
 * User registration screen for MVP Phase 1. Supports first name, last name,
 * email, and password signup with validation, error handling, and auto-login
 * after successful registration.
 *
 * Features:
 * - Separate first name and last name input fields
 * - Email and password input fields
 * - Form validation (email format, password strength, required fields)
 * - Loading states during registration
 * - Error messages for failed signup attempts
 * - Auto-login after successful signup
 * - Navigation back to login screen
 *
 * @example
 * Navigation: navigation.navigate('Signup')
 */

export default function SignupScreen({ navigation }: Props) {
  // Theme colors
  const colors = useThemeColors();
  const isDark = useIsDark();

  // Auth hook
  const { signup, isAuthenticating } = useAuth();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  // Validation state
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  /**
   * Validate first name
   */
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

  /**
   * Validate last name
   */
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

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  /**
   * Validate password strength
   */
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      setPasswordError('Password must contain uppercase and lowercase letters');
      return false;
    }
    if (!/(?=.*\d)/.test(password)) {
      setPasswordError('Password must contain at least one number');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  /**
   * Validate password confirmation
   */
  const validateConfirmPassword = (confirmPassword: string): boolean => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError(null);
    return true;
  };

  /**
   * Handle signup form submission
   */
  const handleSignup = async () => {
    // Clear previous errors
    setError(null);

    // Validate all fields
    const isFirstNameValid = validateFirstName(firstName);
    const isLastNameValid = validateLastName(lastName);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isFirstNameValid || !isLastNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    // Combine first and last name for storage
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const result = await signup({
        email,
        password,
        name: fullName,
      });

      console.log('Signup successful:', { name: fullName, email });

      // Check if email confirmation is required
      if (result.emailConfirmationRequired) {
        // Show email confirmation message instead of navigating
        setEmailConfirmationSent(true);
      }
      // If no email confirmation required, navigation is handled automatically
      // by RootNavigator's conditional rendering when isAuthenticated becomes true
    } catch (err: unknown) {
      console.error('Signup error:', err);

      // Handle specific Supabase auth errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        setError('This email is already registered. Please login instead.');
      } else if (errorMessage.includes('weak password')) {
        setError('Password is too weak. Please use a stronger password.');
      } else if (errorMessage.includes('invalid email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(errorMessage || 'Failed to create account. Please try again.');
      }
    }
  };

  /**
   * Navigate back to login screen
   */
  const handleBackToLogin = () => {
    navigation.goBack();
  };

  // Show email confirmation success screen
  if (emailConfirmationSent) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <PageHeader
          title="Check Your Email"
          showBack={true}
          onBack={handleBackToLogin}
        />
        <View style={styles.confirmationContainer}>
          <View style={[styles.confirmationIcon, { backgroundColor: colors.primaryLight }]}>
            <IconMail size={48} color={colors.primary} />
          </View>
          <Text style={[styles.confirmationTitle, { color: colors.textPrimary }]}>Confirm Your Email</Text>
          <Text style={[styles.confirmationMessage, { color: colors.textSecondary }]}>
            We&apos;ve sent a confirmation link to:
          </Text>
          <Text style={[styles.confirmationEmail, { color: colors.primary }]}>{email}</Text>
          <Text style={[styles.confirmationInstructions, { color: colors.textSecondary }]}>
            Please check your inbox and click the link to activate your account.
            Once confirmed, you can log in.
          </Text>
          <Button
            mode="contained"
            onPress={handleBackToLogin}
            style={styles.confirmationButton}
            contentStyle={styles.signupButtonContent}
            buttonColor={colors.primary}
            textColor={colors.white}
          >
            Go to Login
          </Button>
          <Text style={[styles.confirmationHint, { color: colors.textDisabled }]}>
            Didn&apos;t receive the email? Check your spam folder or try signing up again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader
        title="Sign Up"
        showBack={true}
        onBack={handleBackToLogin}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <AppIcon size={190} />
              <LogoHorizontal width={200} variant={isDark ? 'light' : 'dark'} />
            </View>

            {/* Header Section */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Join The Nineteenth and start organising golf competitions
              </Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.errorLight, borderLeftColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.errorDark }]}>{error}</Text>
              </View>
            )}

            {/* Form Section */}
            <View style={styles.form}>
              {/* Name Row */}
              <View style={styles.nameRow}>
                {/* First Name Input */}
                <View style={styles.nameField}>
                  <FormInput
                    label="First Name"
                    floatingLabel
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (firstNameError) validateFirstName(text);
                    }}
                    onBlur={() => validateFirstName(firstName)}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    textContentType="givenName"
                    error={firstNameError || undefined}
                    disabled={isAuthenticating}
                    accessibilityHint="Enter your first name"
                  />
                </View>

                {/* Last Name Input */}
                <View style={styles.nameField}>
                  <FormInput
                    label="Last Name"
                    floatingLabel
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (lastNameError) validateLastName(text);
                    }}
                    onBlur={() => validateLastName(lastName)}
                    autoCapitalize="words"
                    autoComplete="family-name"
                    textContentType="familyName"
                    error={lastNameError || undefined}
                    disabled={isAuthenticating}
                    accessibilityHint="Enter your last name"
                  />
                </View>
              </View>

              {/* Email Input */}
              <FormInput
                label="Email"
                floatingLabel
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) validateEmail(text);
                }}
                onBlur={() => validateEmail(email)}
                keyboardType="email"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                error={emailError || undefined}
                disabled={isAuthenticating}
                accessibilityHint="Enter your email address"
              />

              {/* Password Input */}
              <FormInput
                label="Password"
                floatingLabel
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                  // Re-validate confirm password if it's been filled
                  if (confirmPassword) validateConfirmPassword(confirmPassword);
                }}
                onBlur={() => validatePassword(password)}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                error={passwordError || undefined}
                hint={!passwordError && password.length > 0 ? 'Use 8+ characters with uppercase, lowercase, and numbers' : undefined}
                disabled={isAuthenticating}
                accessibilityHint="Enter a strong password with at least 8 characters, uppercase, lowercase, and a number"
              />

              {/* Confirm Password Input */}
              <FormInput
                label="Confirm Password"
                floatingLabel
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) validateConfirmPassword(text);
                }}
                onBlur={() => validateConfirmPassword(confirmPassword)}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                error={confirmPasswordError || undefined}
                disabled={isAuthenticating}
                accessibilityHint="Re-enter your password to confirm"
              />

              {/* Sign Up Button */}
              <Button
                mode="contained"
                onPress={handleSignup}
                disabled={isAuthenticating}
                loading={isAuthenticating}
                style={styles.signupButton}
                contentStyle={styles.signupButtonContent}
                labelStyle={styles.signupButtonLabel}
                buttonColor={colors.primary}
                textColor={colors.white}
                accessibilityLabel="Sign up button"
                accessibilityHint="Tap to create your account"
              >
                {isAuthenticating ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={[styles.loginText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <Button
                mode="text"
                onPress={handleBackToLogin}
                disabled={isAuthenticating}
                labelStyle={styles.loginButtonLabel}
                textColor={colors.primary}
                accessibilityLabel="Login button"
                accessibilityHint="Navigate to login screen"
              >
                Login
              </Button>
            </View>

            {/* Terms & Privacy Notice */}
            <View style={styles.termsContainer}>
              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                By signing up, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
  },
  errorContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
  },
  errorText: {
    ...typography.small,
  },
  form: {
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  nameField: {
    flex: 1,
  },
  signupButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
  },
  signupButtonContent: {
    height: 48,
  },
  signupButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  loginText: {
    ...typography.body,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  termsText: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Email confirmation styles
  confirmationContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  confirmationIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  confirmationTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  confirmationMessage: {
    ...typography.body,
    textAlign: 'center',
  },
  confirmationEmail: {
    ...typography.body,
    fontWeight: '600',
    marginVertical: spacing.sm,
    textAlign: 'center',
  },
  confirmationInstructions: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 22,
  },
  confirmationButton: {
    marginTop: spacing.xxl,
    width: '100%',
    borderRadius: borderRadius.md,
  },
  confirmationHint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
