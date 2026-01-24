/**
 * Tests for WHS Handicap Differential Utilities
 */

import {
  calculateScoreDifferential,
  getQualifyingCount,
  calculateHandicapIndex,
  getRatingsForGender,
} from '@/utils/handicapDifferential';

describe('calculateScoreDifferential', () => {
  describe('standard inputs', () => {
    it('calculates correct differential for typical round', () => {
      // Player scores 85 on CR 72.5, slope 125
      // Expected: (113 / 125) × (85 - 72.5) = 0.904 × 12.5 = 11.3
      const result = calculateScoreDifferential({
        adjustedGrossScore: 85,
        courseRating: 72.5,
        slopeRating: 125,
      });
      expect(result).toBe(11.3);
    });

    it('calculates correct differential for scratch score', () => {
      // Player scores 72 on CR 72.0, slope 120
      // Expected: (113 / 120) × (72 - 72) = 0
      const result = calculateScoreDifferential({
        adjustedGrossScore: 72,
        courseRating: 72.0,
        slopeRating: 120,
      });
      expect(result).toBe(0);
    });

    it('calculates negative differential when below course rating', () => {
      // Player scores 68 on CR 72.0, slope 120
      // Expected: (113 / 120) × (68 - 72) = 0.942 × -4 = -3.8
      const result = calculateScoreDifferential({
        adjustedGrossScore: 68,
        courseRating: 72.0,
        slopeRating: 120,
      });
      expect(result).toBe(-3.8);
    });
  });

  describe('different slope ratings', () => {
    it('adjusts correctly for low slope (100)', () => {
      // Easier course amplifies differential
      // (113 / 100) × (85 - 72.5) = 1.13 × 12.5 = 14.1
      const result = calculateScoreDifferential({
        adjustedGrossScore: 85,
        courseRating: 72.5,
        slopeRating: 100,
      });
      expect(result).toBe(14.1);
    });

    it('adjusts correctly for neutral slope (113)', () => {
      // Neutral slope = no adjustment
      // (113 / 113) × (85 - 72.5) = 1 × 12.5 = 12.5
      const result = calculateScoreDifferential({
        adjustedGrossScore: 85,
        courseRating: 72.5,
        slopeRating: 113,
      });
      expect(result).toBe(12.5);
    });

    it('adjusts correctly for high slope (145)', () => {
      // Harder course reduces differential
      // (113 / 145) × (85 - 72.5) = 0.779 × 12.5 = 9.7
      const result = calculateScoreDifferential({
        adjustedGrossScore: 85,
        courseRating: 72.5,
        slopeRating: 145,
      });
      expect(result).toBe(9.7);
    });
  });

  describe('edge cases', () => {
    it('returns null for zero slope rating', () => {
      const result = calculateScoreDifferential({
        adjustedGrossScore: 85,
        courseRating: 72.5,
        slopeRating: 0,
      });
      expect(result).toBeNull();
    });

    it('returns null for negative slope rating', () => {
      const result = calculateScoreDifferential({
        adjustedGrossScore: 85,
        courseRating: 72.5,
        slopeRating: -1,
      });
      expect(result).toBeNull();
    });

    it('returns null for zero course rating', () => {
      const result = calculateScoreDifferential({
        adjustedGrossScore: 85,
        courseRating: 0,
        slopeRating: 125,
      });
      expect(result).toBeNull();
    });

    it('returns null for negative course rating', () => {
      const result = calculateScoreDifferential({
        adjustedGrossScore: 85,
        courseRating: -1,
        slopeRating: 125,
      });
      expect(result).toBeNull();
    });

    it('rounds to 1 decimal place', () => {
      // (113 / 121) × (83 - 71.3) = 0.9338... × 11.7 = 10.926...
      const result = calculateScoreDifferential({
        adjustedGrossScore: 83,
        courseRating: 71.3,
        slopeRating: 121,
      });
      expect(result).toBe(10.9);
    });
  });
});

describe('getQualifyingCount', () => {
  describe('WHS counting table', () => {
    it('returns 0 for 0 rounds', () => {
      expect(getQualifyingCount(0)).toBe(0);
    });

    it('returns 0 for negative rounds', () => {
      expect(getQualifyingCount(-5)).toBe(0);
    });

    it('returns 1 for 1-5 rounds', () => {
      expect(getQualifyingCount(1)).toBe(1);
      expect(getQualifyingCount(3)).toBe(1);
      expect(getQualifyingCount(5)).toBe(1);
    });

    it('returns 2 for 6-8 rounds', () => {
      expect(getQualifyingCount(6)).toBe(2);
      expect(getQualifyingCount(7)).toBe(2);
      expect(getQualifyingCount(8)).toBe(2);
    });

    it('returns 3 for 9-11 rounds', () => {
      expect(getQualifyingCount(9)).toBe(3);
      expect(getQualifyingCount(10)).toBe(3);
      expect(getQualifyingCount(11)).toBe(3);
    });

    it('returns 4 for 12-14 rounds', () => {
      expect(getQualifyingCount(12)).toBe(4);
      expect(getQualifyingCount(13)).toBe(4);
      expect(getQualifyingCount(14)).toBe(4);
    });

    it('returns 5 for 15-16 rounds', () => {
      expect(getQualifyingCount(15)).toBe(5);
      expect(getQualifyingCount(16)).toBe(5);
    });

    it('returns 6 for 17-18 rounds', () => {
      expect(getQualifyingCount(17)).toBe(6);
      expect(getQualifyingCount(18)).toBe(6);
    });

    it('returns 7 for 19 rounds', () => {
      expect(getQualifyingCount(19)).toBe(7);
    });

    it('returns 8 for 20+ rounds', () => {
      expect(getQualifyingCount(20)).toBe(8);
      expect(getQualifyingCount(30)).toBe(8);
      expect(getQualifyingCount(100)).toBe(8);
    });
  });
});

describe('calculateHandicapIndex', () => {
  describe('basic calculations', () => {
    it('returns null for empty array', () => {
      expect(calculateHandicapIndex([])).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(calculateHandicapIndex(undefined as unknown as number[])).toBeNull();
    });

    it('calculates correctly for single round', () => {
      // 1 round = use best 1
      // Average = 15.0, × 0.96 = 14.4
      const result = calculateHandicapIndex([15.0]);
      expect(result).toBe(14.4);
    });

    it('calculates correctly for 5 rounds using best 1', () => {
      // 5 rounds = use best 1 (lowest differential)
      // Best = 10.0, × 0.96 = 9.6
      const result = calculateHandicapIndex([15.0, 12.5, 14.2, 10.0, 18.3]);
      expect(result).toBe(9.6);
    });

    it('calculates correctly for 8 rounds using best 2', () => {
      // 8 rounds = use best 2
      // Best 2 = 10.0, 11.5 → Average = 10.75, × 0.96 = 10.32 → 10.3
      const differentials = [15.0, 12.5, 14.2, 10.0, 18.3, 16.1, 11.5, 13.8];
      const result = calculateHandicapIndex(differentials);
      expect(result).toBe(10.3);
    });

    it('calculates correctly for 20 rounds using best 8', () => {
      // 20 rounds = use best 8
      const differentials = [
        10.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 14.5, // Best 8
        15.0, 15.5, 16.0, 16.5, 17.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.0, 20.5,
      ];
      // Best 8 avg = (10+11.5+12+12.5+13+13.5+14+14.5)/8 = 101/8 = 12.625
      // × 0.96 = 12.12
      const result = calculateHandicapIndex(differentials);
      expect(result).toBe(12.1);
    });
  });

  describe('0.96 multiplier', () => {
    it('applies 0.96 multiplier correctly', () => {
      // 3 rounds = use best 1
      // Best = 20.0, × 0.96 = 19.2
      const result = calculateHandicapIndex([20.0, 25.0, 30.0]);
      expect(result).toBe(19.2);
    });

    it('applies multiplier before rounding', () => {
      // Best 1 = 10.5, × 0.96 = 10.08 → rounds to 10.1
      const result = calculateHandicapIndex([10.5, 15.0, 20.0]);
      expect(result).toBe(10.1);
    });
  });

  describe('maximum cap', () => {
    it('caps at 54.0', () => {
      // Extremely high differential
      // Best 1 = 60.0, × 0.96 = 57.6 → should cap at 54.0
      const result = calculateHandicapIndex([60.0]);
      expect(result).toBe(54.0);
    });

    it('does not cap when below maximum', () => {
      // Best 1 = 50.0, × 0.96 = 48.0 → no cap needed
      const result = calculateHandicapIndex([50.0, 55.0, 60.0]);
      expect(result).toBe(48.0);
    });
  });

  describe('order independence', () => {
    it('produces same result regardless of input order', () => {
      const differentials = [12.5, 10.0, 15.0, 8.5, 18.0, 14.2, 11.8, 16.5];
      const shuffled = [15.0, 8.5, 16.5, 12.5, 10.0, 18.0, 14.2, 11.8];

      const result1 = calculateHandicapIndex(differentials);
      const result2 = calculateHandicapIndex(shuffled);

      expect(result1).toBe(result2);
    });
  });
});

describe('getRatingsForGender', () => {
  const teeWithBothRatings = {
    course_rating: 72.5,
    slope_rating: 125,
    womens_course_rating: 74.5,
    womens_slope_rating: 130,
  };

  const teeWithMensOnly = {
    course_rating: 72.5,
    slope_rating: 125,
    womens_course_rating: null,
    womens_slope_rating: null,
  };

  const teeWithNoRatings = {
    course_rating: null,
    slope_rating: null,
    womens_course_rating: null,
    womens_slope_rating: null,
  };

  describe('male player', () => {
    it('returns mens ratings for male player', () => {
      const result = getRatingsForGender(teeWithBothRatings, 'male');
      expect(result).toEqual({
        courseRating: 72.5,
        slopeRating: 125,
      });
    });

    it('returns mens ratings when gender is null', () => {
      const result = getRatingsForGender(teeWithBothRatings, null);
      expect(result).toEqual({
        courseRating: 72.5,
        slopeRating: 125,
      });
    });

    it('returns mens ratings when gender is undefined', () => {
      const result = getRatingsForGender(teeWithBothRatings, undefined);
      expect(result).toEqual({
        courseRating: 72.5,
        slopeRating: 125,
      });
    });
  });

  describe('female player', () => {
    it('returns womens ratings when available', () => {
      const result = getRatingsForGender(teeWithBothRatings, 'female');
      expect(result).toEqual({
        courseRating: 74.5,
        slopeRating: 130,
      });
    });

    it('falls back to mens ratings when womens not available', () => {
      const result = getRatingsForGender(teeWithMensOnly, 'female');
      expect(result).toEqual({
        courseRating: 72.5,
        slopeRating: 125,
      });
    });
  });

  describe('edge cases', () => {
    it('returns null for null tee', () => {
      const result = getRatingsForGender(null, 'male');
      expect(result).toBeNull();
    });

    it('returns null for undefined tee', () => {
      const result = getRatingsForGender(undefined, 'male');
      expect(result).toBeNull();
    });

    it('returns null when no valid ratings exist', () => {
      const result = getRatingsForGender(teeWithNoRatings, 'male');
      expect(result).toBeNull();
    });

    it('returns null for zero course rating', () => {
      const tee = { ...teeWithMensOnly, course_rating: 0 };
      const result = getRatingsForGender(tee, 'male');
      expect(result).toBeNull();
    });

    it('returns null for zero slope rating', () => {
      const tee = { ...teeWithMensOnly, slope_rating: 0 };
      const result = getRatingsForGender(tee, 'male');
      expect(result).toBeNull();
    });

    it('falls back to mens when womens course rating is zero', () => {
      const tee = { ...teeWithBothRatings, womens_course_rating: 0 };
      const result = getRatingsForGender(tee, 'female');
      expect(result).toEqual({
        courseRating: 72.5,
        slopeRating: 125,
      });
    });
  });
});
