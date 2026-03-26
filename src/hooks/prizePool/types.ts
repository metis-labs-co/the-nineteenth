/**
 * Prize Pool Hooks - Type Definitions
 *
 * Shared types for prize pool hooks.
 */

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
  type?: 'prize_payout' | 'adjustment';
}
