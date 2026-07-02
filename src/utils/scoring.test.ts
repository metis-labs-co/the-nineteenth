// src/utils/scoring.test.ts
import { getEffectiveGrossStrokes, getMatchPlayStrokes } from './scoring';

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
