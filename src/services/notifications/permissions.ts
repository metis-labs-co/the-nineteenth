/**
 * Push Notification Permissions
 *
 * Request and check notification permissions on iOS and Android.
 */

import * as Notifications from 'expo-notifications';
import type { PermissionStatus } from './types';

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
export async function requestPermissions(): Promise<PermissionStatus> {
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
export async function getPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();

  if (status === 'granted') {
    return 'granted';
  } else if (status === 'denied') {
    return 'denied';
  }

  return 'undetermined';
}
