/**
 * Push Token Database Types
 * Database types for push notification tokens
 */

/**
 * Push token record stored in the database
 * Represents a registered Expo push token for a user's device
 */
export interface PushToken {
  id: string; // UUID
  user_id: string; // UUID, references players(id)
  expo_token: string; // Expo push token (ExponentPushToken[xxx])
  device_id: string | null; // Unique device identifier for multi-device support
  device_name: string | null; // User-friendly device name (e.g., iPhone 15 Pro)
  platform: 'ios' | 'android' | null; // Platform: ios or android
  app_version: string | null; // App version that registered this token
  enabled: boolean; // Whether to send push notifications to this token
  last_used_at: string | null; // ISO timestamp - last time this token was used or updated
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
