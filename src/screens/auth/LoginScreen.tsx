import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Logo } from '@/components/common/Logo';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
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

  // Auth hook
  const { login, sendOtp, verifyOtp, isAuthenticating } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Validation state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

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
   * Validate OTP code (Supabase uses 8-digit codes by default)
   */
  const validateOtpCode = (code: string): boolean => {
    if (!code) {
      setOtpError('Verification code is required');
      return false;
    }
    if (!/^\d+$/.test(code)) {
      setOtpError('Code must contain only numbers');
      return false;
    }
    if (code.length < 6 || code.length > 8) {
      setOtpError('Please enter a valid verification code');
      return false;
    }
    setOtpError(null);
    return true;
  };

  /**
   * Handle sending OTP code
   */
  const handleSendOtp = async () => {
    // Clear previous errors
    setError(null);

    // Validate email only
    const isEmailValid = validateEmail(email);

    if (!isEmailValid) {
      return;
    }

    try {
      await sendOtp({ email });
      setOtpSent(true);
      setOtpCode('');
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
   * Handle verifying OTP code
   */
  const handleVerifyOtp = async () => {
    // Clear previous errors
    setError(null);

    // Validate OTP code
    const isOtpValid = validateOtpCode(otpCode);

    if (!isOtpValid) {
      return;
    }

    try {
      await verifyOtp({ email, token: otpCode });
      console.log('OTP verification successful:', email);
      // Navigation is handled automatically by RootNavigator's conditional rendering
    } catch (err: unknown) {
      console.error('Verify OTP error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Invalid') || errorMessage.includes('expired')) {
        setError('Invalid or expired code. Please try again.');
      } else {
        setError(errorMessage || 'Verification failed. Please try again.');
      }
    }
  };

  /**
   * Toggle between password and OTP login
   */
  const toggleLoginMethod = () => {
    setUseOtp(!useOtp);
    setError(null);
    setOtpSent(false);
    setOtpCode('');
    setPasswordError(null);
    setOtpError(null);
  };

  /**
   * Go back to email entry (from OTP input)
   */
  const handleBackToEmail = () => {
    setOtpSent(false);
    setOtpCode('');
    setOtpError(null);
    setError(null);
  };

  /**
   * Navigate to signup screen
   */
  const handleNavigateToSignup = () => {
    navigation.navigate('Signup');
  };

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
              <Logo size={64} color={colors.primary} strokeWidth={2} />
            </View>

            {/* Header Section */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign in to continue to The Nineteenth
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
              {/* OTP Code Entry - shown after code is sent */}
              {useOtp && otpSent ? (
                <>
                  <View style={[styles.otpInfoContainer, { backgroundColor: colors.gray100 }]}>
                    <Text style={[styles.otpInfoText, { color: colors.textSecondary }]}>
                      We sent a verification code to
                    </Text>
                    <Text style={[styles.otpEmailText, { color: colors.textPrimary }]}>{email}</Text>
                  </View>

                  {/* OTP Code Input */}
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Verification Code"
                      value={otpCode}
                      onChangeText={(text) => {
                        // Only allow digits and max 8 characters
                        const cleanedText = text.replace(/[^0-9]/g, '').slice(0, 8);
                        setOtpCode(cleanedText);
                        if (otpError) validateOtpCode(cleanedText);
                      }}
                      mode="outlined"
                      keyboardType="number-pad"
                      maxLength={8}
                      error={!!otpError}
                      disabled={isAuthenticating}
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                      textColor={colors.textPrimary}
                      accessibilityLabel="Verification code input"
                      accessibilityHint="Enter the code sent to your email"
                    />
                    {otpError && (
                      <HelperText type="error" visible={!!otpError}>
                        {otpError}
                      </HelperText>
                    )}
                  </View>

                  {/* Verify Button */}
                  <Button
                    mode="contained"
                    onPress={handleVerifyOtp}
                    disabled={isAuthenticating || otpCode.length < 6}
                    loading={isAuthenticating}
                    style={styles.loginButton}
                    contentStyle={styles.loginButtonContent}
                    labelStyle={styles.loginButtonLabel}
                    buttonColor={colors.primary}
                    textColor={colors.white}
                    accessibilityLabel="Verify code button"
                    accessibilityHint="Tap to verify the code and sign in"
                  >
                    {isAuthenticating ? 'Verifying...' : 'Verify Code'}
                  </Button>

                  {/* Resend / Back options */}
                  <View style={styles.otpActionsContainer}>
                    <Button
                      mode="text"
                      onPress={handleSendOtp}
                      disabled={isAuthenticating}
                      labelStyle={styles.toggleButtonLabel}
                      textColor={colors.primary}
                    >
                      Resend Code
                    </Button>
                    <Button
                      mode="text"
                      onPress={handleBackToEmail}
                      disabled={isAuthenticating}
                      labelStyle={styles.toggleButtonLabel}
                      textColor={colors.textSecondary}
                    >
                      Change Email
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  {/* Email Input */}
                  <View style={styles.inputContainer}>
                    <TextInput
                      label="Email"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (emailError) validateEmail(text);
                      }}
                      onBlur={() => validateEmail(email)}
                      mode="outlined"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      error={!!emailError}
                      disabled={isAuthenticating}
                      style={[styles.input, { backgroundColor: colors.surface }]}
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                      textColor={colors.textPrimary}
                      accessibilityLabel="Email input"
                      accessibilityHint="Enter your email address"
                    />
                    {emailError && (
                      <HelperText type="error" visible={!!emailError}>
                        {emailError}
                      </HelperText>
                    )}
                  </View>

                  {/* Password Input - Only shown for password login */}
                  {!useOtp && (
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Password"
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (passwordError) validatePassword(text);
                        }}
                        onBlur={() => validatePassword(password)}
                        mode="outlined"
                        secureTextEntry={secureTextEntry}
                        autoCapitalize="none"
                        autoComplete="password"
                        error={!!passwordError}
                        disabled={isAuthenticating}
                        style={[styles.input, { backgroundColor: colors.surface }]}
                        outlineColor={colors.border}
                        activeOutlineColor={colors.primary}
                        textColor={colors.textPrimary}
                        right={
                          <TextInput.Icon
                            icon={secureTextEntry ? 'eye' : 'eye-off'}
                            onPress={() => setSecureTextEntry(!secureTextEntry)}
                            accessibilityLabel={
                              secureTextEntry ? 'Show password' : 'Hide password'
                            }
                          />
                        }
                        accessibilityLabel="Password input"
                        accessibilityHint="Enter your password"
                      />
                      {passwordError && (
                        <HelperText type="error" visible={!!passwordError}>
                          {passwordError}
                        </HelperText>
                      )}
                    </View>
                  )}

                  {/* Login / Send Code Button */}
                  <Button
                    mode="contained"
                    onPress={useOtp ? handleSendOtp : handleLogin}
                    disabled={isAuthenticating}
                    loading={isAuthenticating}
                    style={styles.loginButton}
                    contentStyle={styles.loginButtonContent}
                    labelStyle={styles.loginButtonLabel}
                    buttonColor={colors.primary}
                    textColor={colors.white}
                    accessibilityLabel={useOtp ? 'Send code button' : 'Login button'}
                    accessibilityHint={useOtp ? 'Tap to receive a verification code via email' : 'Tap to sign in to your account'}
                  >
                    {isAuthenticating
                      ? useOtp
                        ? 'Sending...'
                        : 'Signing in...'
                      : useOtp
                        ? 'Send Code'
                        : 'Login'}
                  </Button>

                  {/* Toggle Login Method */}
                  <Button
                    mode="text"
                    onPress={toggleLoginMethod}
                    disabled={isAuthenticating}
                    labelStyle={styles.toggleButtonLabel}
                    textColor={colors.textSecondary}
                    accessibilityLabel={useOtp ? 'Use password instead' : 'Use email code instead'}
                  >
                    {useOtp ? 'Use password instead' : 'Sign in with email code'}
                  </Button>
                </>
              )}
            </View>

            {/* Signup Link */}
            <View style={styles.signupContainer}>
              <Text style={[styles.signupText, { color: colors.textSecondary }]}>Don't have an account? </Text>
              <Button
                mode="text"
                onPress={handleNavigateToSignup}
                disabled={isAuthenticating}
                labelStyle={styles.signupButtonLabel}
                textColor={colors.primary}
                accessibilityLabel="Sign up button"
                accessibilityHint="Navigate to sign up screen"
              >
                Sign Up
              </Button>
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
  otpInfoContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  otpInfoText: {
    ...typography.body,
    textAlign: 'center',
  },
  otpEmailText: {
    ...typography.body,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  otpActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  form: {
    gap: spacing.lg,
    width: '100%',
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  input: {},
  loginButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
  },
  loginButtonContent: {
    height: 48,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButtonLabel: {
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '600',
  },
});
