/**
 * usePendingActions - Aggregates "things waiting on the user" for Home.
 *
 * v1 sources:
 * - Unread `competition_player_added` notifications (competition invites)
 * - Unread `social_round_invitation` notifications (round invites)
 * - Unread `friend_request_received` notifications
 *
 * Future sources (not in v1; require cross-round queries):
 * - Score mismatches across all in-progress rounds
 * - Untagged-to-league prompts (recent rounds at league-eligible courses)
 * - League invitations stored in `league_players` with status='invited'
 */

import { useMemo } from 'react';
import { useNotifications } from '@/hooks/notifications';
import type { Notification } from '@/types/database/notification.types';
import type { PendingAction, PendingActionType } from '@/types/home';

const PENDING_TYPES = new Set([
  'competition_player_added',
  'social_round_invitation',
  'friend_request_received',
]);

const MAX_ITEMS = 5;

function notificationToPendingAction(n: Notification): PendingAction | null {
  switch (n.type) {
    case 'competition_player_added': {
      const compName = n.data.competition_name ?? 'a competition';
      const inviter = n.data.added_by_name;
      return {
        id: n.id,
        type: 'competition_invite' satisfies PendingActionType,
        label: `Invited to ${compName}`,
        subLabel: inviter ? `by ${inviter}` : undefined,
        ctaLabel: 'View',
        route: 'CompetitionDetail',
        params: n.competition_id ? { id: n.competition_id } : undefined,
        createdAt: n.created_at,
      };
    }
    case 'social_round_invitation': {
      const inviter = n.data.inviter_name ?? 'someone';
      const venue = n.data.venue_name ?? 'a course';
      return {
        id: n.id,
        type: 'competition_invite' satisfies PendingActionType,
        label: `${inviter} invited you to a round`,
        subLabel: venue,
        ctaLabel: 'View',
        route: 'Notifications',
        createdAt: n.created_at,
      };
    }
    case 'friend_request_received': {
      const requester = n.data.requester_name ?? 'A player';
      return {
        id: n.id,
        type: 'competition_invite' satisfies PendingActionType,
        label: `${requester} sent a friend request`,
        ctaLabel: 'Respond',
        route: 'Friends',
        createdAt: n.created_at,
      };
    }
    default:
      return null;
  }
}

export function usePendingActions() {
  const { data: notifications, isLoading, refetch } = useNotifications();

  const actions = useMemo<PendingAction[]>(() => {
    if (!notifications) return [];
    return notifications
      .filter((n) => !n.is_read && PENDING_TYPES.has(n.type))
      .map(notificationToPendingAction)
      .filter((a): a is PendingAction => a !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, MAX_ITEMS);
  }, [notifications]);

  return {
    actions,
    isLoading,
    refetch,
  };
}
