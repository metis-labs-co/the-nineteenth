/**
 * Alternate-shot (foursomes) contribution derivation.
 *
 * In alt shot the player who tees the 1st hole tees all ODD holes; their
 * partner tees all EVEN holes. Within a hole the partners strictly alternate
 * every stroke until the ball is holed. So given who tees first and a hole's
 * stroke count, every shot's owner is fully determined — no manual entry needed.
 */

import { PICKUP_SCORE } from '@/constants/scoring';

export interface AltShotHoleBreakdown {
  drives: number;
  approaches: number;
  putts: number;
  total: number;
}

/** Which player tees off on a given hole. First-tee = odd holes, partner = even. */
export function altShotTeePlayer(
  firstTeePlayerId: string,
  partnerPlayerId: string,
  holeNumber: number,
): string {
  return holeNumber % 2 === 1 ? firstTeePlayerId : partnerPlayerId;
}

/**
 * Per-player shot counts for one alt-shot hole, by strict alternation.
 * - drives: stroke 1 (the tee shot)
 * - putts: the final holing stroke (only when strokes >= 2)
 * - approaches: the strokes in between
 * Returns all-zero counts when strokes is missing, <= 0, or a pickup.
 */
export function deriveAltShotShotCounts(
  firstTeePlayerId: string,
  partnerPlayerId: string,
  holeNumber: number,
  strokes: number | undefined,
  pickupScore: number = PICKUP_SCORE,
): Record<string, AltShotHoleBreakdown> {
  const result: Record<string, AltShotHoleBreakdown> = {
    [firstTeePlayerId]: { drives: 0, approaches: 0, putts: 0, total: 0 },
    [partnerPlayerId]: { drives: 0, approaches: 0, putts: 0, total: 0 },
  };

  if (!strokes || strokes <= 0 || strokes >= pickupScore) {
    return result;
  }

  const teePlayer = altShotTeePlayer(firstTeePlayerId, partnerPlayerId, holeNumber);
  const otherPlayer = teePlayer === firstTeePlayerId ? partnerPlayerId : firstTeePlayerId;

  for (let stroke = 1; stroke <= strokes; stroke++) {
    const owner = stroke % 2 === 1 ? teePlayer : otherPlayer;
    const bd = result[owner];
    bd.total += 1;
    if (stroke === 1) bd.drives += 1;
    else if (stroke === strokes) bd.putts += 1;
    else bd.approaches += 1;
  }

  return result;
}
