import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackScreenProps } from '@/navigation/types';
import { OtpInput } from '@/components/common';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { maskEmail } from '@/utils/formatting';

type Props = RootStackScreenProps<'OTPVerification'>;

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const colors = useThemeColors();
  const { verifyOtp, sendOtp, isAuthenticating } = useAuth();

  const [otpValue, setOtpValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start resend cooldown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleVerify = useCallback(
    async (code: string) => {
      if (isVerifying) return;
      setError(null);
      setIsVerifying(true);

      try {
        await verifyOtp({ email, token: code });
        // Navigation handled automatically by RootNavigator when isAuthenticated becomes true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('Invalid') || message.includes('expired')) {
          setError('Invalid or expired code. Please try again.');
        } else {
          setError(message || 'Verification failed. Please try again.');
        }
        // Clear input for retry
        setOtpValue('');
        setIsVerifying(false);
      }
    },
    [email, verifyOtp, isVerifying],
  );

  const handleResend = useCallback(async () => {
    if (resendCountdown > 0 || isResending) return;
    setError(null);
    setIsResending(true);

    try {
      await sendOtp({ email });
      // Reset cooldown
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
      countdownRef.current = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('rate limit')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError(message || 'Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  }, [email, sendOtp, resendCountdown, isResending]);

  const handleOtpChange = useCallback(
    (value: string) => {
      setOtpValue(value);
      if (error) setError(null);
    },
    [error],
  );

  const handleVerifyPress = useCallback(() => {
    if (otpValue.length === OTP_LENGTH) {
      handleVerify(otpValue);
    }
  }, [otpValue, handleVerify]);

  const isComplete = otpValue.length === OTP_LENGTH;
  const isLoading = isVerifying || isAuthenticating;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Arrow */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            disabled={isLoading}
          >
            <Icon source="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.content}>
            {/* Email Icon Badge */}
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: colors.primaryBackground },
              ]}
            >
              <Icon source="email-outline" size={36} color={colors.primary} />
            </View>

            {/* Heading */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Check your email
            </Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We sent a 6-digit code to
            </Text>
            <Text style={[styles.emailText, { color: colors.textPrimary }]}>
              {maskEmail(email)}
            </Text>

            {/* Error Message */}
            {error && (
              <View
                style={[
                  styles.errorContainer,
                  {
                    backgroundColor: colors.errorLight,
                    borderLeftColor: colors.error,
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.errorDark }]}>
                  {error}
                </Text>
              </View>
            )}

            {/* OTP Input */}
            <View style={styles.otpContainer}>
              <OtpInput
                length={OTP_LENGTH}
                value={otpValue}
                onChange={handleOtpChange}
                onComplete={handleVerify}
                error={!!error}
                disabled={isLoading}
                autoFocus
              />
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleVerifyPress}
              disabled={!isComplete || isLoading}
              style={[
                styles.verifyButton,
                isComplete && !isLoading
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.surfaceVariant },
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Verify code"
            >
              {isLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isComplete ? colors.white : colors.textTertiary}
                />
              ) : (
                <Text
                  style={[
                    styles.verifyButtonLabel,
                    {
                      color: isComplete
                        ? colors.white
                        : colors.textTertiary,
                    },
                  ]}
                >
                  Verify
                </Text>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCountdown > 0 || isResending || isLoading}
              activeOpacity={0.7}
              style={styles.resendButton}
              accessibilityRole="button"
              accessibilityLabel={
                resendCountdown > 0
                  ? `Resend code in ${resendCountdown} seconds`
                  : 'Resend code'
              }
            >
              {isResending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.resendText,
                    {
                      color:
                        resendCountdown > 0
                          ? colors.textTertiary
                          : colors.primary,
                    },
                  ]}
                >
                  {resendCountdown > 0
                    ? `Resend code in ${resendCountdown}s`
                    : 'Resend code'}
                </Text>
              )}
            </TouchableOpacity>
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
  backButton: {
    padding: spacing.lg,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  emailText: {
    ...typography.bodyBold,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
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
  otpContainer: {
    marginBottom: spacing.xxl,
    width: '100%',
  },
  verifyButton: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  verifyButtonLabel: {
    ...typography.bodyBold,
  },
  resendButton: {
    paddingVertical: spacing.sm,
  },
  resendText: {
    ...typography.body,
  },
});
