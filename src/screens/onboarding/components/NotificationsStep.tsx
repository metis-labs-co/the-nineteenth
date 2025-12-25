/**
 * NotificationsStep - Push notification permission step
 *
 * Asks users to enable push notifications during onboarding.
 * Handles physical device detection, permission requesting, and token registration.
 */

import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Linking } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { OnboardingCard } from './OnboardingCard';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { pushService } from '@/services/notifications/pushService';
import { useAuth } from '@/hooks/useAuth';
import type { StepProps } from '../OnboardingScreen';

export function NotificationsStep({ onNext }: StepProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');

  const isPhysicalDevice = pushService.isPhysicalDevice();

  const handleEnableNotifications = async () => {
    if (isRequesting) return;

    setIsRequesting(true);
    try {
      // Request OS permission and register token if granted
      // registerPushToken handles both permission request and token registration
      if (user?.id && isPhysicalDevice) {
        const result = await pushService.registerPushToken(user.id);

        if (result.success) {
          setPermissionStatus('granted');
          console.log('[NotificationsStep] Push token registered successfully');
        } else {
          // Check if it was a permission denial
          const status = await pushService.getPermissionStatus();
          setPermissionStatus(status);
          console.log('[NotificationsStep] Registration result:', result.error);
        }
      } else {
        // Just request permission on simulator (won't get token)
        const status = await pushService.requestPermissions();
        setPermissionStatus(status);
      }

      // Proceed to next step regardless of result
      // Users can always enable later in settings
      onNext();
    } catch (error) {
      console.error('[NotificationsStep] Error enabling notifications:', error);
      // Still proceed on error
      onNext();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenSettings = async () => {
    await Linking.openSettings();
  };

  const handleSkipNotifications = () => {
    onNext();
  };

  // Show different UI based on device type and permission status
  const renderContent = () => {
    if (!isPhysicalDevice) {
      // Running on simulator - show info message
      return (
        <View style={styles.infoContainer}>
          <Icon source="information-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Push notifications require a physical device. You can enable them later in Settings.
          </Text>
        </View>
      );
    }

    if (permissionStatus === 'denied') {
      // Permission was denied - show settings link
      return (
        <View style={styles.infoContainer}>
          <Icon source="alert-circle-outline" size={20} color={colors.warning} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Notifications are disabled. You can enable them in your device settings.
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
          <Icon source="bell-outline" size={80} color={colors.primary} />
        </View>
      }
      title="Stay in the Loop"
      description="Get notified about competition updates, friend requests, and when your mates submit their scorecards. Never miss a beat on the course."
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
            onPress={handleEnableNotifications}
            accessibilityLabel="Enable push notifications"
            accessibilityRole="button"
            disabled={isRequesting}
          >
            {isRequesting ? (
              <Text style={[styles.enableButtonText, { color: colors.textInverse }]}>
                Enabling...
              </Text>
            ) : (
              <>
                <Icon source="bell-ring-outline" size={20} color={colors.textInverse} />
                <Text style={[styles.enableButtonText, { color: colors.textInverse }]}>
                  Enable Notifications
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Skip option */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipNotifications}
            accessibilityLabel="Skip enabling notifications"
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
    borderRadius: 70,
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

export default NotificationsStep;
