/**
 * useFriends - Friends Management Hooks
 *
 * Re-exports from the friends/ directory for backward compatibility.
 * New code should import directly from '@/hooks/friends'.
 *
 * @example
 * ```tsx
 * import { useFriends, useAddFriend } from '@/hooks/friends';
 * ```
 */

export {
  useFriendsCount,
  useCheckCanAddFriend,
  useFriends,
  useFriendsWithPendingSent,
  useFriendRequests,
  useSentFriendRequests,
  useSearchPlayers,
  useFriendStats,
  useAddFriend,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useCancelFriendRequest,
} from './friends';
