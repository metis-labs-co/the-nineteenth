/**
 * ScorecardTable Types
 *
 * Shared type definitions for the scorecard table components.
 */

import type { Hole, TeeBox, GameType } from '@/types/database.types';
import type { HandicapSource } from '@/types/database';
import type { PlayerGender } from '@/types/database/player.types';
import type { ScoresRecord, PlayerStats, ParTotals } from '@/utils/scorecardCalculations';

export type ScoreDisplayMode = 'strokes' | 'points';

/**
 * Minimal player info needed for scorecard display
 */
export interface ScorecardPlayerInfo {
  id: string;
  name: string;
  handicap?: number | null;
  gender?: PlayerGender | null; // For daily handicap calculation
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
  /**
   * Historical snapshot fields from the scorecards row, captured at sync time.
   * When present, these should be preferred over live recomputation so the
   * view stays consistent with the round list card and leaderboards.
   */
  storedGaHandicap?: number | null;
  storedDailyHandicap?: number | null;
  storedTotalPoints?: number | null;
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
  /** Callback when a hole number is pressed to navigate to that hole */
  onHolePress?: (holeNumber: number) => void;
  /** Selected tee data with slope/course ratings for daily handicap calculation */
  selectedTeeData?: TeeBox | null;
  /** Game type - affects score display (par shows +1/0/-1 instead of strokes) */
  gameType?: GameType;
  /** Handicap source for calculating player stats ('profile' | 'calculated' | 'none') */
  handicapSource?: HandicapSource;
  /** Score display mode for Stableford - 'strokes' shows gross strokes, 'points' shows Stableford points */
  scoreDisplayMode?: ScoreDisplayMode;
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
