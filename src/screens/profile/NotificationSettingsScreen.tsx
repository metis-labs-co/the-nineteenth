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
import { Text, Icon, Divider, ActivityIndicator } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { PageHeader, SectionHeader, ToggleSwitch } from '@/components/common';
import { MenuItemRow } from './components';
import { usePushNotifications } from '@/hooks/usePushNotifications';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
          <SectionHeader title="Push Notifications" description="Receive alerts when the app is closed" />
          <View style={[styles.settingsGroup, { backgroundColor: colors.surface }]}>
            <MenuItemRow
              icon="bell-outline"
              title="Enable Push Notifications"
              subtitle="Allow notifications on your device"
              showChevron={false}
              disabled={masterToggleDisabled}
              rightContent={
                <ToggleSwitch
                  value={pushEnabled}
                  onValueChange={handlePushEnabledChange}
                  disabled={masterToggleDisabled}
                />
              }
              onPress={() => !masterToggleDisabled && handlePushEnabledChange(!pushEnabled)}
              testID="setting-push-notifications"
            />
          </View>
        </View>

        {/* Category Toggles (only shown when push is enabled) */}
        {showCategoryToggles && (
          <>
            <Divider style={[styles.divider, { backgroundColor: colors.gray200 }]} />

            <View style={styles.section}>
              <SectionHeader title="Notification Types" description="Choose which notifications you want to receive" />
              <View style={[styles.settingsGroup, { backgroundColor: colors.surface }]}>
                <MenuItemRow
                  icon="trophy-outline"
                  title="Competition Updates"
                  subtitle="New rounds, status changes, and player updates"
                  showChevron={false}
                  disabled={isUpdatingPreferences}
                  rightContent={
                    <ToggleSwitch
                      value={preferences?.pushCompetitionUpdates ?? true}
                      onValueChange={handleCompetitionUpdatesChange}
                      disabled={isUpdatingPreferences}
                    />
                  }
                  onPress={() => !isUpdatingPreferences && handleCompetitionUpdatesChange(!(preferences?.pushCompetitionUpdates ?? true))}
                  testID="setting-competition-updates"
                />
                <MenuItemRow
                  icon="account-plus-outline"
                  title="Friend Requests"
                  subtitle="New friend requests and acceptances"
                  showChevron={false}
                  disabled={isUpdatingPreferences}
                  rightContent={
                    <ToggleSwitch
                      value={preferences?.pushFriendRequests ?? true}
                      onValueChange={handleFriendRequestsChange}
                      disabled={isUpdatingPreferences}
                    />
                  }
                  onPress={() => !isUpdatingPreferences && handleFriendRequestsChange(!(preferences?.pushFriendRequests ?? true))}
                  testID="setting-friend-requests"
                />
                <MenuItemRow
                  icon="card-text-outline"
                  title="Scorecard Updates"
                  subtitle="When players submit scorecards"
                  showChevron={false}
                  disabled={isUpdatingPreferences}
                  rightContent={
                    <ToggleSwitch
                      value={preferences?.pushScorecardUpdates ?? true}
                      onValueChange={handleScorecardUpdatesChange}
                      disabled={isUpdatingPreferences}
                    />
                  }
                  onPress={() => !isUpdatingPreferences && handleScorecardUpdatesChange(!(preferences?.pushScorecardUpdates ?? true))}
                  testID="setting-scorecard-updates"
                />
                <MenuItemRow
                  icon="shield-crown-outline"
                  title="League Updates"
                  subtitle="When players join, tag rounds, or rankings change"
                  showChevron={false}
                  disabled={isUpdatingPreferences}
                  rightContent={
                    <ToggleSwitch
                      value={preferences?.pushLeagueUpdates ?? true}
                      onValueChange={handleLeagueUpdatesChange}
                      disabled={isUpdatingPreferences}
                    />
                  }
                  onPress={() => !isUpdatingPreferences && handleLeagueUpdatesChange(!(preferences?.pushLeagueUpdates ?? true))}
                  testID="setting-league-updates"
                />
                <MenuItemRow
                  icon="cards-playing-outline"
                  title="Side Games & Payouts"
                  subtitle="Skins, Wolf, and prize pool results"
                  showChevron={false}
                  disabled={isUpdatingPreferences}
                  rightContent={
                    <ToggleSwitch
                      value={preferences?.pushSideGameUpdates ?? true}
                      onValueChange={handleSideGameUpdatesChange}
                      disabled={isUpdatingPreferences}
                    />
                  }
                  onPress={() => !isUpdatingPreferences && handleSideGameUpdatesChange(!(preferences?.pushSideGameUpdates ?? true))}
                  testID="setting-side-game-updates"
                />
              </View>
            </View>
          </>
        )}

        {/* Info Footer */}
        <View style={[styles.infoFooter, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Push notifications keep you informed about competition activity, friend requests, scorecard submissions, league updates, and side game results even when the app is closed.
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
