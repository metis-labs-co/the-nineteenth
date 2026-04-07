/**
 * Match Play Functions
 *
 * Hole-by-hole and overall match play scoring, including
 * early finish detection and handicap-adjusted comparisons.
 */

import type { Hole } from '@/types';
import { calculateNetScore } from '../scoring';
import type { MatchPlayHoleResult, MatchStatus, MatchPlayMatchResult } from './types';

/**
 * Calculate the result of a single match play hole.
 *
 * Compares net scores between player and opponent to determine
 * who won the hole.
 *
 * @param playerScore - Player's net score on the hole
 * @param opponentScore - Opponent's net score on the hole
 * @param holeNumber - The hole number (1-18)
 * @returns Hole result with scores and outcome
 *
 * @example
 * ```typescript
 * const result = calculateMatchPlayHoleResult(4, 5, 1);
 * // result = { holeNumber: 1, playerScore: 4, opponentScore: 5, result: 'won' }
 *
 * const tied = calculateMatchPlayHoleResult(4, 4, 2);
 * // tied = { holeNumber: 2, playerScore: 4, opponentScore: 4, result: 'halved' }
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('calculateMatchPlayHoleResult', () => {
 *   it('returns won when player score is lower', () => {
 *     const result = calculateMatchPlayHoleResult(3, 5, 1);
 *
 *     expect(result.result).toBe('won');
 *     expect(result.playerScore).toBe(3);
 *     expect(result.opponentScore).toBe(5);
 *   });
 *
 *   it('returns lost when opponent score is lower', () => {
 *     const result = calculateMatchPlayHoleResult(6, 4, 5);
 *
 *     expect(result.result).toBe('lost');
 *   });
 *
 *   it('returns halved when scores are equal', () => {
 *     const result = calculateMatchPlayHoleResult(4, 4, 10);
 *
 *     expect(result.result).toBe('halved');
 *     expect(result.holeNumber).toBe(10);
 *   });
 * });
 * ```
 */
export function calculateMatchPlayHoleResult(
  playerScore: number,
  opponentScore: number,
  holeNumber: number
): MatchPlayHoleResult {
  let result: 'won' | 'lost' | 'halved';

  if (playerScore < opponentScore) {
    result = 'won';
  } else if (playerScore > opponentScore) {
    result = 'lost';
  } else {
    result = 'halved';
  }

  return {
    holeNumber,
    playerScore,
    opponentScore,
    result,
  };
}

/**
 * Calculate the overall match play match result from all hole results.
 *
 * Tracks holes won/lost/halved and determines match status including
 * early finish detection (when a player is more holes up than remaining).
 *
 * Match status:
 * - `in_progress`: Match is still active
 * - `player_wins`: Player has won the match
 * - `opponent_wins`: Opponent has won the match
 * - `all_square`: Match is tied after all holes
 * - `dormie_player`: Player is up by exactly the number of holes remaining
 * - `dormie_opponent`: Opponent is up by exactly the number of holes remaining
 *
 * @param holeResults - Array of completed hole results
 * @param totalHoles - Total holes in the match (default 18)
 * @returns Complete match result with status and final result string
 *
 * @example
 * ```typescript
 * const holeResults: MatchPlayHoleResult[] = [
 *   { holeNumber: 1, playerScore: 4, opponentScore: 5, result: 'won' },
 *   { holeNumber: 2, playerScore: 5, opponentScore: 4, result: 'lost' },
 *   { holeNumber: 3, playerScore: 4, opponentScore: 4, result: 'halved' },
 * ];
 *
 * const match = calculateMatchPlayMatchResult(holeResults);
 * // match.holesWon = 1
 * // match.holesLost = 1
 * // match.holesHalved = 1
 * // match.currentScore = 0 (all square)
 * // match.matchResult = 'in_progress'
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('calculateMatchPlayMatchResult', () => {
 *   it('calculates match in progress correctly', () => {
 *     const holes: MatchPlayHoleResult[] = [
 *       { holeNumber: 1, playerScore: 4, opponentScore: 5, result: 'won' },
 *       { holeNumber: 2, playerScore: 5, opponentScore: 5, result: 'halved' },
 *     ];
 *
 *     const result = calculateMatchPlayMatchResult(holes);
 *
 *     expect(result.holesWon).toBe(1);
 *     expect(result.holesHalved).toBe(1);
 *     expect(result.currentScore).toBe(1);
 *     expect(result.matchResult).toBe('in_progress');
 *   });
 *
 *   it('detects player win by 3&2', () => {
 *     // Player is 3 up with 2 to play - match over
 *     const holes: MatchPlayHoleResult[] = Array(16).fill(null).map((_, i) => ({
 *       holeNumber: i + 1,
 *       playerScore: i < 3 ? 4 : 5,
 *       opponentScore: i < 3 ? 5 : 5,
 *       result: i < 3 ? 'won' as const : 'halved' as const,
 *     }));
 *
 *     const result = calculateMatchPlayMatchResult(holes);
 *
 *     expect(result.matchResult).toBe('player_wins');
 *     expect(result.finalResult).toBe('3&2');
 *   });
 *
 *   it('detects dormie situation', () => {
 *     // Player is 2 up with 2 to play
 *     const holes: MatchPlayHoleResult[] = Array(16).fill(null).map((_, i) => ({
 *       holeNumber: i + 1,
 *       playerScore: i < 2 ? 4 : 5,
 *       opponentScore: i < 2 ? 5 : 5,
 *       result: i < 2 ? 'won' as const : 'halved' as const,
 *     }));
 *
 *     const result = calculateMatchPlayMatchResult(holes);
 *
 *     expect(result.matchResult).toBe('dormie_player');
 *   });
 *
 *   it('returns all_square after 18 holes when tied', () => {
 *     const holes: MatchPlayHoleResult[] = Array(18).fill(null).map((_, i) => ({
 *       holeNumber: i + 1,
 *       playerScore: 5,
 *       opponentScore: 5,
 *       result: 'halved' as const,
 *     }));
 *
 *     const result = calculateMatchPlayMatchResult(holes);
 *
 *     expect(result.matchResult).toBe('all_square');
 *     expect(result.finalResult).toBe('A/S');
 *   });
 * });
 * ```
 */
export function calculateMatchPlayMatchResult(
  holeResults: MatchPlayHoleResult[],
  totalHoles: number = 18
): MatchPlayMatchResult {
  const holesWon = holeResults.filter((h) => h.result === 'won').length;
  const holesLost = holeResults.filter((h) => h.result === 'lost').length;
  const holesHalved = holeResults.filter((h) => h.result === 'halved').length;
  const holesPlayed = holeResults.length;
  const holesRemaining = totalHoles - holesPlayed;

  // Positive = player ahead, negative = opponent ahead
  const currentScore = holesWon - holesLost;
  const absoluteScore = Math.abs(currentScore);

  let matchResult: MatchStatus;
  let finalResult: string | undefined;

  // Check if match is over (someone is more holes up than remaining)
  if (absoluteScore > holesRemaining) {
    if (currentScore > 0) {
      matchResult = 'player_wins';
      finalResult = `${absoluteScore}&${holesRemaining}`;
    } else {
      matchResult = 'opponent_wins';
      finalResult = `${absoluteScore}&${holesRemaining}`;
    }
  } else if (holesRemaining === 0) {
    // All holes played
    if (currentScore > 0) {
      matchResult = 'player_wins';
      finalResult = `${absoluteScore} UP`;
    } else if (currentScore < 0) {
      matchResult = 'opponent_wins';
      finalResult = `${absoluteScore} UP`;
    } else {
      matchResult = 'all_square';
      finalResult = 'A/S';
    }
  } else if (absoluteScore === holesRemaining && absoluteScore > 0) {
    // Dormie situation - lead equals holes remaining
    matchResult = currentScore > 0 ? 'dormie_player' : 'dormie_opponent';
  } else {
    matchResult = 'in_progress';
  }

  return {
    holesWon,
    holesLost,
    holesHalved,
    holesPlayed,
    holesRemaining,
    currentScore,
    matchResult,
    finalResult,
  };
}

/**
 * Calculate match play hole result using gross scores and handicaps.
 *
 * Convenience function that calculates net scores before comparing.
 *
 * @param playerGross - Player's gross score
 * @param playerHandicap - Player's handicap
 * @param opponentGross - Opponent's gross score
 * @param opponentHandicap - Opponent's handicap
 * @param hole - The hole being scored
 * @returns Hole result with net scores and outcome
 *
 * @example
 * ```typescript
 * const hole: Hole = { number: 1, par: 4, strokeIndex: 1, yardages: {} };
 *
 * // Player: gross 5, handicap 18 → net 4
 * // Opponent: gross 4, handicap 0 → net 4
 * const result = calculateMatchPlayHoleResultWithHandicaps(5, 18, 4, 0, hole);
 * // result.result = 'halved' (both net 4)
 * ```
 */
export function calculateMatchPlayHoleResultWithHandicaps(
  playerGross: number,
  playerHandicap: number,
  opponentGross: number,
  opponentHandicap: number,
  hole: Hole
): MatchPlayHoleResult {
  const playerNet = calculateNetScore(playerGross, playerHandicap, hole);
  const opponentNet = calculateNetScore(opponentGross, opponentHandicap, hole);

  return calculateMatchPlayHoleResult(playerNet, opponentNet, hole.number);
}

/**
 * Format match play score for display.
 *
 * @param currentScore - Current score differential (positive = player ahead)
 * @returns Formatted string like "2 UP", "3 DN", or "A/S"
 *
 * @example
 * ```typescript
 * formatMatchPlayScore(2);   // "2 UP"
 * formatMatchPlayScore(-1);  // "1 DN"
 * formatMatchPlayScore(0);   // "A/S"
 * ```
 */
export function formatMatchPlayScore(currentScore: number): string {
  if (currentScore === 0) return 'A/S';
  if (currentScore > 0) return `${currentScore} UP`;
  return `${Math.abs(currentScore)} DN`;
}

// Note: getStrokesOnHole is available from ./scoring - import it directly from there if needed
