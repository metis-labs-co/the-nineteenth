/**
 * Scoring Pairs Types
 *
 * Shared types used across scoring pairs modules.
 */

import type { ScoringPairCreateInput } from '@/types';

// Type for player input - accepts full Player objects or just { id: string }
export type PlayerInput = { id: string };

/**
 * Strategy for handling uneven team sizes in cross-team pairing
 */
export type CrossTeamPairingStrategy = 'wrap' | 'partial';

/**
 * Metadata about how uneven teams were handled
 */
export interface UnevenTeamMetadata {
  /** Whether teams had different sizes */
  hasUnevenTeams: boolean;
  /** Size of team 1 */
  team1Size: number;
  /** Size of team 2 */
  team2Size: number;
  /** The strategy used to handle uneven teams */
  strategyUsed: CrossTeamPairingStrategy;
  /** Player IDs from the smaller team that were reused (wrap strategy) */
  reusedPlayerIds: string[];
  /** Player IDs from the larger team left unassigned (partial strategy) */
  unassignedPlayerIds: string[];
  /** Number of extra pairings created due to wrapping */
  extraPairingsCount: number;
}

/**
 * Result of cross-team pair generation including metadata
 */
export interface CrossTeamPairResult {
  /** Generated scoring pairs */
  pairs: ScoringPairCreateInput[];
  /** Metadata about how uneven teams were handled */
  metadata: UnevenTeamMetadata;
}

/**
 * Validation result for scoring pairs coverage check
 */
export interface ScoringPairsCoverageResult {
  /** Whether all players are covered exactly once as scorer and once as player */
  isValid: boolean;
  /** Player IDs that are not being scored by anyone */
  missingPlayers: string[];
  /** Player IDs that have multiple scorers */
  duplicatePlayers: string[];
  /** Player IDs that are not scoring anyone */
  missingScorers: string[];
  /** Player IDs that are scoring multiple players (only invalid in reciprocal mode) */
  duplicateScorers: string[];
}
