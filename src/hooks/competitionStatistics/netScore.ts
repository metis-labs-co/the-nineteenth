/**
 * Competition Statistics — Net Score Helpers
 *
 * Computes handicap-adjusted (net) per-hole stats for the Scoring category
 * group's Net mode.
 *
 * V1 simplification: uses the player's profile handicap. Does NOT apply
 * competition/round-level overrides or tee-specific playing-handicap
 * calculations. This matches the approach in
 * `src/hooks/playerStatistics/queries.ts` for determining score categories.
 * A follow-up can plumb through round.handicap_source if the need arises.
 */

import { getStrokesOnHole } from '@/utils/scoring';
import type { Hole } from '@/types';

/**
 * Per-hole net strokes for a player, given their handicap and the hole's
 * stroke index. Returns 0 when the player's handicap is 0 or less.
 */
export function netStrokesForHole(
  grossStrokes: number,
  playerHandicap: number,
  hole: Hole
): number {
  const strokesReceived = getStrokesOnHole(playerHandicap, hole);
  return grossStrokes - strokesReceived;
}

/**
 * Classify a hole's net score relative to par.
 * Returns a bucket usable by the scoring categories.
 */
export type ScoreBucket = 'eagleOrBetter' | 'birdie' | 'par' | 'bogey' | 'doublePlus';

export function bucketForNetScore(netStrokes: number, par: number): ScoreBucket {
  const diff = netStrokes - par;
  if (diff <= -2) return 'eagleOrBetter';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  return 'doublePlus';
}
