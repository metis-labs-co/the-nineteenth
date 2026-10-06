// src/utils/adjustedGross.test.ts
//
// Tests for WHS Adjusted Gross Score — the per-hole net-double-bogey cap that
// must be applied before a Score Differential is calculated, plus the
// flag-aware pickup resolver that feeds it.
import {
  isHolePickedUp,
  capAtNetDoubleBogey,
  calculateAdjustedGrossScore,
  type AdjustedGrossHole,
} from './adjustedGross';

const NINE: AdjustedGrossHole[] = [
  { number: 1, par: 4, strokeIndex: 5 },
  { number: 2, par: 4, strokeIndex: 1 },
  { number: 3, par: 3, strokeIndex: 9 },
  { number: 4, par: 5, strokeIndex: 3 },
  { number: 5, par: 4, strokeIndex: 7 },
  { number: 6, par: 4, strokeIndex: 2 },
  { number: 7, par: 3, strokeIndex: 8 },
  { number: 8, par: 5, strokeIndex: 4 },
  { number: 9, par: 4, strokeIndex: 6 },
];

describe('isHolePickedUp', () => {
  it('trusts an explicit pickedUp flag regardless of strokes', () => {
    expect(isHolePickedUp({ strokes: 5, pickedUp: true })).toBe(true);
    expect(isHolePickedUp({ strokes: 12, pickedUp: false })).toBe(false);
  });

  it('falls back to the legacy PICKUP_SCORE sentinel when no flag is set', () => {
    // Legacy cards encoded a pickup as strokes >= 10 with no flag.
    expect(isHolePickedUp({ strokes: 10 })).toBe(true);
    expect(isHolePickedUp({ strokes: 11 })).toBe(true);
    expect(isHolePickedUp({ strokes: 9 })).toBe(false);
  });

  it('accepts a bare number and handles empty holes', () => {
    expect(isHolePickedUp(10)).toBe(true);
    expect(isHolePickedUp(4)).toBe(false);
    expect(isHolePickedUp(null)).toBe(false);
    expect(isHolePickedUp(undefined)).toBe(false);
  });

  it('does not treat a did-not-attempt hole as a pickup', () => {
    expect(isHolePickedUp({ didNotAttempt: true })).toBe(false);
  });
});

describe('capAtNetDoubleBogey', () => {
  it('caps a blow-up hole at par + 2 + strokes received', () => {
    expect(capAtNetDoubleBogey(9, 3, 0)).toBe(5); // 3 + 2 + 0
    expect(capAtNetDoubleBogey(11, 4, 1)).toBe(7); // 4 + 2 + 1
    expect(capAtNetDoubleBogey(12, 5, 2)).toBe(9); // 5 + 2 + 2
  });

  it('leaves a score at or below the cap untouched', () => {
    expect(capAtNetDoubleBogey(5, 4, 0)).toBe(5);
    expect(capAtNetDoubleBogey(6, 4, 0)).toBe(6); // exactly the cap
    expect(capAtNetDoubleBogey(3, 4, 0)).toBe(3);
  });
});

describe('calculateAdjustedGrossScore', () => {
  it('equals raw gross when no hole exceeds net double bogey', () => {
    const scores = Object.fromEntries(
      NINE.map((h) => [h.number, { strokes: h.par + 1 }])
    );

    const result = calculateAdjustedGrossScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    // 36 par + 9 bogeys = 45, none capped (bogey < double bogey)
    expect(result.adjustedGross).toBe(45);
    expect(result.rawGross).toBe(45);
    expect(result.holesCounted).toBe(9);
  });

  it('caps blow-up holes and so comes in below raw gross', () => {
    const scores: Record<string, { strokes: number }> = Object.fromEntries(
      NINE.map((h) => [h.number, { strokes: h.par }])
    );
    // A 10 on the par-3 3rd (SI 9). Scratch player: cap = 3 + 2 = 5.
    scores['3'] = { strokes: 10 };

    const result = calculateAdjustedGrossScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    expect(result.rawGross).toBe(36 + 7); // level par except the 10
    expect(result.adjustedGross).toBe(36 + 2); // capped to 5 on a par 3
  });

  it('raises the cap by strokes received off the daily handicap', () => {
    const scores: Record<string, { strokes: number }> = Object.fromEntries(
      NINE.map((h) => [h.number, { strokes: h.par }])
    );
    scores['3'] = { strokes: 10 };

    // Daily handicap 9 gives a stroke on SI 1..9, so the par-3 cap is 3+2+1=6.
    const result = calculateAdjustedGrossScore({
      holes: NINE,
      scores,
      dailyHandicap: 9,
    });

    expect(result.adjustedGross).toBe(36 + 3); // 6 instead of 3
  });

  it('records a pickup at net double bogey', () => {
    const scores: Record<string, { strokes?: number; pickedUp?: boolean }> =
      Object.fromEntries(NINE.map((h) => [h.number, { strokes: h.par }]));
    scores['4'] = { pickedUp: true }; // par 5, scratch -> 7

    const result = calculateAdjustedGrossScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    expect(result.adjustedGross).toBe(36 - 5 + 7);
  });

  it('excludes did-not-attempt holes and flags the round', () => {
    const scores: Record<string, { strokes?: number; didNotAttempt?: boolean }> =
      Object.fromEntries(NINE.map((h) => [h.number, { strokes: h.par }]));
    scores['3'] = { didNotAttempt: true };

    const result = calculateAdjustedGrossScore({
      holes: NINE,
      scores,
      dailyHandicap: 0,
    });

    // Hole 3 contributes nothing — GA supplies an Expected Score for it.
    expect(result.adjustedGross).toBe(33);
    expect(result.holesCounted).toBe(8);
    expect(result.allHolesAttempted).toBe(false);
  });

  it('returns zeroes for an empty card', () => {
    const result = calculateAdjustedGrossScore({
      holes: NINE,
      scores: {},
      dailyHandicap: 0,
    });

    expect(result.adjustedGross).toBe(0);
    expect(result.rawGross).toBe(0);
    expect(result.holesCounted).toBe(0);
  });
});
