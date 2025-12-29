/**
 * Player Database Types
 * Player profiles, friendships, and related entities
 */

import type { FriendshipStatus } from './enums';

/**
 * Player profile extending Supabase auth.users
 * One-to-one relationship with auth.users for real players.
 * Placeholder players don't have an auth.users entry.
 */
export interface Player {
  id: string; // UUID, references auth.users(id) for real players
  name: string;
  email: string;
  phone: string | null;
  handicap: number | null; // NUMERIC(4,1) - e.g., 12.5 (nullable for players without handicap)
  golf_id: string | null; // 10-digit Golf Australia ID (formerly GOLF Link number)
  handicap_updated_at: string | null; // ISO timestamp when handicap was last updated
  photo_url: string | null;
  home_venue_id: string | null; // UUID, reference to player's designated home golf club (venue)
  // Placeholder player fields
  is_placeholder: boolean; // TRUE for guest/placeholder players without auth accounts
  created_by: string | null; // UUID of user who created this placeholder (NULL for real players)
  linked_player_id: string | null; // UUID of real player this placeholder was merged into
  // Push notification preferences
  push_enabled: boolean; // Global toggle for all push notifications
  push_competition_updates: boolean; // Competition-related notifications
  push_friend_requests: boolean; // Friend request notifications
  push_scorecard_updates: boolean; // Scorecard notifications
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Push notification preferences (extracted for convenience)
 */
export interface PushPreferences {
  push_enabled: boolean;
  push_competition_updates: boolean;
  push_friend_requests: boolean;
  push_scorecard_updates: boolean;
}

/**
 * User preferences stored in user_preferences table
 * Centralized preferences synced across devices
 */
export interface UserPreferences {
  id: string; // UUID
  user_id: string; // UUID, references players(id)
  // Display & UI preferences
  theme_mode: 'light' | 'dark' | 'system';
  distance_unit: 'yards' | 'metres';
  // Scoring entry display preferences
  show_putts: boolean;
  show_fairway_hit: boolean;
  show_gir: boolean;
  // Push notification preferences
  push_enabled: boolean;
  push_competition_updates: boolean;
  push_friend_requests: boolean;
  push_scorecard_updates: boolean;
  // Feature toggles
  round_timer_enabled: boolean;
  debug_mode_enabled: boolean;
  // Flexible extension
  custom_settings: Record<string, unknown>;
  // Metadata
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Friendship relationship between two players
 */
export interface Friendship {
  id: string; // UUID
  requester_id: string; // UUID, references players(id) - who sent the request
  addressee_id: string; // UUID, references players(id) - who received the request
  status: FriendshipStatus;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Friend with player details and friendship info
 * Used for displaying friend lists
 */
export interface Friend extends Player {
  friendship_id: string;
  friendship_status: FriendshipStatus;
  is_requester: boolean; // true if current user sent the friend request
}

/**
 * Friend request with sender details
 * Used for displaying pending requests
 */
export interface FriendRequest {
  id: string;
  requester: Player;
  created_at: string;
}

/**
 * Player search result for adding friends
 */
export interface PlayerSearchResult extends Player {
  is_friend: boolean;
  has_pending_request: boolean;
  request_direction?: 'sent' | 'received'; // if has_pending_request is true
}

// =====================================================
// PLACEHOLDER PLAYER TYPES
// =====================================================

/**
 * Input for creating a placeholder player
 */
export interface PlaceholderPlayerInput {
  name: string;
  handicap?: number | null;
}

/**
 * Placeholder player with usage statistics
 * Returned by get_my_placeholder_players()
 */
export interface PlaceholderPlayerWithStats {
  id: string;
  name: string;
  email: string;
  handicap: number | null;
  created_at: string;
  competitions_count: number;
  scorecards_count: number;
}

/**
 * Real player that can be linked to a placeholder
 * Returned by search_linkable_players()
 */
export interface LinkablePlayer {
  id: string;
  name: string;
  email: string;
  handicap: number | null;
  photo_url: string | null;
}

/**
 * Result of linking a placeholder to a real player
 */
export interface LinkPlaceholderResult {
  success: boolean;
  placeholder_id: string;
  real_player_id: string;
  transferred: {
    competitions: number;
    scorecards: number;
    pairings: number;
  };
}

/**
 * Type guard to check if a player is a placeholder
 */
export function isPlaceholderPlayer(player: Player): boolean {
  return player.is_placeholder === true;
}

/**
 * Type guard to check if a placeholder has been linked
 */
export function isLinkedPlaceholder(player: Player): boolean {
  return player.is_placeholder === true && player.linked_player_id !== null;
}

/**
 * Type guard to check if a player is a real (non-placeholder) player
 */
export function isRealPlayer(player: Player): boolean {
  return player.is_placeholder === false;
}
