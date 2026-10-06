// src/utils/scorecardCalculations.test.ts
import { calculatePlayerStats, type ScorecardPlayerData } from './scorecardCalculations';
import type { Hole } from '@/types/database.types';

function hole(number: number, par: number, strokeIndex: number): Hole {
  return { number, par, strokeIndex } as Hole;
}

function player(scores: Record<string, { strokes: number }>): ScorecardPlayerData {
  return {
    id: 'sc1',
    playerId: 'p1',
    player: { id: 'p1', name: 'Alice', handicap: 0 },
    scores,
    hasScorecard: true,
  };
}

describe('calculatePlayerStats — pickup handling', () => {
  it('counts a picked-up hole as net double bogey in gross, not the raw pickup score', () => {
    const holes = [hole(1, 4, 1), hole(2, 4, 2)];
    // handicapSource 'none' => daily handicap 0 => strokes received 0.
    const [stats] = calculatePlayerStats(
      [player({ '1': { strokes: 4 }, '2': { strokes: 10 } })],
      holes,
      null,
      'none',
    );

    // Hole 1 = 4 (par). Hole 2 pickup -> net double bogey = par 4 + 2 + 0 = 6.
    expect(stats.totalGross).toBe(10); // not 14
    // Net = gross - daily handicap (0) = 10.
    expect(stats.totalNet).toBe(10);
  });
});
