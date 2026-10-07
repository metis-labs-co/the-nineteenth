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

describe('calculateAllData — planned hole count', () => {
  const nine = (first: number): Hole[] =>
    Array.from({ length: 9 }, (_, i) => ({ number: first + i, par: 4, strokeIndex: i + 1 }) as Hole);

  /** p1 cards 3 on `wonHoles` and 4 elsewhere; p2 cards 4 on every scored hole. */
  const scoresFor = (scored: number[], wonHoles: number[]) =>
    (playerId: string, holeNumber: number): number | undefined => {
      if (!scored.includes(holeNumber)) return undefined;
      if (playerId === 'p1') return wonHoles.includes(holeNumber) ? 3 : 4;
      return 4;
    };

  it('finishes a front-9 match on the 9th hole: "1 up"', () => {
    const holes = nine(1);
    const data = calculateAllData(holes, 'p1', 'p2', scoresFor(holes.map((h) => h.number), [9]));
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '1 up' });
    expect(data.runningStatus[8]).toEqual({ status: 'in_progress', leader: null, holesUp: 0, holesRemaining: 1 });
  });

  it('closes out a back-9 match against 9 planned holes: "5 & 4"', () => {
    const scored = [10, 11, 12, 13, 14];
    const data = calculateAllData(nine(10), 'p1', 'p2', scoresFor(scored, scored));
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '5 & 4' });
  });

  it('keeps 18 for an empty hole list, never a finished halved match (characterization)', () => {
    const data = calculateAllData([], 'p1', 'p2', () => undefined);
    expect(data.finalStatus).toEqual({ status: 'in_progress', leader: null, holesUp: 0, holesRemaining: 18 });
  });
});
