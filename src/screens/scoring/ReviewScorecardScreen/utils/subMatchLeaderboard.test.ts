import {
  resolveSubMatchModel,
  computeMatchPlaySubMatch,
  computeNetSubMatch,
  tallyOverall,
  extractStrokes,
  createMergedGetStrokes,
} from './subMatchLeaderboard';
import type { Hole } from '@/types';
import type { HoleScore, MultiBallHoleScore } from '@/types/database/base';

describe('resolveSubMatchModel', () => {
  it('maps match-play game type to the match-play model', () => {
    expect(resolveSubMatchModel('match-play', null)).toBe('match-play');
    expect(resolveSubMatchModel('match-play', 'match-play-team')).toBe('match-play');
  });

  it('maps the match-play-team format to the match-play model even when game_type is not match-play', () => {
    expect(resolveSubMatchModel('stroke', 'match-play-team')).toBe('match-play');
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

describe('computeNetSubMatch', () => {
  const sides = {
    a: [{ id: 'a1', name: 'Sam', handicap: 0 }, { id: 'a2', name: 'Al', handicap: 0 }],
    b: [{ id: 'b1', name: 'Bob', handicap: 0 }, { id: 'b2', name: 'Ed', handicap: 0 }],
  };

  it('alt-shot: lower combined net leads, scratch pairs use raw gross', () => {
    // Side A's shared ball: 4 on holes 1-2 (gross 8). Side B: 5,5 (gross 10).
    const getStrokes = (pid: string, h: number) => {
      if (h > 2) return undefined;
      if (pid === 'a1' || pid === 'a2') return 4;
      return 5;
    };
    const r = computeNetSubMatch('alt-shot', sides, NINE, getStrokes);
    expect(r.valueA).toBe(8);
    expect(r.valueB).toBe(10);
    expect(r.leaderSide).toBe('a');
    expect(r.diff).toBe(2);
    expect(r.unit).toBe('');
  });

  it('best-ball: higher stableford points lead, unit is pts', () => {
    // Par-4 holes, scratch. Side A makes 4 (par=2pts) on holes 1-2 => 4 pts.
    // Side B makes 5 (bogey=1pt) on holes 1-2 => 2 pts.
    const getStrokes = (pid: string, h: number) => {
      if (h > 2) return undefined;
      return pid.startsWith('a') ? 4 : 5;
    };
    const r = computeNetSubMatch('best-ball', sides, NINE, getStrokes);
    expect(r.valueA).toBe(4);
    expect(r.valueB).toBe(2);
    expect(r.leaderSide).toBe('a');
    expect(r.unit).toBe(' pts');
  });

  it('returns nulls and no leader before any scores', () => {
    const r = computeNetSubMatch('aggregate', sides, NINE, () => undefined);
    expect(r.valueA).toBeNull();
    expect(r.valueB).toBeNull();
    expect(r.leaderSide).toBeNull();
    expect(r.hasScores).toBe(false);
  });
});

describe('extractStrokes', () => {
  it('returns strokes from a single-ball score', () => {
    expect(extractStrokes({ strokes: 4 } as HoleScore)).toBe(4);
  });

  it('returns the first ball’s strokes from a multi-ball score', () => {
    expect(
      extractStrokes({ balls: [{ strokes: 5 }, { strokes: 6 }] } as MultiBallHoleScore)
    ).toBe(5);
  });

  it('returns undefined for missing or empty scores', () => {
    expect(extractStrokes(undefined)).toBeUndefined();
    expect(extractStrokes({ balls: [] } as MultiBallHoleScore)).toBeUndefined();
  });
});

describe('createMergedGetStrokes', () => {
  const server: { player_id: string; scores: Record<string, HoleScore> }[] = [
    { player_id: 'other1', scores: { '1': { strokes: 5 }, '2': { strokes: 6 } } },
    { player_id: 'mine', scores: { '1': { strokes: 9 } } }, // stale server copy of my own card
  ];

  it('prefers the local store for the current scorer’s own group', () => {
    // Local has my fresh score (4); server has a stale 9 for the same hole.
    const getLocal = (pid: string, h: number) =>
      pid === 'mine' && h === 1 ? ({ strokes: 4 } as HoleScore) : undefined;
    const get = createMergedGetStrokes(getLocal, server);
    expect(get('mine', 1)).toBe(4);
  });

  it('falls back to server scorecards for players in other groups', () => {
    const get = createMergedGetStrokes(() => undefined, server);
    expect(get('other1', 1)).toBe(5);
    expect(get('other1', 2)).toBe(6);
  });

  it('returns undefined when neither source has the hole', () => {
    const get = createMergedGetStrokes(() => undefined, server);
    expect(get('other1', 9)).toBeUndefined();
    expect(get('nobody', 1)).toBeUndefined();
  });

  it('tolerates missing server scorecards (offline / not yet loaded)', () => {
    const getLocal = (pid: string, h: number) =>
      pid === 'mine' && h === 1 ? ({ strokes: 4 } as HoleScore) : undefined;
    const get = createMergedGetStrokes(getLocal, undefined);
    expect(get('mine', 1)).toBe(4);
    expect(get('other1', 1)).toBeUndefined();
  });
});

describe('tallyOverall', () => {
  it('awards 1 to the current leader, 0.5 each when level, 0 when unscored', () => {
    const result = tallyOverall([
      { leaderSide: 'a', hasScores: true },
      { leaderSide: 'b', hasScores: true },
      { leaderSide: null, hasScores: true }, // level -> 0.5 each
      { leaderSide: null, hasScores: false }, // not started -> 0
    ]);
    expect(result.pointsA).toBe(1.5);
    expect(result.pointsB).toBe(1.5);
  });
});
