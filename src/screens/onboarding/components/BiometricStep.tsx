/**
 * BiometricStep - Biometric authentication opt-in step
 *
 * Asks users to enable Face ID / Fingerprint during onboarding.
 * Auto-skips if device has no biometric hardware.
 */

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { OnboardingCard } from './OnboardingCard';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { biometricService } from '@/services/biometric';
import type { BiometricType } from '@/services/biometric';
import { useBiometricSetting } from '@/store/settingsStore';
import { useAuth } from '@/hooks/useAuth';
import type { StepProps } from '../OnboardingScreen';

export function BiometricStep({ onNext, onComplete }: StepProps) {
  const colors = useThemeColors();
  const { session } = useAuth();
  const { setBiometricEnabled } = useBiometricSetting();
  const [isEnabling, setIsEnabling] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isChecking, setIsChecking] = useState(true);
  const hasAutoSkipped = useRef(false);

  // Check biometric availability on mount
  useEffect(() => {
    let mounted = true;

    biometricService.checkAvailability().then((availability) => {
      if (!mounted) return;

      if (!availability.isAvailable) {
        // No biometric hardware — auto-complete onboarding
        if (!hasAutoSkipped.current) {
          hasAutoSkipped.current = true;
          onComplete();
        }
        return;
      }

      setBiometricType(availability.biometricType);
      setIsChecking(false);
    });

    return () => {
      mounted = false;
    };
  }, [onComplete]);

  const handleEnable = async () => {
    if (isEnabling) return;

    setIsEnabling(true);
    try {
      const result = await biometricService.authenticate(
        'Confirm your identity to enable biometric lock'
      );

      if (result.success) {
        // Store current refresh token for session recovery
        if (session?.refresh_token) {
          await biometricService.storeRefreshToken(session.refresh_token);
        }
        setBiometricEnabled(true);
        await onComplete();
      }
      // If cancelled or failed, stay on step — user can retry or skip
    } catch (error) {
      console.error('[BiometricStep] Error enabling biometric:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkip = async () => {
    await onComplete();
  };

  // Show loading while checking availability (will auto-skip if unavailable)
  if (isChecking) {
    return (
      <OnboardingCard
        illustration={
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primaryLight },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        }
        title="Secure Your App"
        description="Checking biometric availability..."
      />
    );
  }

  const isFaceId = biometricType === 'facial';
  const iconName = isFaceId ? 'face-recognition' : 'fingerprint';
  const biometricLabel = isFaceId ? 'Face ID' : 'Fingerprint';

  return (
    <OnboardingCard
      illustration={
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryLight },
          ]}
        >
          <Icon source={iconName} size={80} color={colors.primary} />
        </View>
      }
      title="Secure Your App"
      description={`Enable ${biometricLabel} to quickly unlock The Nineteenth. Your scores and competitions stay protected.`}
      actions={
        <View style={styles.actionsContainer}>
          {/* Main action button */}
          <TouchableOpacity
            style={[
              styles.enableButton,
              { backgroundColor: colors.primary },
              isEnabling && styles.buttonDisabled,
            ]}
            onPress={handleEnable}
            accessibilityLabel={`Enable ${biometricLabel}`}
            accessibilityRole="button"
            disabled={isEnabling}
          >
            {isEnabling ? (
              <Text style={[styles.enableButtonText, { color: colors.textInverse }]}>
                Enabling...
              </Text>
            ) : (
              <>
                <Icon source={iconName} size={20} color={colors.textInverse} />
                <Text style={[styles.enableButtonText, { color: colors.textInverse }]}>
                  Enable {biometricLabel}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Skip option */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            accessibilityLabel="Skip enabling biometric lock"
            accessibilityRole="button"
            disabled={isEnabling}
          >
            <Text
              style={[
                styles.skipButtonText,
                { color: isEnabling ? colors.textDisabled : colors.textSecondary },
              ]}
            >
              Skip & Get Started
            </Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  enableButtonText: {
    ...typography.bodyBold,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  skipButton: {
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    ...typography.body,
  },
});

export default BiometricStep;
