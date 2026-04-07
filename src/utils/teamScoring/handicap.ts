/**
 * Team Handicap Calculation
 *
 * Calculates combined team handicaps from individual player handicaps.
 */

import type { TeamMember } from './types';

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
