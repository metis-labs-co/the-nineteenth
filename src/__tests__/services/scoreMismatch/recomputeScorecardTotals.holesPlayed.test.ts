/**
 * recomputeScorecardTotals — rounds ended early (`options.holesPlayed`).
 *
 * Mismatch resolution can rewrite a card after rounds.holes_played is set
 * (two phones that both score everyone). Totals must cover only the holes
 * played, and net is Σ(gross − strokes received) over them — the same rule as
 * calculatePlayerStats and the sync snapshot.
 *
 * Fixture: 18 par-4 holes, SI = hole number. DHC 10 ⇒ one stroke on SI 1–10.
 */

import { recomputeScorecardTotals } from '@/services/scoreMismatch/resolution';
import { PICKUP_SCORE } from '@/constants/scoring';
import type { Hole, HoleScore } from '@/types';

const HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: 4 as Hole['par'],
  strokeIndex: i + 1,
}));
const DHC = 10;

function scoresOn(entries: Record<number, number>): Record<string, HoleScore> {
  const scores: Record<string, HoleScore> = {};
  for (const [hole, strokes] of Object.entries(entries)) {
    scores[hole] = { strokes } as HoleScore;
  }
  return scores;
}

describe('recomputeScorecardTotals — holes played', () => {
  it('nets gross − DHC without options (locks current behaviour)', () => {
    expect(recomputeScorecardTotals(scoresOn({ 1: 5, 2: 5, 3: 5 }), HOLES, 'stroke', DHC)).toEqual({
      totalGross: 15,
      totalNet: 5,
      totalPoints: null,
    });
  });

  it('nets per hole over the played holes', () => {
    const totals = recomputeScorecardTotals(scoresOn({ 1: 5, 2: 5, 3: 5 }), HOLES, 'stroke', DHC, {
      holesPlayed: 3,
      nineType: 'full',
    });
    expect(totals.totalGross).toBe(15);
    expect(totals.totalNet).toBe(12); // 3 × (5 − 1)
  });

  it('ignores a score after the holes played', () => {
    const totals = recomputeScorecardTotals(
      scoresOn({ 1: 5, 2: 5, 3: 5, 4: 5 }),
      HOLES,
      'stroke',
      DHC,
      { holesPlayed: 3, nineType: 'full' }
    );
    expect(totals.totalGross).toBe(15);
    expect(totals.totalNet).toBe(12);
  });

  it('slices a back-nine round from hole 10', () => {
    // Holes 10–11 played; hole 12 is after the end. Hole 10 (SI 10) gets a
    // stroke, hole 11 (SI 11) does not ⇒ net 4 + 5 = 9.
    const totals = recomputeScorecardTotals(
      scoresOn({ 10: 5, 11: 5, 12: 5 }),
      HOLES,
      'stroke',
      DHC,
      { holesPlayed: 2, nineType: 'back9' }
    );
    expect(totals.totalGross).toBe(10);
    expect(totals.totalNet).toBe(9);
  });

  it('counts a pickup on a played hole as net double bogey (I3)', () => {
    // Hole 3: par 4 + 2 + 1 stroke = 7. Gross 5 + 5 + 7 = 17; net 4 + 4 + 6 = 14.
    const totals = recomputeScorecardTotals(
      scoresOn({ 1: 5, 2: 5, 3: PICKUP_SCORE }),
      HOLES,
      'stroke',
      DHC,
      { holesPlayed: 3, nineType: 'full' }
    );
    expect(totals.totalGross).toBe(17);
    expect(totals.totalNet).toBe(14);
  });

  it('counts stableford points over the played holes only', () => {
    // A 5 on a par 4 with a stroke = net par = 2 pts; hole 4 is after the end.
    const totals = recomputeScorecardTotals(
      scoresOn({ 1: 5, 2: 5, 3: 5, 4: 5 }),
      HOLES,
      'stableford',
      DHC,
      { holesPlayed: 3, nineType: 'full' }
    );
    expect(totals.totalPoints).toBe(6);
  });

  it('treats holesPlayed null or 0 like no options', () => {
    const scores = scoresOn({ 1: 5, 2: 5, 3: 5, 4: 5 });
    const baseline = recomputeScorecardTotals(scores, HOLES, 'stroke', DHC);
    expect(baseline).toEqual({ totalGross: 20, totalNet: 10, totalPoints: null });
    expect(
      recomputeScorecardTotals(scores, HOLES, 'stroke', DHC, {
        holesPlayed: null,
        nineType: 'full',
      })
    ).toEqual(baseline);
    expect(
      recomputeScorecardTotals(scores, HOLES, 'stroke', DHC, { holesPlayed: 0, nineType: 'full' })
    ).toEqual(baseline);
  });

  it.each([null, 0, -1, 2.5, NaN])('ignores invalid marker %s consistently', (holesPlayed) => {
    const scores = scoresOn({ 10: 5, 11: 5, 12: 5 });
    expect(
      recomputeScorecardTotals(scores, HOLES, 'stableford', DHC, { holesPlayed, nineType: 'back9' })
    ).toEqual(recomputeScorecardTotals(scores, HOLES, 'stableford', DHC, { nineType: 'back9' }));
  });

  it('preserves null net and points without DHC on played holes', () => {
    expect(
      recomputeScorecardTotals(
        scoresOn({ 1: PICKUP_SCORE, 2: 5, 3: 5 }),
        HOLES,
        'stableford',
        null,
        { holesPlayed: 2 }
      )
    ).toEqual({ totalGross: 11, totalNet: null, totalPoints: null });
  });

  it('keeps the existing single-ball gross contract for net and points too', () => {
    const scores = scoresOn({ 1: 5 });
    scores['2'] = { balls: [{ strokes: 4 }, { strokes: 6 }] } as unknown as HoleScore;
    expect(recomputeScorecardTotals(scores, HOLES, 'stableford', DHC, { holesPlayed: 2 })).toEqual({
      totalGross: 5,
      totalNet: 4,
      totalPoints: 2,
    });
  });

  it('omits unscored holes and preserves planned plus handicap allocation', () => {
    expect(
      recomputeScorecardTotals(scoresOn({ 1: 5, 3: 0 }), HOLES, 'stroke', -2, { holesPlayed: 3 })
    ).toEqual({ totalGross: 5, totalNet: 5, totalPoints: null });
  });

  it('filters fallback keys by the planned nine and cutoff without metadata', () => {
    expect(
      recomputeScorecardTotals(scoresOn({ 5: 6, 10: 5, 11: 4, 12: 6 }), [], 'stroke', DHC, {
        nineType: 'back9',
        holesPlayed: 2,
      })
    ).toEqual({ totalGross: 9, totalNet: -1, totalPoints: null });
  });

  it('preserves missing-metadata fallback without options', () => {
    expect(
      recomputeScorecardTotals(scoresOn({ 1: PICKUP_SCORE, 2: 5 }), [], 'stableford', DHC)
    ).toEqual({ totalGross: 15, totalNet: 5, totalPoints: null });
  });
});
