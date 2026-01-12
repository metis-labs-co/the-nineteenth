/**
 * Prize Pool Types
 * Types for competition prize pools that fund skins games and other prizes
 */

// =====================================================
// ENUMS
// =====================================================

/** How the pool is funded */
export type PoolFundingType = 'per_player' | 'fixed_total';

/** Status of a prize pool */
export type PoolStatus = 'draft' | 'active' | 'settled';

/** Type of pool transaction */
export type PoolTransactionType =
  | 'allocation'
  | 'skins_draw'
  | 'skins_return'
  | 'prize_payout'
  | 'adjustment';

// =====================================================
// COMPETITION PRIZE POOL
// =====================================================

/**
 * A prize pool associated with a competition
 * Funds skins games and other competition prizes
 */
export interface CompetitionPrizePool {
  id: string;
  competition_id: string;

  /** Funding configuration */
  funding_type: PoolFundingType;
  funding_amount: number;
  currency: string;

  /** Calculated total pool amount */
  total_pool_amount: number;

  /** Allocation percentages (0-100, must sum to <= 100) */
  skins_allocation_percent: number;
  winner_allocation_percent: number;
  other_allocation_percent: number;

  /** Calculated budget amounts (derived from percentages) */
  skins_budget: number;
  winner_budget: number;
  other_budget: number;

  /** Auto-split skins configuration */
  auto_split_skins: boolean;
  /** Calculated pot per round when auto_split enabled (null otherwise) */
  skins_pot_per_round: number | null;

  /** Locking state (pool locked when any round starts) */
  is_locked: boolean;
  locked_at: string | null;

  /** Pool status */
  status: PoolStatus;

  /** Audit fields */
  created_by: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// POOL TRANSACTION
// =====================================================

/**
 * A transaction against a prize pool for audit tracking
 */
export interface PoolTransaction {
  id: string;
  pool_id: string;

  /** Transaction details */
  transaction_type: PoolTransactionType;
  /** Amount (positive for credits, negative for debits) */
  amount: number;

  /** Optional round association (for skins transactions) */
  round_id: string | null;

  /** Description for audit trail */
  description: string | null;

  /** Running balance after this transaction */
  balance_after: number;

  /** Audit fields */
  created_by: string | null;
  created_at: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for creating a new prize pool
 */
export interface CreatePrizePoolInput {
  competition_id: string;
  funding_type: PoolFundingType;
  funding_amount: number;
  currency?: string;
  skins_allocation_percent: number;
  winner_allocation_percent?: number;
  other_allocation_percent?: number;
  auto_split_skins?: boolean;
}

/**
 * Input for updating a prize pool (only allowed if not locked)
 */
export interface UpdatePrizePoolInput {
  funding_type?: PoolFundingType;
  funding_amount?: number;
  skins_allocation_percent?: number;
  winner_allocation_percent?: number;
  other_allocation_percent?: number;
  auto_split_skins?: boolean;
}

// =====================================================
// SUMMARY / AGGREGATE TYPES
// =====================================================

/**
 * Budget allocation details for a single category
 */
export interface PoolAllocationDetail {
  /** Allocation percentage (0-100) */
  percent: number;
  /** Total budget for this category */
  budget: number;
  /** Amount already used */
  used: number;
  /** Remaining available amount */
  remaining: number;
}

/**
 * Summary of pool allocations with usage tracking
 */
export interface PoolAllocationSummary {
  skins: PoolAllocationDetail;
  winner: PoolAllocationDetail;
  other: PoolAllocationDetail;
}

/**
 * Summary of current pool balances
 */
export interface PoolBalanceSummary {
  /** Total pool amount */
  total: number;
  /** Remaining skins budget */
  skins_remaining: number;
  /** Remaining winner budget */
  winner_remaining: number;
  /** Remaining other budget */
  other_remaining: number;
  /** Total number of transactions */
  transactions_count: number;
}

/**
 * Prize pool with calculated allocation summary
 */
export interface PrizePoolWithSummary extends CompetitionPrizePool {
  allocation_summary: PoolAllocationSummary;
  balance_summary: PoolBalanceSummary;
}
