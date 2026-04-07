/**
 * Push Service Types
 *
 * Shared types and constants for push notification modules.
 */

// =====================================================
// TYPES
// =====================================================

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PushServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RegisterTokenResult {
  tokenId: string;
  expoToken: string;
}

// =====================================================
// NOTIFICATION CATEGORIES (iOS)
// =====================================================

/**
 * Notification category identifiers
 * Used to group notifications and provide quick actions
 */
export const NotificationCategories = {
  COMPETITION: 'COMPETITION',
  FRIEND_REQUEST: 'FRIEND_REQUEST',
  SCORECARD: 'SCORECARD',
  LEAGUE: 'LEAGUE',
  SIDE_GAME: 'SIDE_GAME',
} as const;

export type NotificationCategory = (typeof NotificationCategories)[keyof typeof NotificationCategories];

/**
 * Notification action identifiers
 * Used to identify which action the user tapped
 */
export const NotificationActions = {
  VIEW: 'VIEW',
  ACCEPT: 'ACCEPT',
} as const;

export type NotificationAction = (typeof NotificationActions)[keyof typeof NotificationActions];
