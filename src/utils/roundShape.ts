/**
 * Round shape — the planned nine type plus how many holes were actually played.
 *
 * A social round can be ended early (see docs/superpowers/specs/
 * 2026-10-07-end-round-early-design.md, Revision 3). The end is recorded in
 * two places:
 * - the server: `rounds.holes_played`, written by the `end_round_early` RPC at
 *   confirm time (or by the queued 'end_early' sync item when offline);
 * - this device: `holes_played` on the round's local SQLite scorecard rows,
 *   written by the store's `endRoundEarly(n)`.
 *
 * `resolveRoundShape` merges the two so an offline end that hasn't reached the
 * server yet isn't "corrected" back by the server row. Ending is final: there
 * is no way back to `holesPlayed = null` once either side has a value.
 */

import type { NineType } from '@/types/database/enums';
import { getHoleCount, getHoleRange } from '@/constants/scoring';

export interface RoundShape {
  nineType: NineType;
  holesPlayed: number | null;
}

/**
 * A positive integer holes-played count, or null ("played as planned").
 * Same rule as filterPlayableHoles, so a value it ignores (0, -3, 2.5, NaN)
 * never reads as "ended early" here either.
 */
function positiveOrNull(value: number | null | undefined): number | null {
  return value != null && Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * - holesPlayed: the server's `holes_played` when set (the first end wins on
 *   the server, so a device that ended at a different N adopts it); otherwise
 *   the local value from the SQLite cards; otherwise null.
 * - nineType: server `nine_type` → local nine type → 'full'.
 * Non-positive or non-integer values on either side count as "not set".
 */
export function resolveRoundShape(
  server: { nine_type?: NineType | null; holes_played?: number | null } | null | undefined,
  local?: { nineType?: NineType | null; holesPlayed?: number | null } | null
): RoundShape {
  return {
    nineType: server?.nine_type ?? local?.nineType ?? 'full',
    holesPlayed: positiveOrNull(server?.holes_played) ?? positiveOrNull(local?.holesPlayed),
  };
}

/** The round's first hole number: 10 for a back 9, otherwise 1. */
export function firstHoleNumber(nineType: NineType): number {
  return getHoleRange(nineType).start;
}

/** The hole number the round ended on: firstHoleNumber + N − 1 (back9 + 6 ⇒ 15). */
export function lastPlayedHoleNumber(nineType: NineType, holesPlayed: number): number {
  return firstHoleNumber(nineType) + holesPlayed - 1;
}

/**
 * True when the round was ended early and `holeNumber` comes after its last
 * played hole. A hole BEFORE the round's first hole (hole 5 of a back 9) is
 * not "after the end": callers that must reject it check the planned hole
 * list as well (the store's closed-holes guard does).
 */
export function isHoleAfterEarlyEnd(
  nineType: NineType,
  holesPlayed: number | null | undefined,
  holeNumber: number
): boolean {
  const played = positiveOrNull(holesPlayed);
  if (played == null) return false;
  return holeNumber > lastPlayedHoleNumber(nineType, played);
}

/** True when the round row records an early end. */
export function isEndedEarly(round: { holes_played?: number | null } | null | undefined): boolean {
  return positiveOrNull(round?.holes_played) != null;
}

/** "Ended after 6 of 9" — M is the planned hole count for the nine type. */
export function formatEndedEarlyLabel(holesPlayed: number, nineType: NineType): string {
  return `Ended after ${holesPlayed} of ${getHoleCount(nineType)}`;
}
