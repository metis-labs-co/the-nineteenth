/**
 * LocationStep - GPS permission step for onboarding
 *
 * Asks users to enable GPS/location for distance-to-pin feature during onboarding.
 * Handles permission requesting and graceful degradation if denied.
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Linking, Platform } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import * as Location from 'expo-location';
import { OnboardingCard } from './OnboardingCard';
import { OnboardingPrimaryButton } from './OnboardingPrimaryButton';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { useThemeColors } from '@/context/ThemeContext';
import type { StepProps } from '../OnboardingScreen';

export function LocationStep({ onNext }: StepProps) {
  const colors = useThemeColors();
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');

  // Check initial permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setPermissionStatus('granted');
        } else if (status === 'denied') {
          setPermissionStatus('denied');
        }
      } catch (error) {
        console.error('[LocationStep] Error checking permission:', error);
      }
    };
    checkPermission();
  }, []);

  const handleEnableGPS = async () => {
    if (isRequesting) return;

    setIsRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setPermissionStatus('granted');
      } else {
        setPermissionStatus('denied');
      }

      // Proceed to next step regardless of result
      // Users can always enable later in settings
      onNext();
    } catch (error) {
      console.error('[LocationStep] Error requesting GPS permission:', error);
      // Still proceed on error
      onNext();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    await Linking.openSettings();
  };

  const handleSkipGPS = () => {
    onNext();
  };

  // Show different UI based on permission status
  const renderContent = () => {
    // Simulator info message (location works but may be simulated)
    if (__DEV__ && Platform.OS === 'ios') {
      // On iOS simulator, location can be simulated - just show a note
      // We don't block the feature, just inform the user
    }

    if (permissionStatus === 'denied') {
      // Permission was denied - show settings link
      return (
        <View style={styles.infoContainer}>
          <Icon source="alert-circle-outline" size={20} color={colors.warning} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Location access is disabled. You can enable it in your device settings.
          </Text>
          <TouchableOpacity
            style={[styles.settingsLink, { borderColor: colors.primary }]}
            onPress={handleOpenSettings}
            accessibilityLabel="Open device settings"
            accessibilityRole="button"
          >
            <Text style={[styles.settingsLinkText, { color: colors.primary }]}>
              Open Settings
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <OnboardingCard
      illustration={
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: withOpacity(colors.primary, 0.16) },
          ]}
        >
          <Icon source="crosshairs-gps" size={38} color={colors.primary} />
        </View>
      }
      title="Distance to Pin"
      description="See your live distance to the green while scoring. Works on courses with GPS data - perfect for club selection."
      actions={
        <View style={styles.actionsContainer}>
          {renderContent()}

          {/* Main action button */}
          <OnboardingPrimaryButton
            onPress={handleEnableGPS}
            disabled={isRequesting}
            accessibilityLabel="Enable GPS location"
          >
            {isRequesting ? (
              <Text style={[styles.enableButtonText, { color: colors.textInverse }]}>
                Enabling...
              </Text>
            ) : (
              <>
                <Icon source="map-marker-radius" size={20} color={colors.textInverse} />
                <Text style={[styles.enableButtonText, { color: colors.textInverse }]}>
                  Enable GPS
                </Text>
              </>
            )}
          </OnboardingPrimaryButton>

          {/* Skip option */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipGPS}
            accessibilityLabel="Skip enabling GPS"
            accessibilityRole="button"
            disabled={isRequesting}
          >
            <Text
              style={[
                styles.skipButtonText,
                { color: isRequesting ? colors.textDisabled : colors.textSecondary },
              ]}
            >
              Maybe later
            </Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    // Design: 74px icon chip, radius 22, primary tint
    width: 74,
    height: 74,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.small,
    textAlign: 'center',
  },
  settingsLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  settingsLinkText: {
    ...typography.small,
  },
  enableButtonText: {
    ...typography.bodyBold,
  },
  skipButton: {
    paddingVertical: spacing.sm,
  },
  skipButtonText: {
    ...typography.body,
  },
});

export default LocationStep;
