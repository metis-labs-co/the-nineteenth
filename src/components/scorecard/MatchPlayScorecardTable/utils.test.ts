import { calculateAllData } from './utils';
import type { Hole } from '@/types/database/base';
import { PICKUP_SCORE } from '@/constants/scoring';

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

describe('calculateAllData — ended early (holesPlayed)', () => {
  const eighteen: Hole[] = Array.from(
    { length: 18 },
    (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }) as Hole
  );
  // p1 wins holes 1 and 2 (3 v 4), holes 3-6 halved (4 v 4); nothing after 6.
  const getScore = (playerId: string, holeNumber: number): number | undefined => {
    if (holeNumber > 6) return undefined;
    if (playerId === 'p1') return holeNumber <= 2 ? 3 : 4;
    return 4;
  };

  it('walks and totals only the played holes, settling on the lead', () => {
    const data = calculateAllData(eighteen, 'p1', 'p2', getScore, 0, 0, 6);
    expect(Object.keys(data.holeResults).map(Number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(data.total).toEqual({ par: 24, player1: 22, player2: 24, holesPlayed: 6 });
    expect(data.back9).toEqual({ par: 0, player1: 0, player2: 0, holesPlayed: 0 });
    expect(data.runningStatus[5]).toEqual({ status: 'in_progress', leader: 'player1', holesUp: 2, holesRemaining: 13 });
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '2 up' });
  });

  it('is unchanged when holesPlayed is null (characterization)', () => {
    const data = calculateAllData(eighteen, 'p1', 'p2', getScore, 0, 0, null);
    expect(Object.keys(data.holeResults)).toHaveLength(18);
    expect(data.total.par).toBe(72);
    expect(data.finalStatus).toEqual({ status: 'in_progress', leader: 'player1', holesUp: 2, holesRemaining: 12 });
  });

  it('counts a pickup on the last played hole as a concession, then settles on the lead', () => {
    // p1 wins 1-2 (3 v 4), halves 3-5 (4 v 4), picks up on 6 while p2 cards 4:
    // hole 6 goes to p2. Lead after 6 = 2 − 1 = 1 → "1 up".
    const withPickup = (playerId: string, holeNumber: number): number | undefined => {
      if (playerId === 'p1' && holeNumber === 6) return PICKUP_SCORE;
      return getScore(playerId, holeNumber);
    };
    const data = calculateAllData(eighteen, 'p1', 'p2', withPickup, 0, 0, 6);
    expect(data.holeResults[6]).toEqual(
      expect.objectContaining({ player1PickedUp: true, winner: 'player2' })
    );
    // The pickup is not a gross score: p1 totals 3+3+4+4+4 over the 5 holes it carded.
    expect(data.total).toEqual({ par: 24, player1: 18, player2: 24, holesPlayed: 6 });
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '1 up' });
  });

  it('ignores scored holes after the cutoff in rows, gross totals and status', () => {
    const stale = (pid: string, h: number) => h > 6 ? (pid === 'p1' ? 8 : 3) : getScore(pid, h);
    const data = calculateAllData(eighteen, 'p1', 'p2', stale, 0, 0, 6);
    expect(data).toEqual(calculateAllData(eighteen, 'p1', 'p2', getScore, 0, 0, 6));
    expect(data.runningStatus[6]).toEqual(data.finalStatus);
  });

  it('keeps an undecided hole before N and never uses a later score to settle it', () => {
    const data = calculateAllData(eighteen, 'p1', 'p2', (pid, h) => {
      if (h === 2) return undefined;
      if (h > 6) return pid === 'p1' ? 3 : 4;
      return getScore(pid, h);
    }, 0, 0, 6);
    expect(data.holeResults[2].winner).toBeNull();
    expect(data.holeResults[7]).toBeUndefined();
    expect(data.finalStatus).toEqual({ status: 'in_progress', leader: 'player1', holesUp: 1, holesRemaining: 13 });
  });

  it.each([9, 18])('cuts a %i-hole back/combo list by physical order and keeps its planned count', (count) => {
    const planned: Hole[] = Array.from({ length: count }, (_, i) => ({ number: 10 + i, par: 4, strokeIndex: i + 1 }) as Hole);
    const data = calculateAllData([...planned].reverse(), 'p1', 'p2', (pid, h) => {
      if (h >= 16) return pid === 'p1' ? 8 : 3;
      return pid === 'p1' && h <= 11 ? 3 : 4;
    }, 0, 0, 6);
    expect(Object.keys(data.holeResults).map(Number)).toEqual([10, 11, 12, 13, 14, 15]);
    expect(data.front9).toEqual({ par: 0, player1: 0, player2: 0, holesPlayed: 0 });
    expect(data.back9).toEqual({ par: 24, player1: 22, player2: 24, holesPlayed: 6 });
    expect(data.runningStatus[14]).toEqual({ status: 'in_progress', leader: 'player1', holesUp: 2, holesRemaining: count - 5 });
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '2 up' });
  });

  it('retains difference-method strokes when settling an early match', () => {
    const data = calculateAllData(eighteen, 'p1', 'p2', () => 5, 20, 15, 1);
    expect(data.holeResults[1].winner).toBe('player1');
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '1 up' });
  });

  it('preserves the first genuine close-out against the planned nine', () => {
    const data = calculateAllData(eighteen.slice(0, 9), 'p1', 'p2', (pid, h) => {
      return pid === 'p1' && h <= 5 ? 3 : 4;
    }, 0, 0, 6);
    expect(data.runningStatus[4].status).toBe('in_progress');
    expect(data.finalStatus).toEqual({ status: 'complete', winner: 'player1', margin: '5 & 4' });
  });

  it.each([undefined, 0, -1, 1.5, NaN, Infinity, 18, 19])('keeps default outputs for cutoff %s', (cutoff) => {
    const unsorted = [...eighteen].reverse();
    expect(calculateAllData(unsorted, 'p1', 'p2', getScore, 0, 0, cutoff))
      .toEqual(calculateAllData(unsorted, 'p1', 'p2', getScore));
  });
});
