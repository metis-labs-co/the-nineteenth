/**
 * Push Notification Configuration for The Nineteenth
 *
 * Contains Expo Push API configuration, notification message templates,
 * and helper functions for building push messages.
 */

// =====================================================
// CONSTANTS
// =====================================================

/**
 * Expo Push API endpoint for sending notifications
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
export const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Expo Push API endpoint for fetching receipts
 */
export const EXPO_PUSH_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

/**
 * Maximum number of notifications per Expo Push API request
 */
export const EXPO_PUSH_BATCH_SIZE = 100;

/**
 * Default TTL (time-to-live) for push notifications in seconds
 * Notifications expire after 1 week
 */
export const DEFAULT_TTL_SECONDS = 604800;

// =====================================================
// TYPES
// =====================================================

/**
 * Notification types supported by the app
 * Must match NotificationType from database enums
 */
export type NotificationType =
  | 'competition_player_added'
  | 'competition_player_joined'
  | 'new_round_created'
  | 'competition_status_changed'
  | 'scorecard_submitted'
  | 'friend_request_received'
  | 'friend_request_accepted'
  | 'social_round_invitation'
  | 'league_player_joined'
  | 'league_player_left'
  | 'league_player_removed'
  | 'league_round_tagged'
  | 'league_leaderboard_changed'
  | 'round_completed'
  | 'partnership_created'
  | 'partnership_round_tagged'
  | 'skins_game_completed'
  | 'skins_game_cancelled'
  | 'wolf_game_completed'
  | 'wolf_game_cancelled'
  | 'prize_pool_settled';

/**
 * Template for notification messages
 */
export interface NotificationTemplate {
  /** Title displayed in the notification */
  title: string;
  /** Body text displayed in the notification */
  body: string;
}

/**
 * Data passed to buildPushMessage for template interpolation
 */
export interface NotificationData {
  /** Name of the player triggering the action */
  player_name?: string;
  /** Name of the competition */
  competition_name?: string;
  /** Name of the round or course */
  round_name?: string;
  /** New status of competition */
  status?: string;
  /** Course name for the round */
  course_name?: string;
  /** Date of the round */
  round_date?: string;
  /** Any additional data */
  [key: string]: unknown;
}

/**
 * Built push message ready for sending
 */
export interface BuiltPushMessage {
  title: string;
  body: string;
}

// =====================================================
// NOTIFICATION TEMPLATES
// =====================================================

/**
 * Message templates for all notification types
 * Use placeholders like {player_name}, {competition_name} that get replaced with actual data
 */
export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  competition_player_added: {
    title: 'Added to Competition',
    body: "You've been added to {competition_name}",
  },
  competition_player_joined: {
    title: 'New Player Joined',
    body: '{player_name} joined {competition_name}',
  },
  new_round_created: {
    title: 'New Round Added',
    body: 'A new round has been added to {competition_name}',
  },
  competition_status_changed: {
    title: 'Competition Update',
    body: '{competition_name} is now {status}',
  },
  scorecard_submitted: {
    title: 'Scorecard Submitted',
    body: '{player_name} submitted their scorecard for {round_name}',
  },
  friend_request_received: {
    title: 'Friend Request',
    body: '{player_name} sent you a friend request',
  },
  friend_request_accepted: {
    title: 'Friend Request Accepted',
    body: '{player_name} accepted your friend request',
  },
  social_round_invitation: {
    title: 'Round Invitation',
    body: '{player_name} invited you to play at {course_name}',
  },
  league_player_joined: {
    title: 'Player Joined League',
    body: '{player_name} joined {league_name}',
  },
  league_player_left: {
    title: 'Player Left League',
    body: '{player_name} left {league_name}',
  },
  league_player_removed: {
    title: 'Removed from League',
    body: 'You were removed from {league_name}',
  },
  league_round_tagged: {
    title: 'Round Tagged',
    body: '{player_name} tagged a round to {league_name}',
  },
  league_leaderboard_changed: {
    title: 'Leaderboard Update',
    body: 'Your rank changed in {league_name}',
  },
  round_completed: {
    title: 'Round Complete',
    body: 'All scorecards submitted for {round_name}',
  },
  partnership_created: {
    title: 'Partnership Created',
    body: '{player_name} created a partnership with you in {league_name}',
  },
  partnership_round_tagged: {
    title: 'Partnership Round Tagged',
    body: '{player_name} tagged a round to {league_name}',
  },
  skins_game_completed: {
    title: 'Skins Game Complete',
    body: 'Skins game completed for {round_name} of {competition_name}',
  },
  skins_game_cancelled: {
    title: 'Skins Game Cancelled',
    body: 'Skins game for {round_name} of {competition_name} has been cancelled',
  },
  wolf_game_completed: {
    title: 'Wolf Game Complete',
    body: 'Wolf game completed for {round_name} of {competition_name}',
  },
  wolf_game_cancelled: {
    title: 'Wolf Game Cancelled',
    body: 'Wolf game for {round_name} of {competition_name} has been cancelled',
  },
  prize_pool_settled: {
    title: 'Prize Pool Settled',
    body: 'Prize pool for {competition_name} has been settled',
  },
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Replace placeholders in a string with actual values from data
 * Placeholders are in the format {key_name}
 *
 * @param template - String with placeholders
 * @param data - Object with values to substitute
 * @returns String with placeholders replaced
 */
function interpolateTemplate(template: string, data: NotificationData): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = data[key];
    if (value !== undefined && value !== null) {
      return String(value);
    }
    // Return placeholder if no value found (for debugging)
    return match;
  });
}

/**
 * Format status string for display
 * Converts database status values to user-friendly text
 *
 * @param status - Raw status from database
 * @returns Formatted status string
 */
function formatStatus(status: string | undefined): string {
  if (!status) return 'updated';

  const statusMap: Record<string, string> = {
    upcoming: 'starting soon',
    'in-progress': 'in progress',
    completed: 'completed',
    cancelled: 'cancelled',
  };

  return statusMap[status] || status.replace(/-/g, ' ');
}

/**
 * Build a push message by filling in template placeholders with notification data
 *
 * @param type - Type of notification
 * @param data - Data to interpolate into the template
 * @returns Built message with title and body, or null if type is unknown
 *
 * @example
 * const message = buildPushMessage('friend_request_received', {
 *   player_name: 'John Smith'
 * });
 * // Result: { title: 'Friend Request', body: 'John Smith sent you a friend request' }
 */
export function buildPushMessage(
  type: NotificationType,
  data: NotificationData
): BuiltPushMessage | null {
  const template = NOTIFICATION_TEMPLATES[type];

  if (!template) {
    console.warn(`[PushConfig] Unknown notification type: ${type}`);
    return null;
  }

  // Pre-process data for special cases
  const processedData: NotificationData = {
    ...data,
    // Format status for display
    status: formatStatus(data.status as string | undefined),
    // Use course_name as round_name fallback
    round_name: data.round_name || data.course_name || 'the round',
  };

  return {
    title: interpolateTemplate(template.title, processedData),
    body: interpolateTemplate(template.body, processedData),
  };
}

/**
 * Get the notification category ID for iOS interactive notifications
 * Maps notification types to category identifiers
 *
 * @param type - Type of notification
 * @returns Category ID for the notification type
 */
export function getCategoryId(type: NotificationType): string {
  const categoryMap: Record<NotificationType, string> = {
    competition_player_added: 'COMPETITION',
    competition_player_joined: 'COMPETITION',
    new_round_created: 'COMPETITION',
    competition_status_changed: 'COMPETITION',
    scorecard_submitted: 'SCORECARD',
    friend_request_received: 'FRIEND_REQUEST',
    friend_request_accepted: 'FRIEND_REQUEST',
    social_round_invitation: 'COMPETITION',
    league_player_joined: 'LEAGUE',
    league_player_left: 'LEAGUE',
    league_player_removed: 'LEAGUE',
    league_round_tagged: 'LEAGUE',
    league_leaderboard_changed: 'LEAGUE',
    round_completed: 'COMPETITION',
    partnership_created: 'LEAGUE',
    partnership_round_tagged: 'LEAGUE',
    skins_game_completed: 'SIDE_GAME',
    skins_game_cancelled: 'SIDE_GAME',
    wolf_game_completed: 'SIDE_GAME',
    wolf_game_cancelled: 'SIDE_GAME',
    prize_pool_settled: 'SIDE_GAME',
  };

  return categoryMap[type] || 'DEFAULT';
}

/**
 * Get default sound for notification type
 * Can be customized per notification type if needed
 *
 * @param type - Type of notification
 * @returns Sound name or 'default'
 */
export function getNotificationSound(type: NotificationType): 'default' | null {
  // All notification types use default sound for now
  // Could be customized per type if needed
  return 'default';
}

/**
 * Get priority level for notification type
 * Higher priority notifications are more likely to be delivered immediately
 *
 * @param type - Type of notification
 * @returns Priority level: 'default', 'normal', or 'high'
 */
export function getNotificationPriority(
  type: NotificationType
): 'default' | 'normal' | 'high' {
  // Friend requests and round invitations are high priority
  const highPriorityTypes: NotificationType[] = [
    'friend_request_received',
    'social_round_invitation',
  ];

  return highPriorityTypes.includes(type) ? 'high' : 'default';
}

/**
 * Validate that a string is a valid Expo push token
 *
 * @param token - Token to validate
 * @returns True if token matches Expo push token format
 */
export function isValidExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(token);
}
