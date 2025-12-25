/**
 * NotificationSettingsScreen - Push notification preferences
 *
 * Allows users to configure:
 * - Master toggle to enable/disable all push notifications
 * - Category toggles for competition updates, friend requests, and scorecard updates
 * - Permission status display and link to device settings if permission not granted
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, ScrollView, Linking, Platform } from 'react-native';
import { Text, Switch, Icon, Divider, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader } from '@/components/common/PageHeader';
import { usePushNotifications } from '@/hooks/usePushNotifications';

import type { ColorPalette } from '@/constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingRowProps {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ColorPalette;
  disabled?: boolean;
}

const SettingRow = React.memo(function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  colors,
  disabled = false,
}: SettingRowProps) {
  return (
    <View style={[styles.settingRow, { borderBottomColor: colors.gray100 }, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingRowLeft}>
        <Icon source={icon} size={20} color={disabled ? colors.gray400 : colors.gray600} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, { color: disabled ? colors.textDisabled : colors.textPrimary }]}>{label}</Text>
          {description && (
            <Text style={[styles.settingDescription, { color: disabled ? colors.textDisabled : colors.textSecondary }]}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        color={colors.primary}
        disabled={disabled}
        accessibilityLabel={`Toggle ${label}`}
        accessibilityHint={description}
      />
    </View>
  );
});

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
        return {
          text: 'Notifications enabled in device settings',
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
  const masterToggleDisabled = !isPhysicalDevice || permissionStatus === 'denied' || isUpdatingPreferences;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Push Notifications"
        showBack
        onBack={handleBack}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        {/* Permission Status Section */}
        <View style={styles.section}>
          <View style={[styles.permissionStatus, { backgroundColor: colors.surface }]}>
            <View style={styles.permissionContent}>
              <Icon source={permissionInfo.icon} size={24} color={permissionInfo.color} />
              <View style={styles.permissionTextContainer}>
                <Text style={[styles.permissionText, { color: permissionInfo.color }]}>
                  {permissionInfo.text}
                </Text>
                {permissionStatus === 'denied' && isPhysicalDevice && (
                  <Text
                    style={[styles.openSettingsLink, { color: colors.primary }]}
                    onPress={handleOpenSettings}
                  >
                    Open Settings
                  </Text>
                )}
              </View>
            </View>
            {(isLoading || isUpdatingPreferences) && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

        {/* Master Toggle Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Push Notifications</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Receive alerts when the app is closed
          </Text>
          <View style={[styles.settingsGroup, { backgroundColor: colors.surface }]}>
            <SettingRow
              icon="bell-outline"
              label="Enable Push Notifications"
              description="Allow notifications on your device"
              value={pushEnabled}
              onValueChange={handlePushEnabledChange}
              colors={colors}
              disabled={masterToggleDisabled}
            />
          </View>
        </View>

        {/* Category Toggles (only shown when push is enabled) */}
        {showCategoryToggles && (
          <>
            <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notification Types</Text>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Choose which notifications you want to receive
              </Text>
              <View style={[styles.settingsGroup, { backgroundColor: colors.surface }]}>
                <SettingRow
                  icon="trophy-outline"
                  label="Competition Updates"
                  description="New rounds, status changes, and player updates"
                  value={preferences?.pushCompetitionUpdates ?? true}
                  onValueChange={handleCompetitionUpdatesChange}
                  colors={colors}
                  disabled={isUpdatingPreferences}
                />
                <SettingRow
                  icon="account-plus-outline"
                  label="Friend Requests"
                  description="New friend requests and acceptances"
                  value={preferences?.pushFriendRequests ?? true}
                  onValueChange={handleFriendRequestsChange}
                  colors={colors}
                  disabled={isUpdatingPreferences}
                />
                <SettingRow
                  icon="card-text-outline"
                  label="Scorecard Updates"
                  description="When players submit scorecards"
                  value={preferences?.pushScorecardUpdates ?? true}
                  onValueChange={handleScorecardUpdatesChange}
                  colors={colors}
                  disabled={isUpdatingPreferences}
                />
              </View>
            </View>
          </>
        )}

        {/* Info Footer */}
        <View style={[styles.infoFooter, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Push notifications keep you informed about competition activity, friend requests, and scorecard submissions even when the app is closed.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  divider: {
    marginVertical: spacing.md,
  },
  // Permission status
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionText: {
    ...typography.body,
  },
  openSettingsLink: {
    ...typography.smallBold,
    marginTop: spacing.xs,
  },
  // Settings group
  settingsGroup: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
  },
  settingDescription: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  // Info footer
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    ...typography.caption,
    flex: 1,
  },
});
