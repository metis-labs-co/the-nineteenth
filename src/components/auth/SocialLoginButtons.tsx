/**
 * SocialLoginButtons - Apple and Google sign-in buttons
 *
 * Reusable component for login and signup screens.
 * Apple button only shows on iOS. Google button shows on all platforms.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { IconBrandApple, IconBrandGoogle } from '@tabler/icons-react-native';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';

interface SocialLoginButtonsProps {
  onApplePress: () => void;
  onGooglePress: () => void;
  isLoading: boolean;
  isAppleAvailable: boolean;
  disabled?: boolean;
}

export function SocialLoginButtons({
  onApplePress,
  onGooglePress,
  isLoading,
  isAppleAvailable,
  disabled = false,
}: SocialLoginButtonsProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const isDisabled = disabled || isLoading;

  return (
    <View style={styles.container}>
      {/* Apple Sign In - iOS only */}
      {Platform.OS === 'ios' && isAppleAvailable && (
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: isDark ? colors.white : '#000000',
            },
            isDisabled && styles.buttonDisabled,
          ]}
          onPress={onApplePress}
          disabled={isDisabled}
          activeOpacity={0.8}
          accessibilityLabel="Continue with Apple"
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size={20} color={isDark ? '#000000' : colors.white} />
          ) : (
            <>
              <IconBrandApple
                size={20}
                color={isDark ? '#000000' : '#FFFFFF'}
                fill={isDark ? '#000000' : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.buttonText,
                  { color: isDark ? '#000000' : '#FFFFFF' },
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
        {isLoading ? (
          <ActivityIndicator size={20} color={colors.textPrimary} />
        ) : (
          <>
            <IconBrandGoogle size={20} color={colors.textPrimary} />
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
