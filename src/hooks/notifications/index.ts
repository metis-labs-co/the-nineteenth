/**
 * Notification Hooks - Module Index
 *
 * Provides comprehensive notification functionality:
 * - Fetch user's notifications list
 * - Track unread notification count
 * - Mark notifications as read (single or all)
 * - Delete notifications
 * - Real-time subscription for new notifications
 *
 * ### Query Hooks
 * - `useNotifications()` - Fetch user's notifications list
 * - `useUnreadNotificationCount()` - Track unread notification count
 * - `useNotificationSubscription()` - Real-time subscription for new notifications
 *
 * ### Mutation Hooks
 * - `useMarkNotificationRead()` - Mark a single notification as read
 * - `useMarkAllNotificationsRead()` - Mark all notifications as read
 * - `useDeleteNotification()` - Delete a notification
 *
 * @example
 * ```tsx
 * // Import from the notifications module
 * import { useNotifications, useMarkNotificationRead } from '@/hooks/notifications';
 *
 * // Or import the entire module
 * import * as notifications from '@/hooks/notifications';
 * ```
 */

// Re-export query hooks
export {
  useNotifications,
  useUnreadNotificationCount,
  useNotificationSubscription,
} from './queries';

// Re-export mutation hooks
export {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from './mutations';
