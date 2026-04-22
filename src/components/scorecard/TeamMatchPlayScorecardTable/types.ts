/**
 * TeamMatchPlayScorecardTable Types
 */

import type { HoleResult, MatchStatus } from '@/screens/scoring/MatchPlayScoringScreen/types';
import type { Hole } from '@/types/database.types';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';

export interface TeamMatchPlayScorecardTableProps {
  /** Course holes data */
  holes: Hole[];
  /** Team A data (members must already have playing handicap populated). */
  team1: MatchTeam;
  /** Team B data (members must already have playing handicap populated). */
  team2: MatchTeam;
  /** Function to get a player's gross score for a specific hole */
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined;
  /** Optional callback when a hole row is pressed */
  onHolePress?: (holeNumber: number) => void;
}

/**
 * Same shape as MatchPlayScorecardTable's CalculatedData so we can reuse the
 * existing HoleRow / SubtotalRow / TotalRow presentational components.
 * The `player1/player2` keys here carry team data semantically.
 */
export interface TeamCalculatedData {
  holeResults: Record<number, HoleResult>;
  runningStatus: Record<number, MatchStatus>;
  front9: {
    par: number;
    player1: number;
    player2: number;
    holesPlayed: number;
  };
  back9: {
    par: number;
    player1: number;
    player2: number;
    holesPlayed: number;
  };
  total: {
    par: number;
    player1: number;
    player2: number;
    holesPlayed: number;
  };
  finalStatus: MatchStatus;
}
