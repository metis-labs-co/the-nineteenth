import { calculateAllData } from './utils';
import type { Hole } from '@/types/database/base';

// Handicaps 20 and 15 on stroke-index-3: this is a case where the two methods
// diverge. Old method (each player's full handicap): both receive 1 stroke on
// SI 3, so with equal gross the hole is halved. New difference method: only the
// difference (5) is allocated, so on SI 3 the higher-handicap player (P1, 20)
// gets the stroke and wins the hole with equal gross.
describe('calculateAllData — difference-method allocation', () => {
  const holes: Hole[] = [{ number: 1, par: 4, strokeIndex: 3 }];

  const scores: Record<string, number> = { 'p1-1': 5, 'p2-1': 5 };
  const getPlayerScore = (playerId: string, holeNumber: number): number | undefined =>
    scores[`${playerId}-${holeNumber}`];

  it('gives the hole to the higher-handicap player on a divergence hole', () => {
    const data = calculateAllData(holes, 'p1', 'p2', getPlayerScore, 20, 15);
    expect(data.holeResults[1].winner).toBe('player1');
  });

  it('gives no strokes to either player when handicaps are equal (halved on equal gross)', () => {
    const data = calculateAllData(holes, 'p1', 'p2', getPlayerScore, 15, 15);
    expect(data.holeResults[1].winner).toBe('halved');
  });
});
