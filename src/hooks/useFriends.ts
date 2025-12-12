/**
 * useFriends - Friends Management Hooks
 *
 * Provides comprehensive friends functionality:
 * - Fetch user's friends list
 * - Search for players to add as friends
 * - Send/accept/decline friend requests
 * - Remove friends
 *
 * @example
 * ```tsx
 * function FriendsScreen() {
 *   const { data: friends, isLoading, refetch } = useFriends();
 *   const addFriend = useAddFriend();
 *
 *   const handleAddFriend = (playerId: string) => {
 *     addFriend.mutate(playerId);
 *   };
 *
 *   return <FriendsList friends={friends} onRefresh={refetch} />;
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { friendsKeys } from './queryKeys';
import { useAuth } from './useAuth';
import { useCanAddFriend } from './useSubscription';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { isUnlimited } from '@/types/subscription.types';
import type { FeatureAccess } from '@/types/subscription.types';
import type {
  Friend,
  FriendRequest,
  PlayerSearchResult,
  Player,
  Friendship,
  FriendshipStatus,
} from '@/types/database.types';

/**
 * Hook: useFriendsCount
 * Returns the count of accepted friends for limit checking
 */
export function useFriendsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendsKeys.count(user?.id),
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      // Count accepted friendships where user is either requester or addressee
      const { count, error } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error counting friends:', error);
        return 0;
      }

      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
  });
}

/**
 * Hook: useCheckCanAddFriend
 * Checks if the user can add more friends based on tier limits
 *
 * @returns FeatureAccess object with allowed, reason, currentValue, limitValue
 */
export function useCheckCanAddFriend(): FeatureAccess & { isLoading: boolean } {
  const { data: friendCount = 0, isLoading } = useFriendsCount();
  const access = useCanAddFriend(friendCount);

  return {
    ...access,
    isLoading,
  };
}

/**
 * Hook: useFriends
 * Fetches the current user's friends list (accepted and pending)
 */
export function useFriends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendsKeys.list(user?.id),
    queryFn: async (): Promise<Friend[]> => {
      if (!user?.id) return [];

      // Fetch friendships where user is either requester or addressee
      // Only include 'accepted' friendships in the friends list
      // Pending requests received by the user are shown separately via useFriendRequests
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          requester_id,
          addressee_id,
          status,
          created_at,
          updated_at,
          requester:players!friendships_requester_id_fkey(*),
          addressee:players!friendships_addressee_id_fkey(*)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) {
        console.error('Error fetching friends:', error);
        throw error;
      }

      // Define the shape of the query result
      type FriendshipQueryResult = {
        id: string;
        requester_id: string;
        addressee_id: string;
        status: FriendshipStatus;
        created_at: string;
        updated_at: string;
        requester: Player;
        addressee: Player;
      };

      // Transform the data to Friend type
      const friends: Friend[] = ((data || []) as FriendshipQueryResult[]).map((friendship) => {
        const isRequester = friendship.requester_id === user.id;
        const friendPlayer = isRequester
          ? friendship.addressee
          : friendship.requester;

        return {
          ...friendPlayer,
          friendship_id: friendship.id,
          friendship_status: friendship.status,
          is_requester: isRequester,
        };
      });

      return friends;
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.STANDARD,
    gcTime: GC_TIMES.STANDARD,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

/**
 * Hook: useFriendRequests
 * Fetches pending friend requests received by the current user
 */
export function useFriendRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendsKeys.pendingRequests(),
    queryFn: async (): Promise<FriendRequest[]> => {
      if (!user?.id) return [];

      // Fetch pending requests where user is the addressee
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          created_at,
          requester:players!friendships_requester_id_fkey(*)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching friend requests:', error);
        throw error;
      }

      // Define the shape of the query result
      type FriendRequestQueryResult = {
        id: string;
        created_at: string;
        requester: Player;
      };

      // Transform to FriendRequest type
      const requests: FriendRequest[] = ((data || []) as FriendRequestQueryResult[]).map((item) => ({
        id: item.id,
        requester: item.requester,
        created_at: item.created_at,
      }));

      return requests;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - check more frequently for requests
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
    refetchOnReconnect: true,
  });
}

/**
 * Hook: useSearchPlayers
 * Search for players by name to add as friends
 */
export function useSearchPlayers(searchQuery: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendsKeys.search(searchQuery),
    queryFn: async (): Promise<PlayerSearchResult[]> => {
      if (!user?.id || !searchQuery.trim()) return [];

      // Search for players by name (case-insensitive)
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .neq('id', user.id) // Exclude current user
        .ilike('name', `%${searchQuery}%`)
        .limit(20);

      if (playersError) {
        console.error('Error searching players:', playersError);
        throw playersError;
      }

      if (!players || players.length === 0) return [];

      // Get existing friendships to mark friend status
      const { data: friendships } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      // Define the shape of friendship query result
      type FriendshipLookup = {
        id: string;
        requester_id: string;
        addressee_id: string;
        status: FriendshipStatus;
      };

      // Create a map of player ID to friendship status
      const friendshipMap = new Map<
        string,
        { status: FriendshipStatus; direction: 'sent' | 'received' }
      >();

      ((friendships || []) as FriendshipLookup[]).forEach((f) => {
        const otherId =
          f.requester_id === user.id ? f.addressee_id : f.requester_id;
        const direction = f.requester_id === user.id ? 'sent' : 'received';
        friendshipMap.set(otherId, { status: f.status, direction });
      });

      // Transform to PlayerSearchResult
      const results: PlayerSearchResult[] = (players as Player[]).map((player) => {
        const friendship = friendshipMap.get(player.id);
        const isFriend = friendship?.status === 'accepted';
        const hasPending = friendship?.status === 'pending';

        return {
          ...player,
          is_friend: isFriend,
          has_pending_request: hasPending,
          request_direction: hasPending ? friendship?.direction : undefined,
        };
      });

      return results;
    },
    enabled: !!user?.id && searchQuery.trim().length >= 2,
    staleTime: 30 * 1000, // 30 seconds - search results can change frequently
    gcTime: 60 * 1000,
    retry: 1,
  });
}

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

      // Create new friendship with pending status
      // The friend will appear in the list with a "Pending" badge
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
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: friendsKeys.all });
    },
  });
}

/**
 * Hook: useAcceptFriendRequest
 * Accept a pending friend request
 */
export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

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
      // Invalidate to refresh friends list and requests
      queryClient.invalidateQueries({ queryKey: friendsKeys.all });
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
      queryClient.invalidateQueries({ queryKey: friendsKeys.list() });
    },
  });
}

/**
 * Hook: useFriendStats
 * Get basic stats for a friend (rounds played together, etc.)
 */
export function useFriendStats(friendId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendsKeys.detail(friendId),
    queryFn: async () => {
      if (!user?.id || !friendId) return null;

      // Get rounds where both players participated
      const { data: rounds, error } = await supabase
        .from('scorecards')
        .select(`
          round_id,
          round:rounds!inner(
            id,
            date,
            competition:competitions(name)
          )
        `)
        .eq('player_id', friendId);

      if (error) {
        console.error('Error fetching friend stats:', error);
        return null;
      }

      // Get the friend's player profile for additional stats
      const { data: friendProfile } = await supabase
        .from('players')
        .select('*')
        .eq('id', friendId)
        .single();

      return {
        roundsPlayed: rounds?.length || 0,
        recentRounds: (rounds as unknown[])?.slice(0, 5) || [],
        player: (friendProfile ?? null) as Player | null,
      };
    },
    enabled: !!user?.id && !!friendId,
    staleTime: 5 * 60 * 1000,
  });
}
