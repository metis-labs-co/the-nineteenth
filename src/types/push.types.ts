/**
 * Push Notification Types for The Nineteenth
 *
 * App-level TypeScript types for push notifications, tokens, and preferences.
 * Uses camelCase naming conventions for frontend consistency.
 *
 * Database types (snake_case) are converted via mapper functions.
 */

import type { NotificationType } from './database/enums';

// Re-export NotificationType for convenience
export type { NotificationType };

// =====================================================
// DATABASE TYPES (snake_case)
// =====================================================

/**
 * Database push token record (snake_case)
 * Matches push_tokens table in Supabase
 */
export interface DBPushToken {
  id: string;
  user_id: string;
  expo_token: string;
  device_id: string | null;
  device_name: string | null;
  platform: 'ios' | 'android' | null;
  app_version: string | null;
  enabled: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// APP TYPES (camelCase)
// =====================================================

/**
 * Push token record (app-level, camelCase)
 * Represents a registered Expo push token for a user's device
 */
export interface PushToken {
  id: string;
  userId: string;
  expoToken: string;
  deviceId: string | null;
  deviceName: string | null;
  platform: 'ios' | 'android' | null;
  appVersion: string | null;
  enabled: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User's push notification preferences
 * Controls which types of push notifications the user wants to receive
 */
export interface PushPreferences {
  /** Master toggle for all push notifications */
  pushEnabled: boolean;
  /** Notifications about competition updates (new rounds, status changes, etc.) */
  pushCompetitionUpdates: boolean;
  /** Notifications about friend requests (received, accepted) */
  pushFriendRequests: boolean;
  /** Notifications about scorecard updates (submitted by others in your round) */
  pushScorecardUpdates: boolean;
  /** Notifications about league updates (joins, round tags, leaderboard changes) */
  pushLeagueUpdates: boolean;
  /** Notifications about side-game results and prize pool settlements */
  pushSideGameUpdates: boolean;
}

/**
 * Default push preferences for new users
 */
export const DEFAULT_PUSH_PREFERENCES: PushPreferences = {
  pushEnabled: true,
  pushCompetitionUpdates: true,
  pushFriendRequests: true,
  pushScorecardUpdates: true,
  pushLeagueUpdates: true,
  pushSideGameUpdates: true,
};

// =====================================================
// PUSH NOTIFICATION DATA TYPES
// =====================================================

/**
 * Push notification payload data
 * Used when sending push notifications via Expo Push API
 */
export interface PushNotificationData {
  /** Type of notification for routing/handling */
  type: NotificationType;
  /** Notification title displayed to user */
  title: string;
  /** Notification body/message displayed to user */
  body: string;
  /** Additional data payload for deep linking and context */
  data: Record<string, unknown>;
  /** Related competition ID (for navigation) */
  competitionId?: string;
  /** Related round ID (for navigation) */
  roundId?: string;
  /** Related player ID (sender or subject of notification) */
  playerId?: string;
  /** Related friendship ID (for friend-related notifications) */
  friendshipId?: string;
  /** Related league ID (for league-related notifications) */
  leagueId?: string;
}

/**
 * Expo push message format
 * Matches the ExpoPushMessage format expected by Expo Push API
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
export interface ExpoPushMessage {
  /** Expo push token(s) to send to */
  to: string | string[];
  /** Notification title */
  title?: string;
  /** Notification body */
  body?: string;
  /** Custom data payload (passed to app when notification is tapped) */
  data?: Record<string, unknown>;
  /** Time-to-live in seconds (0 = immediate, default varies by platform) */
  ttl?: number;
  /** Seconds before notification expires */
  expiration?: number;
  /** Priority: 'default' | 'normal' | 'high' */
  priority?: 'default' | 'normal' | 'high';
  /** Notification subtitle (iOS only) */
  subtitle?: string;
  /** Custom sound name or 'default' */
  sound?: 'default' | string | null;
  /** Badge count to set on app icon */
  badge?: number;
  /** Channel ID for Android */
  channelId?: string;
  /** Category ID for notification actions */
  categoryId?: string;
  /** Whether notification content should be mutable (iOS) */
  mutableContent?: boolean;
}

/**
 * Response from Expo Push API for a single push notification
 */
export interface ExpoPushTicket {
  /** Status of the push send attempt */
  status: 'ok' | 'error';
  /** Ticket ID for checking receipt (only when status is 'ok') */
  id?: string;
  /** Error message (only when status is 'error') */
  message?: string;
  /** Error details (only when status is 'error') */
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
    [key: string]: unknown;
  };
}

/**
 * Receipt from Expo Push API after delivery attempt
 */
export interface ExpoPushReceipt {
  /** Status of the delivery attempt */
  status: 'ok' | 'error';
  /** Error message (only when status is 'error') */
  message?: string;
  /** Error details (only when status is 'error') */
  details?: {
    error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
    [key: string]: unknown;
  };
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for registering/upserting a push token
 */
export interface PushTokenInput {
  expoToken: string;
  deviceId?: string;
  deviceName?: string;
  platform?: 'ios' | 'android';
  appVersion?: string;
}

// =====================================================
// MAPPER FUNCTIONS
// =====================================================

/**
 * Convert database PushToken (snake_case) to app PushToken (camelCase)
 */
export function mapDBPushToken(db: DBPushToken): PushToken {
  return {
    id: db.id,
    userId: db.user_id,
    expoToken: db.expo_token,
    deviceId: db.device_id,
    deviceName: db.device_name,
    platform: db.platform,
    appVersion: db.app_version,
    enabled: db.enabled,
    lastUsedAt: db.last_used_at ? new Date(db.last_used_at) : null,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

/**
 * Convert app PushToken (camelCase) to database format (snake_case)
 * Useful for insert/update operations
 */
export function mapPushTokenToDB(token: Partial<PushToken>): Partial<DBPushToken> {
  const result: Partial<DBPushToken> = {};

  if (token.id !== undefined) result.id = token.id;
  if (token.userId !== undefined) result.user_id = token.userId;
  if (token.expoToken !== undefined) result.expo_token = token.expoToken;
  if (token.deviceId !== undefined) result.device_id = token.deviceId;
  if (token.deviceName !== undefined) result.device_name = token.deviceName;
  if (token.platform !== undefined) result.platform = token.platform;
  if (token.appVersion !== undefined) result.app_version = token.appVersion;
  if (token.enabled !== undefined) result.enabled = token.enabled;
  if (token.lastUsedAt !== undefined) {
    result.last_used_at = token.lastUsedAt?.toISOString() ?? null;
  }
  if (token.createdAt !== undefined) {
    result.created_at = token.createdAt.toISOString();
  }
  if (token.updatedAt !== undefined) {
    result.updated_at = token.updatedAt.toISOString();
  }

  return result;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check if a string is a valid Expo push token format
 * Expo tokens follow the pattern: ExponentPushToken[xxx]
 */
export function isValidExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token);
}

/**
 * Get notification types that should be sent based on user preferences
 */
export function getEnabledNotificationTypes(
  preferences: PushPreferences
): NotificationType[] {
  if (!preferences.pushEnabled) {
    return [];
  }

  const types: NotificationType[] = [];

  if (preferences.pushCompetitionUpdates) {
    types.push(
      'competition_player_added',
      'competition_player_joined',
      'new_round_created',
      'competition_status_changed'
    );
  }

  if (preferences.pushFriendRequests) {
    types.push('friend_request_received', 'friend_request_accepted');
  }

  if (preferences.pushScorecardUpdates) {
    types.push('scorecard_submitted');
  }

  if (preferences.pushLeagueUpdates) {
    types.push(
      'league_player_joined',
      'league_player_left',
      'league_player_removed',
      'league_round_tagged',
      'league_leaderboard_changed',
      'partnership_created',
      'partnership_round_tagged'
    );
  }

  if (preferences.pushSideGameUpdates) {
    types.push(
      'skins_game_completed',
      'skins_game_cancelled',
      'wolf_game_completed',
      'wolf_game_cancelled',
      'prize_pool_settled'
    );
  }

  // Social round invitation is always enabled if push is enabled
  types.push('social_round_invitation');

  // Round completed follows competition updates
  if (preferences.pushCompetitionUpdates) {
    types.push('round_completed');
  }

  return types;
}

/**
 * Check if a notification type should be sent based on preferences
 */
export function shouldSendNotification(
  type: NotificationType,
  preferences: PushPreferences
): boolean {
  if (!preferences.pushEnabled) {
    return false;
  }

  const enabledTypes = getEnabledNotificationTypes(preferences);
  return enabledTypes.includes(type);
}
