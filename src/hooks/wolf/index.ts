/**
 * Wolf Hooks - Module Index
 *
 * TanStack Query hooks for Wolf Games.
 * Provides hooks for fetching and mutating Wolf game data.
 *
 * Wolf is a strategic partner selection side-game where a rotating "Wolf"
 * player chooses to partner with another player or go alone against the pack.
 *
 * This module is organized into:
 * - types.ts: Hook-specific type definitions
 * - helpers.ts: Shared helper functions (error handling)
 * - queries.ts: Query hooks for fetching data
 * - mutations.ts: Mutation hooks for modifying data
 *
 * Core Wolf types are defined in @/types/database/wolf.types.ts
 *
 * @example
 * ```tsx
 * // Import from the wolf module
 * import { useWolfGame, useCreateWolfGame, useCanUseWolf } from '@/hooks/wolf';
 *
 * // Or import the entire module
 * import * as wolf from '@/hooks/wolf';
 * ```
 */

// Re-export hook-specific types
export type {
  WolfServiceError,
  ProcessWolfDecisionResult,
  ProcessWolfHoleResultResponse,
  WolfStandingsDisplayEntry,
  WolfHoleSummary,
  WolfGameCreateOptions,
  WolfSettlementEntry,
  WolfSettlementTransaction,
  WolfPlayerStatistics,
  WolfGameHistoryEntry,
  WolfGameHistoryOptions,
} from './types';

// Re-export helpers
export { isWolfServiceError, getWolfErrorMessage } from './helpers';

// Re-export query hooks
export {
  useWolfGame,
  useWolfGameByRound,
  useWolfHoleDecisions,
  useWolfCurrentHoleDecision,
  useWolfStandings,
  useWolfPayouts,
  useCanUseWolf,
  useWolfSummary,
} from './queries';

// Re-export statistics hooks
export {
  useWolfStatistics,
  useWolfGameHistory,
} from './statistics';

// Re-export mutation hooks
export {
  useCreateWolfGame,
  useSubmitWolfDecision,
  useRecordWolfHoleResult,
  useFinalizeWolfGame,
  useCancelWolfGame,
  useDeleteWolfGame,
} from './mutations';
export type { CreateWolfGameWithDisclaimerInput } from './mutations';
