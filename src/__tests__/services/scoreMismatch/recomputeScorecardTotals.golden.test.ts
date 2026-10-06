/**
 * recomputeScorecardTotals — golden tests
 *
 * The totals rewritten after a mismatch resolution, a submission bypass, or an
 * organiser force-finalise must agree with what the scorecard shows. Invariant
 * I3 (docs/guides/SCORING_ARCHITECTURE.md): a pickup counts as net double bogey
 * (par + 2 + strokes received), never as its raw PICKUP_SCORE sentinel.
 *
 * Expected values are hand-derived from the fixture below.
 */

import { recomputeScorecardTotals } from '@/services/scoreMismatch/resolution';
import { PICKUP_SCORE } from '@/constants/scoring';
import type { Hole, HoleScore } from '@/types';

// Daily handicap 18 → exactly one stroke received on every hole.
const DHC = 18;

const HOLES: Hole[] = [
  { number: 1, par: 4, strokeIndex: 1 },
  { number: 2, par: 3, strokeIndex: 18 },
  { number: 3, par: 5, strokeIndex: 10 },
];

const scores = (h1: number, h2: number, h3: number): Record<string, HoleScore> => ({
  '1': { strokes: h1 },
  '2': { strokes: h2 },
  '3': { strokes: h3 },
});

describe('recomputeScorecardTotals', () => {
  describe('characterization (completed holes)', () => {
    it('sums gross strokes and derives net from the daily handicap', () => {
      const totals = recomputeScorecardTotals(scores(5, 3, 6), HOLES, 'stroke', DHC);

      expect(totals.totalGross).toBe(14);
      expect(totals.totalNet).toBe(-4); // 14 - 18
      expect(totals.totalPoints).toBeNull();
    });

    it('recomputes stableford points with the daily handicap', () => {
      // net par (2) + net birdie (3) + net par (2)
      const totals = recomputeScorecardTotals(scores(5, 3, 6), HOLES, 'stableford', DHC);

      expect(totals.totalPoints).toBe(7);
    });

    it('leaves net and points unset without a daily handicap', () => {
      const totals = recomputeScorecardTotals(scores(5, 3, 6), HOLES, 'stableford', null);

      expect(totals.totalGross).toBe(14);
      expect(totals.totalNet).toBeNull();
      expect(totals.totalPoints).toBeNull();
    });
  });

  describe('pickups (I3: net double bogey)', () => {
    it('counts a pickup as par + 2 + strokes received in gross', () => {
      // Hole 1: par 4 + 2 + 1 stroke = 7 (not 10)
      const totals = recomputeScorecardTotals(scores(PICKUP_SCORE, 3, 6), HOLES, 'stroke', DHC);

      expect(totals.totalGross).toBe(16); // 7 + 3 + 6
      expect(totals.totalNet).toBe(-2); // 16 - 18
    });

    it('scores a pickup as zero stableford points', () => {
      // Hole 1 net double bogey (0) + net birdie (3) + net par (2)
      const totals = recomputeScorecardTotals(scores(PICKUP_SCORE, 3, 6), HOLES, 'stableford', DHC);

      expect(totals.totalPoints).toBe(5);
    });

    it('uses gross double bogey for a pickup when no daily handicap is known', () => {
      // Hole 1: par 4 + 2 + 0 strokes = 6
      const totals = recomputeScorecardTotals(scores(PICKUP_SCORE, 3, 6), HOLES, 'stroke', null);

      expect(totals.totalGross).toBe(15); // 6 + 3 + 6
    });
  });
});
