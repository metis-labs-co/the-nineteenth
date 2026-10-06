/**
 * Push Token Management
 *
 * Get, register, unregister, and remove Expo push tokens.
 */

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/services/supabase/client';
import { createModuleLogger } from '@/utils/debugLogger';
import type { PushServiceResult, RegisterTokenResult } from './types';
import { requestPermissions, getPermissionStatus } from './permissions';
import { isPhysicalDevice, getDeviceInfo } from './device';

const logger = createModuleLogger('PushService');

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
export async function getExpoPushToken(): Promise<PushServiceResult<string>> {
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
      logger.error('Missing projectId in expo config');
      return {
        success: false,
        error: 'Push notification configuration error. Missing projectId.',
      };
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });


    return {
      success: true,
      data: tokenData.data,
    };
  } catch (error) {
    logger.error('Error getting push token', error);

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
export async function registerPushToken(userId: string): Promise<PushServiceResult<RegisterTokenResult>> {
  if (!userId) {
    return {
      success: false,
      error: 'User ID is required to register push token',
    };
  }

  // Step 1: Request permissions
  const permissionStatus = await requestPermissions();

  if (permissionStatus !== 'granted') {
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
      logger.error('Error upserting push token', error);
      return {
        success: false,
        error: `Failed to register push token: ${error.message}`,
      };
    }


    return {
      success: true,
      data: {
        tokenId: data as string,
        expoToken,
      },
    };
  } catch (error) {
    logger.error('Error registering push token', error);
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
export async function unregisterPushToken(token: string): Promise<PushServiceResult> {
  if (!token) {
    return {
      success: false,
      error: 'Token is required to unregister',
    };
  }

  try {
    // Note: Type assertion needed as generated types may have stricter parameter types
    const { error } = await supabase.rpc(
      'disable_push_token' as never,
      { p_token: token } as never
    );

    if (error) {
      logger.error('Error disabling push token', error);
      return {
        success: false,
        error: `Failed to unregister push token: ${error.message}`,
      };
    }


    return {
      success: true,
    };
  } catch (error) {
    logger.error('Error unregistering push token', error);
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
export async function removePushToken(token: string): Promise<PushServiceResult> {
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
      logger.error('Error removing push token', error);
      return {
        success: false,
        error: `Failed to remove push token: ${error.message}`,
      };
    }


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
