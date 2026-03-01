/**
 * Notification Handler
 *
 * Handles push notification responses (taps) and foreground notifications.
 * Provides navigation based on notification type and decides whether to show
 * in-app toasts for foreground notifications.
 *
 * Also handles iOS notification category action responses (e.g., "Accept" on friend requests).
 *
 * @see docs/progress/PUSH-NOTIFICATIONS-PLAN.md
 */

import * as Notifications from 'expo-notifications';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import type { NotificationType } from '@/types/database/enums';
import {
  NotificationCategories,
  NotificationActions,
  type NotificationCategory,
  type NotificationAction,
} from './pushService';

// =====================================================
// TYPES
// =====================================================

/**
 * Notification data payload structure
 * Contains the data sent with push notifications for routing
 */
export interface NotificationData {
  type?: NotificationType;
  competitionId?: string;
  roundId?: string;
  playerId?: string;
  friendshipId?: string;
  leagueId?: string;
  /** Additional arbitrary data */
  [key: string]: unknown;
}

/**
 * Navigation type for the notification handler
 */
export type NotificationNavigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Screen relevance info for foreground notification handling
 */
export interface CurrentScreenInfo {
  /** Current screen name */
  routeName: string;
  /** Current screen params */
  params?: Record<string, unknown>;
}

// =====================================================
// NOTIFICATION TYPE TO SCREEN MAPPING
// =====================================================

/**
 * Map notification types to their corresponding screens
 * Competition-related -> CompetitionDetail
 * Friend-related -> Friends
 * Scorecard-related -> ViewRound
 */
const NOTIFICATION_SCREEN_MAP: Record<NotificationType, keyof RootStackParamList> = {
  // Competition notifications -> CompetitionDetail
  competition_player_added: 'CompetitionDetail',
  competition_player_joined: 'CompetitionDetail',
  new_round_created: 'CompetitionDetail',
  competition_status_changed: 'CompetitionDetail',

  // Friend notifications -> Friends
  friend_request_received: 'Friends',
  friend_request_accepted: 'Friends',

  // Scorecard notifications -> ViewRound
  scorecard_submitted: 'ViewRound',

  // Social round invitation -> ViewRound (or CompetitionDetail if no roundId)
  social_round_invitation: 'ViewRound',

  // League notifications -> LeagueDetail
  league_player_joined: 'LeagueDetail',
  league_player_left: 'LeagueDetail',
  league_player_removed: 'LeagueDetail',
  league_round_tagged: 'LeagueDetail',
  league_leaderboard_changed: 'LeagueDetail',

  // Round completed -> ViewRound
  round_completed: 'ViewRound',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Extract notification data from Expo notification response
 */
function extractNotificationData(
  response: Notifications.NotificationResponse
): NotificationData {
  const notification = response.notification;
  const data = notification.request.content.data as NotificationData | undefined;

  return {
    type: data?.type,
    competitionId: data?.competitionId,
    roundId: data?.roundId,
    playerId: data?.playerId,
    friendshipId: data?.friendshipId,
    leagueId: data?.leagueId,
    ...data,
  };
}

/**
 * Extract notification data from a foreground notification
 */
function extractForegroundNotificationData(
  notification: Notifications.Notification
): NotificationData {
  const data = notification.request.content.data as NotificationData | undefined;

  return {
    type: data?.type,
    competitionId: data?.competitionId,
    roundId: data?.roundId,
    playerId: data?.playerId,
    friendshipId: data?.friendshipId,
    leagueId: data?.leagueId,
    ...data,
  };
}

/**
 * Get the target screen for a notification type
 */
function getTargetScreen(
  type: NotificationType | undefined,
  data: NotificationData
): keyof RootStackParamList {
  if (!type) {
    // Default to Notifications list if no type
    return 'Notifications';
  }

  // Special case: social_round_invitation can go to either ViewRound or CompetitionDetail
  if (type === 'social_round_invitation') {
    if (data.roundId) {
      return 'ViewRound';
    }
    if (data.competitionId) {
      return 'CompetitionDetail';
    }
    return 'Notifications';
  }

  return NOTIFICATION_SCREEN_MAP[type] || 'Notifications';
}

/**
 * Check if the user is already on the screen relevant to this notification
 */
function isOnRelevantScreen(
  currentScreen: CurrentScreenInfo | null,
  targetScreen: keyof RootStackParamList,
  data: NotificationData
): boolean {
  if (!currentScreen) {
    return false;
  }

  // Not on the target screen type
  if (currentScreen.routeName !== targetScreen) {
    return false;
  }

  // Check if viewing the same entity
  const params = currentScreen.params;

  switch (targetScreen) {
    case 'CompetitionDetail':
      // On competition detail for the same competition
      return params?.id === data.competitionId;

    case 'ViewRound':
      // On view round for the same round
      return params?.roundId === data.roundId;

    case 'LeagueDetail':
      // On league detail for the same league
      return params?.id === data.leagueId;

    case 'Friends':
      // Already on friends screen
      return true;

    default:
      return false;
  }
}

// =====================================================
// MAIN HANDLERS
// =====================================================

/**
 * Handle notification response (when user taps a notification)
 *
 * Extracts notification data and navigates to the appropriate screen
 * based on the notification type.
 *
 * Mapping:
 * - competition_* -> CompetitionDetail (with id)
 * - friend_* -> Friends
 * - scorecard_* -> ViewRound (with roundId)
 * - social_round_invitation -> ViewRound or CompetitionDetail
 *
 * @param response - The Expo notification response from user tap
 * @param navigation - React Navigation navigator
 *
 * @example
 * ```typescript
 * // In notification listener setup
 * Notifications.addNotificationResponseReceivedListener((response) => {
 *   handleNotificationResponse(response, navigation);
 * });
 * ```
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigation: NotificationNavigation
): void {
  console.log('[NotificationHandler] Handling notification response');

  const data = extractNotificationData(response);
  const { type, competitionId, roundId, leagueId } = data;

  console.log('[NotificationHandler] Extracted data:', {
    type,
    competitionId,
    roundId,
  });

  // Determine target screen
  const targetScreen = getTargetScreen(type, data);

  console.log('[NotificationHandler] Navigating to:', targetScreen);

  // Navigate based on target screen
  switch (targetScreen) {
    case 'CompetitionDetail':
      if (competitionId) {
        navigation.navigate('CompetitionDetail', { id: competitionId });
      } else {
        console.warn('[NotificationHandler] Competition notification without competitionId');
        navigation.navigate('Notifications');
      }
      break;

    case 'ViewRound':
      if (roundId) {
        navigation.navigate('ViewRound', {
          roundId,
          competitionId: competitionId,
        });
      } else if (competitionId) {
        // Fallback to competition detail if no roundId
        navigation.navigate('CompetitionDetail', { id: competitionId });
      } else {
        console.warn('[NotificationHandler] Round notification without roundId');
        navigation.navigate('Notifications');
      }
      break;

    case 'LeagueDetail':
      if (leagueId) {
        navigation.navigate('LeagueDetail', { id: leagueId });
      } else {
        console.warn('[NotificationHandler] League notification without leagueId');
        navigation.navigate('Notifications');
      }
      break;

    case 'Friends':
      navigation.navigate('Friends', { fromProfile: true });
      break;

    default:
      navigation.navigate('Notifications');
      break;
  }
}

/**
 * Handle foreground notification
 *
 * Decides whether to show an in-app toast or suppress the notification
 * if the user is already on the relevant screen.
 *
 * @param notification - The Expo notification received in foreground
 * @param currentScreen - Info about the current screen (optional)
 * @returns Object indicating whether to show toast and the notification data
 *
 * @example
 * ```typescript
 * // In notification listener
 * Notifications.addNotificationReceivedListener((notification) => {
 *   const { shouldShowToast, data } = handleForegroundNotification(
 *     notification,
 *     { routeName: 'CompetitionDetail', params: { id: '123' } }
 *   );
 *
 *   if (shouldShowToast) {
 *     showNotificationToast(data);
 *   }
 * });
 * ```
 */
export function handleForegroundNotification(
  notification: Notifications.Notification,
  currentScreen?: CurrentScreenInfo | null
): {
  shouldShowToast: boolean;
  data: NotificationData;
  targetScreen: keyof RootStackParamList;
  suppressReason?: string;
} {
  console.log('[NotificationHandler] Handling foreground notification');

  const data = extractForegroundNotificationData(notification);
  const { type } = data;

  console.log('[NotificationHandler] Notification type:', type);

  // Determine target screen
  const targetScreen = getTargetScreen(type, data);

  // Check if user is already on the relevant screen
  if (currentScreen && isOnRelevantScreen(currentScreen, targetScreen, data)) {
    console.log('[NotificationHandler] User is on relevant screen, suppressing toast');
    return {
      shouldShowToast: false,
      data,
      targetScreen,
      suppressReason: `User is already on ${targetScreen} for this ${String(type || 'notification')}`,
    };
  }

  console.log('[NotificationHandler] Showing toast for notification');
  return {
    shouldShowToast: true,
    data,
    targetScreen,
  };
}

// =====================================================
// ACTION RESPONSE HANDLING
// =====================================================

/**
 * Action response result
 * Indicates what action was taken and any additional data
 */
export interface ActionResponseResult {
  /** The action that was triggered */
  action: NotificationAction | 'DEFAULT';
  /** Whether the action was handled */
  handled: boolean;
  /** The notification category */
  category?: NotificationCategory;
  /** Whether to navigate after handling */
  shouldNavigate: boolean;
  /** Callback to execute (e.g., accept friend request) */
  callback?: () => Promise<void>;
  /** Error message if action failed */
  error?: string;
}

/**
 * Extract action identifier from notification response
 */
function getActionIdentifier(
  response: Notifications.NotificationResponse
): NotificationAction | 'DEFAULT' {
  const actionId = response.actionIdentifier;

  // Default action (tap on notification itself)
  if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return 'DEFAULT';
  }

  // Check if it's one of our defined actions
  if (Object.values(NotificationActions).includes(actionId as NotificationAction)) {
    return actionId as NotificationAction;
  }

  return 'DEFAULT';
}

/**
 * Get category from notification response
 */
function getCategoryIdentifier(
  response: Notifications.NotificationResponse
): NotificationCategory | undefined {
  const categoryId = response.notification.request.content.categoryIdentifier;

  if (categoryId && Object.values(NotificationCategories).includes(categoryId as NotificationCategory)) {
    return categoryId as NotificationCategory;
  }

  return undefined;
}

/**
 * Handle notification action response
 *
 * Determines what action to take based on the action button the user tapped.
 * Returns information about the action so the caller can execute any necessary
 * callbacks and decide whether to navigate.
 *
 * Actions:
 * - DEFAULT (tap on notification): Navigate to relevant screen
 * - VIEW: Navigate to relevant screen
 * - ACCEPT (friend request): Accept friend request and navigate
 *
 * @param response - The Expo notification response from user action
 * @param onAcceptFriendRequest - Optional callback to accept friend request
 * @returns Action response result with handling instructions
 *
 * @example
 * ```typescript
 * const result = handleNotificationActionResponse(response, async (friendshipId) => {
 *   await acceptFriendRequest(friendshipId);
 * });
 *
 * if (result.callback) {
 *   await result.callback();
 * }
 *
 * if (result.shouldNavigate) {
 *   handleNotificationResponse(response, navigation);
 * }
 * ```
 */
export function handleNotificationActionResponse(
  response: Notifications.NotificationResponse,
  onAcceptFriendRequest?: (friendshipId: string) => Promise<void>
): ActionResponseResult {
  const action = getActionIdentifier(response);
  const category = getCategoryIdentifier(response);
  const data = extractNotificationData(response);

  console.log('[NotificationHandler] Action response:', {
    action,
    category,
    data,
  });

  // Handle based on action type
  switch (action) {
    case NotificationActions.ACCEPT:
      // Only valid for friend request category
      if (category === NotificationCategories.FRIEND_REQUEST) {
        const friendshipId = data.friendshipId;

        if (!friendshipId) {
          console.warn('[NotificationHandler] ACCEPT action without friendshipId');
          return {
            action,
            handled: false,
            category,
            shouldNavigate: true,
            error: 'Missing friendship ID for accept action',
          };
        }

        if (!onAcceptFriendRequest) {
          console.warn('[NotificationHandler] ACCEPT action without callback');
          return {
            action,
            handled: false,
            category,
            shouldNavigate: true,
            error: 'No accept callback provided',
          };
        }

        return {
          action,
          handled: true,
          category,
          shouldNavigate: true,
          callback: () => onAcceptFriendRequest(friendshipId),
        };
      }

      // ACCEPT on wrong category
      console.warn('[NotificationHandler] ACCEPT action on non-friend-request category');
      return {
        action,
        handled: false,
        category,
        shouldNavigate: true,
        error: 'Accept action not valid for this notification type',
      };

    case NotificationActions.VIEW:
    case 'DEFAULT':
    default:
      // View action or default tap - just navigate
      return {
        action,
        handled: true,
        category,
        shouldNavigate: true,
      };
  }
}

/**
 * Map notification type to iOS category identifier
 *
 * Used when sending push notifications to specify which category
 * (and therefore which actions) should be available.
 *
 * @param type - The notification type
 * @returns The iOS category identifier to use
 */
export function getCategoryForNotificationType(
  type: NotificationType
): NotificationCategory | undefined {
  switch (type) {
    case 'competition_player_added':
    case 'competition_player_joined':
    case 'new_round_created':
    case 'competition_status_changed':
    case 'round_completed':
      return NotificationCategories.COMPETITION;

    case 'friend_request_received':
    case 'friend_request_accepted':
      return NotificationCategories.FRIEND_REQUEST;

    case 'scorecard_submitted':
      return NotificationCategories.SCORECARD;

    case 'social_round_invitation':
      return NotificationCategories.COMPETITION;

    case 'league_player_joined':
    case 'league_player_left':
    case 'league_player_removed':
    case 'league_round_tagged':
    case 'league_leaderboard_changed':
      return NotificationCategories.LEAGUE;

    default:
      return undefined;
  }
}

// =====================================================
// UTILITY EXPORTS
// =====================================================

/**
 * Get screen name for a notification type
 * Useful for building deep links or determining navigation targets
 */
export function getScreenForNotificationType(
  type: NotificationType
): keyof RootStackParamList {
  return NOTIFICATION_SCREEN_MAP[type] || 'Notifications';
}

/**
 * Build navigation params for a notification
 * Returns the params needed to navigate to the appropriate screen
 */
export function buildNavigationParams(
  data: NotificationData
): { screen: keyof RootStackParamList; params: Record<string, unknown> } {
  const targetScreen = getTargetScreen(data.type, data);

  switch (targetScreen) {
    case 'CompetitionDetail':
      return {
        screen: 'CompetitionDetail',
        params: { id: data.competitionId || '' },
      };

    case 'ViewRound':
      return {
        screen: 'ViewRound',
        params: {
          roundId: data.roundId || '',
          competitionId: data.competitionId,
        },
      };

    case 'LeagueDetail':
      if (!data.leagueId) {
        return { screen: 'Notifications', params: {} };
      }
      return {
        screen: 'LeagueDetail',
        params: { id: data.leagueId },
      };

    case 'Friends':
      return {
        screen: 'Friends',
        params: { fromProfile: true },
      };

    default:
      return {
        screen: 'Notifications',
        params: {},
      };
  }
}
