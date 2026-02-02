/**
 * Skins Hooks - Module Index
 *
 * TanStack Query hooks for Skins Games.
 * Provides hooks for fetching and mutating skins game data.
 *
 * This module is organized into:
 * - types.ts: Type definitions
 * - helpers.ts: Shared helper functions
 * - queries.ts: Query hooks for fetching data
 * - mutations.ts: Mutation hooks for modifying data
 * - utilities.ts: Utility hooks (feature checks, processing, auto-split)
 * - statistics.ts: Statistics and leaderboard hooks
 *
 * @example
 * ```tsx
 * // Import from the skins module
 * import { useSkinsGame, useCreateSkinsGame, useCanUseSkins } from '@/hooks/skins';
 *
 * // Or import the entire module
 * import * as skins from '@/hooks/skins';
 * ```
 */

// Re-export types
export type {
  SkinsServiceError,
  ProcessSkinsHoleInput,
  ProcessTeamSkinsHoleInput,
  ProcessSkinsInput,
  ProcessSkinsResult,
  AutoSplitSkinsInput,
  AutoSplitSkinsResult,
  SyncSkinsResult,
  SkinsPlayerStatistics,
  SkinsLeaderboardEntry,
  SkinsGameHistoryEntry,
  SkinsLeaderboardOptions,
  SkinsGameHistoryOptions,
} from './types';

// Re-export helpers
export { createError } from './helpers';

// Re-export query hooks
export {
  useSkinsGame,
  useSkinsGamesByRound,
  useSkinsResults,
  useSkinsPayouts,
  useSkinsSummary,
} from './queries';

// Re-export mutation hooks
export {
  useCreateSkinsGame,
  useProcessSkinsHole,
  useProcessTeamSkinsHole,
  useFinalizeSkinsGame,
  useCancelSkinsGame,
} from './mutations';
export type { CreateSkinsGameWithPoolInput } from './mutations';

// Re-export utility hooks
export {
  useCanUseSkins,
  useActiveSkinsGameForRound,
  useProcessSkinsIfNeeded,
  useFinalizeSkinsForRound,
  useAutoSplitSkinsForCompetition,
} from './utilities';

// Re-export statistics hooks
export {
  useSkinsStatistics,
  useMySkinsStatistics,
  useSkinsLeaderboard,
  useSkinsGameHistory,
  useSkinsRank,
} from './statistics';
