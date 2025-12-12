/**
 * Types for ScoringPairFormationUI component
 */

import type { Player, ScoringPairWithPlayers, TeamWithMembers } from '@/types/database.types';
import type { ScoringPairCreateInput } from '@/types';

/**
 * Coverage quality indicator
 */
export type CoverageQuality = 'good' | 'warning' | 'error';

/**
 * Pairing type used for display badge
 */
export type PairingType = 'reciprocal' | 'circular' | 'cross-team' | 'manual' | 'none';

/**
 * Props for the main ScoringPairFormationUI component
 */
export interface ScoringPairFormationUIProps {
  /**
   * Round UUID for pair generation
   */
  roundId: string;

  /**
   * List of all available players in the round
   */
  players: Player[];

  /**
   * Existing scoring pairs (if editing) - will be displayed initially
   */
  existingPairs?: ScoringPairWithPlayers[];

  /**
   * Teams for cross-team pairing (optional, only for match play)
   */
  teams?: TeamWithMembers[];

  /**
   * Whether this is a team match play format
   */
  isTeamMatchPlay?: boolean;

  /**
   * Callback when pairs are saved
   */
  onSave: (pairs: ScoringPairCreateInput[]) => void;

  /**
   * Callback when user cancels
   */
  onCancel: () => void;

  /**
   * Test ID for testing
   */
  testID?: string;
}
