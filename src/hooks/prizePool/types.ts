/**
 * Prize Pool Hooks - Type Definitions
 *
 * Shared types for prize pool hooks.
 */

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
