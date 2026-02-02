/**
 * usePushNotifications - Push Notification Management Hook
 *
 * @deprecated Import directly from '@/hooks/pushNotifications' instead.
 *
 * This file re-exports everything from the pushNotifications module for backward compatibility.
 * The module has been split into focused files:
 * - pushNotifications/types.ts: Type definitions and constants
 * - pushNotifications/helpers.ts: Utility functions
 * - pushNotifications/queries.ts: Lightweight query hooks
 * - pushNotifications/main.ts: Main comprehensive hook
 *
 * @example
 * // Preferred import (new)
 * import { usePushNotifications, usePushPermissionStatus } from '@/hooks/pushNotifications';
 *
 * // Legacy import (still works)
 * import { usePushNotifications, usePushPermissionStatus } from '@/hooks/usePushNotifications';
 */

// Re-export everything from the pushNotifications module
export * from './pushNotifications';

// Default export for backward compatibility
export { usePushNotifications as default } from './pushNotifications';
