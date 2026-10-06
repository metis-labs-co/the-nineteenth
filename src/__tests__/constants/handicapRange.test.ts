/**
 * Locks the shared handicap-range rule used by every handicap input form.
 */

import {
  isHandicapInRange,
  HANDICAP_RANGE_ERROR,
  MIN_HANDICAP,
  MAX_HANDICAP,
} from '@/constants/scoring';

describe('handicap range', () => {
  it('allows plus-handicaps down to -5 and up to 54', () => {
    expect(MIN_HANDICAP).toBe(-5);
    expect(MAX_HANDICAP).toBe(54);
    expect(HANDICAP_RANGE_ERROR).toBe('Handicap must be between -5 and 54');
  });

  it('accepts values within the inclusive range', () => {
    expect(isHandicapInRange(-5)).toBe(true);
    expect(isHandicapInRange(-2.4)).toBe(true);
    expect(isHandicapInRange(0)).toBe(true);
    expect(isHandicapInRange(18)).toBe(true);
    expect(isHandicapInRange(54)).toBe(true);
  });

  it('rejects out-of-range values and NaN', () => {
    expect(isHandicapInRange(-5.1)).toBe(false);
    expect(isHandicapInRange(54.1)).toBe(false);
    expect(isHandicapInRange(NaN)).toBe(false);
    expect(isHandicapInRange(parseFloat('abc'))).toBe(false);
  });
});
