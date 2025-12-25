/**
 * Notifications Service
 *
 * Re-exports push notification service and related utilities.
 *
 * @see ./pushService.ts
 * @see ./notificationHandler.ts
 */

export { pushService, default } from './pushService';
export type { PermissionStatus, PushServiceResult, RegisterTokenResult } from './pushService';
export {
  NotificationCategories,
  NotificationActions,
  type NotificationCategory,
  type NotificationAction,
} from './pushService';

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
