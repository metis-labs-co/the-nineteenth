/**
 * Wolf Rotation Functions
 *
 * Functions for determining which player is Wolf on each hole.
 * Wolf rotates through the wolf_order array based on hole number.
 */

import { HOLES_PER_ROUND } from '@/constants/scoring';

/**
 * Determine which player is Wolf for a given hole.
 * Wolf rotates through the wolf_order array based on hole number.
 *
 * @param wolfOrder - Array of player IDs in rotation order
 * @param holeNumber - The hole number (1-18)
 * @returns Player ID who is Wolf for this hole
 *
 * @example
 * // 4 players: A, B, C, D
 * // Hole 1 = A, Hole 2 = B, Hole 3 = C, Hole 4 = D
 * // Hole 5 = A, Hole 6 = B, etc.
 * determineWolfForHole(['A', 'B', 'C', 'D'], 1) // 'A'
 * determineWolfForHole(['A', 'B', 'C', 'D'], 5) // 'A'
 *
 * @example
 * // 3 players: A, B, C
 * // Hole 1 = A, Hole 2 = B, Hole 3 = C
 * // Hole 4 = A, Hole 5 = B, Hole 6 = C, etc.
 * determineWolfForHole(['A', 'B', 'C'], 4) // 'A'
 */
export function determineWolfForHole(
  wolfOrder: string[],
  holeNumber: number
): string {
  if (wolfOrder.length === 0) {
    throw new Error('Wolf order cannot be empty');
  }
  // Use 0-indexed calculation: (holeNumber - 1) % playerCount
  const index = (holeNumber - 1) % wolfOrder.length;
  return wolfOrder[index];
}

/**
 * Get the Wolf player for each hole in a round.
 *
 * @param wolfOrder - Array of player IDs in rotation order
 * @param totalHoles - Number of holes in the round (default 18)
 * @param startHole - First hole number (default 1)
 * @returns Map of hole number to Wolf player ID
 */
export function getWolfRotationForRound(
  wolfOrder: string[],
  totalHoles: number = HOLES_PER_ROUND,
  startHole: number = 1,
): Map<number, string> {
  const rotation = new Map<number, string>();
  const playerCount = wolfOrder.length;
  if (playerCount === 0) return rotation;
  for (let i = 0; i < totalHoles; i++) {
    const hole = startHole + i;
    rotation.set(hole, wolfOrder[i % playerCount]);
  }
  return rotation;
}
