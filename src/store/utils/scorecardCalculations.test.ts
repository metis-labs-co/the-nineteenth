// src/store/utils/scorecardCalculations.test.ts
import { calculatePlayerTotals } from './scorecardCalculations';
import type { Scorecard, Hole } from '@/types';

function hole(number: number, par: number, strokeIndex: number): Hole {
  return { number, par, strokeIndex } as Hole;
}

/** Minimal scorecard with a zero-handicap player so strokesReceived === 0. */
function card(scores: Record<number, { strokes: number }>): Scorecard {
  return {
    player: { id: 'p1', name: 'Test', handicap: 0, handicapIndex: 0, gender: null },
    scores,
  } as unknown as Scorecard;
}

describe('calculatePlayerTotals — pickup handling', () => {
  it('counts a pickup hole as net double bogey in gross instead of excluding it', () => {
    const holes = [hole(1, 4, 1), hole(2, 4, 2)];
    // Hole 2 is a pickup (strokes === PICKUP_SCORE === 10).
    const scorecard = card({ 1: { strokes: 5 }, 2: { strokes: 10 } });

    const totals = calculatePlayerTotals(scorecard, holes, 'stroke', {
      handicapSource: 'none',
    });

    // Hole 1 completed = 5; hole 2 pickup -> net double bogey = par 4 + 2 + 0 = 6.
    expect(totals.gross).toBe(11);
  });

  it('still awards 0 Stableford points for a picked-up hole', () => {
    const holes = [hole(1, 4, 1), hole(2, 4, 2)];
    const scorecard = card({ 1: { strokes: 4 }, 2: { strokes: 10 } });

    const totals = calculatePlayerTotals(scorecard, holes, 'stableford', {
      handicapSource: 'none',
    });

    // Hole 1: net par = 2 pts. Hole 2 pickup (net double bogey) = 0 pts.
    expect(totals.points).toBe(2);
  });
});
