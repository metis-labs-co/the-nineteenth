/**
 * Wolf Standings Functions
 *
 * Functions for calculating player standings and leaderboard
 * rankings across all completed holes in a Wolf game.
 */

import type {
  WolfHoleDecision,
  WolfStandingEntry,
} from '@/types/database/wolf.types';

/**
 * Calculate total points per player across all completed holes.
 *
 * @param decisions - Array of Wolf hole decisions with points_awarded
 * @param participantIds - All player IDs in the game
 * @returns Map of player ID to total points
 *
 * @example
 * calculateWolfStandings([
 *   { points_awarded: { p1: 4, p2: 0, p3: 0 } },
 *   { points_awarded: { p1: 0, p2: 2, p3: 2 } },
 * ], ['p1', 'p2', 'p3'])
 * // { p1: 4, p2: 2, p3: 2 }
 */
export function calculateWolfStandings(
  decisions: Pick<WolfHoleDecision, 'points_awarded'>[],
  participantIds: string[]
): Record<string, number> {
  const standings: Record<string, number> = {};

  // Initialize all players with 0 points
  for (const playerId of participantIds) {
    standings[playerId] = 0;
  }

  // Sum up points from all decisions
  for (const decision of decisions) {
    if (decision.points_awarded) {
      for (const [playerId, points] of Object.entries(decision.points_awarded)) {
        if (standings[playerId] !== undefined) {
          standings[playerId] += points;
        }
      }
    }
  }

  return standings;
}

/**
 * Convert standings record to sorted array of standing entries.
 *
 * @param standings - Map of player ID to total points
 * @param playerNames - Map of player ID to name
 * @returns Sorted array of standing entries (highest points first)
 */
export function getSortedStandings(
  standings: Record<string, number>,
  playerNames: Record<string, string>
): WolfStandingEntry[] {
  const entries: WolfStandingEntry[] = Object.entries(standings)
    .map(([playerId, totalPoints]) => ({
      player_id: playerId,
      name: playerNames[playerId] || 'Unknown',
      total_points: totalPoints,
      rank: 0, // Will be set after sorting
    }))
    .sort((a, b) => b.total_points - a.total_points); // Highest points first

  // Assign ranks (handle ties)
  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].total_points < entries[i - 1].total_points) {
      currentRank = i + 1;
    }
    entries[i].rank = currentRank;
  }

  return entries;
}
