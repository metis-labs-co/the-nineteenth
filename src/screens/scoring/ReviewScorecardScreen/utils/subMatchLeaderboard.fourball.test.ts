import { computeMatchPlaySubMatch } from './subMatchLeaderboard';
import type { Hole } from '@/types';

// Same divergence match as the scorecard-table test: side A = P1(5), P2(20);
// side B = P3(10), P4(12); one hole at stroke index 3; grosses P1=5,P2=6,P3=5,P4=6.
// Relative-to-lowest -> side B wins the only hole (1 UP, complete). Old method
// -> halved (A/S). Asserting side B proves the leaderboard inherits the fix.
const holes: Hole[] = [{ number: 1, par: 4, strokeIndex: 3 }];

const sides = {
  a: [
    { id: 'p1', name: 'P1', handicap: 5 },
    { id: 'p2', name: 'P2', handicap: 20 },
  ],
  b: [
    { id: 'p3', name: 'P3', handicap: 10 },
    { id: 'p4', name: 'P4', handicap: 12 },
  ],
};

const grosses: Record<string, number> = { p1: 5, p2: 6, p3: 5, p4: 6 };
const getStrokes = (playerId: string, _holeNumber: number): number | undefined =>
  grosses[playerId];

describe('computeMatchPlaySubMatch — four-ball relative-to-lowest (delegation)', () => {
  it('side B wins the divergence hole (would be A/S under full handicaps)', () => {
    const row = computeMatchPlaySubMatch(sides, holes, getStrokes);
    expect(row.leaderSide).toBe('b');
    expect(row.statusText).not.toBe('A/S');
  });
});
