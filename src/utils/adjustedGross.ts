/**
 * WHS Adjusted Gross Score
 *
 * A Score Differential must be calculated from the player's ADJUSTED gross
 * score, where every hole is capped at net double bogey (par + 2 + strokes
 * received). The app previously passed raw total gross into
 * {@link calculateScoreDifferential}, which inflates the differential — and
 * therefore the handicap index — whenever a player records worse than net
 * double bogey on a hole they holed out on.
 *
 * This module also owns the flag-aware pickup resolver. A pickup used to be
 * expressed only as `strokes >= PICKUP_SCORE`, which is ambiguous with a real
 * score of 10; {@link isHolePickedUp} prefers the explicit `pickedUp` flag and
 * falls back to the sentinel so legacy cards keep behaving exactly as before.
 *
 * @see docs/guides/SCORING_ARCHITECTURE.md
 * @see src/utils/handicapDifferential.ts
 */

import { PICKUP_SCORE } from '@/constants/scoring';
import { getStrokesReceived, NET_DOUBLE_BOGEY_OFFSET } from '@/utils/scoring';

// =====================================================
// TYPES
// =====================================================

/** The hole data needed to cap a hole at net double bogey. */
export interface AdjustedGrossHole {
  number: number;
  par: number;
  strokeIndex: number;
}

/** A hole result, accepting the app's `HoleScore` shape structurally. */
export interface AdjustedGrossHoleScore {
  strokes?: number | null;
  pickedUp?: boolean;
  didNotAttempt?: boolean;
}

export interface AdjustedGrossParams {
  /** Only the holes actually in play (9 for a 9-hole round). */
  holes: AdjustedGrossHole[];
  /** Scores keyed by hole number. A bare number is treated as gross strokes. */
  scores: Record<string, AdjustedGrossHoleScore | number | null | undefined>;
  /** The player's Daily Handicap for this round. */
  dailyHandicap: number;
}

export interface AdjustedGrossResult {
  /** Net-double-bogey-capped total — the value to use for a differential. */
  adjustedGross: number;
  /** Uncapped total, for display and comparison. */
  rawGross: number;
  /** How many holes carried a countable result. */
  holesCounted: number;
  /** False when any hole is flagged didNotAttempt. */
  allHolesAttempted: boolean;
}

// =====================================================
// FUNCTIONS
// =====================================================

/** Normalise the several score shapes a scorecard may hold. */
function readHoleScore(
  raw: AdjustedGrossHoleScore | number | null | undefined
): AdjustedGrossHoleScore | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return { strokes: raw };
  return raw;
}

/**
 * Whether a hole was picked up.
 *
 * The explicit `pickedUp` flag wins when present. Otherwise falls back to the
 * legacy sentinel (`strokes >= PICKUP_SCORE`), so cards written before the flag
 * existed still resolve correctly. A did-not-attempt hole is never a pickup —
 * the player never started it.
 */
export function isHolePickedUp(
  raw: AdjustedGrossHoleScore | number | null | undefined
): boolean {
  const score = readHoleScore(raw);
  if (!score) return false;
  if (score.didNotAttempt) return false;
  if (typeof score.pickedUp === 'boolean') return score.pickedUp;
  return (score.strokes ?? 0) >= PICKUP_SCORE;
}

/**
 * Cap a hole's gross strokes at net double bogey (par + 2 + strokes received).
 * Scores at or below the cap are returned unchanged.
 */
export function capAtNetDoubleBogey(
  strokes: number,
  par: number,
  strokesReceived: number
): number {
  return Math.min(strokes, par + NET_DOUBLE_BOGEY_OFFSET + strokesReceived);
}

/**
 * Calculate the WHS Adjusted Gross Score for a round.
 *
 * Pass only the holes actually played and the Daily Handicap for those holes.
 * Holes flagged `didNotAttempt` are excluded entirely — under the 2024 rules GA
 * supplies a statistical Expected Score for them rather than a stroke total.
 */
export function calculateAdjustedGrossScore(
  params: AdjustedGrossParams
): AdjustedGrossResult {
  const { holes, scores, dailyHandicap } = params;

  let adjustedGross = 0;
  let rawGross = 0;
  let holesCounted = 0;
  let allHolesAttempted = true;

  for (const hole of holes) {
    const score = readHoleScore(scores[String(hole.number)]);
    if (!score) continue;

    if (score.didNotAttempt) {
      allHolesAttempted = false;
      continue;
    }

    const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
    const netDoubleBogey = hole.par + NET_DOUBLE_BOGEY_OFFSET + strokesReceived;

    if (isHolePickedUp(score)) {
      // Did not hole out — WHS records the Maximum Score for the hole.
      holesCounted += 1;
      adjustedGross += netDoubleBogey;
      rawGross += score.strokes ?? netDoubleBogey;
      continue;
    }

    if (!score.strokes || score.strokes <= 0) continue;

    holesCounted += 1;
    rawGross += score.strokes;
    adjustedGross += capAtNetDoubleBogey(
      score.strokes,
      hole.par,
      strokesReceived
    );
  }

  return { adjustedGross, rawGross, holesCounted, allHolesAttempted };
}
