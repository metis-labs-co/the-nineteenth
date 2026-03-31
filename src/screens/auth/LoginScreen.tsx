import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormInput, AppIcon, LogoHorizontal } from '@/components/common';
import { SocialLoginButtons, OrDivider } from '@/components/auth';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import type { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

/**
 * LoginScreen - Simple email + password login form
 *
 * @description
 * Basic authentication screen for MVP Phase 1. Supports email/password login
 * with validation, error handling, and navigation to signup screen.
 *
 * Features:
 * - Email and password input fields
 * - Form validation (email format, required fields)
 * - Loading states during authentication
 * - Error messages for failed login attempts
 * - Link to signup screen
 *
 * @example
 * Navigation: navigation.navigate('Login')
 */

export default function LoginScreen({ navigation }: Props) {
  // Theme colors
  const colors = useThemeColors();
  const isDark = useIsDark();

  // Auth hook
  const { login, sendOtp, loginWithApple, loginWithGoogle, isAuthenticating, isSocialLoggingIn, isAppleLoggingIn, isGoogleLoggingIn, isAppleAvailable } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [useOtp, setUseOtp] = useState(true);

  // Validation state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
   * Validate password
   */
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  /**
   * Handle login form submission
   */
  const handleLogin = async () => {
    // Clear previous errors
    setError(null);

    // Validate form
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      await login({ email, password });
      console.log('Login successful:', email);
      // Navigation is handled automatically by RootNavigator's conditional rendering
      // when isAuthenticated becomes true
    } catch (err: unknown) {
      console.error('Login error:', err);
      // Handle specific Supabase auth errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (errorMessage.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account.');
      } else {
        setError(errorMessage || 'Login failed. Please try again.');
      }
    }
  };

  /**
   * Handle sending OTP code
   */
  const handleSendOtp = async () => {
    setError(null);

    if (!validateEmail(email)) return;

    try {
      await sendOtp({ email });
      navigation.navigate('OTPVerification', { email });
    } catch (err: unknown) {
      console.error('Send OTP error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError(errorMessage || 'Failed to send code. Please try again.');
      }
    }
  };

  /**
   * Toggle between password and OTP login
   */
  const toggleLoginMethod = () => {
    setUseOtp(!useOtp);
    setError(null);
    setPasswordError(null);
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
   * Navigate to signup screen
   */
  const handleNavigateToSignup = () => {
    navigation.navigate('Signup');
  };

  const allLoading = isAuthenticating || isSocialLoggingIn;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
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
              <LogoHorizontal width={240} variant={isDark ? 'light' : 'dark'} />
            </View>

            {/* Social Login Buttons */}
            <SocialLoginButtons
              onGooglePress={handleGoogleLogin}
              onApplePress={handleAppleLogin}
              isAppleAvailable={isAppleAvailable}
              isAppleLoading={isAppleLoggingIn}
              isGoogleLoading={isGoogleLoggingIn}
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
                    importantForAutofill="yes"
                    error={emailError || undefined}
                    disabled={isAuthenticating}
                    accessibilityHint="Enter your email address"
                  />

                  {/* Password Input - Only shown for password login */}
                  {!useOtp && (
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
                      autoComplete="current-password"
                      textContentType="password"
                      importantForAutofill="yes"
                      error={passwordError || undefined}
                      disabled={isAuthenticating}
                      accessibilityHint="Enter your password"
                    />
                  )}

                  {/* Login / Send Code Button */}
                  <TouchableOpacity
                    onPress={useOtp ? handleSendOtp : handleLogin}
                    disabled={isAuthenticating}
                    style={[
                      styles.loginButton,
                      { backgroundColor: colors.primary },
                      isAuthenticating && styles.buttonDisabled,
                    ]}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={useOtp ? 'Send code button' : 'Login button'}
                    accessibilityHint={useOtp ? 'Tap to receive a verification code via email' : 'Tap to sign in to your account'}
                  >
                    {isAuthenticating && <ActivityIndicator size="small" color={colors.white} style={styles.buttonLoader} />}
                    <Text style={[styles.loginButtonLabel, { color: colors.white }]}>
                      {isAuthenticating
                        ? useOtp
                          ? 'Sending...'
                          : 'Signing in...'
                        : useOtp
                          ? 'Send Code'
                          : 'Login'}
                    </Text>
                  </TouchableOpacity>

                  {/* Toggle Login Method */}
                  <TouchableOpacity
                    onPress={toggleLoginMethod}
                    disabled={isAuthenticating}
                    style={styles.toggleButton}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={useOtp ? 'Use password instead' : 'Use email code instead'}
                  >
                    <Text style={[styles.toggleButtonLabel, { color: colors.textSecondary }]}>
                      {useOtp ? 'Sign in with password' : 'Sign in with email code'}
                    </Text>
                  </TouchableOpacity>
            </View>

            {/* Signup Link */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: colors.textSecondary }]}>Don&apos;t have an account? </Text>
              <TouchableOpacity
                onPress={handleNavigateToSignup}
                disabled={isAuthenticating}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Sign up button"
                accessibilityHint="Navigate to sign up screen"
              >
                <Text style={[styles.signupButtonLabel, { color: colors.primary }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
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
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xxxl,
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  errorContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    width: '100%',
  },
  errorText: {
    ...typography.small,
  },
  form: {
    gap: spacing.sm,
    width: '100%',
  },
  loginButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    height: 48,
  },
  loginButtonLabel: {
    ...typography.bodyBold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLoader: {
    marginRight: spacing.sm,
  },
  toggleButton: {
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
  },
  toggleButtonLabel: {
    ...typography.small,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  signupText: {
    ...typography.body,
  },
  signupButtonLabel: {
    ...typography.bodyBold,
  },
});
