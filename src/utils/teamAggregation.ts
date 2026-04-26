/**
 * Team Aggregation Engine
 *
 * Operates on per-player round totals (e.g. total Stableford points,
 * total net strokes) and produces a single team score according to the
 * configured aggregation method.
 *
 * Used by the per-round rules engine during finalization when a round
 * has `rules_override.team_aggregation` set. For the existing per-hole
 * team formats (best-ball, scramble, shamble, match-play-team) see
 * src/utils/scoring.ts — those operate on per-hole shots, not totals.
 *
 * Direction convention:
 *   - higherIsBetter = true  → Stableford (more points = better)
 *   - higherIsBetter = false → Stroke / Par game (fewer strokes = better)
 */

import type {
  TeamAggregationMethod,
  TeamAggregationConfig,
} from '@/types/database/roundRules.types';

export interface PlayerTotal {
  playerId: string;
  /** Total for the round. Stableford points, net strokes, etc. */
  total: number;
}

export interface AggregationResult {
  /** Computed team total. */
  teamTotal: number;
  /** Player IDs whose scores actually counted toward the team total. */
  contributorIds: string[];
  /** Player IDs whose scores were dropped (for best_n_of_m only). */
  droppedIds: string[];
}

/**
 * Sum the best N individual totals from a team of M.
 *
 * When the team has fewer than N members, all members contribute
 * (defensive — matches user intent of "use everyone we have").
 *
 * @example best 3 of 4 Stableford
 *   calculateBestNofM([30, 25, 28, 20], { n: 3, m: 4 }, true)
 *   → { teamTotal: 83, contributorIds: [p1, p3, p2], droppedIds: [p4] }
 */
export function calculateBestNofM(
  playerTotals: PlayerTotal[],
  config: TeamAggregationConfig,
  higherIsBetter: boolean
): AggregationResult {
  const n = Math.max(1, config.n ?? playerTotals.length);

  const sorted = [...playerTotals].sort((a, b) =>
    higherIsBetter ? b.total - a.total : a.total - b.total
  );

  const kept = sorted.slice(0, n);
  const dropped = sorted.slice(n);

  return {
    teamTotal: kept.reduce((acc, p) => acc + p.total, 0),
    contributorIds: kept.map((p) => p.playerId),
    droppedIds: dropped.map((p) => p.playerId),
  };
}

/** Sum every member's total. */
export function calculateSumAggregation(playerTotals: PlayerTotal[]): AggregationResult {
  return {
    teamTotal: playerTotals.reduce((acc, p) => acc + p.total, 0),
    contributorIds: playerTotals.map((p) => p.playerId),
    droppedIds: [],
  };
}

/**
 * Take the single best total from the team. Used as a round-total-level
 * fallback when a 'best_ball' override is applied but the round is scored
 * using per-hole best-ball already aggregated elsewhere. Rarely used in
 * isolation — most best-ball rounds go through the per-hole path.
 */
export function calculateBestBallAggregation(
  playerTotals: PlayerTotal[],
  higherIsBetter: boolean
): AggregationResult {
  if (playerTotals.length === 0) {
    return { teamTotal: 0, contributorIds: [], droppedIds: [] };
  }
  const sorted = [...playerTotals].sort((a, b) =>
    higherIsBetter ? b.total - a.total : a.total - b.total
  );
  const [winner, ...rest] = sorted;
  return {
    teamTotal: winner.total,
    contributorIds: [winner.playerId],
    droppedIds: rest.map((p) => p.playerId),
  };
}

/**
 * Scramble round-total aggregation.
 *
 * In a scramble, the team plays one ball — every member records the same
 * per-hole strokes, so every member's `total` is identical to the team's
 * total. We take the first member's total verbatim. Summing would multiply
 * the team's score by the number of members; `best_ball` / `best_n_of_m`
 * would also collapse to the same value but read oddly in context.
 *
 * All members are listed as contributors because the scramble is, by
 * definition, a team shot for every hole.
 */
export function calculateScrambleAggregation(
  playerTotals: PlayerTotal[]
): AggregationResult {
  if (playerTotals.length === 0) {
    return { teamTotal: 0, contributorIds: [], droppedIds: [] };
  }
  return {
    teamTotal: playerTotals[0].total,
    contributorIds: playerTotals.map((p) => p.playerId),
    droppedIds: [],
  };
}

/**
 * Dispatch aggregation by method. `pairs_better_ball` falls back to sum —
 * per-sub-match point allocation lives in `finalizePairResults` and doesn't
 * go through this helper.
 *
 * Unknown / unsupported methods fall back to sum.
 */
export function aggregateTeamTotal(
  method: TeamAggregationMethod,
  playerTotals: PlayerTotal[],
  config: TeamAggregationConfig | undefined,
  higherIsBetter: boolean
): AggregationResult {
  switch (method) {
    case 'best_n_of_m':
      return calculateBestNofM(playerTotals, config ?? {}, higherIsBetter);
    case 'best_ball':
      return calculateBestBallAggregation(playerTotals, higherIsBetter);
    case 'scramble':
      return calculateScrambleAggregation(playerTotals);
    case 'sum':
    case 'pairs_better_ball':
    default:
      return calculateSumAggregation(playerTotals);
  }
}
