/**
 * SocialLoginButtons - Apple and Google sign-in buttons
 *
 * Reusable component for login and signup screens.
 * Apple button only shows on iOS. Google button shows on all platforms.
 */

import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { IconBrandAppleFilled, IconBrandGoogleFilled } from '@tabler/icons-react-native';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface SocialLoginButtonsProps {
  onGooglePress: () => void;
  onApplePress?: () => void;
  isAppleAvailable?: boolean;
  isAppleLoading?: boolean;
  isGoogleLoading?: boolean;
  disabled?: boolean;
}

export function SocialLoginButtons({
  onGooglePress,
  onApplePress,
  isAppleAvailable = false,
  isAppleLoading = false,
  isGoogleLoading = false,
  disabled = false,
}: SocialLoginButtonsProps) {
  const colors = useThemeColors();

  const isLoading = isAppleLoading || isGoogleLoading;
  const isDisabled = disabled || isLoading;
  const showApple = Platform.OS === 'ios' && isAppleAvailable && onApplePress;

  return (
    <View style={styles.container}>
      {/* Apple Sign In - iOS only */}
      {showApple && (
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            },
            isDisabled && styles.buttonDisabled,
          ]}
          onPress={onApplePress}
          disabled={isDisabled}
          activeOpacity={0.8}
          accessibilityLabel="Continue with Apple"
          accessibilityRole="button"
        >
          {isAppleLoading ? (
            <ActivityIndicator size={20} color={colors.textPrimary} />
          ) : (
            <>
              <IconBrandAppleFilled size={20} color={colors.textPrimary} />
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.textPrimary },
                ]}
              >
                Continue with Apple
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Google Sign In - All platforms */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          },
          isDisabled && styles.buttonDisabled,
        ]}
        onPress={onGooglePress}
        disabled={isDisabled}
        activeOpacity={0.8}
        accessibilityLabel="Continue with Google"
        accessibilityRole="button"
      >
        {isGoogleLoading ? (
          <ActivityIndicator size={20} color={colors.textPrimary} />
        ) : (
          <>
            <IconBrandGoogleFilled size={20} color={colors.textPrimary} />
            <Text
              style={[
                styles.buttonText,
                { color: colors.textPrimary },
              ]}
            >
              Continue with Google
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});

export default SocialLoginButtons;
