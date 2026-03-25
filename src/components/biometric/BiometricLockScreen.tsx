import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useIsDark } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { LogoHorizontal } from '@/components/common/LogoHorizontal';
import { GolfBallLoader } from '@/components/common/GolfBallLoader';
import type { BiometricType } from '@/services/biometric';

interface BiometricLockScreenProps {
  onUnlock: () => Promise<void>;
  onSignOut: () => void;
  isAuthenticating: boolean;
  error: string | null;
  biometricType: BiometricType;
}

function getBiometricIcon(type: BiometricType): string {
  switch (type) {
    case 'facial':
      return 'face-recognition';
    case 'fingerprint':
      return 'fingerprint';
    default:
      return 'lock';
  }
}

function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case 'facial':
      return 'Face ID';
    case 'fingerprint':
      return 'Fingerprint';
    default:
      return 'Biometric';
  }
}

export default function BiometricLockScreen({
  onUnlock,
  onSignOut,
  isAuthenticating,
  error,
  biometricType,
}: BiometricLockScreenProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();

  const icon = getBiometricIcon(biometricType);
  const label = getBiometricLabel(biometricType);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.content}>
        <LogoHorizontal width={200} variant={isDark ? 'light' : 'dark'} />

        <View style={[styles.lockIconContainer, { backgroundColor: colors.gray100 }]}>
          <Icon source="lock" size={64} color={colors.textSecondary} />
        </View>

        <View style={styles.statusArea}>
          {isAuthenticating ? (
            <>
              <GolfBallLoader size="md" />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                Authenticating...
              </Text>
            </>
          ) : error ? (
            <>
              <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { borderColor: colors.primary }]}
                onPress={onUnlock}
              >
                <Text style={[styles.retryButtonText, { color: colors.primary }]}>Try Again</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>Tap to unlock</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.unlockButton, { backgroundColor: colors.primary }]}
          onPress={onUnlock}
          disabled={isAuthenticating}
          accessibilityRole="button"
          accessibilityLabel={`Unlock with ${label}`}
        >
          <Icon source={icon} size={24} color={colors.white} />
          <Text style={[styles.unlockButtonText, { color: colors.white }]}>
            Unlock with {label}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={onSignOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out and use password"
      >
        <Text style={[styles.signOutText, { color: colors.textSecondary }]}>
          Use password instead
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  lockIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusArea: {
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
  },
  statusText: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    ...typography.bodyBold,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    height: 56,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignSelf: 'stretch',
  },
  unlockButtonText: {
    ...typography.bodyBold,
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  signOutText: {
    ...typography.body,
  },
});
