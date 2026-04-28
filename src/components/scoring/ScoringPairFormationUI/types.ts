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
   * Player-id → team-name lookup. When present, the player's team shows
   * as a small italic label under their name in both the selection chips
   * and the pair cards. Optional — individual competitions or rounds
   * without teams simply omit the label.
   */
  teamNameByPlayerId?: Map<string, string>;

  /**
   * Player-id → team-slot-index lookup (0-based). Used as a colour
   * fallback when the stored team colour is missing.
   */
  teamIndexByPlayerId?: Map<string, number>;

  /**
   * Player-id → stored team colour id (e.g. 'avatar-green'). Drives the
   * colour tint on the selection chips and pair cards. When set and
   * present, takes precedence over `teamIndexByPlayerId` for colour
   * resolution. Optional.
   */
  teamColorByPlayerId?: Map<string, string | null>;

  /**
   * Tee-group composition for the round — each entry is the player ids
   * in one tee group. When provided alongside `teamNameByPlayerId`,
   * Auto-Generate produces scoring pairs that respect group boundaries
   * (scorers can only mark someone in their foursome) and prefer cross-
   * team partners. When absent, Auto-Generate falls back to the legacy
   * reciprocal/circular chain that ignores groups.
   */
  groupPlayerIds?: string[][];

  /**
   * Sub-matches for split team rounds. When non-empty, Auto-Generate
   * uses each sub-match as the bucket for cross-team reciprocal pairs —
   * guaranteeing the scorer is in the same head-to-head as the player
   * they mark. Takes precedence over `groupPlayerIds`. Empty / omitted
   * for combined rounds.
   */
  subMatches?: { teamAPlayerIds: string[]; teamBPlayerIds: string[] }[];

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
