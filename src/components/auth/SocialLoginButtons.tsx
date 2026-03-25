/**
 * SocialLoginButtons - Apple and Google sign-in buttons
 *
 * Reusable component for login and signup screens.
 * Apple button only shows on iOS. Google button shows on all platforms.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { IconBrandGoogle } from '@tabler/icons-react-native';
import { spacing, borderRadius, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

interface SocialLoginButtonsProps {
  onGooglePress: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function SocialLoginButtons({
  onGooglePress,
  isLoading,
  disabled = false,
}: SocialLoginButtonsProps) {
  const colors = useThemeColors();

  const isDisabled = disabled || isLoading;

  return (
    <View style={styles.container}>
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
