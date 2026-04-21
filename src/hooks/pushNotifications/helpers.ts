/**
 * Push Notifications Hooks - Helper Functions
 *
 * Utility functions for push notification management.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PUSH_TOKEN_REGISTERED_KEY } from './types';
import type { PushToken, DBPushToken } from '@/types/push.types';
import type { Player } from '@/types/database.types';
import type { PushPreferences } from '@/types/push.types';

/**
 * Map database PushToken (snake_case) to app PushToken (camelCase)
 */
export function mapTokenFromDB(db: DBPushToken): PushToken {
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
 * Extract push preferences from player record
 * NOTE: Currently unused as preferences are loaded from user_preferences table
 */
export function extractPreferencesFromPlayer(player: Player): PushPreferences {
  return {
    pushEnabled: player.push_enabled,
    pushCompetitionUpdates: player.push_competition_updates,
    pushFriendRequests: player.push_friend_requests,
    pushScorecardUpdates: player.push_scorecard_updates,
    pushLeagueUpdates: player.push_league_updates ?? true,
    pushSideGameUpdates: player.push_side_game_updates ?? true,
    pushRoundReminders: player.push_round_reminders ?? true,
  };
}

/**
 * Check if push token has been registered on this device
 */
export async function hasRegisteredOnDevice(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PUSH_TOKEN_REGISTERED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark push token as registered on this device
 */
export async function markRegisteredOnDevice(registered: boolean): Promise<void> {
  try {
    if (registered) {
      await AsyncStorage.setItem(PUSH_TOKEN_REGISTERED_KEY, 'true');
    } else {
      await AsyncStorage.removeItem(PUSH_TOKEN_REGISTERED_KEY);
    }
  } catch (error) {
    console.error('[usePushNotifications] Error updating registration status:', error);
  }
}
