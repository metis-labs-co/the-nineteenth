/**
 * Team Score Calculations
 *
 * Best ball (four ball) and scramble (Ambrose) scoring functions.
 */

import type { Hole } from '@/types';
import { calculateNetScore } from '../scoring';
import type { TeamMemberScore, BestBallHoleResult } from './types';

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
