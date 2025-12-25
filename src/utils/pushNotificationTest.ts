/**
 * Push Notification Test Utilities
 *
 * Development-only utilities for testing push notifications.
 * These functions help verify push notification behavior without
 * needing to wait for actual database triggers.
 *
 * @see docs/progress/PUSH-NOTIFICATIONS-PLAN.md
 *
 * IMPORTANT: This file is for development builds only.
 * Functions are wrapped in __DEV__ checks.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase/client';
import { pushService, type PermissionStatus } from '@/services/notifications/pushService';
import type { NotificationType } from '@/types/database/enums';
import type { NotificationData } from '@/services/notifications/notificationHandler';

// =====================================================
// TYPES
// =====================================================

/**
 * Result from test operations
 */
export interface TestResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

/**
 * Mock notification data for different notification types
 */
const MOCK_NOTIFICATION_DATA: Record<NotificationType, Omit<NotificationData, 'type'>> = {
  competition_player_added: {
    competitionId: 'test-comp-123',
    playerId: 'test-player-456',
  },
  competition_player_joined: {
    competitionId: 'test-comp-123',
    playerId: 'test-player-456',
  },
  new_round_created: {
    competitionId: 'test-comp-123',
    roundId: 'test-round-789',
  },
  competition_status_changed: {
    competitionId: 'test-comp-123',
  },
  friend_request_received: {
    playerId: 'test-player-456',
    friendshipId: 'test-friendship-789',
  },
  friend_request_accepted: {
    playerId: 'test-player-456',
    friendshipId: 'test-friendship-789',
  },
  scorecard_submitted: {
    competitionId: 'test-comp-123',
    roundId: 'test-round-789',
    playerId: 'test-player-456',
  },
  social_round_invitation: {
    competitionId: 'test-comp-123',
    roundId: 'test-round-789',
    playerId: 'test-player-456',
  },
};

/**
 * Mock notification titles for different types
 */
const MOCK_NOTIFICATION_TITLES: Record<NotificationType, string> = {
  competition_player_added: 'Added to Competition',
  competition_player_joined: 'New Player Joined',
  new_round_created: 'New Round Created',
  competition_status_changed: 'Competition Updated',
  friend_request_received: 'Friend Request',
  friend_request_accepted: 'Friend Request Accepted',
  scorecard_submitted: 'Scorecard Submitted',
  social_round_invitation: 'Round Invitation',
};

/**
 * Mock notification bodies for different types
 */
const MOCK_NOTIFICATION_BODIES: Record<NotificationType, string> = {
  competition_player_added: 'You have been added to Test Competition',
  competition_player_joined: 'Test Player joined Test Competition',
  new_round_created: 'A new round has been added to Test Competition',
  competition_status_changed: 'Test Competition status has changed',
  friend_request_received: 'Test Player wants to be your friend',
  friend_request_accepted: 'Test Player accepted your friend request',
  scorecard_submitted: 'Test Player submitted their scorecard for Round 1',
  social_round_invitation: 'Test Player invited you to join a round',
};

// =====================================================
// TEST FUNCTIONS (DEV ONLY)
// =====================================================

/**
 * Send a test push notification via the Edge Function
 *
 * Calls the send-push-notification Edge Function directly with test data.
 * Requires the user to be authenticated and have a registered push token.
 *
 * @param userId - The user ID to send the notification to
 * @param type - The notification type to simulate
 * @returns TestResult with success/failure information
 *
 * @example
 * ```typescript
 * if (__DEV__) {
 *   const result = await sendTestNotification(userId, 'friend_request_received');
 *   console.log('Test notification result:', result);
 * }
 * ```
 */
export async function sendTestNotification(
  userId: string,
  type: NotificationType
): Promise<TestResult> {
  if (!__DEV__) {
    return {
      success: false,
      message: 'Test notifications are only available in development builds',
    };
  }

  if (!userId) {
    return {
      success: false,
      message: 'User ID is required',
      error: 'Missing userId parameter',
    };
  }

  console.log('[PushTest] Sending test notification:', { userId, type });

  try {
    // Get Supabase session for auth header
    const { data: session, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.session) {
      return {
        success: false,
        message: 'Not authenticated',
        error: sessionError?.message || 'No active session',
      };
    }

    // Get the Supabase Edge Function URL
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return {
        success: false,
        message: 'Supabase URL not configured',
        error: 'EXPO_PUBLIC_SUPABASE_URL environment variable not set',
      };
    }

    // Build Edge Function URL
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

    // Build request body with mock data
    const requestBody = {
      user_id: userId,
      notification_type: type,
      title: `[TEST] ${MOCK_NOTIFICATION_TITLES[type]}`,
      body: MOCK_NOTIFICATION_BODIES[type],
      data: {
        ...MOCK_NOTIFICATION_DATA[type],
        type,
        isTest: true,
      },
    };

    console.log('[PushTest] Request body:', requestBody);

    // Note: This uses the anon key through Supabase client
    // The Edge Function requires service role, so this will fail with 401
    // In real testing, use Supabase Dashboard or CLI to invoke with service role
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      // Expected: 401 Unauthorized since we're not using service role
      // This is a dev utility - document how to properly test
      console.log('[PushTest] Edge Function response:', { status: response.status, result });

      if (response.status === 401) {
        return {
          success: false,
          message:
            'Edge Function requires service role key. Use Supabase Dashboard or CLI to test directly.',
          error: 'Unauthorized - service role required',
          data: {
            hint: 'Run: supabase functions invoke send-push-notification --body \'{"user_id":"...","notification_type":"...","title":"...","body":"..."}\'',
          },
        };
      }

      return {
        success: false,
        message: `Edge Function error: ${response.status}`,
        error: result.errors?.join(', ') || 'Unknown error',
        data: result,
      };
    }

    console.log('[PushTest] Success:', result);

    return {
      success: true,
      message: `Test notification sent! sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`,
      data: result,
    };
  } catch (error) {
    console.error('[PushTest] Error sending test notification:', error);
    return {
      success: false,
      message: 'Failed to send test notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simulate receiving a notification locally
 *
 * Triggers local notification listeners with mock data.
 * Useful for testing notification handling code without
 * needing actual push notifications.
 *
 * @param type - The notification type to simulate
 * @param customData - Optional custom data to merge with mock data
 * @returns TestResult with success/failure information
 *
 * @example
 * ```typescript
 * if (__DEV__) {
 *   const result = await simulateNotificationReceived('competition_player_added', {
 *     competitionId: 'real-comp-id'
 *   });
 * }
 * ```
 */
export async function simulateNotificationReceived(
  type: NotificationType,
  customData?: Partial<NotificationData>
): Promise<TestResult> {
  if (!__DEV__) {
    return {
      success: false,
      message: 'Simulated notifications are only available in development builds',
    };
  }

  console.log('[PushTest] Simulating notification received:', { type, customData });

  try {
    const notificationData = {
      ...MOCK_NOTIFICATION_DATA[type],
      ...customData,
      type,
      isTest: true,
    };

    // Schedule an immediate local notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `[TEST] ${MOCK_NOTIFICATION_TITLES[type]}`,
        body: MOCK_NOTIFICATION_BODIES[type],
        data: notificationData,
        sound: 'default',
      },
      trigger: null, // Immediate delivery
    });

    console.log('[PushTest] Local notification scheduled:', notificationId);

    return {
      success: true,
      message: `Test notification triggered with ID: ${notificationId}`,
      data: {
        notificationId,
        type,
        data: notificationData,
      },
    };
  } catch (error) {
    console.error('[PushTest] Error simulating notification:', error);
    return {
      success: false,
      message: 'Failed to simulate notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Debug info structure returned by logPushDebugInfo
 */
export interface PushDebugInfo {
  device: {
    isPhysicalDevice: boolean;
    platform: 'ios' | 'android' | null;
    deviceId: string | null;
    deviceName: string | null;
  };
  permissions: {
    status: PermissionStatus;
    ios?: {
      allowsAlert: boolean;
      allowsBadge: boolean;
      allowsSound: boolean;
    };
  };
  token: {
    hasToken: boolean;
    token: string | null;
    error?: string;
  };
  registration: {
    isRegisteredOnDevice: boolean;
    storageKey: string;
  };
  database: {
    tokenCount: number;
    tokens: Array<{
      id: string;
      expoToken: string;
      platform: string | null;
      enabled: boolean;
      lastUsedAt: string | null;
    }>;
    error?: string;
  };
  preferences: {
    pushEnabled: boolean;
    pushCompetitionUpdates: boolean;
    pushFriendRequests: boolean;
    pushScorecardUpdates: boolean;
    error?: string;
  };
}

/**
 * Log comprehensive push notification debug information
 *
 * Logs and returns detailed information about the current push
 * notification state, including:
 * - Device information
 * - Permission status
 * - Current Expo push token
 * - Registration status in local storage
 * - Tokens registered in database
 * - User preferences
 *
 * @returns PushDebugInfo object with all debug information
 *
 * @example
 * ```typescript
 * if (__DEV__) {
 *   const debugInfo = await logPushDebugInfo();
 *   console.log('Push debug info:', JSON.stringify(debugInfo, null, 2));
 * }
 * ```
 */
export async function logPushDebugInfo(): Promise<PushDebugInfo> {
  console.log('\n========================================');
  console.log('PUSH NOTIFICATION DEBUG INFO');
  console.log('========================================\n');

  // Initialize result object
  const debugInfo: PushDebugInfo = {
    device: {
      isPhysicalDevice: false,
      platform: null,
      deviceId: null,
      deviceName: null,
    },
    permissions: {
      status: 'undetermined',
    },
    token: {
      hasToken: false,
      token: null,
    },
    registration: {
      isRegisteredOnDevice: false,
      storageKey: '@push_token_registered',
    },
    database: {
      tokenCount: 0,
      tokens: [],
    },
    preferences: {
      pushEnabled: false,
      pushCompetitionUpdates: false,
      pushFriendRequests: false,
      pushScorecardUpdates: false,
    },
  };

  // 1. Device Information
  console.log('1. Device Information');
  console.log('---------------------');
  const deviceInfo = pushService.getDeviceInfo();
  const isPhysical = pushService.isPhysicalDevice();

  debugInfo.device = {
    isPhysicalDevice: isPhysical,
    platform: deviceInfo.platform,
    deviceId: deviceInfo.deviceId,
    deviceName: deviceInfo.deviceName,
  };

  console.log(`   Physical Device: ${isPhysical ? 'Yes' : 'No (Simulator)'}`);
  console.log(`   Platform: ${deviceInfo.platform || 'Unknown'}`);
  console.log(`   Device ID: ${deviceInfo.deviceId || 'N/A'}`);
  console.log(`   Device Name: ${deviceInfo.deviceName || 'N/A'}`);
  console.log('');

  // 2. Permission Status
  console.log('2. Permission Status');
  console.log('--------------------');
  const permissionStatus = await pushService.getPermissionStatus();
  debugInfo.permissions.status = permissionStatus;
  console.log(`   Status: ${permissionStatus}`);

  // Get iOS-specific permissions if available
  const { status: iosStatus, ios: iosPerms } = await Notifications.getPermissionsAsync();
  if (iosPerms) {
    debugInfo.permissions.ios = {
      allowsAlert: iosPerms.allowsAlert ?? false,
      allowsBadge: iosPerms.allowsBadge ?? false,
      allowsSound: iosPerms.allowsSound ?? false,
    };
    console.log(`   iOS Alert: ${iosPerms.allowsAlert ?? 'N/A'}`);
    console.log(`   iOS Badge: ${iosPerms.allowsBadge ?? 'N/A'}`);
    console.log(`   iOS Sound: ${iosPerms.allowsSound ?? 'N/A'}`);
  }
  console.log('');

  // 3. Expo Push Token
  console.log('3. Expo Push Token');
  console.log('------------------');
  if (isPhysical && permissionStatus === 'granted') {
    const tokenResult = await pushService.getExpoPushToken();
    debugInfo.token = {
      hasToken: tokenResult.success,
      token: tokenResult.data ?? null,
      error: tokenResult.error,
    };

    if (tokenResult.success && tokenResult.data) {
      console.log(`   Token: ${tokenResult.data}`);
    } else {
      console.log(`   Error: ${tokenResult.error || 'Failed to get token'}`);
    }
  } else {
    const reason = !isPhysical
      ? 'Running on simulator'
      : 'Permission not granted';
    debugInfo.token = {
      hasToken: false,
      token: null,
      error: reason,
    };
    console.log(`   Not available: ${reason}`);
  }
  console.log('');

  // 4. Local Registration Status
  console.log('4. Local Registration Status');
  console.log('----------------------------');
  try {
    const registeredValue = await AsyncStorage.getItem('@push_token_registered');
    debugInfo.registration.isRegisteredOnDevice = registeredValue === 'true';
    console.log(`   Registered on device: ${registeredValue === 'true' ? 'Yes' : 'No'}`);
    console.log(`   Storage key: @push_token_registered`);
  } catch (error) {
    console.log(`   Error reading AsyncStorage: ${error}`);
  }
  console.log('');

  // 5. Database Tokens
  console.log('5. Database Tokens');
  console.log('------------------');
  try {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      const userId = session.session.user.id;
      console.log(`   User ID: ${userId}`);

      // Type for the select result
      type TokenSelectResult = {
        id: string;
        expo_token: string;
        platform: string | null;
        enabled: boolean;
        last_used_at: string | null;
      };

      const { data: tokens, error: tokenError } = await supabase
        .from('push_tokens')
        .select('id, expo_token, platform, enabled, last_used_at')
        .eq('user_id', userId)
        .returns<TokenSelectResult[]>();

      if (tokenError) {
        debugInfo.database.error = tokenError.message;
        console.log(`   Error: ${tokenError.message}`);
      } else if (tokens) {
        debugInfo.database.tokenCount = tokens.length;
        debugInfo.database.tokens = tokens.map((t) => ({
          id: t.id,
          expoToken: t.expo_token,
          platform: t.platform,
          enabled: t.enabled,
          lastUsedAt: t.last_used_at,
        }));

        console.log(`   Token count: ${tokens.length}`);
        tokens.forEach((token, i) => {
          console.log(`   Token ${i + 1}:`);
          console.log(`      ID: ${token.id}`);
          console.log(`      Token: ${token.expo_token.substring(0, 30)}...`);
          console.log(`      Platform: ${token.platform || 'Unknown'}`);
          console.log(`      Enabled: ${token.enabled ? 'Yes' : 'No'}`);
          console.log(`      Last Used: ${token.last_used_at || 'Never'}`);
        });
      }
    } else {
      debugInfo.database.error = 'Not authenticated';
      console.log('   Not authenticated');
    }
  } catch (error) {
    debugInfo.database.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`   Error: ${error}`);
  }
  console.log('');

  // 6. User Preferences
  console.log('6. User Preferences');
  console.log('-------------------');
  try {
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      // Type for the preferences select result
      type PreferencesSelectResult = {
        push_enabled: boolean;
        push_competition_updates: boolean;
        push_friend_requests: boolean;
        push_scorecard_updates: boolean;
      };

      const { data: player, error: prefError } = await supabase
        .from('players')
        .select(
          'push_enabled, push_competition_updates, push_friend_requests, push_scorecard_updates'
        )
        .eq('id', session.session.user.id)
        .single<PreferencesSelectResult>();

      if (prefError) {
        debugInfo.preferences.error = prefError.message;
        console.log(`   Error: ${prefError.message}`);
      } else if (player) {
        debugInfo.preferences = {
          pushEnabled: player.push_enabled,
          pushCompetitionUpdates: player.push_competition_updates,
          pushFriendRequests: player.push_friend_requests,
          pushScorecardUpdates: player.push_scorecard_updates,
        };

        console.log(`   Push Enabled: ${player.push_enabled ? 'Yes' : 'No'}`);
        console.log(
          `   Competition Updates: ${player.push_competition_updates ? 'Yes' : 'No'}`
        );
        console.log(`   Friend Requests: ${player.push_friend_requests ? 'Yes' : 'No'}`);
        console.log(`   Scorecard Updates: ${player.push_scorecard_updates ? 'Yes' : 'No'}`);
      }
    } else {
      debugInfo.preferences.error = 'Not authenticated';
      console.log('   Not authenticated');
    }
  } catch (error) {
    debugInfo.preferences.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`   Error: ${error}`);
  }

  console.log('\n========================================');
  console.log('END PUSH NOTIFICATION DEBUG INFO');
  console.log('========================================\n');

  return debugInfo;
}

/**
 * Clear local push registration status
 *
 * Useful for testing re-registration flow.
 * Removes the AsyncStorage flag that tracks registration.
 *
 * @returns TestResult with success/failure information
 */
export async function clearLocalRegistration(): Promise<TestResult> {
  if (!__DEV__) {
    return {
      success: false,
      message: 'This function is only available in development builds',
    };
  }

  try {
    await AsyncStorage.removeItem('@push_token_registered');
    console.log('[PushTest] Local registration cleared');

    return {
      success: true,
      message: 'Local registration status cleared. Token will re-register on next auth.',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to clear registration',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel all pending notifications
 *
 * Clears all scheduled and displayed notifications.
 * Useful for cleaning up during testing.
 *
 * @returns TestResult with success/failure information
 */
export async function cancelAllNotifications(): Promise<TestResult> {
  if (!__DEV__) {
    return {
      success: false,
      message: 'This function is only available in development builds',
    };
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    console.log('[PushTest] All notifications cancelled');

    return {
      success: true,
      message: 'All notifications cancelled and dismissed',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to cancel notifications',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================================================
// DEV-ONLY EXPORTS
// =====================================================

/**
 * Push notification test utilities
 *
 * Only exported in development builds (__DEV__).
 * These utilities help test push notification behavior
 * without needing actual database triggers.
 *
 * @example
 * ```typescript
 * import { pushTestUtils } from '@/utils/pushNotificationTest';
 *
 * if (__DEV__) {
 *   // Log debug info
 *   await pushTestUtils.logPushDebugInfo();
 *
 *   // Simulate receiving a notification
 *   await pushTestUtils.simulateNotificationReceived('friend_request_received');
 *
 *   // Clear registration for re-testing
 *   await pushTestUtils.clearLocalRegistration();
 * }
 * ```
 */
export const pushTestUtils = __DEV__
  ? {
      sendTestNotification,
      simulateNotificationReceived,
      logPushDebugInfo,
      clearLocalRegistration,
      cancelAllNotifications,
      MOCK_NOTIFICATION_DATA,
      MOCK_NOTIFICATION_TITLES,
      MOCK_NOTIFICATION_BODIES,
    }
  : undefined;

// Export types for external use
export type { NotificationData };
