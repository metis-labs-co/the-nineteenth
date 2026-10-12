import type { Notification } from '@/types/database.types';
import type { RootStackParamList } from '@/navigation/types';
import { isActivityDetailNotificationType } from './activityDeepLink';

/**
 * A navigation target for an in-app notification row. `null` means "stay
 * where you are" (the caller is already on the Notifications list).
 */
export type NotificationRoute =
  | { name: 'ScheduledRound'; params: RootStackParamList['ScheduledRound'] }
  | { name: 'RoundActivity'; params: RootStackParamList['RoundActivity'] }
  | { name: 'ViewRound'; params: RootStackParamList['ViewRound'] }
  | { name: 'CompetitionDetail'; params: RootStackParamList['CompetitionDetail'] }
  | { name: 'LeagueDetail'; params: RootStackParamList['LeagueDetail'] }
  | { name: 'PlayerDetail'; params: RootStackParamList['PlayerDetail'] }
  | { name: 'Friends'; params: RootStackParamList['Friends'] };

type RoutableNotification = Pick<
  Notification,
  'type' | 'round_id' | 'competition_id' | 'league_id' | 'friendship_id' | 'player_id'
>;

/**
 * Where tapping a notification in the Notifications list should go. Mirrors
 * the push/toast routing in NotificationContext, plus a PlayerDetail target
 * for accepted friend requests (the new friend's profile).
 */
export function getNotificationRoute(notification: RoutableNotification): NotificationRoute | null {
  const { type, round_id, competition_id, league_id, friendship_id, player_id } = notification;

  if ((type === 'social_round_invitation' || type === 'social_round_response') && round_id) {
    return { name: 'ScheduledRound', params: { roundId: round_id } };
  }
  if (isActivityDetailNotificationType(type) && round_id) {
    return { name: 'RoundActivity', params: { roundId: round_id } };
  }
  if (round_id) {
    return {
      name: 'ViewRound',
      params: { roundId: round_id, competitionId: competition_id ?? undefined },
    };
  }
  if (competition_id) {
    return { name: 'CompetitionDetail', params: { id: competition_id } };
  }
  if (league_id) {
    return { name: 'LeagueDetail', params: { id: league_id } };
  }
  if (type === 'friend_request_accepted' && player_id) {
    return { name: 'PlayerDetail', params: { id: player_id } };
  }
  if (
    friendship_id ||
    type === 'friend_request_received' ||
    type === 'friend_request_accepted'
  ) {
    return { name: 'Friends', params: { fromProfile: true } };
  }
  return null;
}
