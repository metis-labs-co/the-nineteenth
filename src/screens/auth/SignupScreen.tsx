import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconMail } from '@tabler/icons-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PageHeader, FormInput } from '@/components/common';
import { SocialLoginButtons, OrDivider } from '@/components/auth';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/constants/app';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

/**
 * SignupScreen - Simplified email + password signup with social login
 *
 * @description
 * Streamlined registration screen with social login options (Apple/Google)
 * and a simplified email/password form (just email + password).
 * Name is captured during onboarding instead.
 */

export default function SignupScreen({ navigation }: Props) {
  // Theme colors
  const colors = useThemeColors();

  // Auth hook
  const { signup, loginWithApple, loginWithGoogle, isAuthenticating, isSocialLoggingIn, isAppleAvailable } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  // Validation state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const allLoading = isAuthenticating || isSocialLoggingIn;

  /**
   * Validate email format
   */
  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError(null);
    return true;
  };

  /**
   * Validate password strength
   */
  const validatePassword = (value: string): boolean => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(value)) {
      setPasswordError('Password must contain uppercase and lowercase letters');
      return false;
    }
    if (!/(?=.*\d)/.test(value)) {
      setPasswordError('Password must contain at least one number');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  /**
   * Handle signup form submission
   */
  const handleSignup = async () => {
    setError(null);

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) return;

    try {
      const result = await signup({
        email,
        password,
        name: '', // Name captured during onboarding; ensurePlayerProfile falls back to email prefix
      });

      if (result.emailConfirmationRequired) {
        setEmailConfirmationSent(true);
      }
    } catch (err: unknown) {
      console.error('Signup error:', err);

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
   * Handle Apple social login
   */
  const handleAppleLogin = async () => {
    setError(null);
    try {
      await loginWithApple();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('ERR_CANCELED') || message.includes('canceled')) return;
      setError('Apple sign in failed. Please try again.');
    }
  };

  /**
   * Handle Google social login
   */
  const handleGoogleLogin = async () => {
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('ERR_CANCELED') || message.includes('canceled')) return;
      setError('Google sign in failed. Please try again.');
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
      <PageHeader
        title="Sign Up"
        showBack={true}
        onBack={handleBackToLogin}
        skipTopInset
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
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Sign up with socials</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                The quickest way to get started — no password needed
              </Text>
            </View>

            {/* Social Login Buttons */}
            <SocialLoginButtons
              onGooglePress={handleGoogleLogin}
              isLoading={isSocialLoggingIn}
              disabled={allLoading}
            />

            <OrDivider />

            {/* Error Message */}
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.errorLight, borderLeftColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.errorDark }]}>{error}</Text>
              </View>
            )}

            {/* Form Section */}
            <View style={styles.form}>
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
                disabled={allLoading}
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
                }}
                onBlur={() => validatePassword(password)}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                error={passwordError || undefined}
                hint={!passwordError && password.length > 0 ? 'Use 8+ characters with uppercase, lowercase, and numbers' : undefined}
                disabled={allLoading}
                accessibilityHint="Enter a strong password with at least 8 characters, uppercase, lowercase, and a number"
              />

              {/* Sign Up Button */}
              <Button
                mode="contained"
                onPress={handleSignup}
                disabled={allLoading}
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
                disabled={allLoading}
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
                By signing up, you agree to our{' '}
              </Text>
              <View style={styles.termsLinksRow}>
                <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
                  <Text style={[styles.termsLink, { color: colors.primary }]}>
                    Terms of Service
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}> and </Text>
                <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                  <Text style={[styles.termsLink, { color: colors.primary }]}>
                    Privacy Policy
                  </Text>
                </TouchableOpacity>
              </View>
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
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
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
  termsLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  termsLink: {
    ...typography.caption,
    textDecorationLine: 'underline',
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
