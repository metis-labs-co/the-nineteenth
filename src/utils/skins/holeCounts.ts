/**
 * Skins hole counts
 *
 * A skins game prices each hole on the round's PLANNED hole count (18, or 9
 * for a front/back nine) and settles over the holes actually PLAYED. When a
 * round ends early the pot shrinks in proportion to the holes played, so an
 * individual game's settlement stays zero-sum within cent rounding (I11).
 *
 * Pure: the round-row read lives in services/skins/roundHoleCounts.ts.
 */

import type { NineType } from '@/types/database/enums';
import { getHoleCount, HOLES_PER_ROUND } from '@/constants/scoring';

export interface SkinsHoleCounts {
  /** Holes the round was set up for (18 or 9) — prices each hole. */
  plannedHoles: number;
  /** Holes actually played (1..plannedHoles) — sizes the settled pot. */
  holesPlayed: number;
}

/** A full 18 played as planned — the pricing every caller used before hole counts existed. */
export const DEFAULT_SKINS_HOLE_COUNTS: SkinsHoleCounts = {
  plannedHoles: HOLES_PER_ROUND,
  holesPlayed: HOLES_PER_ROUND,
};

/**
 * Hole counts for a round row: planned = getHoleCount(nine_type ?? 'full');
 * played = holes_played when it is a count in 1..planned, else planned.
 */
export function getSkinsHoleCounts(
  round: { nine_type?: NineType | null; holes_played?: number | null } | null | undefined
): SkinsHoleCounts {
  const plannedHoles = getHoleCount(round?.nine_type ?? 'full');
  const played = round?.holes_played;
  const holesPlayed =
    played != null && played > 0 && played <= plannedHoles ? played : plannedHoles;
  return { plannedHoles, holesPlayed };
}
