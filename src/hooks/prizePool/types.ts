/**
 * Prize Pool Hooks - Type Definitions
 *
 * Shared types for prize pool hooks.
 */

import type { PoolTransactionType } from '@/types/database/prizePool.types';

// =====================================================
// ERROR TYPES
// =====================================================

/**
 * Error type for prize pool service operations
 */
export interface PrizePoolServiceError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'PERMISSION' | 'LOCKED' | 'UNKNOWN';
}

// =====================================================
// OPTIONS TYPES
// =====================================================

/**
 * Options for filtering pool transactions
 */
export interface PoolTransactionsOptions {
  /** Maximum number of transactions to return */
  limit?: number;
  /** Filter by transaction type */
  type?: PoolTransactionType;
}

// =====================================================
// ALLOCATION TYPES
// =====================================================

/**
 * Details of skins allocation for a single round
 */
export interface RoundSkinsAllocation {
  /** Round ID */
  roundId: string;
  /** Round number */
  roundNumber: number;
  /** Amount drawn from pool (0 if no skins game or direct pot) */
  poolDrawAmount: number;
  /** Whether this round has a skins game from the pool */
  hasPoolSkins: boolean;
  /** Status of the skins game */
  status: 'none' | 'active' | 'completed' | 'cancelled';
}

/**
 * Skins allocation status across all competition rounds
 */
export interface SkinsAllocationStatus {
  /** Total skins budget from the prize pool */
  totalBudget: number;
  /** Total amount already drawn for skins games */
  totalAllocated: number;
  /** Remaining budget available for new skins games */
  remainingBudget: number;
  /** Whether any budget is available */
  hasAvailableBudget: boolean;
  /** Per-round allocation details */
  roundAllocations: RoundSkinsAllocation[];
  /** Number of rounds with pool-sourced skins */
  roundsWithPoolSkins: number;
  /** Total number of rounds in the competition */
  totalRounds: number;
}
