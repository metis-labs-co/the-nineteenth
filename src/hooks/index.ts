/**
 * Hooks Module
 *
 * Re-exports all TanStack Query hooks and query keys.
 *
 * All domain hooks are organized in subdirectories and use `export *`.
 * Root-level hooks are cross-cutting utilities that don't belong to a specific domain.
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

// Auth hooks (subdirectory modules)
export * from './auth';

// Auth composed hook (root-level, wraps auth/ hooks for backward compat)
export { useAuth, useSession, useUser } from './useAuth';

// Club hooks (includes deprecated venue aliases)
export * from './clubs';

// Competition hooks
export * from './competitions';

// Coordinates / GPS hooks
export * from './coordinates';

// Cosmetics hooks
export * from './cosmetics';

// Course hooks
export * from './courses';

// Friends hooks
export * from './friends';

// Leagues hooks
export * from './leagues';

// Location hooks
export * from './location';

// Notification hooks (in-app)
export * from './notifications';

// Placeholder players hooks
export * from './placeholderPlayers';

// Player hooks
export * from './player';

// Player statistics hooks
export * from './playerStatistics';

// Prize pool hooks
export * from './prizePool';

// Push notification hooks
export * from './pushNotifications';

// Round hooks
export * from './rounds';

// Score mismatch hooks
export * from './scoreMismatch';

// Scoring pairs hooks
export * from './scoringPairs';

// Skins game hooks
export * from './skins';

// Subscription hooks
export * from './subscription';

// Tee hooks
export * from './tees';

// Wolf game hooks
export * from './wolf';

// ============================================================================
// ROOT-LEVEL HOOKS (cross-cutting utilities)
// ============================================================================

// Online status hooks
export {
  useOnlineStatus,
  useOnlineStatusWithRefresh,
  checkIsOnline,
  getIsOnlineCached,
  initOnlineStatus,
} from './useOnlineStatus';

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

// Screen welcome hooks
export { useScreenWelcome } from './useScreenWelcome';

// One-shot location hook
export { useOneShotLocation } from './useOneShotLocation';
