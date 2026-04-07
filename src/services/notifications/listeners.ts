/**
 * Notification Listeners & Badge Management
 *
 * Event listeners for incoming notifications and user interactions,
 * plus app badge count management.
 */

import * as Notifications from 'expo-notifications';

// =====================================================
// NOTIFICATION LISTENERS
// =====================================================

/**
 * Add a listener for when a notification is received while app is foregrounded
 *
 * @param callback - Function to call when notification is received
 * @returns Subscription that can be removed with .remove()
 */
export function addNotificationReceivedListener(
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
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the last notification response that opened the app
 *
 * Useful for handling deep links from notifications when app was killed.
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
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
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Get the current badge count
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Clear the app badge
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}
