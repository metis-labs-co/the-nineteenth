/**
 * Prize Pool Types
 * Types for competition prize pools with placement-based payouts
 */

// =====================================================
// ENUMS
// =====================================================

/** How the pool is funded */
export type PoolFundingType = 'per_player' | 'fixed_total';

/** Status of a prize pool */
export type PoolStatus = 'draft' | 'active' | 'settled';

/** Type of pool transaction */
export type PoolTransactionType = 'prize_payout' | 'adjustment';

/** Pool target — who receives payouts */
export type PoolTargetType = 'individual' | 'team';

// =====================================================
// COMPETITION PRIZE POOL
// =====================================================

/**
 * A prize pool associated with a competition
 * Distributes prizes to top finishers based on placement splits
 */
export interface CompetitionPrizePool {
  id: string;
  competition_id: string;

  /** Pool target — individual players or teams */
  target_type: PoolTargetType;

  /** Funding configuration */
  funding_type: PoolFundingType;
  funding_amount: number;
  currency: string;

  /** Calculated total pool amount */
  total_pool_amount: number;

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
// PRIZE POOL PLACEMENT
// =====================================================

/**
 * A placement row defining how a portion of the pool is distributed
 */
export interface PrizePoolPlacement {
  id: string;
  pool_id: string;
  position: number;
  percent: number;
  payout_amount: number;
  /** Set on settlement for individual pools */
  player_id: string | null;
  /** Set on settlement for team pools */
  team_id: string | null;
  paid_at: string | null;
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

  /** Description for audit trail */
  description: string | null;

  /** Running balance after this transaction */
  balance_after: number;

  /** Recipient player (set on prize_payout rows) */
  player_id: string | null;

  /** Source team (set on team-pool prize_payout rows alongside player_id) */
  team_id: string | null;

  /** Audit fields */
  created_by: string | null;
  created_at: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

/** Input for a single placement split */
export interface PlacementInput {
  position: number;
  percent: number;
}

/**
 * Input for creating a new prize pool
 */
export interface CreatePrizePoolInput {
  competition_id: string;
  target_type: PoolTargetType;
  funding_type: PoolFundingType;
  funding_amount: number;
  currency?: string;
  placements: PlacementInput[];
}

/**
 * Input for updating a prize pool (only allowed if not locked)
 */
export interface UpdatePrizePoolInput {
  funding_type?: PoolFundingType;
  funding_amount?: number;
  placements?: PlacementInput[];
}

// =====================================================
// SUMMARY TYPES
// =====================================================

/**
 * Prize pool with its placement breakdown
 */
export interface PrizePoolWithPlacements extends CompetitionPrizePool {
  placements: PrizePoolPlacement[];
}
