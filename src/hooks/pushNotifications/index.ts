/**
 * Push Notifications Hooks - Module Index
 *
 * TanStack Query hooks for push notification management.
 * Provides hooks for token management, permission handling, and preferences.
 *
 * This module is organized into:
 * - types.ts: Type definitions and constants
 * - helpers.ts: Utility functions for token mapping and device registration
 * - queries.ts: Lightweight query hooks for specific data
 * - main.ts: Main comprehensive push notifications hook
 *
 * @example
 * ```tsx
 * // Import the main hook
 * import { usePushNotifications } from '@/hooks/pushNotifications';
 *
 * // Import lightweight hooks for specific use cases
 * import {
 *   usePushPermissionStatus,
 *   usePushPreferences,
 *   useIsPushRegistered,
 * } from '@/hooks/pushNotifications';
 * ```
 */

// Re-export types
export type { UpdatePushPreferencesInput, UsePushNotificationsReturn } from './types';
export { PUSH_TOKEN_REGISTERED_KEY, STALE_TIME } from './types';

// Re-export helpers
export {
  mapTokenFromDB,
  extractPreferencesFromPlayer,
  hasRegisteredOnDevice,
  markRegisteredOnDevice,
} from './helpers';

// Re-export query hooks
export { usePushPermissionStatus, usePushPreferences, useIsPushRegistered } from './queries';

// Re-export main hook
export { usePushNotifications } from './main';

// Default export
export { usePushNotifications as default } from './main';
