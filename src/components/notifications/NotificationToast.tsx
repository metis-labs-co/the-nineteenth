/**
 * NotificationToast - Re-exports from unified toast system
 *
 * This file is kept for backward compatibility. The actual implementation
 * has moved to @/components/common/Toast/variants/NotificationToastCard.
 *
 * For new code, import directly from:
 * - @/context/ToastContext (useToast hook)
 * - @/components/common/Toast (card components)
 */

export {
  NotificationToastCard as default,
  notificationConfig,
  getNotificationConfig,
} from '@/components/common/Toast/variants/NotificationToastCard';
