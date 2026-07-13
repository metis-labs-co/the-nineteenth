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
  player1PickedUp: boolean;
  player2PickedUp: boolean;
  winner: 'player1' | 'player2' | 'halved' | null;
}

export type MatchStatus =
  | { status: 'in_progress'; leader: 'player1' | 'player2' | null; holesUp: number; holesRemaining: number }
  | { status: 'complete'; winner: 'player1' | 'player2' | 'halved'; margin: string };

/**
 * Per-player match status display
 */
export interface PlayerMatchStatus {
  /** Short text: "1 UP", "2 DN", "A/S" */
  text: string;
  /** Full text: "1 Up", "2 Down", "All Square" */
  fullText: string;
  /** Status type for styling */
  type: 'up' | 'down' | 'square' | 'win' | 'loss' | 'halved';
  /** Number of holes up/down (0 for square) */
  holesUpDown: number;
}
