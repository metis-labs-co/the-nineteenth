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
import { spacing, typography, borderRadius } from '@/constants/theme';
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
        console.log('[LocationStep] GPS permission granted');
      } else {
        setPermissionStatus('denied');
        console.log('[LocationStep] GPS permission denied');
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
            { backgroundColor: colors.primaryLight },
          ]}
        >
          <Icon source="crosshairs-gps" size={80} color={colors.primary} />
        </View>
      }
      title="Distance to Pin"
      description="See your live distance to the green while scoring. Works on courses with GPS data - perfect for club selection."
      actions={
        <View style={styles.actionsContainer}>
          {renderContent()}

          {/* Main action button */}
          <TouchableOpacity
            style={[
              styles.enableButton,
              { backgroundColor: colors.primary },
              isRequesting && styles.buttonDisabled,
            ]}
            onPress={handleEnableGPS}
            accessibilityLabel="Enable GPS location"
            accessibilityRole="button"
            disabled={isRequesting}
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
          </TouchableOpacity>

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

export default LocationStep;
