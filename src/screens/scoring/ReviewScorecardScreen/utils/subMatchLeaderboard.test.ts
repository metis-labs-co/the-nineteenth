import { resolveSubMatchModel, computeMatchPlaySubMatch } from './subMatchLeaderboard';
import type { Hole } from '@/types';

describe('resolveSubMatchModel', () => {
  it('maps match-play game type to the match-play model', () => {
    expect(resolveSubMatchModel('match-play', null)).toBe('match-play');
    expect(resolveSubMatchModel('match-play', 'match-play-team')).toBe('match-play');
  });

  it('maps alt-shot and aggregate to net, best-ball to points', () => {
    expect(resolveSubMatchModel('alt-shot', 'alt-shot')).toBe('alt-shot');
    expect(resolveSubMatchModel('stroke', 'aggregate')).toBe('aggregate');
    expect(resolveSubMatchModel('stableford', 'best-ball')).toBe('best-ball');
  });

  it('defaults unknown combinations to aggregate (net)', () => {
    expect(resolveSubMatchModel('stroke', null)).toBe('aggregate');
  });
});

function hole(number: number, par = 4, strokeIndex = number): Hole {
  return { number, par, strokeIndex } as Hole;
}

// 9 holes, stroke index 1..9 ascending.
const NINE: Hole[] = Array.from({ length: 9 }, (_, i) => hole(i + 1));

describe('computeMatchPlaySubMatch', () => {
  const sides = {
    a: [{ id: 'a1', name: 'Sam', handicap: 0 }],
    b: [{ id: 'b1', name: 'Bob', handicap: 0 }],
  };

  it('reports all square before any scores', () => {
    const r = computeMatchPlaySubMatch(sides, NINE, () => undefined);
    expect(r.statusText).toBe('A/S');
    expect(r.leaderSide).toBeNull();
    expect(r.hasScores).toBe(false);
  });

  it('reports the leading side as "N UP" in progress', () => {
    // Sam wins holes 1 & 2 (4 vs 5), rest unscored.
    const getStrokes = (pid: string, h: number) => {
      if (h > 2) return undefined;
      return pid === 'a1' ? 4 : 5;
    };
    const r = computeMatchPlaySubMatch(sides, NINE, getStrokes);
    expect(r.statusText).toBe('2 UP');
    expect(r.leaderSide).toBe('a');
    expect(r.hasScores).toBe(true);
    expect(r.isComplete).toBe(false);
  });

  it('formats a closed-out match as "N&M"', () => {
    // Sam wins holes 1-7 (all of them through 7); 2 holes remain, 7-up: closed.
    const getStrokes = (pid: string, h: number) => {
      if (h > 7) return undefined;
      return pid === 'a1' ? 3 : 5;
    };
    const r = computeMatchPlaySubMatch(sides, NINE, getStrokes);
    expect(r.isComplete).toBe(true);
    expect(r.leaderSide).toBe('a');
    expect(r.statusText).toBe('7&2');
  });
});
