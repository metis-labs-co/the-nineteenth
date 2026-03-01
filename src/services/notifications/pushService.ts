/**
 * Push Notification Service
 *
 * Handles Expo push notification registration, permissions, and token management.
 *
 * Features:
 * - Request iOS/Android notification permissions
 * - Get Expo push tokens
 * - Register/unregister tokens with Supabase
 * - Configure foreground notification handling
 * - Physical device detection (push doesn't work on simulators)
 *
 * @see docs/progress/PUSH-NOTIFICATIONS-PLAN.md
 * @see src/types/push.types.ts
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/services/supabase/client';

// =====================================================
// TYPES
// =====================================================

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PushServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RegisterTokenResult {
  tokenId: string;
  expoToken: string;
}

// =====================================================
// PERMISSION HANDLING
// =====================================================

/**
 * Request notification permissions from the user
 *
 * On iOS: Shows system permission dialog
 * On Android 13+: Shows system permission dialog
 * On Android <13: Permissions are granted by default
 *
 * @returns Permission status after request
 */
async function requestPermissions(): Promise<PermissionStatus> {
  // Check existing permissions first
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === 'granted') {
    return 'granted';
  }

  // Request permissions
  const { status } = await Notifications.requestPermissionsAsync();

  // Map Expo status to our simpler status type
  if (status === 'granted') {
    return 'granted';
  } else if (status === 'denied') {
    return 'denied';
  }

  return 'undetermined';
}

/**
 * Get current permission status without requesting
 */
async function getPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();

  if (status === 'granted') {
    return 'granted';
  } else if (status === 'denied') {
    return 'denied';
  }

  return 'undetermined';
}

// =====================================================
// DEVICE DETECTION
// =====================================================

/**
 * Check if running on a physical device
 *
 * Push notifications only work on physical devices.
 * Simulators/emulators will fail to get a push token.
 *
 * @returns true if running on a physical device
 */
function isPhysicalDevice(): boolean {
  return Device.isDevice;
}

/**
 * Get device information for token registration
 */
function getDeviceInfo(): { deviceId: string | null; deviceName: string | null; platform: 'ios' | 'android' | null } {
  return {
    deviceId: Device.osBuildId ?? Device.modelId ?? null,
    deviceName: Device.deviceName ?? Device.modelName ?? null,
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : null,
  };
}

// =====================================================
// TOKEN MANAGEMENT
// =====================================================

/**
 * Get the Expo push token for this device
 *
 * Requires:
 * - Physical device (not simulator)
 * - Notification permissions granted
 * - projectId configured in app.json
 *
 * @returns The Expo push token or error
 */
async function getExpoPushToken(): Promise<PushServiceResult<string>> {
  // Check if running on physical device
  if (!isPhysicalDevice()) {
    return {
      success: false,
      error: 'Push notifications require a physical device. Simulators are not supported.',
    };
  }

  // Check permissions
  const permissionStatus = await getPermissionStatus();
  if (permissionStatus !== 'granted') {
    return {
      success: false,
      error: 'Notification permissions not granted. Please enable notifications in Settings.',
    };
  }

  try {
    // Get projectId from Expo config
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.error('[PushService] Missing projectId in expo config');
      return {
        success: false,
        error: 'Push notification configuration error. Missing projectId.',
      };
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('[PushService] Got Expo push token:', tokenData.data);

    return {
      success: true,
      data: tokenData.data,
    };
  } catch (error) {
    console.error('[PushService] Error getting push token:', error);

    const message = error instanceof Error ? error.message : 'Unknown error getting push token';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Register a push token for the current user
 *
 * Steps:
 * 1. Request notification permissions
 * 2. Get Expo push token
 * 3. Upsert token to Supabase via database function
 *
 * @param userId - The authenticated user's ID
 * @returns The registered token ID and expo token, or error
 */
async function registerPushToken(userId: string): Promise<PushServiceResult<RegisterTokenResult>> {
  if (!userId) {
    return {
      success: false,
      error: 'User ID is required to register push token',
    };
  }

  // Step 1: Request permissions
  const permissionStatus = await requestPermissions();

  if (permissionStatus !== 'granted') {
    console.log('[PushService] Permission not granted:', permissionStatus);
    return {
      success: false,
      error: permissionStatus === 'denied'
        ? 'Notification permissions denied. Please enable in Settings.'
        : 'Notification permissions not granted.',
    };
  }

  // Step 2: Get Expo push token
  const tokenResult = await getExpoPushToken();

  if (!tokenResult.success || !tokenResult.data) {
    return {
      success: false,
      error: tokenResult.error ?? 'Failed to get push token',
    };
  }

  const expoToken = tokenResult.data;

  // Step 3: Get device info
  const deviceInfo = getDeviceInfo();
  const appVersion = Constants.expoConfig?.version ?? null;

  // Step 4: Upsert to Supabase using the database function
  // Note: Type assertion needed as generated types may have stricter parameter types
  try {
    const { data, error } = await supabase.rpc(
      'upsert_push_token' as never,
      {
        p_user_id: userId,
        p_token: expoToken,
        p_device_id: deviceInfo.deviceId,
        p_platform: deviceInfo.platform,
        p_device_name: deviceInfo.deviceName,
        p_app_version: appVersion,
      } as never
    );

    if (error) {
      console.error('[PushService] Error upserting push token:', error);
      return {
        success: false,
        error: `Failed to register push token: ${error.message}`,
      };
    }

    console.log('[PushService] Push token registered successfully:', data);

    return {
      success: true,
      data: {
        tokenId: data as string,
        expoToken,
      },
    };
  } catch (error) {
    console.error('[PushService] Error registering push token:', error);
    const message = error instanceof Error ? error.message : 'Unknown error registering push token';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Unregister/disable a push token
 *
 * Used when:
 * - User logs out
 * - User disables notifications
 * - Token becomes invalid (DeviceNotRegistered error)
 *
 * @param token - The Expo push token to unregister
 * @returns Success or error
 */
async function unregisterPushToken(token: string): Promise<PushServiceResult> {
  if (!token) {
    return {
      success: false,
      error: 'Token is required to unregister',
    };
  }

  try {
    // Note: Type assertion needed as generated types may have stricter parameter types
    const { data, error } = await supabase.rpc(
      'disable_push_token' as never,
      { p_token: token } as never
    );

    if (error) {
      console.error('[PushService] Error disabling push token:', error);
      return {
        success: false,
        error: `Failed to unregister push token: ${error.message}`,
      };
    }

    console.log('[PushService] Push token disabled:', data);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[PushService] Error unregistering push token:', error);
    const message = error instanceof Error ? error.message : 'Unknown error unregistering push token';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Remove a push token completely from database
 *
 * Used when user explicitly wants to remove the token entirely
 * rather than just disabling it.
 *
 * @param token - The Expo push token to remove
 * @returns Success or error
 */
async function removePushToken(token: string): Promise<PushServiceResult> {
  if (!token) {
    return {
      success: false,
      error: 'Token is required to remove',
    };
  }

  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('expo_token', token);

    if (error) {
      console.error('[PushService] Error removing push token:', error);
      return {
        success: false,
        error: `Failed to remove push token: ${error.message}`,
      };
    }

    console.log('[PushService] Push token removed');

    return {
      success: true,
    };
  } catch (error) {
    console.error('[PushService] Error removing push token:', error);
    const message = error instanceof Error ? error.message : 'Unknown error removing push token';
    return {
      success: false,
      error: message,
    };
  }
}

// =====================================================
// NOTIFICATION CATEGORIES (iOS)
// =====================================================

/**
 * Notification category identifiers
 * Used to group notifications and provide quick actions
 */
export const NotificationCategories = {
  COMPETITION: 'COMPETITION',
  FRIEND_REQUEST: 'FRIEND_REQUEST',
  SCORECARD: 'SCORECARD',
  LEAGUE: 'LEAGUE',
} as const;

export type NotificationCategory = (typeof NotificationCategories)[keyof typeof NotificationCategories];

/**
 * Notification action identifiers
 * Used to identify which action the user tapped
 */
export const NotificationActions = {
  VIEW: 'VIEW',
  ACCEPT: 'ACCEPT',
} as const;

export type NotificationAction = (typeof NotificationActions)[keyof typeof NotificationActions];

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
async function configureNotificationCategories(): Promise<void> {
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

  console.log('[PushService] iOS notification categories configured');
}

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
function configureNotificationHandler(): void {
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

  console.log('[PushService] Notification handler configured');
}

/**
 * Set up Android notification channel (required for Android 8+)
 *
 * Android requires notification channels for organizing notifications.
 * Call this once at app startup on Android.
 */
async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20', // Primary green color
  });

  // Competition updates channel
  await Notifications.setNotificationChannelAsync('competitions', {
    name: 'Competition Updates',
    description: 'Updates about your golf competitions',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
  });

  // Social channel for friend requests
  await Notifications.setNotificationChannelAsync('social', {
    name: 'Social',
    description: 'Friend requests and social updates',
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  // League updates channel
  await Notifications.setNotificationChannelAsync('league-updates', {
    name: 'League Updates',
    description: 'League joins, round tags, and ranking changes',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1B5E20',
  });

  console.log('[PushService] Android notification channels configured');
}

// =====================================================
// NOTIFICATION LISTENERS
// =====================================================

/**
 * Add a listener for when a notification is received while app is foregrounded
 *
 * @param callback - Function to call when notification is received
 * @returns Subscription that can be removed with .remove()
 */
function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for when user interacts with a notification
 *
 * @param callback - Function to call when notification is tapped
 * @returns Subscription that can be removed with .remove()
 */
function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the last notification response that opened the app
 *
 * Useful for handling deep links from notifications when app was killed.
 */
async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

// =====================================================
// BADGE MANAGEMENT
// =====================================================

/**
 * Set the app badge count (iOS only, some Android launchers)
 *
 * @param count - Badge number to display (0 to clear)
 */
async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get the current badge count
 */
async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Clear the app badge
 */
async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}

// =====================================================
// PUSH SERVICE SINGLETON
// =====================================================

/**
 * Push notification service singleton
 *
 * Provides all push notification functionality for the app.
 *
 * Usage:
 * ```typescript
 * import { pushService } from '@/services/notifications/pushService';
 *
 * // At app startup
 * pushService.configureNotificationHandler();
 * await pushService.setupAndroidNotificationChannel();
 *
 * // When user logs in
 * const result = await pushService.registerPushToken(userId);
 *
 * // When user logs out
 * await pushService.unregisterPushToken(token);
 * ```
 */
export const pushService = {
  // Permissions
  requestPermissions,
  getPermissionStatus,

  // Device detection
  isPhysicalDevice,
  getDeviceInfo,

  // Token management
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
  removePushToken,

  // Notification handling
  configureNotificationHandler,
  configureNotificationCategories,
  setupAndroidNotificationChannel,

  // Listeners
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,

  // Badge management
  setBadgeCount,
  getBadgeCount,
  clearBadge,
};

export default pushService;
