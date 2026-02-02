/**
 * Prize Pool Hooks - Module Index
 *
 * TanStack Query hooks for Competition Prize Pools.
 * Provides hooks for fetching and mutating prize pool data.
 *
 * This module is organized into:
 * - types.ts: Type definitions
 * - helpers.ts: Shared helper functions
 * - queries.ts: Query hooks for fetching data
 * - mutations.ts: Mutation hooks for modifying data
 *
 * @example
 * ```tsx
 * // Import from the prizePool module
 * import { useCompetitionPrizePool, useCreatePrizePool } from '@/hooks/prizePool';
 *
 * // Or import the entire module
 * import * as prizePool from '@/hooks/prizePool';
 * ```
 */

// Re-export types
export type {
  PrizePoolServiceError,
  PoolTransactionsOptions,
  RoundSkinsAllocation,
  SkinsAllocationStatus,
} from './types';

// Re-export helpers
export { createError } from './helpers';

// Re-export query hooks
export {
  useCompetitionPrizePool,
  usePoolTransactions,
  usePoolBalance,
  usePoolAllocationSummary,
  useCanDrawFromPool,
  useSkinsAllocationStatus,
} from './queries';

// Re-export mutation hooks
export {
  useCreatePrizePool,
  useUpdatePrizePool,
  useDeletePrizePool,
  useAutoSplitPool,
  useDrawFromPool,
  useReturnToPool,
} from './mutations';
