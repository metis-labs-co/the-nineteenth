/**
 * Handicap Utilities
 *
 * Functions for calculating handicap-related adjustments.
 */

import type { Hole } from '../types';
import type { GameType } from '@/types/database';
import { getStrokesReceived } from '@/utils/scoring';

/**
 * Calculate the number of strokes a player receives on a specific hole
 * based on their playing handicap and the hole's stroke index.
 *
 * @deprecated Use getStrokesReceived from '@/utils/scoring' directly.
 * This is kept as an alias for backward compatibility.
 *
 * @param playingHandicap - Player's adjusted handicap for the round
 * @param strokeIndex - The hole's stroke index (1-18, lower = harder)
 * @returns Number of strokes received (0, 1, or 2+)
 */
export const calculateStrokesForHole = getStrokesReceived;

/**
 * Get the playing handicap adjusted for the course and game type.
 *
 * Course Handicap = Handicap Index × (Slope Rating ÷ 113)
 * Playing Handicap = Course Handicap + (Course Rating - Par)
 *
 * @param handicapIndex - Player's handicap index
 * @param slopeRating - Course slope rating (55-155, default 113)
 * @param courseRating - Course rating
 * @param par - Course par
 * @param gameType - The game type (may affect handicap allowance)
 * @returns Adjusted playing handicap (rounded to nearest integer)
 */
export function getPlayingHandicap(
  handicapIndex: number,
  slopeRating = 113,
  courseRating?: number,
  par?: number,
  gameType?: GameType
): number {
  // Calculate course handicap
  const courseHandicap = Math.round((handicapIndex * slopeRating) / 113);

  // If we have course rating and par, adjust for course difficulty
  let playingHandicap = courseHandicap;
  if (courseRating !== undefined && par !== undefined) {
    playingHandicap = courseHandicap + Math.round(courseRating - par);
  }

  // Apply game type allowance
  const allowance = getHandicapAllowance(gameType);
  return Math.round(playingHandicap * allowance);
}

/**
 * Get the handicap allowance percentage for a game type.
 *
 * Different formats use different percentages of handicap:
 * - Individual stroke play: 95%
 * - Individual Stableford: 95%
 * - Match play: 100%
 * - Best ball: 85%
 * - Ambrose: varies (handled separately)
 *
 * @param gameType - The game type
 * @returns Allowance as a decimal (e.g., 0.95 for 95%)
 */
export function getHandicapAllowance(gameType?: GameType): number {
  switch (gameType) {
    case 'match-play':
      return 1.0; // 100%
    case 'best-ball':
      return 0.85; // 85%
    case 'ambrose':
      return 1.0; // Team handicap calculated differently
    case 'stableford':
    case 'stroke':
    default:
      return 0.95; // 95%
  }
}

/**
 * Calculate strokes received for all holes based on handicap.
 *
 * @param playingHandicap - Player's playing handicap
 * @param holes - Array of course holes with stroke indexes
 * @returns Map of hole number to strokes received
 */
export function getStrokesReceivedPerHole(
  playingHandicap: number,
  holes: Hole[]
): Map<number, number> {
  const strokesMap = new Map<number, number>();

  for (const hole of holes) {
    const strokes = calculateStrokesForHole(playingHandicap, hole.strokeIndex);
    strokesMap.set(hole.number, strokes);
  }

  return strokesMap;
}

/**
 * Calculate team handicap for Ambrose format.
 *
 * Ambrose handicap is typically a fraction of the combined team handicaps.
 * Common formulas:
 * - 2-person: (H1 + H2) / 4
 * - 3-person: (H1 + H2 + H3) / 6
 * - 4-person: (H1 + H2 + H3 + H4) / 8
 *
 * @param teamHandicaps - Array of team member handicaps
 * @returns Team handicap for Ambrose
 */
export function calculateAmbroseHandicap(teamHandicaps: number[]): number {
  if (teamHandicaps.length === 0) return 0;

  const totalHandicap = teamHandicaps.reduce((sum, h) => sum + h, 0);
  const divisor = teamHandicaps.length * 2;

  return Math.round(totalHandicap / divisor);
}
