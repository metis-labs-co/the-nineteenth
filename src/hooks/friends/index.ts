/**
 * Friends Hooks
 *
 * Comprehensive friends management hooks split by concern:
 * - queries.ts: Read-only hooks (friends list, search, requests, stats)
 * - mutations.ts: Write hooks (add, accept, decline, remove, cancel)
 */

// Query hooks
export {
  useFriendsCount,
  useCheckCanAddFriend,
  useFriends,
  useFriendsWithPendingSent,
  useFriendRequests,
  useSentFriendRequests,
  useSearchPlayers,
  useFriendStats,
} from './queries';

// Mutation hooks
export {
  useAddFriend,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useCancelFriendRequest,
} from './mutations';
