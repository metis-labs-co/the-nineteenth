/**
 * ScorecardTable Types
 *
 * Shared type definitions for the scorecard table components.
 */

import type { Hole } from '@/types/database.types';
import type { ScoresRecord, PlayerStats, ParTotals } from '@/utils/scorecardCalculations';

/**
 * Minimal player info needed for scorecard display
 */
export interface ScorecardPlayerInfo {
  id: string;
  name: string;
  handicap?: number | null;
}

/**
 * Player data structure used by the scorecard table
 */
export interface ScorecardTablePlayer {
  /** Unique identifier (scorecard ID or player ID) */
  id: string;
  /** Player ID */
  playerId: string;
  /** Player data - only requires id, name, handicap */
  player: ScorecardPlayerInfo | null;
  /** Scores keyed by hole number */
  scores: ScoresRecord | null;
  /** Whether the player has a scorecard submitted */
  hasScorecard: boolean;
}

/**
 * Props for the main ScorecardTable component
 */
export interface ScorecardTableProps {
  /** Array of players with their scores */
  players: ScorecardTablePlayer[];
  /** Array of holes for the course */
  holes: Hole[];
  /** Screen width for calculating layout */
  screenWidth: number;
  /** Callback when a player name is pressed in the header */
  onPlayerPress?: (playerId: string) => void;
}

/**
 * Props for table row rendering components
 */
export interface TableRowProps {
  /** Hole data */
  hole: Hole;
  /** Width for player columns */
  playerCellWidth: number;
}

/**
 * Props for header row component
 */
export interface TableHeaderProps {
  /** Array of players */
  players: ScorecardTablePlayer[];
  /** Width for player columns */
  playerCellWidth: number;
}

/**
 * Props for subtotal row component
 */
export interface SubtotalRowProps {
  /** Label (OUT or IN) */
  label: string;
  /** Par total for this section */
  par: number;
  /** Player stats for calculating subtotals */
  playerStats: PlayerStats[];
  /** Whether this is the back 9 */
  isBack9: boolean;
  /** Width for player columns */
  playerCellWidth: number;
}

/**
 * Props for total row components
 */
export interface TotalRowProps {
  /** Player stats for totals */
  playerStats: PlayerStats[];
  /** Par totals */
  parTotals: ParTotals;
  /** Width for player columns */
  playerCellWidth: number;
}
