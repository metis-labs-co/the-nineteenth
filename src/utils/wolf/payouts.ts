/**
 * Wolf Payout Calculation Functions
 *
 * Functions for calculating per-point payouts and creating
 * payout records for database storage.
 */

import type { WolfPayout } from '@/types/database/wolf.types';
import { roundCurrency } from '../currency';

/**
 * Calculate Wolf payouts for all players when pot is enabled.
 *
 * In Wolf with a per-point pot:
 * - Each point is worth the pot_value amount
 * - Total winnings = points * pot_value
 * - Net result = difference from average (zero-sum game)
 *
 * The net result calculation ensures it's a zero-sum game:
 * - Sum of all net_results = 0
 * - Players with more points than average are positive
 * - Players with fewer points than average are negative
 *
 * @param standings - Map of player ID to total points
 * @param potValue - Dollar value per point (null if no pot)
 * @returns Map of player ID to payout info
 *
 * @example
 * // 3 players, $1 per point
 * // p1: 10 pts, p2: 6 pts, p3: 2 pts (total: 18 pts, avg: 6 pts)
 * calculateWolfPayouts({ p1: 10, p2: 6, p3: 2 }, 1)
 * // {
 * //   p1: { winnings: 10, netResult: 4 },   // 10 - 6 = +4
 * //   p2: { winnings: 6, netResult: 0 },    // 6 - 6 = 0
 * //   p3: { winnings: 2, netResult: -4 },   // 2 - 6 = -4
 * // }
 */
export function calculateWolfPayouts(
  standings: Record<string, number>,
  potValue: number | null
): Record<string, { winnings: number; netResult: number }> {
  const payouts: Record<string, { winnings: number; netResult: number }> = {};

  // If no pot, all values are 0
  if (!potValue || potValue <= 0) {
    for (const playerId of Object.keys(standings)) {
      payouts[playerId] = { winnings: 0, netResult: 0 };
    }
    return payouts;
  }

  const playerIds = Object.keys(standings);
  const totalPoints = Object.values(standings).reduce((sum, pts) => sum + pts, 0);
  const averagePoints = totalPoints / playerIds.length;

  for (const playerId of playerIds) {
    const points = standings[playerId];
    const winnings = roundCurrency(points * potValue);
    // Net result is how much above/below average (makes it zero-sum)
    const netResult = roundCurrency((points - averagePoints) * potValue);

    payouts[playerId] = { winnings, netResult };
  }

  return payouts;
}

/**
 * Create full payout records for database storage.
 *
 * @param standings - Map of player ID to total points
 * @param potValue - Dollar value per point (null if no pot)
 * @returns Array of payout records (without IDs)
 */
export function createPayoutRecords(
  standings: Record<string, number>,
  potValue: number | null
): Omit<WolfPayout, 'id' | 'wolf_game_id' | 'calculated_at'>[] {
  const payoutCalcs = calculateWolfPayouts(standings, potValue);

  return Object.entries(standings).map(([playerId, totalPoints]) => ({
    player_id: playerId,
    total_points: totalPoints,
    total_winnings: payoutCalcs[playerId].winnings,
    net_result: payoutCalcs[playerId].netResult,
  }));
}
