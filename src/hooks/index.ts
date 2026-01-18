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
  clubKeys,
  venueKeys, // @deprecated - use clubKeys
  coordinateKeys,
  teeKeys,
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
  placeholderPlayersKeys,
  achievementKeys,
  cosmeticKeys,
  prizePoolKeys,
  skinsKeys,
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

// Course details hooks
export { useCourseDetails, useCoursesByClub, useCoursesByVenue } from './useCourseDetails';
export type {
  UseCourseDetailsOptions,
  CourseWithDetails,
  CourseWithClubDetail,
  CourseWithVenueDetail, // @deprecated
} from './useCourseDetails';

// Tee hooks
export {
  useTeesByCourse,
  useTeeById,
  useTeesWithCourse,
  useDefaultTee,
  useTeesByGender,
  useCreateTee,
  useUpdateTee,
  useDeleteTee,
  useBulkCreateTees,
} from './useTees';
export type {
  TeeWithCourse,
  CreateTeeInput,
  UpdateTeeInput,
} from './useTees';

// Club hooks (renamed from Venue hooks)
export {
  // New names
  useClubsWithCourses,
  useSearchClubs,
  useClubCourseDisplayItems,
  useFavoriteCoursesWithClubs,
  useCreateClub,
  useCreateClubWithCourse,
  useCreateCourse as useCreateClubCourse,
  // Search result helpers
  isLocalClub,
  isGolfApiResult, // Re-exported from useGolfApiSearch for convenience
  // Deprecated aliases
  useVenuesWithCourses, // @deprecated - use useClubsWithCourses
  useSearchVenues, // @deprecated - use useSearchClubs
  useVenueCourseDisplayItems, // @deprecated - use useClubCourseDisplayItems
  useFavoriteCoursesWithVenues, // @deprecated - use useFavoriteCoursesWithClubs
  useCreateVenue, // @deprecated - use useCreateClub
  useCreateVenueWithCourse, // @deprecated - use useCreateClubWithCourse
  // Favorites
  useAddCourseFavorite,
  useRemoveCourseFavorite,
} from './useClubs';
export type {
  CourseWithFavoriteStatus,
  // New types
  ClubWithCourses,
  ClubCourseDisplayItem,
  CreateClubInput,
  CreateClubCourseInput,
  FavoriteCourseWithClub,
  SearchResultItem, // Union of local and API results
  GolfApiSearchResultItem, // Re-exported from useGolfApiSearch for convenience
  // Deprecated type aliases
  VenueWithCourses, // @deprecated - use ClubWithCourses
  VenueCourseDisplayItem, // @deprecated - use ClubCourseDisplayItem
  CreateVenueInput, // @deprecated - use CreateClubInput
  FavoriteCourseWithVenue, // @deprecated - use FavoriteCourseWithClub
} from './useClubs';
export { useCreateCourse as useCreateVenueCourse } from './useClubs'; // @deprecated

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

// GolfAPI.io Club Search hooks (on-demand search fallback)
export { useGolfApiSearch } from './useGolfApiSearch';
// Note: isGolfApiResult and GolfApiSearchResultItem are re-exported from useClubs above

// Club Import hooks
export { useImportClub } from './useImportClub';
export type { ImportClubResult } from './useImportClub';

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
export { useSubscription, useCompetitionCount } from './useSubscription';
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

// Home club hooks (renamed from Home venue hooks)
export {
  // New names
  useHomeClub,
  useSetHomeClub,
  useClearHomeClub,
  // Deprecated aliases
  useHomeVenue, // @deprecated - use useHomeClub
  useSetHomeVenue, // @deprecated - use useSetHomeClub
  useClearHomeVenue, // @deprecated - use useClearHomeClub
} from './useHomeClub';
export type {
  HomeClubWithCourses,
  HomeVenueWithCourses, // @deprecated - use HomeClubWithCourses
} from './useHomeClub';

// Course update hooks
export { useUpdateCourseHoles } from './useUpdateCourseHoles';
export type { UpdateCourseHolesInput } from './useUpdateCourseHoles';

// Placeholder players hooks
export {
  usePlaceholderPlayers,
  usePlaceholderPlayer,
  useCreatePlaceholderPlayer,
  useLinkPlaceholderPlayer,
  useDeletePlaceholderPlayer,
  useUpdatePlaceholderPlayer,
} from './usePlaceholderPlayers';

// Achievement hooks
export {
  useAchievementDefinitions,
  usePlayerAchievements,
  useAchievementProgress,
  useAchievementSummary,
  useAchievementLeaderboard,
  useAwardAchievement,
  useUpdateProgress,
  useHasAchievement,
  useAchievementPoints,
  useAchievementsByCategory,
} from './achievements';

// Cosmetics hooks
export {
  useCosmeticDefinitions,
  usePlayerCosmetics,
  useEquippedCosmetics,
  useUnlockableCosmetics,
  useCosmeticsWithStatus,
  useUnlockCosmetic,
  useEquipCosmetic,
  useUnequipCosmetic,
  useHasCosmetic,
  useNextUnlockableCosmetic,
  useCosmeticCounts,
} from './cosmetics';

// Online status hooks
export {
  useOnlineStatus,
  useOnlineStatusWithRefresh,
  checkIsOnline,
  getIsOnlineCached,
  initOnlineStatus,
} from './useOnlineStatus';

// Hole Coordinates hooks (GPS features)
export {
  useHoleCoordinates,
  useHoleCoordinatesByHole,
  useGreenCoordinate,
  useTeeCoordinate,
  useCoordinateSummary,
  useDistanceToGreen,
  useHoleDistance,
  useHasCoordinates,
  useHasCompleteCoordinates,
  useAllHoleDistances,
} from './useHoleCoordinates';
export type {
  HoleCoordinateSet,
  CoordinatesByHole,
  UserLocation,
  DistanceResult,
  HoleCoordinateSummary,
} from './useHoleCoordinates';

// Skins game hooks
export {
  useSkinsGame,
  useSkinsGamesByRound,
  useSkinsResults,
  useSkinsPayouts,
  useSkinsSummary,
  useCreateSkinsGame,
  useProcessSkinsHole,
  useFinalizeSkinsGame,
  useCancelSkinsGame,
  useCanUseSkins,
  useActiveSkinsGameForRound,
  useProcessSkinsIfNeeded,
  useFinalizeSkinsForRound,
  useAutoSplitSkinsForCompetition,
  // Statistics & Leaderboard
  useSkinsStatistics,
  useMySkinsStatistics,
  useSkinsLeaderboard,
  useSkinsGameHistory,
  useSkinsRank,
} from './useSkins';
export type {
  SkinsServiceError,
  ProcessSkinsHoleInput,
  ProcessSkinsInput,
  ProcessSkinsResult,
  AutoSplitSkinsInput,
  AutoSplitSkinsResult,
  SyncSkinsResult,
  CreateSkinsGameWithPoolInput,
  // Statistics types
  SkinsPlayerStatistics,
  SkinsLeaderboardEntry,
  SkinsGameHistoryEntry,
  SkinsLeaderboardOptions,
  SkinsGameHistoryOptions,
} from './useSkins';

// Prize pool hooks
export {
  useCompetitionPrizePool,
  usePoolTransactions,
  usePoolBalance,
  usePoolAllocationSummary,
  useCanDrawFromPool,
  useCreatePrizePool,
  useUpdatePrizePool,
  useDeletePrizePool,
  useAutoSplitPool,
  useDrawFromPool,
  useReturnToPool,
  useSkinsAllocationStatus,
} from './usePrizePool';
export type {
  PrizePoolServiceError,
  PoolTransactionsOptions,
  RoundSkinsAllocation,
  SkinsAllocationStatus,
} from './usePrizePool';

// Auto-split skins sync hook (deprecated - now read-only status hook)
export { useAutoSplitSkinsSync } from './useAutoSplitSkinsSync';
export type { UseAutoSplitSkinsSyncReturn } from './useAutoSplitSkinsSync';

