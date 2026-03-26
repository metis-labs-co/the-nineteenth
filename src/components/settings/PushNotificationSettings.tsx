/**
 * PushNotificationSettings - Settings section for push notification preferences
 *
 * Displays a card with toggles to control push notification preferences:
 * - Master toggle to enable/disable all push notifications
 * - Category toggles for competition updates, friend requests, and scorecard updates
 * - Permission status display and link to device settings if permission not granted
 *
 * Uses the usePushNotifications hook for state management and mutations.
 *
 * @example
 * ```tsx
 * <PushNotificationSettings />
 * ```
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Linking, Platform } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ToggleSwitch } from '@/components/common';

/**
 * Props for PushNotificationSettings component
 */
export interface PushNotificationSettingsProps {
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * Props for a single setting row
 */
interface SettingRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * Individual setting row with label, description, and switch
 */
const SettingRow = React.memo(function SettingRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  testID,
}: SettingRowProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border },
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.rowContent}>
        <Text
          style={[
            styles.rowLabel,
            { color: disabled ? colors.textDisabled : colors.textPrimary },
          ]}
        >
          {label}
        </Text>
        {description && (
          <Text
            style={[
              styles.rowDescription,
              { color: disabled ? colors.textDisabled : colors.textSecondary },
            ]}
          >
            {description}
          </Text>
        )}
      </View>
      <ToggleSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      />
    </View>
  );
});

/**
 * PushNotificationSettings component
 *
 * Displays push notification settings in a card format with:
 * - Master toggle for all push notifications
 * - Category toggles for specific notification types (when enabled)
 * - Permission status and settings link (when permission not granted)
 */
export const PushNotificationSettings = React.memo(function PushNotificationSettings({
  testID,
}: PushNotificationSettingsProps) {
  const colors = useThemeColors();
  const {
    preferences,
    permissionStatus,
    isLoadingPreferences,
    isLoadingPermission,
    isUpdatingPreferences,
    isPhysicalDevice,
    updatePreferences,
    requestPermission,
  } = usePushNotifications();

  // Determine if push is enabled
  const pushEnabled = preferences?.pushEnabled ?? false;

  // Open device settings for notification permissions
  const handleOpenSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  // Handle master toggle change
  const handlePushEnabledChange = useCallback(
    async (enabled: boolean) => {
      // If enabling and permission not granted, request permission first
      if (enabled && permissionStatus !== 'granted') {
        const status = await requestPermission();
        if (status !== 'granted') {
          // Permission denied, don't enable
          return;
        }
      }
      await updatePreferences({ pushEnabled: enabled });
    },
    [permissionStatus, requestPermission, updatePreferences]
  );

  // Handle category toggle changes
  const handleCompetitionUpdatesChange = useCallback(
    (enabled: boolean) => {
      updatePreferences({ pushCompetitionUpdates: enabled });
    },
    [updatePreferences]
  );

  const handleFriendRequestsChange = useCallback(
    (enabled: boolean) => {
      updatePreferences({ pushFriendRequests: enabled });
    },
    [updatePreferences]
  );

  const handleScorecardUpdatesChange = useCallback(
    (enabled: boolean) => {
      updatePreferences({ pushScorecardUpdates: enabled });
    },
    [updatePreferences]
  );

  const handleLeagueUpdatesChange = useCallback(
    (enabled: boolean) => {
      updatePreferences({ pushLeagueUpdates: enabled });
    },
    [updatePreferences]
  );

  const handleSideGameUpdatesChange = useCallback(
    (enabled: boolean) => {
      updatePreferences({ pushSideGameUpdates: enabled });
    },
    [updatePreferences]
  );

  // Get permission status text and icon
  const getPermissionStatusInfo = () => {
    if (!isPhysicalDevice) {
      return {
        text: 'Push notifications require a physical device',
        icon: 'cellphone-off',
        color: colors.warning,
      };
    }

    switch (permissionStatus) {
      case 'granted':
        // Check if user has disabled notifications via the master toggle
        if (!pushEnabled) {
          return {
            text: 'Notifications disabled',
            icon: 'bell-off-outline',
            color: colors.textSecondary,
          };
        }
        return {
          text: 'Notifications enabled',
          icon: 'check-circle-outline',
          color: colors.success,
        };
      case 'denied':
        return {
          text: 'Notifications blocked in device settings',
          icon: 'close-circle-outline',
          color: colors.error,
        };
      case 'undetermined':
      default:
        return {
          text: 'Enable notifications to stay updated',
          icon: 'bell-outline',
          color: colors.textSecondary,
        };
    }
  };

  const permissionInfo = getPermissionStatusInfo();
  const isLoading = isLoadingPreferences || isLoadingPermission;
  const showCategoryToggles = pushEnabled && permissionStatus === 'granted';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      testID={testID}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon source="bell-outline" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Push Notifications
          </Text>
        </View>
        {(isLoading || isUpdatingPreferences) && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {/* Permission Status */}
      <View
        style={[
          styles.permissionStatus,
          { backgroundColor: colors.surfaceVariant },
        ]}
      >
        <Icon source={permissionInfo.icon} size={18} color={permissionInfo.color} />
        <Text
          style={[styles.permissionText, { color: permissionInfo.color }]}
          accessibilityLabel={`Permission status: ${permissionInfo.text}`}
        >
          {permissionInfo.text}
        </Text>
      </View>

      {/* Enable in Settings Button (when permission denied) */}
      {permissionStatus === 'denied' && isPhysicalDevice && (
        <View style={styles.settingsButtonContainer}>
          <Text
            style={[styles.settingsButton, { color: colors.primary }]}
            onPress={handleOpenSettings}
            accessibilityRole="link"
            accessibilityLabel="Open device settings to enable notifications"
            accessibilityHint="Opens your device settings where you can enable notifications for this app"
          >
            Enable in Settings
          </Text>
        </View>
      )}

      {/* Master Toggle */}
      <SettingRow
        label="Enable Push Notifications"
        description="Receive alerts when the app is closed"
        value={pushEnabled}
        onValueChange={handlePushEnabledChange}
        disabled={!isPhysicalDevice || permissionStatus === 'denied' || isUpdatingPreferences}
        accessibilityLabel="Enable push notifications toggle"
        testID={testID ? `${testID}-master-toggle` : undefined}
      />

      {/* Category Toggles (only shown when push is enabled) */}
      {showCategoryToggles && (
        <View style={styles.categorySection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Notification Types
          </Text>

          <SettingRow
            label="Competition Updates"
            description="New rounds, status changes, and player updates"
            value={preferences?.pushCompetitionUpdates ?? true}
            onValueChange={handleCompetitionUpdatesChange}
            disabled={isUpdatingPreferences}
            accessibilityLabel="Competition updates notifications toggle"
            testID={testID ? `${testID}-competition-toggle` : undefined}
          />

          <SettingRow
            label="Friend Requests"
            description="New friend requests and acceptances"
            value={preferences?.pushFriendRequests ?? true}
            onValueChange={handleFriendRequestsChange}
            disabled={isUpdatingPreferences}
            accessibilityLabel="Friend requests notifications toggle"
            testID={testID ? `${testID}-friends-toggle` : undefined}
          />

          <SettingRow
            label="Scorecard Updates"
            description="When players submit scorecards"
            value={preferences?.pushScorecardUpdates ?? true}
            onValueChange={handleScorecardUpdatesChange}
            disabled={isUpdatingPreferences}
            accessibilityLabel="Scorecard updates notifications toggle"
            testID={testID ? `${testID}-scorecard-toggle` : undefined}
          />

          <SettingRow
            label="League Updates"
            description="When players join, tag rounds, or rankings change"
            value={preferences?.pushLeagueUpdates ?? true}
            onValueChange={handleLeagueUpdatesChange}
            disabled={isUpdatingPreferences}
            accessibilityLabel="League updates notifications toggle"
            testID={testID ? `${testID}-league-toggle` : undefined}
          />

          <SettingRow
            label="Side Games & Payouts"
            description="Skins, Wolf, and prize pool results"
            value={preferences?.pushSideGameUpdates ?? true}
            onValueChange={handleSideGameUpdatesChange}
            disabled={isUpdatingPreferences}
            accessibilityLabel="Side games and payouts notifications toggle"
            testID={testID ? `${testID}-side-games-toggle` : undefined}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h4,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  permissionText: {
    ...typography.small,
    flex: 1,
  },
  settingsButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  settingsButton: {
    ...typography.smallBold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowLabel: {
    ...typography.body,
  },
  rowDescription: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  categorySection: {
    paddingTop: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});

export default PushNotificationSettings;
