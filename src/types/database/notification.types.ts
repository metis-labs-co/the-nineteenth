/**
 * Notification Database Types
 * In-app notifications and related data
 */

import type { NotificationType } from './enums';
import type { Competition } from './competition.types';
import type { Round } from './round.types';
import type { Player, Friendship } from './player.types';

/**
 * Notification data payload types based on notification type
 */
export interface NotificationData {
  // competition_player_added
  competition_name?: string;
  added_by_name?: string;

  // competition_player_joined
  player_name?: string;

  // new_round_created
  course_name?: string;
  round_number?: number;
  date?: string;

  // competition_status_changed
  old_status?: string;
  new_status?: string;

  // scorecard_submitted
  // Uses player_name, round_number, date

  // friend_request_received
  requester_name?: string;

  // friend_request_accepted
  accepter_name?: string;

  // social_round_invitation
  inviter_name?: string;
  venue_name?: string;
  game_type?: string;

  // Generic - allow additional fields
  [key: string]: string | number | boolean | undefined;
}

/**
 * In-app notification for a user
 */
export interface Notification {
  id: string; // UUID
  user_id: string; // UUID, references players(id) - the recipient
  type: NotificationType;
  data: NotificationData; // JSONB with notification-specific payload
  competition_id: string | null; // UUID, references competitions(id)
  round_id: string | null; // UUID, references rounds(id)
  player_id: string | null; // UUID, references players(id) - sender/related player
  friendship_id: string | null; // UUID, references friendships(id)
  league_id: string | null; // UUID, references leagues(id)
  is_read: boolean;
  read_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
}

/**
 * Notification with related entities populated
 */
export interface NotificationWithRelations extends Notification {
  competition?: Competition;
  round?: Round;
  player?: Player; // The sender/related player
  friendship?: Friendship;
}
