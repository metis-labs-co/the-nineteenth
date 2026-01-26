import type { Hole } from '@/types';
import { calculateNetScore } from './scoring';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Best Ball / Four Ball Functions
// ============================================================================

/**
 * Calculate the best ball (four ball) result for a single hole.
 *
 * In best ball format, each team member plays their own ball and the team
 * takes the best (lowest) net score among all team members for each hole.
 *
 * @param teamScores - Array of team member scores with their handicaps
 * @param hole - The hole being scored (includes par and stroke index)
 * @returns Best net score and the contributing player's ID
 *
 * @example
 * ```typescript
 * const teamScores: TeamMemberScore[] = [
 *   { playerId: 'player1', grossScore: 5, handicap: 18 },
 *   { playerId: 'player2', grossScore: 4, handicap: 10 },
 * ];
 * const hole: Hole = { number: 1, par: 4, strokeIndex: 5, yardages: {} };
 *
 * const result = calculateBestBallHole(teamScores, hole);
 * // result.bestNetScore = 4 (player2's net score: 4 - 0 strokes on SI 5)
 * // result.contributingPlayerId = 'player2'
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('calculateBestBallHole', () => {
 *   it('returns best net score among team members', () => {
 *     const teamScores: TeamMemberScore[] = [
 *       { playerId: 'p1', grossScore: 6, handicap: 20 }, // gets 2 strokes, net = 4
 *       { playerId: 'p2', grossScore: 5, handicap: 8 },  // gets 0 strokes, net = 5
 *     ];
 *     const hole: Hole = { number: 1, par: 4, strokeIndex: 2, yardages: {} };
 *
 *     const result = calculateBestBallHole(teamScores, hole);
 *
 *     expect(result.bestNetScore).toBe(4);
 *     expect(result.contributingPlayerId).toBe('p1');
 *   });
 *
 *   it('handles ties by returning first player', () => {
 *     const teamScores: TeamMemberScore[] = [
 *       { playerId: 'p1', grossScore: 4, handicap: 0 },
 *       { playerId: 'p2', grossScore: 4, handicap: 0 },
 *     ];
 *     const hole: Hole = { number: 1, par: 4, strokeIndex: 1, yardages: {} };
 *
 *     const result = calculateBestBallHole(teamScores, hole);
 *
 *     expect(result.bestNetScore).toBe(4);
 *     expect(result.contributingPlayerId).toBe('p1');
 *   });
 * });
 * ```
 */
export function calculateBestBallHole(
  teamScores: TeamMemberScore[],
  hole: Hole
): BestBallHoleResult {
  if (teamScores.length === 0) {
    throw new Error('Team must have at least one player');
  }

  const netScores = teamScores.map((member) => ({
    playerId: member.playerId,
    netScore: calculateNetScore(member.grossScore, member.handicap, hole),
  }));

  // Sort by net score (ascending) to find best
  const sorted = [...netScores].sort((a, b) => a.netScore - b.netScore);
  const best = sorted[0];

  return {
    bestNetScore: best.netScore,
    contributingPlayerId: best.playerId,
    allNetScores: netScores,
  };
}

// ============================================================================
// Scramble / Ambrose Functions
// ============================================================================

/**
 * Calculate the scramble result for a single hole.
 *
 * In scramble format, the team plays one ball and selects the best shot
 * each time. The team handicap is applied to the single team score.
 *
 * @param teamScore - The team's gross score on the hole
 * @param teamHandicap - The calculated team handicap
 * @param hole - The hole being scored (includes par and stroke index)
 * @returns The team's net score for the hole
 *
 * @example
 * ```typescript
 * const hole: Hole = { number: 1, par: 4, strokeIndex: 3, yardages: {} };
 *
 * // Team with handicap 12 scores 5 on stroke index 3 hole
 * // Strokes received: floor(12/18) + (3 <= 12%18 ? 1 : 0) = 0 + 1 = 1
 * const netScore = calculateScrambleHole(5, 12, hole);
 * // netScore = 5 - 1 = 4
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('calculateScrambleHole', () => {
 *   it('applies team handicap to team score', () => {
 *     const hole: Hole = { number: 1, par: 4, strokeIndex: 1, yardages: {} };
 *
 *     const netScore = calculateScrambleHole(5, 18, hole);
 *
 *     // Handicap 18 gets 1 stroke on every hole
 *     expect(netScore).toBe(4);
 *   });
 *
 *   it('handles high team handicap correctly', () => {
 *     const hole: Hole = { number: 1, par: 4, strokeIndex: 1, yardages: {} };
 *
 *     const netScore = calculateScrambleHole(6, 36, hole);
 *
 *     // Handicap 36 gets 2 strokes on every hole
 *     expect(netScore).toBe(4);
 *   });
 * });
 * ```
 */
export function calculateScrambleHole(
  teamScore: number,
  teamHandicap: number,
  hole: Hole
): number {
  return calculateNetScore(teamScore, teamHandicap, hole);
}

// ============================================================================
// Team Handicap Calculation
// ============================================================================

/**
 * Team member data for handicap calculation
 */
export interface TeamMember {
  playerId: string;
  handicap: number;
}

/**
 * Calculate the team handicap based on team members' individual handicaps.
 *
 * For 2-person teams: 35% of low handicap + 15% of high handicap
 * For 3-4 person teams: Average of all handicaps / team size factor
 *
 * This formula encourages balanced teams while preventing sandbagging.
 *
 * @param teamMembers - Array of team members with their handicaps
 * @param teamSize - Optional override for team size (defaults to teamMembers.length)
 * @returns The calculated team handicap (rounded to nearest integer)
 *
 * @example
 * ```typescript
 * // 2-person team
 * const team2 = [
 *   { playerId: 'p1', handicap: 10 },
 *   { playerId: 'p2', handicap: 20 },
 * ];
 * const handicap2 = calculateTeamHandicap(team2);
 * // = (10 * 0.35) + (20 * 0.15) = 3.5 + 3 = 6.5 → 7
 *
 * // 4-person team
 * const team4 = [
 *   { playerId: 'p1', handicap: 5 },
 *   { playerId: 'p2', handicap: 10 },
 *   { playerId: 'p3', handicap: 15 },
 *   { playerId: 'p4', handicap: 20 },
 * ];
 * const handicap4 = calculateTeamHandicap(team4);
 * // = (5 + 10 + 15 + 20) / 4 / 4 = 50 / 4 / 4 = 3.125 → 3
 * ```
 *
 * @example Unit test
 * ```typescript
 * describe('calculateTeamHandicap', () => {
 *   it('calculates 2-person team handicap correctly', () => {
 *     const team = [
 *       { playerId: 'p1', handicap: 10 },
 *       { playerId: 'p2', handicap: 20 },
 *     ];
 *
 *     const result = calculateTeamHandicap(team);
 *
 *     // 35% of 10 + 15% of 20 = 3.5 + 3 = 6.5 → 7
 *     expect(result).toBe(7);
 *   });
 *
 *   it('calculates 4-person team handicap correctly', () => {
 *     const team = [
 *       { playerId: 'p1', handicap: 8 },
 *       { playerId: 'p2', handicap: 12 },
 *       { playerId: 'p3', handicap: 16 },
 *       { playerId: 'p4', handicap: 20 },
 *     ];
 *
 *     const result = calculateTeamHandicap(team);
 *
 *     // Average = 14, divided by 4 = 3.5 → 4
 *     expect(result).toBe(4);
 *   });
 *
 *   it('handles single player team', () => {
 *     const team = [{ playerId: 'p1', handicap: 15 }];
 *
 *     const result = calculateTeamHandicap(team);
 *
 *     expect(result).toBe(15);
 *   });
 * });
 * ```
 */
export function calculateTeamHandicap(
  teamMembers: TeamMember[],
  teamSize?: number
): number {
  if (teamMembers.length === 0) {
    throw new Error('Team must have at least one member');
  }

  const size = teamSize ?? teamMembers.length;

  // Single player - use their full handicap
  if (size === 1) {
    return Math.round(teamMembers[0].handicap);
  }

  // Sort handicaps to find low and high
  const sortedHandicaps = teamMembers
    .map((m) => m.handicap)
    .sort((a, b) => a - b);

  // 2-person teams: 35% low + 15% high
  if (size === 2) {
    const lowHandicap = sortedHandicaps[0];
    const highHandicap = sortedHandicaps[sortedHandicaps.length - 1];
    return Math.round(lowHandicap * 0.35 + highHandicap * 0.15);
  }

  // 3-4 person teams: average / team size
  const totalHandicap = sortedHandicaps.reduce((sum, h) => sum + h, 0);
  const average = totalHandicap / sortedHandicaps.length;
  return Math.round(average / size);
}

// ============================================================================
// Match Play Functions
// ============================================================================

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

// ============================================================================
// Helper Functions
// ============================================================================

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
