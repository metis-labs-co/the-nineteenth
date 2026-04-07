/**
 * Notifications Service
 *
 * Re-exports push notification service and related utilities from focused modules.
 *
 * Modules:
 * - types.ts       - Shared types and constants
 * - permissions.ts - Permission request and status
 * - device.ts      - Physical device detection
 * - tokens.ts      - Push token registration and management
 * - channels.ts    - Notification handler, categories, Android channels
 * - listeners.ts   - Notification event listeners and badge management
 *
 * @see ./notificationHandler.ts
 */

// Types & Constants
export type { PermissionStatus, PushServiceResult, RegisterTokenResult } from './types';
export type { NotificationCategory, NotificationAction } from './types';
export { NotificationCategories, NotificationActions } from './types';

// Permissions
export { requestPermissions, getPermissionStatus } from './permissions';

// Device
export { isPhysicalDevice, getDeviceInfo } from './device';

// Token management
export { getExpoPushToken, registerPushToken, unregisterPushToken, removePushToken } from './tokens';

// Notification handling & channels
export { configureNotificationHandler, configureNotificationCategories, setupAndroidNotificationChannel } from './channels';

// Listeners & badges
export {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
  setBadgeCount,
  getBadgeCount,
  clearBadge,
} from './listeners';

// Notification handler (existing module, unchanged)
export {
  handleNotificationResponse,
  handleForegroundNotification,
  handleNotificationActionResponse,
  getScreenForNotificationType,
  getCategoryForNotificationType,
  buildNavigationParams,
} from './notificationHandler';
export type {
  NotificationData,
  NotificationNavigation,
  CurrentScreenInfo,
  ActionResponseResult,
} from './notificationHandler';

// Singleton (preserves backward compatibility for `pushService.xxx` usage)
import { requestPermissions, getPermissionStatus } from './permissions';
import { isPhysicalDevice, getDeviceInfo } from './device';
import { getExpoPushToken, registerPushToken, unregisterPushToken, removePushToken } from './tokens';
import { configureNotificationHandler, configureNotificationCategories, setupAndroidNotificationChannel } from './channels';
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
  setBadgeCount,
  getBadgeCount,
  clearBadge,
} from './listeners';

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
