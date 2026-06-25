// src/utils/scoring.test.ts
import { getEffectiveGrossStrokes } from './scoring';

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
