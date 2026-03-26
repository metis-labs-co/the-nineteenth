/**
 * Types for EditCompetitionScreen
 *
 * Note: Prize pool types are kept here for reuse by EditPrizePoolBottomSheet
 * which handles prize pool configuration separately from competition editing.
 */

import type { CompetitionType, TeamMode } from '@/types/database.types';
import type { PoolFundingType } from '@/types';

export interface CompetitionFormData {
  name: string;
  description: string | null;
  competitionType: CompetitionType;
  teamMode: TeamMode;
  startDate: string;
  endDate: string | null;
}

export interface CompetitionUpdateInput {
  name?: string;
  description?: string | null;
  competition_type?: CompetitionType;
  team_mode?: TeamMode;
  start_date?: string;
  end_date?: string | null;
}

// ============================================================================
// Prize Pool Types (used by EditPrizePoolBottomSheet)
// ============================================================================

/**
 * Prize pool configuration for edit form
 */
export interface PrizePoolFormConfig {
  /** Whether pool is enabled */
  enabled: boolean;
  /** Per player or fixed total */
  fundingType: PoolFundingType;
  /** Amount per player or total amount */
  fundingAmount: number;
  /** Placement-based payout splits */
  placements: { position: number; percent: number }[];
}

/**
 * State for tracking prize pool edit mode
 */
export interface PrizePoolEditState {
  /** Whether the competition has an existing prize pool */
  hasExistingPool: boolean;
  /** Whether the pool is locked (any round has started) */
  isLocked: boolean;
  /** Reason why pool can't be edited (if applicable) */
  lockedReason: string | null;
  /** Original pool ID (for updates) */
  poolId: string | null;
}

/**
 * Default prize pool configuration values
 */
export const DEFAULT_PRIZE_POOL_CONFIG: PrizePoolFormConfig = {
  enabled: false,
  fundingType: 'per_player',
  fundingAmount: 50,
  placements: [
    { position: 1, percent: 60 },
    { position: 2, percent: 30 },
    { position: 3, percent: 10 },
  ],
};
