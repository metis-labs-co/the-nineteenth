/**
 * Friends Mutation Hooks
 *
 * Write hooks for friends management:
 * - Send friend request
 * - Accept/decline friend requests
 * - Remove friends
 * - Cancel sent requests
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { friendsKeys } from '../queryKeys';
import { achievementKeys } from '../queryKeys';
import { useAuth } from '../useAuth';
import type {
  Friendship,
  FriendshipStatus,
} from '@/types/database.types';

/**
 * Hook: useAddFriend
 * Send a friend request to another player
 */
export function useAddFriend() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!user?.id) {
        throw new Error('Must be logged in to add friends');
      }

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
        )
        .single();

      const existingFriendship = existing as { id: string; status: FriendshipStatus } | null;
      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          throw new Error('Already friends with this player');
        }
        if (existingFriendship.status === 'pending') {
          throw new Error('Friend request already pending');
        }
        if (existingFriendship.status === 'blocked') {
          throw new Error('Cannot send friend request');
        }
      }

      const { data, error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending' as FriendshipStatus,
        } as unknown as never)
        .select()
        .single();

      if (error) {
        console.error('Error sending friend request:', error);
        throw error;
      }

      return data as Friendship;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.all });
    },
  });
}

/**
 * Hook: useAcceptFriendRequest
 *
 * Accept a pending friend request. Friend-count achievement progress and
 * tier awards are kept in sync server-side by the `friendships_sync_achievements`
 * trigger (see migration 20260429000000_fix_friend_achievement_progress.sql),
 * so this client only needs to invalidate the relevant query caches.
 *
 * Note: the previous client-side `checkAndAward('friend_added', ...)` flow
 * was removed because it double-counted progress (currentValue + friend_count).
 * As a side effect, friend-tier achievement *toasts* no longer fire in the
 * moment of acceptance — earned achievements still appear on the Achievements
 * screen and via any future achievement notification trigger.
 */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const playerId = user?.id ?? '';

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' as FriendshipStatus } as unknown as never)
        .eq('id', friendshipId)
        .select()
        .single();

      if (error) {
        console.error('Error accepting friend request:', error);
        throw error;
      }

      return data as Friendship;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.all });

      if (playerId) {
        // The DB trigger updates achievement_progress and player_achievements
        // for the friend-count families. Refetch them so any UI that reads
        // these tables (Home, AchievementsScreen, etc.) reflects the new state.
        queryClient.invalidateQueries({
          queryKey: achievementKeys.progress(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.playerAchievements(playerId),
        });
        queryClient.invalidateQueries({
          queryKey: achievementKeys.summary(playerId),
        });
      }
    },
  });
}

/**
 * Hook: useDeclineFriendRequest
 * Decline a pending friend request
 */
export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        console.error('Error declining friend request:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.pendingRequests() });
    },
  });
}

/**
 * Hook: useRemoveFriend
 * Remove an existing friend
 */
export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        console.error('Error removing friend:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.all });
    },
  });
}

/**
 * Hook: useCancelFriendRequest
 * Cancel a pending friend request that was sent
 */
export function useCancelFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        console.error('Error cancelling friend request:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendsKeys.all });
    },
  });
}
