/**
 * GA CONNECT "Handicapping Score"
 *
 * Golf Australia CONNECT requires a Stableford total (`stablefordScore`) on
 * EVERY score submission regardless of the format actually played — stroke,
 * Par, Maximum Score or Stableford (GA CONNECT Business Requirements
 * Specifications §4H). GA derives the player's Gross Differential from it, so
 * it is the single most important number we would send.
 *
 * The BRS rules encoded here:
 *
 * - The total is computed from hole-by-hole gross scores, using the player's
 *   `courseHandicap` (which GA defines as the Daily Handicap — BRS §1) to work
 *   out strokes received.
 * - Holes flagged `didNotAttempt` score **zero**: "GA-Licenced Software
 *   Provider products must attribute a value of zero to any hole that is
 *   eligible to receive an Expected Score (i.e. a 'Did Not Attempt' hole)".
 *   GA substitutes its own statistical Expected Score server-side.
 * - Holes where the player picked up also score zero (a pickup is a net double
 *   bogey at best, which is 0 points).
 * - A hole with no gross value is treated as commenced-but-not-completed and
 *   scores zero (BRS §5B default treatment for app-submitted cards).
 * - For 9-hole rounds the total is the 9-hole points only, with no adjustment
 *   for holes 10-18. Callers pass only the holes actually in play.
 *
 * NOTE ON THE POINTS TABLE: this module deliberately does NOT reuse
 * `getStablefordPoints` / `calculateStablefordPoints` from `utils/scoring`.
 * Those drive the app's own displayed points and clamp at 5 and 4 points
 * respectively, whereas Rule 21.1 Stableford is unbounded upward (a net
 * 4-under is 6 points). GA needs the true value, so the primitive below is
 * kept separate. Nothing in the app's existing displayed totals is affected.
 *
 * @see docs/guides/SCORING_ARCHITECTURE.md
 */

import { getStrokesReceived } from '@/utils/scoring';

// =====================================================
// CONSTANTS
// =====================================================

/** Stableford points awarded for a net par — the anchor of the Rule 21.1 table. */
export const STABLEFORD_PAR_POINTS = 2;

/**
 * Offset used to convert an 18-hole Par-format result into a Stableford total.
 * BRS §4H: "any round played under the Par scoring format must be converted
 * into a Stableford score by adding 36 points to the player's final Par
 * result; e.g. a result of 4 down (i.e. -4) is converted to 32 points".
 *
 * 36 = 2 points per hole × 18 holes. See {@link parScoreToStableford} for the
 * nine-aware form and for why this conversion is lossy.
 */
export const PAR_GAME_STABLEFORD_OFFSET = 36;

// =====================================================
// TYPES
// =====================================================

/** The hole data needed to score a hole for handicapping. */
export interface HandicappingHole {
  number: number;
  par: number;
  strokeIndex: number;
}

/**
 * A single hole's result as stored on a scorecard. Accepts the app's
 * `HoleScore` shape structurally, so callers can pass scorecard scores
 * directly.
 */
export interface HandicappingHoleScore {
  strokes?: number | null;
  /** Player picked up without holing out — GA `pickedUp`. */
  pickedUp?: boolean;
  /** Hole never attempted — GA `didNotAttempt`, eligible for an Expected Score. */
  didNotAttempt?: boolean;
}

export interface HandicappingScoreParams {
  /** Only the holes actually in play (9 for a 9-hole round). */
  holes: HandicappingHole[];
  /** Scores keyed by hole number. A bare number is treated as gross strokes. */
  scores: Record<string, HandicappingHoleScore | number | null | undefined>;
  /** The player's Daily Handicap for this round (GA `courseHandicap`). */
  dailyHandicap: number;
}

export interface HandicappingScoreResult {
  /** The value to send as GA's `stablefordScore`. */
  stablefordScore: number;
  /** How many of the supplied holes carried a result of any kind. */
  holesCounted: number;
  /** GA `allHolesAttempted` — false when any hole is flagged didNotAttempt. */
  allHolesAttempted: boolean;
}

// =====================================================
// FUNCTIONS
// =====================================================

/**
 * Rules-of-Golf (Rule 21.1) Stableford points for a net score relative to par.
 *
 * Uncapped upward — net 3-under is 5 points, net 4-under is 6, and so on —
 * and floored at zero for net double bogey or worse.
 */
export function stablefordPointsForHole(netToPar: number): number {
  return Math.max(0, STABLEFORD_PAR_POINTS - netToPar);
}

/**
 * Convert a Par-format result (holes up/down, e.g. -4 for "4 down") into a
 * Stableford total, per BRS §4H.
 *
 * ⚠️ FALLBACK ONLY — PREFER {@link calculateHandicappingScore}.
 *
 * This conversion is inherently lossy, because a Par result records only
 * win/square/loss per hole (`calculateParScore` in `utils/scoring`) and so
 * discards the magnitude of good and bad holes:
 *
 * | net to par        | Par game | +2 ⇒ | true Stableford | drift |
 * |-------------------|----------|------|-----------------|-------|
 * | ≤ −3 (albatross)  | +1       | 3    | 5               | −2    |
 * | −2 (eagle)        | +1       | 3    | 4               | −1    |
 * | −1 / 0 / +1       | +1/0/−1  | 3/2/1| 3/2/1           | ✅     |
 * | ≥ +2 (double+)    | −1       | 1    | 0               | +1    |
 *
 * So it overstates by one point per net-double-or-worse hole and understates
 * on net eagles and better. GA accepts it because a Par competition genuinely
 * has no finer-grained result to send — but whenever hole-by-hole scores exist
 * (which is always, in this app) `calculateHandicappingScore` is both exact and
 * what BRS §4H actually asks for ("calculated from the hole-by-hole scores").
 *
 * @param parResult   holes up/down, e.g. -4 for "4 down"
 * @param holesPlayed number of holes the Par result covers — 9-hole rounds must
 *                    pass 9 so the offset is 18, not 36 (see invariant I4)
 */
export function parScoreToStableford(parResult: number, holesPlayed = 18): number {
  return parResult + STABLEFORD_PAR_POINTS * holesPlayed;
}

/** Normalise the several score shapes a scorecard may hold. */
function readHoleScore(
  raw: HandicappingHoleScore | number | null | undefined
): HandicappingHoleScore | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return { strokes: raw };
  return raw;
}

/**
 * Calculate the GA CONNECT Handicapping Score for a round.
 *
 * Pass only the holes actually played (the front nine for a front-nine round),
 * and the Daily Handicap for those holes — this function does not derive or
 * halve handicaps itself.
 */
export function calculateHandicappingScore(
  params: HandicappingScoreParams
): HandicappingScoreResult {
  const { holes, scores, dailyHandicap } = params;

  let stablefordScore = 0;
  let holesCounted = 0;
  let allHolesAttempted = true;

  for (const hole of holes) {
    const score = readHoleScore(scores[String(hole.number)]);

    if (!score) {
      // No entry at all for this hole — no result to count, no points.
      continue;
    }

    holesCounted += 1;

    if (score.didNotAttempt) {
      // GA substitutes an Expected Score server-side; we must send zero.
      allHolesAttempted = false;
      continue;
    }

    // A pickup, or a hole left without a gross value, scores nothing.
    if (score.pickedUp || !score.strokes || score.strokes <= 0) {
      continue;
    }

    const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
    const netStrokes = score.strokes - strokesReceived;
    stablefordScore += stablefordPointsForHole(netStrokes - hole.par);
  }

  return { stablefordScore, holesCounted, allHolesAttempted };
}
