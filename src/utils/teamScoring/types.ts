/**
 * Team Scoring Types
 *
 * Shared types used across team scoring modules.
 */

/**
 * Team member score data for best ball calculations
 */
export interface TeamMemberScore {
  playerId: string;
  grossScore: number;
  handicap: number;
}

/**
 * Result of a best ball hole calculation
 */
export interface BestBallHoleResult {
  bestNetScore: number;
  contributingPlayerId: string;
  allNetScores: {
    playerId: string;
    netScore: number;
  }[];
}

/**
 * Result of a single match play hole
 */
export interface MatchPlayHoleResult {
  holeNumber: number;
  playerScore: number;
  opponentScore: number;
  result: 'won' | 'lost' | 'halved';
}

/**
 * Match status for early finish detection
 */
export type MatchStatus =
  | 'in_progress'
  | 'player_wins'
  | 'opponent_wins'
  | 'all_square'
  | 'dormie_player'
  | 'dormie_opponent';

/**
 * Complete match play result
 */
export interface MatchPlayMatchResult {
  holesWon: number;
  holesLost: number;
  holesHalved: number;
  holesPlayed: number;
  holesRemaining: number;
  currentScore: number; // positive = player ahead, negative = opponent ahead
  matchResult: MatchStatus;
  finalResult?: string; // e.g., "3&2", "1 UP", "A/S"
}

/**
 * Team member data for handicap calculation
 */
export interface TeamMember {
  playerId: string;
  handicap: number;
}
