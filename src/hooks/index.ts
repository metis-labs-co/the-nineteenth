/**
 * Hooks Module
 *
 * Re-exports all TanStack Query hooks and query keys.
 */

// Query keys
export {
  authKeys,
  competitionKeys,
  roundKeys,
  venueKeys,
  courseKeys,
  playerKeys,
  scorecardKeys,
  leaderboardKeys,
  teamKeys,
  pairingKeys,
  scoringPairsKeys,
  statisticsKeys,
  friendsKeys,
  notificationKeys,
  subscriptionKeys,
  pushKeys,
  allQueryKeys,
} from './queryKeys';
export type { QueryKey } from './queryKeys';

// Auth hooks
export { useAuth, useSession, useUser } from './useAuth';

// Competition hooks
export { useCompetitions, useFilteredCompetitions } from './useCompetitions';
export type { CompetitionsFilter } from './useCompetitions';
export { useCreateCompetition } from './useCreateCompetition';

// Course hooks
export {
  useCourses,
  useCourse,
  useSearchCourses,
  useFavoriteCourses,
  useAddFavorite,
  useRemoveFavorite,
  useCreateCourse,
} from './useCourses';
export type { CourseWithFavorite, CreateCourseInput } from './useCourses';

// Venue hooks
export {
  useVenuesWithCourses,
  useSearchVenues,
  useVenueCourseDisplayItems,
  useFavoriteCoursesWithVenues,
  useCreateVenue,
  useCreateVenueWithCourse,
  useAddCourseFavorite,
  useRemoveCourseFavorite,
} from './useVenues';
export type {
  CourseWithFavoriteStatus,
  VenueWithCourses,
  VenueCourseDisplayItem,
  CreateVenueInput,
} from './useVenues';
export { useCreateCourse as useCreateVenueCourse } from './useVenues';

// API Course hooks (GolfAPI.io)
export {
  useApiCourseSearch,
  useImportCourse,
  useImportBasicCourse,
  useCourseWithDetails,
  useRefreshCourseData,
  useCacheStats,
  useIsApiAvailable,
  useRefreshStaleCourses,
  useCombinedCourseSearch,
} from './useApiCourses';
export type {
  UseApiCourseSearchOptions,
  UseImportCourseOptions,
} from './useApiCourses';

// Leaderboard hooks
export { useLeaderboard } from './useLeaderboard';
export type { LeaderboardEntry } from './useLeaderboard';
export { useCompetitionLeaderboard } from './useCompetitionLeaderboard';
export type {
  CompetitionLeaderboardEntry,
  LeaderboardFilter,
  TeamMemberInfo,
  UseCompetitionLeaderboardOptions,
} from './useCompetitionLeaderboard';

// Round leaderboard (format-specific)
export {
  useRoundLeaderboard,
  isPlayerEntry,
  isTeamEntry,
  isStablefordScore,
  isStrokeScore,
  isMatchPlayScore,
  isTeamScore,
} from './useRoundLeaderboard';
export type {
  RoundLeaderboardEntry,
  RoundLeaderboardResponse,
  RoundMetadata,
  PlayerLeaderboardEntry,
  TeamLeaderboardEntry,
  FormatSpecificScoreData,
  StablefordScoreData,
  StrokeScoreData,
  MatchPlayScoreData,
  TeamScoreData,
  UseRoundLeaderboardOptions,
} from './useRoundLeaderboard';

// Player hooks
export { usePlayer } from './usePlayer';

// Player statistics hooks
export { usePlayerStatistics } from './usePlayerStatistics';
export type {
  ScoreDistribution,
  CourseStats,
  RoundSummary,
  PlayerStatistics,
} from './usePlayerStatistics';

// Friends hooks
export {
  useFriends,
  useFriendsCount,
  useCheckCanAddFriend,
  useFriendRequests,
  useSearchPlayers,
  useAddFriend,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useFriendStats,
} from './useFriends';

// Team hooks
export {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAutoGenerateTeams,
} from './useTeams';

// Round details hooks
export { useRoundDetails, useRoundScorecards, useRoundPlayers } from './useRoundDetails';
export type {
  RoundWithCourse,
  CourseWithVenue,
  ScorecardWithPlayer,
  RoundPlayer,
} from './useRoundDetails';

// Round delete hook
export { useDeleteRound } from './useDeleteRound';
export type { DeleteRoundInput, DeleteRoundResult } from './useDeleteRound';

// Scoring pairs hooks
export {
  useScoringPairs,
  usePlayersToScore,
  useCreateScoringPairs,
  useAutoGenerateScoringPairs,
  useGenerateTeamMatchPlayPairs,
  useDeleteScoringPairs,
} from './useScoringPairs';

// Competition player management hooks
export { useRemoveCompetitionPlayer } from './useRemoveCompetitionPlayer';
export type {
  RemovePlayerState,
  UseRemoveCompetitionPlayerOptions,
  UseRemoveCompetitionPlayerResult,
} from './useRemoveCompetitionPlayer';

// Notification hooks
export {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useNotificationSubscription,
} from './useNotifications';

// Subscription hooks
export {
  useSubscription,
  useCheckFeature,
  useCanCreateCompetition,
  useCanAddRound,
  useCanAddPlayer,
  useCanAddFriend,
  useCanUseGameType,
} from './useSubscription';
export type {
  FeatureCheckContext,
  UseSubscriptionReturn,
} from './useSubscription';

// Push notification hooks
export {
  usePushNotifications,
  usePushPermissionStatus,
  usePushPreferences,
  useIsPushRegistered,
} from './usePushNotifications';
export type {
  UpdatePushPreferencesInput,
  UsePushNotificationsReturn,
} from './usePushNotifications';

