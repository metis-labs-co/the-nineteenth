/**
 * MatchPlayScorecardTable Types
 *
 * Shared type definitions for the MatchPlayScorecardTable component and
 * its sub-components.
 */

import type { HoleResult, MatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/types';
import type { Hole } from '@/types/database.types';

export interface MatchPlayScorecardTableProps {
  /** Course holes data */
  holes: Hole[];
  /** Player 1 info */
  player1: { id: string; name: string };
  /** Player 2 info */
  player2: { id: string; name: string };
  /** Function to get a player's score for a specific hole */
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined;
  /** Optional callback when a hole row is pressed */
  onHolePress?: (holeNumber: number) => void;
  /** Player 1's playing handicap for the round (defaults to 0 — gross scoring). */
  player1Handicap?: number;
  /** Player 2's playing handicap for the round (defaults to 0 — gross scoring). */
  player2Handicap?: number;
}

export interface CalculatedData {
  /** Hole results for all holes */
  holeResults: Record<number, HoleResult>;
  /** Running match status after each hole */
  runningStatus: Record<number, MatchStatus>;
  /** Front 9 totals */
  front9: {
    par: number;
    player1: number;
    player2: number;
    holesPlayed: number;
  };
  /** Back 9 totals */
  back9: {
    par: number;
    player1: number;
    player2: number;
    holesPlayed: number;
  };
  /** Overall totals */
  total: {
    par: number;
    player1: number;
    player2: number;
    holesPlayed: number;
  };
  /** Final match status */
  finalStatus: MatchStatus;
}
