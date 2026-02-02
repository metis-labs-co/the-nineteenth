/**
 * TanStack Query hooks for Competition Prize Pools
 *
 * @deprecated Import directly from '@/hooks/prizePool' instead.
 *
 * This file re-exports everything from the prizePool module for backward compatibility.
 * The module has been split into focused files:
 * - prizePool/types.ts: Type definitions
 * - prizePool/helpers.ts: Shared helper functions
 * - prizePool/queries.ts: Query hooks
 * - prizePool/mutations.ts: Mutation hooks
 *
 * @example
 * // Preferred import (new)
 * import { useCompetitionPrizePool, useCreatePrizePool } from '@/hooks/prizePool';
 *
 * // Legacy import (still works)
 * import { useCompetitionPrizePool, useCreatePrizePool } from '@/hooks/usePrizePool';
 */

// Re-export everything from the prizePool module
export * from './prizePool';
