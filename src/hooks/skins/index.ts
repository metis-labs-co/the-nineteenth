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
 * - teamSkinsProcessor.ts: Pure async team skins processing
 * - useCanUseSkins.ts: Subscription feature check hook
 * - useActiveSkinsGameForRound.ts: Active skins game query hook
 * - useProcessSkinsIfNeeded.ts: Hole completion processing hook
 * - useFinalizeSkinsForRound.ts: Round finalization hook
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
  SkinsPlayerStatistics,
  SkinsLeaderboardEntry,
  SkinsGameHistoryEntry,
  SkinsLeaderboardOptions,
  SkinsGameHistoryOptions,
} from './types';

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
export type { CreateSkinsGameWithDisclaimerInput } from './mutations';

// Re-export team skins processor
export { processTeamSkins } from './teamSkinsProcessor';

// Re-export utility hooks
export { useCanUseSkins } from './useCanUseSkins';
export { useActiveSkinsGameForRound } from './useActiveSkinsGameForRound';
export { useProcessSkinsIfNeeded } from './useProcessSkinsIfNeeded';
export { useFinalizeSkinsForRound } from './useFinalizeSkinsForRound';

// Re-export statistics hooks
export {
  useSkinsStatistics,
  useMySkinsStatistics,
  useSkinsLeaderboard,
  useSkinsGameHistory,
  useSkinsRank,
} from './statistics';
