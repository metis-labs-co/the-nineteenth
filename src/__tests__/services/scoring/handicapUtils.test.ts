/**
 * Handicap Utilities Tests
 *
 * Tests for handicap-related calculations including:
 * - Playing handicap calculation with course adjustments
 * - Handicap allowance percentages by game type
 * - Strokes received per hole based on handicap and stroke index
 * - Ambrose team handicap calculation
 */

import {
  getPlayingHandicap,
  getHandicapAllowance,
  getStrokesReceivedPerHole,
  calculateAmbroseHandicap,
  calculateStrokesForHole,
} from '@/services/scoring/utils/handicapUtils';
import type { Hole } from '@/services/scoring/types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create standard 18 holes with sequential stroke indexes
 */
function createStandardHoles(): Hole[] {
  const pars = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
  return pars.map((par, i) => ({
    number: i + 1,
    par,
    strokeIndex: i + 1, // SI 1-18
  }));
}

// ============================================================================
// Tests
// ============================================================================

describe('handicapUtils', () => {
  // ==========================================================================
  // getPlayingHandicap
  // ==========================================================================
  describe('getPlayingHandicap', () => {
    describe('basic calculation', () => {
      it('returns handicap index when slope is 113 (standard)', () => {
        const result = getPlayingHandicap(18, 113);
        expect(result).toBe(17); // 18 * 0.95 = 17.1 rounded
      });

      it('adjusts for slope rating above 113', () => {
        // Course Handicap = Index × (Slope / 113)
        // 18 × (130 / 113) = 20.7 → 21
        // With 95% allowance: 21 * 0.95 = 19.95 → 20
        const result = getPlayingHandicap(18, 130);
        expect(result).toBeGreaterThan(17);
      });

      it('adjusts for slope rating below 113', () => {
        // 18 × (100 / 113) = 15.9 → 16
        // With 95% allowance: 16 * 0.95 = 15.2 → 15
        const result = getPlayingHandicap(18, 100);
        expect(result).toBeLessThan(17);
      });

      it('uses default slope of 113 when not provided', () => {
        const result = getPlayingHandicap(18);
        expect(result).toBe(17); // 18 * 0.95 rounded
      });

      it('handles zero handicap', () => {
        const result = getPlayingHandicap(0, 113);
        expect(result).toBe(0);
      });

      it('handles high handicap (36)', () => {
        const result = getPlayingHandicap(36, 113);
        // 36 * 0.95 = 34.2 → 34
        expect(result).toBe(34);
      });

      it('handles very high handicap (54)', () => {
        const result = getPlayingHandicap(54, 113);
        // 54 * 0.95 = 51.3 → 51
        expect(result).toBe(51);
      });
    });

    describe('with course rating and par (GA 2025 formula)', () => {
      // GA Formula: Daily HC = ((GA HC × Slope ÷ 113) + (CR − Par)) × 0.93 × 0.9986
      // Then apply game type allowance (default 95%)

      it('adjusts for course rating above par', () => {
        // GA Daily HC = ((18 × 113 ÷ 113) + (74 - 72)) × 0.93 × 0.9986
        //             = (18 + 2) × 0.93 × 0.9986 = 18.57 → 19
        // With 95% allowance: 19 × 0.95 = 18.05 → 18
        const result = getPlayingHandicap(18, 113, 74, 72);
        expect(result).toBe(18);
      });

      it('adjusts for course rating below par', () => {
        // GA Daily HC = ((18) + (70 - 72)) × 0.93 × 0.9986
        //             = 16 × 0.93 × 0.9986 = 14.86 → 15
        // With 95% allowance: 15 × 0.95 = 14.25 → 14
        const result = getPlayingHandicap(18, 113, 70, 72);
        expect(result).toBe(14);
      });

      it('handles course rating equal to par', () => {
        // GA Daily HC = 18 × 0.93 × 0.9986 = 16.72 → 17
        // With 95% allowance: 17 × 0.95 = 16.15 → 16
        const result = getPlayingHandicap(18, 113, 72, 72);
        expect(result).toBe(16);
      });

      it('combines slope and course rating adjustments', () => {
        // GA Daily HC = ((18 × 130 ÷ 113) + (74 - 72)) × 0.93 × 0.9986
        //             = (20.71 + 2) × 0.93 × 0.9986 = 21.08 → 21
        // With 95% allowance: 21 × 0.95 = 19.95 → 20
        const result = getPlayingHandicap(18, 130, 74, 72);
        expect(result).toBeGreaterThanOrEqual(19);
      });
    });

    describe('with gender parameter (GA 2025 formula)', () => {
      // GA Formula: Daily HC = ((GA HC × Slope ÷ 113) + (CR − Par)) × 0.93 × consistencyFactor
      // Male consistency factor: 0.9986
      // Female consistency factor: 1.0483

      it('uses male consistency factor by default (when gender not provided)', () => {
        // GA Daily HC = ((18 × 113 ÷ 113) + (72 - 72)) × 0.93 × 0.9986
        //             = 18 × 0.93 × 0.9986 = 16.72 → 17
        // With 95% allowance: 17 × 0.95 = 16.15 → 16
        const result = getPlayingHandicap(18, 113, 72, 72, 'stableford');
        expect(result).toBe(16);
      });

      it('uses male consistency factor when gender is male', () => {
        // Same calculation as default
        const result = getPlayingHandicap(18, 113, 72, 72, 'stableford', 'male');
        expect(result).toBe(16);
      });

      it('uses male consistency factor when gender is null', () => {
        // Same calculation as default
        const result = getPlayingHandicap(18, 113, 72, 72, 'stableford', null);
        expect(result).toBe(16);
      });

      it('uses female consistency factor when gender is female', () => {
        // GA Daily HC = ((18 × 113 ÷ 113) + (72 - 72)) × 0.93 × 1.0483
        //             = 18 × 0.93 × 1.0483 = 17.55 → 18
        // With 95% allowance: 18 × 0.95 = 17.1 → 17
        const result = getPlayingHandicap(18, 113, 72, 72, 'stableford', 'female');
        expect(result).toBe(17);
      });

      it('female gets higher daily handicap than male for same index', () => {
        // Female consistency factor (1.0483) > Male (0.9986)
        const maleResult = getPlayingHandicap(18, 113, 72, 72, 'stableford', 'male');
        const femaleResult = getPlayingHandicap(18, 113, 72, 72, 'stableford', 'female');
        expect(femaleResult).toBeGreaterThanOrEqual(maleResult);
      });

      it('applies gender-adjusted daily handicap with course rating above par', () => {
        // GA Daily HC (female) = ((18 × 113 ÷ 113) + (74 - 72)) × 0.93 × 1.0483
        //                      = (18 + 2) × 0.93 × 1.0483 = 19.50 → 19 (rounded)
        // With 95% allowance: 19 × 0.95 = 18.05 → 18
        const result = getPlayingHandicap(18, 113, 74, 72, 'stableford', 'female');
        expect(result).toBe(18);
      });

      it('applies gender-adjusted daily handicap with course rating below par', () => {
        // GA Daily HC (female) = ((18 × 113 ÷ 113) + (70 - 72)) × 0.93 × 1.0483
        //                      = (18 - 2) × 0.93 × 1.0483 = 15.60 → 16
        // With 95% allowance: 16 × 0.95 = 15.2 → 15
        const result = getPlayingHandicap(18, 113, 70, 72, 'stableford', 'female');
        expect(result).toBe(15);
      });

      it('maintains backward compatibility - existing calls without gender work', () => {
        // Should work exactly as before (defaults to male factor)
        const withoutGender = getPlayingHandicap(18, 113, 72, 72);
        const withUndefinedGender = getPlayingHandicap(18, 113, 72, 72, 'stableford', undefined);
        expect(withoutGender).toBe(withUndefinedGender);
      });
    });

    describe('with game type allowances', () => {
      it('applies 95% for stableford', () => {
        const result = getPlayingHandicap(20, 113, undefined, undefined, 'stableford');
        // 20 * 0.95 = 19
        expect(result).toBe(19);
      });

      it('applies 95% for stroke play', () => {
        const result = getPlayingHandicap(20, 113, undefined, undefined, 'stroke');
        expect(result).toBe(19);
      });

      it('applies 100% for match play', () => {
        const result = getPlayingHandicap(20, 113, undefined, undefined, 'match-play');
        // 20 * 1.0 = 20
        expect(result).toBe(20);
      });

      it('applies 85% for best ball', () => {
        const result = getPlayingHandicap(20, 113, undefined, undefined, 'best-ball');
        // 20 * 0.85 = 17
        expect(result).toBe(17);
      });

      it('applies 100% for ambrose', () => {
        const result = getPlayingHandicap(20, 113, undefined, undefined, 'ambrose');
        // 20 * 1.0 = 20
        expect(result).toBe(20);
      });

      it('uses 95% for undefined game type', () => {
        const result = getPlayingHandicap(20, 113);
        expect(result).toBe(19);
      });
    });
  });

  // ==========================================================================
  // getHandicapAllowance
  // ==========================================================================
  describe('getHandicapAllowance', () => {
    it('returns 0.95 (95%) for stableford', () => {
      expect(getHandicapAllowance('stableford')).toBe(0.95);
    });

    it('returns 0.95 (95%) for stroke play', () => {
      expect(getHandicapAllowance('stroke')).toBe(0.95);
    });

    it('returns 1.0 (100%) for match play', () => {
      expect(getHandicapAllowance('match-play')).toBe(1.0);
    });

    it('returns 0.85 (85%) for best ball', () => {
      expect(getHandicapAllowance('best-ball')).toBe(0.85);
    });

    it('returns 1.0 (100%) for ambrose', () => {
      expect(getHandicapAllowance('ambrose')).toBe(1.0);
    });

    it('returns 0.95 (95%) for undefined game type', () => {
      expect(getHandicapAllowance(undefined)).toBe(0.95);
    });

    it('returns 0.95 (95%) for unknown game type', () => {
      expect(getHandicapAllowance('unknown' as any)).toBe(0.95);
    });
  });

  // ==========================================================================
  // getStrokesReceivedPerHole
  // ==========================================================================
  describe('getStrokesReceivedPerHole', () => {
    it('returns 0 strokes for 0 handicap', () => {
      const holes = createStandardHoles();
      const result = getStrokesReceivedPerHole(0, holes);

      expect(result.size).toBe(18);
      for (let i = 1; i <= 18; i++) {
        expect(result.get(i)).toBe(0);
      }
    });

    it('returns 1 stroke each hole for 18 handicap', () => {
      const holes = createStandardHoles();
      const result = getStrokesReceivedPerHole(18, holes);

      expect(result.size).toBe(18);
      for (let i = 1; i <= 18; i++) {
        expect(result.get(i)).toBe(1);
      }
    });

    it('returns 1 stroke on SI 1-10 for 10 handicap', () => {
      const holes = createStandardHoles();
      const result = getStrokesReceivedPerHole(10, holes);

      // Holes with SI 1-10 get 1 stroke
      for (let i = 1; i <= 10; i++) {
        expect(result.get(i)).toBe(1);
      }
      // Holes with SI 11-18 get 0 strokes
      for (let i = 11; i <= 18; i++) {
        expect(result.get(i)).toBe(0);
      }
    });

    it('returns 2 strokes on SI 1-9 for 27 handicap', () => {
      const holes = createStandardHoles();
      const result = getStrokesReceivedPerHole(27, holes);

      // Handicap 27: base = floor(27/18) = 1, remainder = 9
      // SI 1-9: 2 strokes (base + 1 for remainder)
      // SI 10-18: 1 stroke (base only)
      for (let i = 1; i <= 9; i++) {
        expect(result.get(i)).toBe(2);
      }
      for (let i = 10; i <= 18; i++) {
        expect(result.get(i)).toBe(1);
      }
    });

    it('returns 2 strokes each hole for 36 handicap', () => {
      const holes = createStandardHoles();
      const result = getStrokesReceivedPerHole(36, holes);

      for (let i = 1; i <= 18; i++) {
        expect(result.get(i)).toBe(2);
      }
    });

    it('returns 3 strokes each hole for 54 handicap', () => {
      const holes = createStandardHoles();
      const result = getStrokesReceivedPerHole(54, holes);

      for (let i = 1; i <= 18; i++) {
        expect(result.get(i)).toBe(3);
      }
    });

    it('handles non-sequential stroke indexes', () => {
      // Real course might have SI: 7, 15, 3, 11, 1, 17, 5, 9, 13, 8, 16, 4, 12, 2, 18, 6, 10, 14
      const holes: Hole[] = [
        { number: 1, par: 4, strokeIndex: 7 },
        { number: 2, par: 3, strokeIndex: 15 },
        { number: 3, par: 5, strokeIndex: 3 },
        { number: 4, par: 4, strokeIndex: 11 },
        { number: 5, par: 4, strokeIndex: 1 },
        { number: 6, par: 3, strokeIndex: 17 },
        { number: 7, par: 4, strokeIndex: 5 },
        { number: 8, par: 5, strokeIndex: 9 },
        { number: 9, par: 4, strokeIndex: 13 },
        { number: 10, par: 4, strokeIndex: 8 },
        { number: 11, par: 3, strokeIndex: 16 },
        { number: 12, par: 5, strokeIndex: 4 },
        { number: 13, par: 4, strokeIndex: 12 },
        { number: 14, par: 4, strokeIndex: 2 },
        { number: 15, par: 3, strokeIndex: 18 },
        { number: 16, par: 4, strokeIndex: 6 },
        { number: 17, par: 5, strokeIndex: 10 },
        { number: 18, par: 4, strokeIndex: 14 },
      ];

      const result = getStrokesReceivedPerHole(10, holes);

      // With 10 handicap, strokes on holes with SI 1-10
      expect(result.get(5)).toBe(1); // SI 1
      expect(result.get(14)).toBe(1); // SI 2
      expect(result.get(3)).toBe(1); // SI 3
      expect(result.get(12)).toBe(1); // SI 4
      expect(result.get(7)).toBe(1); // SI 5
      expect(result.get(16)).toBe(1); // SI 6
      expect(result.get(1)).toBe(1); // SI 7
      expect(result.get(10)).toBe(1); // SI 8
      expect(result.get(8)).toBe(1); // SI 9
      expect(result.get(17)).toBe(1); // SI 10

      // No strokes on SI 11-18
      expect(result.get(4)).toBe(0); // SI 11
      expect(result.get(2)).toBe(0); // SI 15
      expect(result.get(6)).toBe(0); // SI 17
    });

    it('handles empty holes array', () => {
      const result = getStrokesReceivedPerHole(18, []);
      expect(result.size).toBe(0);
    });

    it('handles 9-hole course', () => {
      const holes: Hole[] = [];
      for (let i = 1; i <= 9; i++) {
        holes.push({ number: i, par: 4, strokeIndex: i });
      }

      const result = getStrokesReceivedPerHole(9, holes);

      expect(result.size).toBe(9);
      for (let i = 1; i <= 9; i++) {
        expect(result.get(i)).toBe(1);
      }
    });
  });

  // ==========================================================================
  // calculateStrokesForHole (alias for getStrokesReceived)
  // ==========================================================================
  describe('calculateStrokesForHole', () => {
    it('is an alias for getStrokesReceived', () => {
      // This is marked as deprecated but should still work
      expect(calculateStrokesForHole(18, 1)).toBe(1);
      expect(calculateStrokesForHole(18, 18)).toBe(1);
      expect(calculateStrokesForHole(10, 5)).toBe(1);
      expect(calculateStrokesForHole(10, 15)).toBe(0);
    });

    it('returns correct strokes for boundary cases', () => {
      expect(calculateStrokesForHole(0, 1)).toBe(0);
      expect(calculateStrokesForHole(36, 1)).toBe(2);
      expect(calculateStrokesForHole(54, 1)).toBe(3);
    });
  });

  // ==========================================================================
  // calculateAmbroseHandicap
  // ==========================================================================
  describe('calculateAmbroseHandicap', () => {
    describe('2-person team', () => {
      it('calculates correctly: (H1 + H2) / 4', () => {
        // (20 + 16) / 4 = 9
        const result = calculateAmbroseHandicap([20, 16]);
        expect(result).toBe(9);
      });

      it('rounds to nearest integer', () => {
        // (15 + 10) / 4 = 6.25 → 6
        const result = calculateAmbroseHandicap([15, 10]);
        expect(result).toBe(6);
      });

      it('handles equal handicaps', () => {
        // (18 + 18) / 4 = 9
        const result = calculateAmbroseHandicap([18, 18]);
        expect(result).toBe(9);
      });

      it('handles zero handicaps', () => {
        const result = calculateAmbroseHandicap([0, 0]);
        expect(result).toBe(0);
      });

      it('handles mixed zero and non-zero', () => {
        // (0 + 20) / 4 = 5
        const result = calculateAmbroseHandicap([0, 20]);
        expect(result).toBe(5);
      });
    });

    describe('3-person team', () => {
      it('calculates correctly: (H1 + H2 + H3) / 6', () => {
        // (18 + 12 + 6) / 6 = 6
        const result = calculateAmbroseHandicap([18, 12, 6]);
        expect(result).toBe(6);
      });

      it('rounds to nearest integer', () => {
        // (20 + 15 + 10) / 6 = 7.5 → 8
        const result = calculateAmbroseHandicap([20, 15, 10]);
        expect(result).toBe(8);
      });
    });

    describe('4-person team', () => {
      it('calculates correctly: (H1 + H2 + H3 + H4) / 8', () => {
        // (20 + 16 + 12 + 8) / 8 = 7
        const result = calculateAmbroseHandicap([20, 16, 12, 8]);
        expect(result).toBe(7);
      });

      it('rounds to nearest integer', () => {
        // (18 + 18 + 18 + 18) / 8 = 9
        const result = calculateAmbroseHandicap([18, 18, 18, 18]);
        expect(result).toBe(9);
      });

      it('handles all zeros', () => {
        const result = calculateAmbroseHandicap([0, 0, 0, 0]);
        expect(result).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('returns 0 for empty team', () => {
        const result = calculateAmbroseHandicap([]);
        expect(result).toBe(0);
      });

      it('calculates for single player team', () => {
        // 18 / 2 = 9
        const result = calculateAmbroseHandicap([18]);
        expect(result).toBe(9);
      });

      it('calculates for 5+ player team', () => {
        // (10 + 10 + 10 + 10 + 10) / 10 = 5
        const result = calculateAmbroseHandicap([10, 10, 10, 10, 10]);
        expect(result).toBe(5);
      });

      it('handles high handicaps', () => {
        // (36 + 36) / 4 = 18
        const result = calculateAmbroseHandicap([36, 36]);
        expect(result).toBe(18);
      });

      it('handles very high handicaps', () => {
        // (54 + 54 + 54 + 54) / 8 = 27
        const result = calculateAmbroseHandicap([54, 54, 54, 54]);
        expect(result).toBe(27);
      });
    });
  });
});
