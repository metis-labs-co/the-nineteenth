/**
 * Decay model tests
 *
 * Covers the four quick-setup decay strategies in
 * src/utils/competitionPoints/decay.ts.
 */

import {
  scaledStandard,
  linearToOne,
  linearMinusTwo,
  halvingPairs,
  applyDecayModel,
} from '@/utils/competitionPoints/decay';

describe('scaledStandard', () => {
  it('reproduces the baked-in Standard shape when value=10', () => {
    expect(scaledStandard(10)).toEqual([10, 8, 6, 5, 4, 3, 2, 1]);
  });

  it('scales proportionally to other values', () => {
    // 1st=20 → each position doubled
    expect(scaledStandard(20)).toEqual([20, 16, 12, 10, 8, 6, 4, 2]);
  });

  it('rounds to whole points', () => {
    // 1st=15 → shape * 1.5
    expect(scaledStandard(15)).toEqual([15, 12, 9, 8, 6, 5, 3, 2]);
  });

  it('floors at 0 for zero value', () => {
    expect(scaledStandard(0)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('treats negative input as zero', () => {
    expect(scaledStandard(-5)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('respects a shorter position count', () => {
    expect(scaledStandard(10, 4)).toEqual([10, 8, 6, 5]);
  });

  it('extends past 8 positions without producing negatives', () => {
    const extended = scaledStandard(10, 10);
    expect(extended).toHaveLength(10);
    expect(extended.slice(0, 8)).toEqual([10, 8, 6, 5, 4, 3, 2, 1]);
    expect(extended[8]).toBeGreaterThanOrEqual(0);
    expect(extended[9]).toBeGreaterThanOrEqual(0);
  });
});

describe('linearToOne', () => {
  it('starts at value, ends at 1, evenly spaced', () => {
    expect(linearToOne(8, 8)).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('rounds mid-steps when the division is not clean', () => {
    // 1st=20, 8 positions → step = 19/7 ≈ 2.71
    const out = linearToOne(20, 8);
    expect(out[0]).toBe(20);
    expect(out[7]).toBe(1);
    expect(out).toHaveLength(8);
    // Monotonically non-increasing
    for (let i = 1; i < out.length; i++) {
      expect(out[i]).toBeLessThanOrEqual(out[i - 1]);
    }
  });

  it('returns just the value when positions=1', () => {
    expect(linearToOne(10, 1)).toEqual([10]);
  });

  it('returns an empty array for zero positions', () => {
    expect(linearToOne(10, 0)).toEqual([]);
  });
});

describe('linearMinusTwo', () => {
  it('drops by 2 per position', () => {
    expect(linearMinusTwo(20)).toEqual([20, 18, 16, 14, 12, 10, 8, 6]);
  });

  it('clamps at 0 when values would go negative', () => {
    expect(linearMinusTwo(4, 8)).toEqual([4, 2, 0, 0, 0, 0, 0, 0]);
  });

  it('handles zero value cleanly', () => {
    expect(linearMinusTwo(0)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('halvingPairs', () => {
  it('assigns same value to each pair, halving each', () => {
    expect(halvingPairs(20)).toEqual([20, 20, 10, 10, 5, 5, 3, 3]);
  });

  it('rounds half values correctly', () => {
    expect(halvingPairs(10)).toEqual([10, 10, 5, 5, 3, 3, 1, 1]);
  });

  it('floors at 0 once the halving drops below 1', () => {
    const out = halvingPairs(4, 10);
    expect(out).toEqual([4, 4, 2, 2, 1, 1, 1, 1, 0, 0]);
  });
});

describe('applyDecayModel dispatcher', () => {
  it('routes to scaled_standard', () => {
    expect(applyDecayModel('scaled_standard', 10)).toEqual(scaledStandard(10));
  });

  it('routes to linear_to_one', () => {
    expect(applyDecayModel('linear_to_one', 8)).toEqual(linearToOne(8));
  });

  it('routes to linear_minus_two', () => {
    expect(applyDecayModel('linear_minus_two', 20)).toEqual(linearMinusTwo(20));
  });

  it('routes to halving_pairs', () => {
    expect(applyDecayModel('halving_pairs', 20)).toEqual(halvingPairs(20));
  });

  it('respects the positions argument for all models', () => {
    for (const id of [
      'scaled_standard',
      'linear_to_one',
      'linear_minus_two',
      'halving_pairs',
    ] as const) {
      expect(applyDecayModel(id, 10, 4)).toHaveLength(4);
    }
  });
});
