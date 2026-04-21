/**
 * Notification Channels & Categories
 *
 * Configures foreground notification handling, iOS notification categories
 * with quick actions, and Android notification channels.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationCategories, NotificationActions } from './types';

// =====================================================
// NOTIFICATION HANDLER CONFIGURATION
// =====================================================

/**
 * Configure how notifications are handled when the app is in the foreground
 *
 * By default, notifications received while the app is foregrounded
 * are not displayed. This configures them to show.
 *
 * Call this once at app startup (e.g., in App.tsx or a root component).
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Show the notification as a banner and in notification list
      shouldShowBanner: true,
      shouldShowList: true,
      // Play the notification sound
      shouldPlaySound: true,
      // Update the app badge (iOS)
      shouldSetBadge: true,
    }),
  });

}

// =====================================================
// NOTIFICATION CATEGORIES (iOS)
// =====================================================

/**
 * Configure iOS notification categories with quick actions
 *
 * Categories allow users to take actions directly from the notification
 * without opening the app. Each category can have multiple actions.
 *
 * Categories:
 * - COMPETITION: View action for competition-related notifications
 * - FRIEND_REQUEST: View and Accept actions for friend requests
 * - SCORECARD: View action for scorecard submissions
 *
 * Call this once at app startup (e.g., in App.tsx or a root component).
 */
export async function configureNotificationCategories(): Promise<void> {
  // COMPETITION category - View action
  await Notifications.setNotificationCategoryAsync(NotificationCategories.COMPETITION, [
    {
      identifier: NotificationActions.VIEW,
      buttonTitle: 'View',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  // FRIEND_REQUEST category - View and Accept actions
  await Notifications.setNotificationCategoryAsync(NotificationCategories.FRIEND_REQUEST, [
    {
      identifier: NotificationActions.VIEW,
      buttonTitle: 'View',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: NotificationActions.ACCEPT,
      buttonTitle: 'Accept',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  // SCORECARD category - View action
  await Notifications.setNotificationCategoryAsync(NotificationCategories.SCORECARD, [
    {
      identifier: NotificationActions.VIEW,
      buttonTitle: 'View',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  // LEAGUE category - View action
  await Notifications.setNotificationCategoryAsync(NotificationCategories.LEAGUE, [
    {
      identifier: NotificationActions.VIEW,
      buttonTitle: 'View',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

  // SIDE_GAME category - View action
  await Notifications.setNotificationCategoryAsync(NotificationCategories.SIDE_GAME, [
    {
      identifier: NotificationActions.VIEW,
      buttonTitle: 'View',
      options: {
        opensAppToForeground: true,
      },
    },
  ]);

}

// =====================================================
// ANDROID NOTIFICATION CHANNELS
// =====================================================

/**
 * Set up Android notification channel (required for Android 8+)
 *
 * Android requires notification channels for organizing notifications.
 * Call this once at app startup on Android.
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
  });

  // Channel IDs below MUST match ANDROID_CHANNEL_MAP in
  // supabase/functions/send-push-notification/index.ts and
  // supabase/functions/test-push/index.ts. Pushes arriving with a
  // channelId that isn't registered fall back to the default channel
  // and won't carry channel-specific importance/grouping.
  await Notifications.setNotificationChannelAsync('competition-updates', {
    name: 'Competition Updates',
    description: 'Updates about your golf competitions',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
  });

  await Notifications.setNotificationChannelAsync('friend-requests', {
    name: 'Friend Requests',
    description: 'Friend requests and social updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
  });

  await Notifications.setNotificationChannelAsync('scorecard-updates', {
    name: 'Scorecard Updates',
    description: 'Scorecard submissions and round completions',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
  });

  await Notifications.setNotificationChannelAsync('league-updates', {
    name: 'League Updates',
    description: 'League joins, round tags, and ranking changes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
  });

  await Notifications.setNotificationChannelAsync('side-game-updates', {
    name: 'Side Game Updates',
    description: 'Skins, Wolf, and prize pool results',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
  });

  await Notifications.setNotificationChannelAsync('round-reminders', {
    name: 'Tee Time Reminders',
    description: 'Alerts 30 min before your tee time',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
  });

}
