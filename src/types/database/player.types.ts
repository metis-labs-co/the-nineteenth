/**
 * Player Database Types
 * Player profiles, friendships, and related entities
 */

import type { FriendshipStatus } from './enums';

/**
 * Player profile extending Supabase auth.users
 * One-to-one relationship with auth.users
 */
export interface Player {
  id: string; // UUID, references auth.users(id)
  name: string;
  email: string;
  phone: string | null;
  handicap: number; // NUMERIC(4,1) - e.g., 12.5
  golf_id: string | null; // 10-digit Golf Australia ID (formerly GOLF Link number)
  handicap_updated_at: string | null; // ISO timestamp when handicap was last updated
  photo_url: string | null;
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
