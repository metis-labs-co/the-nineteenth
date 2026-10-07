// src/utils/handicapEligibility.ts
/**
 * Handicap Eligibility — the card-level completeness gate (invariant I12)
 *
 * Only a FULL scorecard earns a WHS Score Differential: every hole of the
 * round's planned nine or eighteen carries a score. A partial card — a social
 * round ended early, a part-filled Quick Score card, a half-scored nine —
 * would otherwise yield a wildly low differential (an 18-hole round ended
 * after 6 holes comes out around −38) and poison the handicap index.
 *
 * Card-based on purpose: it reads the card's own scores and the round's planned
 * nine type — never a hole list — so it holds whatever hole list a caller has
 * in scope, and it works offline before any round-level write reaches the
 * server.
 *
 * Mirrored on the server by public.scorecard_is_complete_for_handicap()
 * (supabase/migrations/20261007000100_full_scorecards_only_handicap.sql).
 * Keep the two in step.
 *
 * Legacy cards with no per-hole data at all keep the old gross-only behaviour
 * (treated as complete).
 *
 * @see docs/guides/SCORING_ARCHITECTURE.md (I8 differential call sites)
 */

import { getHoleRange } from '@/constants/scoring';
import type { NineType } from '@/types/database/enums';

/**
 * Whether one stored hole score carries a stroke count. Accepts every shape a
 * card may hold: a bare number, a `{ strokes }` object (app or JSONB), or a
 * multi-ball `{ balls: [...] }` (scored when any ball is). A pickup is stored as
 * strokes = PICKUP_SCORE, so it counts as scored; a did-not-attempt hole is
 * stored as strokes = 0, so it does not.
 */
function hasStrokes(raw: unknown): boolean {
  if (typeof raw === 'number') return raw > 0;
  if (raw == null || typeof raw !== 'object') return false;
  const { balls, strokes } = raw as { balls?: unknown; strokes?: unknown };
  if (Array.isArray(balls)) return balls.some((ball) => hasStrokes(ball));
  return typeof strokes === 'number' && strokes > 0;
}

/**
 * True when the card is complete for handicap purposes: every planned hole
 * (`getHoleRange(nineType)`) has a score. A card with no per-hole data at all
 * (null / undefined / no keys) is a legacy gross-only card and returns true.
 */
export function isCompleteForHandicap(
  scores: Record<string | number, unknown> | null | undefined,
  nineType: NineType,
): boolean {
  if (!scores || Object.keys(scores).length === 0) return true;
  const { start, end } = getHoleRange(nineType);
  for (let hole = start; hole <= end; hole++) {
    if (!hasStrokes(scores[hole])) return false;
  }
  return true;
}
