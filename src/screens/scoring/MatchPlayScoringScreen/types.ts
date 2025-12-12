/**
 * Type definitions for MatchPlayScoringScreen
 */

export interface MatchPlayer {
  id: string;
  name: string;
  handicap: number;
}

export interface HoleResult {
  player1Score: number | null;
  player2Score: number | null;
  winner: 'player1' | 'player2' | 'halved' | null;
}

export type MatchStatus =
  | { status: 'in_progress'; leader: 'player1' | 'player2' | null; holesUp: number; holesRemaining: number }
  | { status: 'complete'; winner: 'player1' | 'player2' | 'halved'; margin: string };
