/**
 * Friends Query Hooks
 *
 * Read-only hooks for fetching friends data:
 * - Friends list (accepted)
 * - Friends with pending sent requests
 * - Incoming friend requests
 * - Sent friend requests
 * - Player search
 * - Friend stats
 * - Friends count (for tier limit checking)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase/client';
import { friendsKeys } from '../queryKeys';
import { useAuth } from '../useAuth';
import { useSubscription } from '../useSubscription';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import type { FeatureAccess } from '@/types/subscription.types';
import type {
  Friend,
  FriendRequest,
  PlayerSearchResult,
  Player,
  FriendshipStatus,
} from '@/types/database.types';

/** Shape of a friendship query result with joined player data */
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

/** Transform a friendship row into a Friend, picking the "other" player */
function toFriend(friendship: FriendshipQueryResult, userId: string): Friend {
  const isRequester = friendship.requester_id === userId;
  const friendPlayer = isRequester ? friendship.addressee : friendship.requester;
  return {
    ...friendPlayer,
    friendship_id: friendship.id,
    friendship_status: friendship.status,
    is_requester: isRequester,
  };
}

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
 */
export function useCheckCanAddFriend(): FeatureAccess & { isLoading: boolean } {
  const { data: friendCount = 0, isLoading } = useFriendsCount();
  const { checkFeature } = useSubscription();
  const access = checkFeature('add_friend', { friendCount });

  return {
    ...access,
    isLoading,
  };
}

/**
 * Hook: useFriends
 * Fetches the current user's friends list (accepted only)
 */
export function useFriends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendsKeys.list(user?.id),
    queryFn: async (): Promise<Friend[]> => {
      if (!user?.id) return [];

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

      return ((data || []) as FriendshipQueryResult[]).map(f => toFriend(f, user.id));
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
 * Hook: useFriendsWithPendingSent
 * Fetches friends list including pending requests sent BY the current user.
 */
export function useFriendsWithPendingSent() {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendsKeys.listWithPendingSent(user?.id),
    queryFn: async (): Promise<Friend[]> => {
      if (!user?.id) return [];

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
        .or(
          `and(status.eq.accepted,or(requester_id.eq.${user.id},addressee_id.eq.${user.id})),` +
            `and(status.eq.pending,requester_id.eq.${user.id})`
        );

      if (error) {
        console.error('Error fetching friends with pending sent:', error);
        throw error;
      }

      return ((data || []) as FriendshipQueryResult[]).map(f => toFriend(f, user.id));
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

      type FriendRequestQueryResult = {
        id: string;
        created_at: string;
        requester: Player;
      };

      return ((data || []) as FriendRequestQueryResult[]).map((item) => ({
        id: item.id,
        requester: item.requester,
        created_at: item.created_at,
      }));
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * Hook: useSentFriendRequests
 * Fetches pending friend requests sent by the current user
 */
export function useSentFriendRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendsKeys.sentRequests(),
    queryFn: async (): Promise<FriendRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id,
          created_at,
          addressee:players!friendships_addressee_id_fkey(*)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching sent friend requests:', error);
        throw error;
      }

      type SentRequestQueryResult = {
        id: string;
        created_at: string;
        addressee: Player;
      };

      return ((data || []) as SentRequestQueryResult[]).map((item) => ({
        id: item.id,
        requester: item.addressee,
        created_at: item.created_at,
      }));
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: true,
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

      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .neq('id', user.id)
        .ilike('name', `%${searchQuery}%`)
        .limit(20);

      if (playersError) {
        console.error('Error searching players:', playersError);
        throw playersError;
      }

      if (!players || players.length === 0) return [];

      const { data: friendships } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      type FriendshipLookup = {
        id: string;
        requester_id: string;
        addressee_id: string;
        status: FriendshipStatus;
      };

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

      return (players as Player[]).map((player) => {
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
    },
    enabled: !!user?.id && searchQuery.trim().length >= 2,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    retry: 1,
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
