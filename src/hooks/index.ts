/**
 * Hooks Module
 *
 * Re-exports all TanStack Query hooks and query keys.
 *
 * Domain hooks that have been split into subdirectories use `export *`.
 * Root-level hooks that haven't been split keep individual named exports.
 */

// ============================================================================
// QUERY KEYS
// ============================================================================

export {
  authKeys,
  competitionKeys,
  competitionDetailsKeys,
  roundKeys,
  clubKeys,
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
  wolfKeys,
  allQueryKeys,
} from './queryKeys';
export type { QueryKey } from './queryKeys';

// ============================================================================
// DOMAIN HOOKS (subdirectory modules)
// ============================================================================

// Achievements hooks
export * from './achievements';

// Club hooks (includes deprecated venue aliases)
export * from './clubs';

// Coordinates / GPS hooks
export * from './coordinates';

// Cosmetics hooks
export * from './cosmetics';

// Friends hooks
export * from './friends';

// Leagues hooks
export * from './leagues';

// Placeholder players hooks
export * from './placeholderPlayers';

// Player statistics hooks
export * from './playerStatistics';

// Prize pool hooks
export * from './prizePool';

// Push notification hooks
export * from './pushNotifications';

// Score mismatch hooks
export * from './scoreMismatch';

// Scoring pairs hooks
export * from './scoringPairs';

// Skins game hooks
export * from './skins';

// Wolf game hooks
export * from './wolf';

// ============================================================================
// ROOT-LEVEL HOOKS (not yet split into subdirectories)
// ============================================================================

// Auth hooks (composed hook with actual logic)
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
export { useCourseDetails, useCoursesByClub } from './useCourseDetails';
export type {
  UseCourseDetailsOptions,
  CourseWithDetails,
  CourseWithClubDetail,
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

// Club Import hooks
export { useImportClub } from './useImportClub';
export type { ImportClubResult } from './useImportClub';

// Club Sync hooks (auto-refresh stale data)
export { useClubSync } from './useClubSync';
export type { UseClubSyncResult } from './useClubSync';

// Leaderboard hooks
export { useCompetitionLeaderboard } from './useCompetitionLeaderboard';
export type {
  CompetitionLeaderboardEntry,
  LeaderboardEntry,
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

// Team hooks
export {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAutoGenerateTeams,
} from './useTeams';

// Pairing hooks (player groupings with tee times)
export {
  usePairings,
  useHasPairings,
  useCreatePairings,
  useUpdatePairing,
  useDeletePairing,
  useDeleteAllPairings,
  useAutoGeneratePairings,
  useReplacePairings,
  useUpdatePairingTeeTimes,
} from './usePairings';

// Round details hooks
export { useRoundDetails, useRoundScorecards, useRoundPlayers } from './useRoundDetails';
export type {
  RoundWithCourse,
  CourseWithClub,
  ScorecardWithPlayer,
  RoundPlayer,
} from './useRoundDetails';

// Round delete hook
export { useDeleteRound } from './useDeleteRound';
export type { DeleteRoundInput, DeleteRoundResult } from './useDeleteRound';

// Course delete hook
export { useDeleteCourse } from './useDeleteCourse';
export type { DeleteCourseInput, DeleteCourseResult } from './useDeleteCourse';

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

// Subscription hooks (composed hook with actual logic)
export { useSubscription, useCompetitionCount } from './useSubscription';
export type {
  FeatureCheckContext,
  UseSubscriptionReturn,
} from './useSubscription';

// Home club hooks
export {
  useHomeClub,
  useSetHomeClub,
  useClearHomeClub,
} from './useHomeClub';
export type {
  HomeClubWithCourses,
} from './useHomeClub';

// Course update hooks
export { useUpdateCourseHoles } from './useUpdateCourseHoles';
export type { UpdateCourseHolesInput } from './useUpdateCourseHoles';
export { useUpdateCourse } from './useUpdateCourse';
export type { UpdateCourseInput } from './useUpdateCourse';

// Online status hooks
export {
  useOnlineStatus,
  useOnlineStatusWithRefresh,
  checkIsOnline,
  getIsOnlineCached,
  initOnlineStatus,
} from './useOnlineStatus';

// Coordinate backfill (auto-fetch missing GPS data from GolfAPI.io)
export { useCoordinateBackfill } from './useCoordinateBackfill';
export type { UseCoordinateBackfillResult } from './useCoordinateBackfill';

// User Location hooks (GPS tracking for distance-to-pin)
export { useUserLocation } from './useUserLocation';
export type {
  UseUserLocationReturn,
  LocationPermissionStatus,
  UserLocation as DeviceUserLocation,
} from './useUserLocation';

// UI hooks
export { useConfirmationDialog } from './useConfirmationDialog';
export type { DialogConfig, UseConfirmationDialogReturn } from './useConfirmationDialog';

// Utility hooks
export {
  useDebouncedValue,
  useDebouncedCallback,
  useDebouncedValueWithPending,
  DEFAULT_DEBOUNCE_DELAY,
} from './useDebouncedValue';

// Generic entity hooks
export { useEntity, useEntities, createEntityHook } from './useEntity';
export type { SupabaseTable, TableRow, UseEntityOptions } from './useEntity';

// Handicap history hooks
export { useHandicapHistory, handicapKeys } from './useHandicapHistory';

// Competition details data hooks
export {
  useCompetitionDetailsData,
  fetchCompetitionDetails,
  getCurrentPlayerStanding,
} from './useCompetitionDetailsData';
export type { UseCompetitionDetailsDataOptions } from './useCompetitionDetailsData';

// Competition info hooks (lightweight version)
export { useCompetitionInfo } from './useCompetitionInfo';
export type { CompetitionInfo, UseCompetitionInfoOptions } from './useCompetitionInfo';

