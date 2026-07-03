// src/utils/scoring.test.ts
import { getEffectiveGrossStrokes, getMatchPlayStrokes, getFourBallStrokes } from './scoring';

describe('getEffectiveGrossStrokes', () => {
  it('returns null for a hole that was not played', () => {
    expect(getEffectiveGrossStrokes(undefined, 4, 0)).toBeNull();
    expect(getEffectiveGrossStrokes(0, 4, 0)).toBeNull();
    expect(getEffectiveGrossStrokes(-1, 4, 0)).toBeNull();
  });

  it('returns the actual strokes for a completed hole below the pickup threshold', () => {
    expect(getEffectiveGrossStrokes(5, 4, 0)).toBe(5);
    expect(getEffectiveGrossStrokes(3, 3, 1)).toBe(3);
  });

  it('caps a pickup (>= PICKUP_SCORE) at net double bogey: par + 2 + strokesReceived', () => {
    // Par 5, 1 stroke received -> net double bogey = 5 + 2 + 1 = 8
    expect(getEffectiveGrossStrokes(10, 5, 1)).toBe(8);
    // Par 4, 0 strokes received -> 4 + 2 + 0 = 6
    expect(getEffectiveGrossStrokes(10, 4, 0)).toBe(6);
    // Par 3, 1 stroke received -> 3 + 2 + 1 = 6
    expect(getEffectiveGrossStrokes(10, 3, 1)).toBe(6);
  });
});

describe('getMatchPlayStrokes', () => {
  it('gives no strokes to either player when handicaps are equal', () => {
    expect(getMatchPlayStrokes(12, 12, 1)).toEqual({ a: 0, b: 0 });
  });

  it('allocates the difference to the higher-handicap player on the lowest-SI holes', () => {
    // diff 5 -> a stroke on the 5 lowest stroke-index holes, none above
    expect(getMatchPlayStrokes(20, 15, 5)).toEqual({ a: 1, b: 0 });
    expect(getMatchPlayStrokes(20, 15, 6)).toEqual({ a: 0, b: 0 });
  });

  it('is symmetric — the higher handicap always receives, regardless of argument order', () => {
    expect(getMatchPlayStrokes(15, 20, 5)).toEqual({ a: 0, b: 1 });
  });

  it('gives a second stroke on the lowest-SI holes when the difference exceeds 18', () => {
    // diff 20 -> 1 stroke on every hole, a 2nd stroke on SI 1 and SI 2
    expect(getMatchPlayStrokes(25, 5, 2)).toEqual({ a: 2, b: 0 });
    expect(getMatchPlayStrokes(25, 5, 3)).toEqual({ a: 1, b: 0 });
  });

  it('allocates to the higher (less-minus) player for plus handicaps', () => {
    // -3 vs -5 -> difference 2, the -3 player receives on the 2 lowest-SI holes
    expect(getMatchPlayStrokes(-3, -5, 1)).toEqual({ a: 1, b: 0 });
    expect(getMatchPlayStrokes(-3, -5, 3)).toEqual({ a: 0, b: 0 });
  });
});

describe('getFourBallStrokes', () => {
  it('gives the lowest-handicap player no strokes and others their difference by stroke index', () => {
    const players = [
      { playerId: 'a', handicap: 6 },
      { playerId: 'b', handicap: 12 },
      { playerId: 'c', handicap: 20 },
    ];
    // lowest = 6 -> a:0. b diff 6 -> stroke on SI 1..6. c diff 14 -> stroke on SI 1..14.
    const si5 = getFourBallStrokes(players, 5);
    expect(si5.get('a')).toBe(0);
    expect(si5.get('b')).toBe(1); // 5 <= 6
    expect(si5.get('c')).toBe(1); // 5 <= 14

    const si10 = getFourBallStrokes(players, 10);
    expect(si10.get('a')).toBe(0);
    expect(si10.get('b')).toBe(0); // 10 > 6
    expect(si10.get('c')).toBe(1); // 10 <= 14
  });

  it('gives all tied-lowest players zero strokes', () => {
    const players = [
      { playerId: 'a', handicap: 8 },
      { playerId: 'b', handicap: 8 },
      { playerId: 'c', handicap: 15 },
    ];
    const m = getFourBallStrokes(players, 1);
    expect(m.get('a')).toBe(0);
    expect(m.get('b')).toBe(0);
    expect(m.get('c')).toBe(1); // diff 7, SI 1 <= 7
  });

  it('gives a second stroke on the lowest-SI holes when a difference exceeds 18', () => {
    const players = [
      { playerId: 'a', handicap: 5 },
      { playerId: 'b', handicap: 25 },
    ];
    // diff 20 -> 1 stroke every hole, 2nd on SI 1 and 2.
    expect(getFourBallStrokes(players, 2).get('b')).toBe(2);
    expect(getFourBallStrokes(players, 3).get('b')).toBe(1);
    expect(getFourBallStrokes(players, 2).get('a')).toBe(0);
  });

  it('reduces to the singles difference method for a two-player match', () => {
    for (const si of [1, 3, 7, 12, 18]) {
      const m = getFourBallStrokes(
        [
          { playerId: 'a', handicap: 20 },
          { playerId: 'b', handicap: 15 },
        ],
        si
      );
      const singles = getMatchPlayStrokes(20, 15, si);
      expect(m.get('a')).toBe(singles.a);
      expect(m.get('b')).toBe(singles.b);
    }
  });

  it('returns an empty map for an empty players list', () => {
    expect(getFourBallStrokes([], 1).size).toBe(0);
  });
});
