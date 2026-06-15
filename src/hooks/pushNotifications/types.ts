/**
 * Push Notifications Hooks - Type Definitions
 *
 * Types for push notification management.
 */

import type { PermissionStatus } from '@/services/notifications';
import type { PushToken, PushPreferences } from '@/types/push.types';
import { CACHE_TIMES } from '@/constants/cacheConfig';

// =====================================================
// CONSTANTS
// =====================================================

export const PUSH_TOKEN_REGISTERED_KEY = '@push_token_registered';
export const STALE_TIME = CACHE_TIMES.STANDARD; // 5 minutes

// =====================================================
// TYPES
// =====================================================

/**
 * Push preferences update input
 */
export interface UpdatePushPreferencesInput {
  pushEnabled?: boolean;
  pushCompetitionUpdates?: boolean;
  pushFriendRequests?: boolean;
  pushScorecardUpdates?: boolean;
  pushLeagueUpdates?: boolean;
  pushSideGameUpdates?: boolean;
  pushRoundReminders?: boolean;
  pushSocialActivity?: boolean;
}

/**
 * Return type for usePushNotifications hook
 */
export interface UsePushNotificationsReturn {
  // Data
  tokens: PushToken[] | undefined;
  preferences: PushPreferences | null | undefined;
  permissionStatus: PermissionStatus | undefined;

  // Status
  isLoadingTokens: boolean;
  isLoadingPreferences: boolean;
  isLoadingPermission: boolean;
  isRegistering: boolean;
  isUpdatingPreferences: boolean;
  isRegistered: boolean;
  isPhysicalDevice: boolean;

  // Actions
  registerToken: () => Promise<void>;
  unregisterToken: () => Promise<void>;
  updatePreferences: (preferences: UpdatePushPreferencesInput) => Promise<void>;
  requestPermission: () => Promise<PermissionStatus>;
  refreshPermissionStatus: () => Promise<void>;

  // Errors
  registrationError: Error | null;
  preferencesError: Error | null;
}
