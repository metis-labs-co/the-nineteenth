/**
 * Net Score Utilities Tests
 *
 * Tests for net score calculations including:
 * - Net score calculation (gross - strokes received)
 * - Net score relative to par
 * - Total net score for a round
 * - Total gross score for a round
 * - Hole-by-hole net score breakdown
 */

import {
  calculateNetScore,
  getNetToPar,
  calculateTotalNetScore,
  calculateTotalGrossScore,
  getHoleByHoleNetScores,
} from '@/services/scoring/utils/netScoreUtils';
import type { HoleScore, Hole } from '@/services/scoring/types';

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

/**
 * Create 9 holes for front nine
 */
function createFrontNineHoles(): Hole[] {
  const pars = [4, 3, 5, 4, 4, 3, 4, 5, 4];
  return pars.map((par, i) => ({
    number: i + 1,
    par,
    strokeIndex: i + 1,
  }));
}

/**
 * Create hole scores from an array of strokes
 */
function createHoleScores(strokes: (number | null)[]): HoleScore[] {
  return strokes
    .map((s, i) => ({
      holeNumber: i + 1,
      strokes: s as number,
    }))
    .filter((s) => s.strokes !== null);
}

/**
 * Get all pars for standard course
 */
function allPars(): number[] {
  return [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
}

/**
 * Get all bogeys for standard course
 */
function allBogeys(): number[] {
  return [5, 4, 6, 5, 5, 4, 5, 6, 5, 5, 4, 6, 5, 5, 4, 5, 6, 5];
}

// ============================================================================
// Tests
// ============================================================================

describe('netScoreUtils', () => {
  // ==========================================================================
  // calculateNetScore
  // ==========================================================================
  describe('calculateNetScore', () => {
    it('returns gross when no strokes received', () => {
      expect(calculateNetScore(4, 0)).toBe(4);
    });

    it('subtracts strokes received from gross', () => {
      expect(calculateNetScore(5, 1)).toBe(4);
      expect(calculateNetScore(6, 2)).toBe(4);
      expect(calculateNetScore(7, 3)).toBe(4);
    });

    it('handles zero gross score', () => {
      expect(calculateNetScore(0, 0)).toBe(0);
    });

    it('can result in negative net (theoretical)', () => {
      // Very high handicap with low gross
      expect(calculateNetScore(3, 5)).toBe(-2);
    });

    it('handles typical golf scores', () => {
      // Par 4, gross bogey 5, 1 stroke = net par 4
      expect(calculateNetScore(5, 1)).toBe(4);
      // Par 4, gross double 6, 2 strokes = net par 4
      expect(calculateNetScore(6, 2)).toBe(4);
    });
  });

  // ==========================================================================
  // getNetToPar
  // ==========================================================================
  describe('getNetToPar', () => {
    it('returns 0 for par', () => {
      expect(getNetToPar(4, 4)).toBe(0);
      expect(getNetToPar(3, 3)).toBe(0);
      expect(getNetToPar(5, 5)).toBe(0);
    });

    it('returns negative for under par', () => {
      expect(getNetToPar(3, 4)).toBe(-1); // Birdie
      expect(getNetToPar(2, 4)).toBe(-2); // Eagle
      expect(getNetToPar(1, 4)).toBe(-3); // Albatross
    });

    it('returns positive for over par', () => {
      expect(getNetToPar(5, 4)).toBe(1); // Bogey
      expect(getNetToPar(6, 4)).toBe(2); // Double bogey
      expect(getNetToPar(7, 4)).toBe(3); // Triple bogey
    });

    it('handles all par values', () => {
      // Par 3
      expect(getNetToPar(2, 3)).toBe(-1);
      expect(getNetToPar(3, 3)).toBe(0);
      expect(getNetToPar(4, 3)).toBe(1);

      // Par 5
      expect(getNetToPar(4, 5)).toBe(-1);
      expect(getNetToPar(5, 5)).toBe(0);
      expect(getNetToPar(6, 5)).toBe(1);
    });
  });

  // ==========================================================================
  // calculateTotalNetScore
  // ==========================================================================
  describe('calculateTotalNetScore', () => {
    describe('full 18-hole round', () => {
      it('calculates net for 0 handicap (no adjustment)', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = calculateTotalNetScore(scores, holes, 0);

        // All pars, no strokes = gross 72 = net 72
        expect(result).toBe(72);
      });

      it('calculates net for 18 handicap', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = calculateTotalNetScore(scores, holes, 18);

        // Gross 72, 18 strokes received = net 54
        expect(result).toBe(54);
      });

      it('calculates net for 36 handicap', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = calculateTotalNetScore(scores, holes, 36);

        // Gross 72, 36 strokes received = net 36
        expect(result).toBe(36);
      });

      it('calculates net for high handicap (54)', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = calculateTotalNetScore(scores, holes, 54);

        // Gross 72, 54 strokes received = net 18
        expect(result).toBe(18);
      });

      it('calculates net with bogey golf', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allBogeys());

        const result = calculateTotalNetScore(scores, holes, 18);

        // Gross 90, 18 strokes = net 72
        expect(result).toBe(72);
      });
    });

    describe('9-hole round', () => {
      it('calculates net for front 9', () => {
        const holes = createFrontNineHoles();
        const scores = createHoleScores([4, 3, 5, 4, 4, 3, 4, 5, 4]); // All pars

        const result = calculateTotalNetScore(scores, holes, 9);

        // Gross 36, 9 strokes = net 27
        expect(result).toBe(27);
      });

      it('calculates net with 18-hole handicap on 9 holes', () => {
        const holes = createFrontNineHoles();
        const scores = createHoleScores([4, 3, 5, 4, 4, 3, 4, 5, 4]);

        const result = calculateTotalNetScore(scores, holes, 18);

        // Gross 36, 9 strokes (SI 1-9 each get 1) = net 27
        expect(result).toBe(27);
      });
    });

    describe('partial round', () => {
      it('calculates net with missing holes', () => {
        const holes = createStandardHoles();
        // Only first 9 holes completed
        const partialScores: (number | null)[] = [4, 3, 5, 4, 4, 3, 4, 5, 4, null, null, null, null, null, null, null, null, null];
        const scores = createHoleScores(partialScores);

        const result = calculateTotalNetScore(scores, holes, 18);

        // Front 9 gross = 36, strokes on SI 1-9 = 9, net = 27
        expect(result).toBe(27);
      });

      it('handles scattered missing holes', () => {
        const holes = createStandardHoles();
        // Some holes missing
        const scatteredScores: (number | null)[] = [4, null, 5, null, 4, null, 4, null, 4, null, 3, null, 4, null, 3, null, 5, null];
        const scores = createHoleScores(scatteredScores);

        const result = calculateTotalNetScore(scores, holes, 0);

        // Sum of completed holes: 4+5+4+4+4+3+4+3+5 = 36
        expect(result).toBe(36);
      });
    });

    describe('edge cases', () => {
      it('returns 0 for empty scores', () => {
        const holes = createStandardHoles();
        const result = calculateTotalNetScore([], holes, 18);
        expect(result).toBe(0);
      });

      it('returns 0 for empty holes', () => {
        const scores = createHoleScores(allPars());
        const result = calculateTotalNetScore(scores, [], 18);
        expect(result).toBe(0);
      });

      it('handles mismatched hole numbers', () => {
        const holes = createStandardHoles();
        // Scores for holes that don't exist
        const scores: HoleScore[] = [
          { holeNumber: 19, strokes: 4 },
          { holeNumber: 20, strokes: 5 },
        ];

        const result = calculateTotalNetScore(scores, holes, 0);

        expect(result).toBe(0);
      });

      it('skips null strokes', () => {
        const holes = createStandardHoles();
        const scores: HoleScore[] = [
          { holeNumber: 1, strokes: 4 },
          { holeNumber: 2, strokes: null as any },
          { holeNumber: 3, strokes: 5 },
        ];

        const result = calculateTotalNetScore(scores, holes, 0);

        expect(result).toBe(9); // Only holes 1 and 3
      });

      it('skips undefined strokes', () => {
        const holes = createStandardHoles();
        const scores: HoleScore[] = [
          { holeNumber: 1, strokes: 4 },
          { holeNumber: 2, strokes: undefined as any },
          { holeNumber: 3, strokes: 5 },
        ];

        const result = calculateTotalNetScore(scores, holes, 0);

        expect(result).toBe(9);
      });
    });
  });

  // ==========================================================================
  // calculateTotalGrossScore
  // ==========================================================================
  describe('calculateTotalGrossScore', () => {
    it('sums all strokes for full round', () => {
      const scores = createHoleScores(allPars());

      const result = calculateTotalGrossScore(scores);

      expect(result).toBe(72);
    });

    it('sums bogey round correctly', () => {
      const scores = createHoleScores(allBogeys());

      const result = calculateTotalGrossScore(scores);

      expect(result).toBe(90);
    });

    it('handles partial round', () => {
      const scores = createHoleScores([4, 3, 5, 4, 4, 3, 4, 5, 4]); // Front 9 pars

      const result = calculateTotalGrossScore(scores);

      expect(result).toBe(36);
    });

    it('returns 0 for empty scores', () => {
      const result = calculateTotalGrossScore([]);

      expect(result).toBe(0);
    });

    it('handles null strokes as 0', () => {
      const scores: HoleScore[] = [
        { holeNumber: 1, strokes: 4 },
        { holeNumber: 2, strokes: null as any },
        { holeNumber: 3, strokes: 5 },
      ];

      const result = calculateTotalGrossScore(scores);

      expect(result).toBe(9); // 4 + 0 + 5
    });

    it('handles undefined strokes as 0', () => {
      const scores: HoleScore[] = [
        { holeNumber: 1, strokes: 4 },
        { holeNumber: 2, strokes: undefined as any },
        { holeNumber: 3, strokes: 5 },
      ];

      const result = calculateTotalGrossScore(scores);

      expect(result).toBe(9);
    });

    it('handles high scores (pickup)', () => {
      const scores: HoleScore[] = [
        { holeNumber: 1, strokes: 10 }, // Pickup
        { holeNumber: 2, strokes: 4 },
      ];

      const result = calculateTotalGrossScore(scores);

      expect(result).toBe(14);
    });
  });

  // ==========================================================================
  // getHoleByHoleNetScores
  // ==========================================================================
  describe('getHoleByHoleNetScores', () => {
    describe('complete scorecard', () => {
      it('returns breakdown for all 18 holes', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = getHoleByHoleNetScores(scores, holes, 0);

        expect(result.length).toBe(18);
      });

      it('includes all required fields', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = getHoleByHoleNetScores(scores, holes, 0);

        expect(result[0]).toEqual({
          holeNumber: 1,
          gross: 4,
          net: 4,
          strokesReceived: 0,
          par: 4,
          netToPar: 0,
        });
      });

      it('calculates strokes received correctly', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = getHoleByHoleNetScores(scores, holes, 18);

        // With 18 handicap, each hole gets 1 stroke
        for (const hole of result) {
          expect(hole.strokesReceived).toBe(1);
          expect(hole.net).toBe(hole.gross - 1);
        }
      });

      it('calculates net to par correctly', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = getHoleByHoleNetScores(scores, holes, 18);

        // With 18 handicap, pars become net birdies
        for (const hole of result) {
          expect(hole.netToPar).toBe(-1); // Net birdie
        }
      });
    });

    describe('sorting', () => {
      it('sorts results by hole number', () => {
        const holes = createStandardHoles();
        // Scores in random order
        const scores: HoleScore[] = [
          { holeNumber: 18, strokes: 4 },
          { holeNumber: 1, strokes: 4 },
          { holeNumber: 10, strokes: 4 },
          { holeNumber: 5, strokes: 4 },
        ];

        const result = getHoleByHoleNetScores(scores, holes, 0);

        expect(result[0].holeNumber).toBe(1);
        expect(result[1].holeNumber).toBe(5);
        expect(result[2].holeNumber).toBe(10);
        expect(result[3].holeNumber).toBe(18);
      });
    });

    describe('handicap scenarios', () => {
      it('shows 0 strokes for 0 handicap', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = getHoleByHoleNetScores(scores, holes, 0);

        for (const hole of result) {
          expect(hole.strokesReceived).toBe(0);
        }
      });

      it('shows 2 strokes on low SI holes for 27 handicap', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = getHoleByHoleNetScores(scores, holes, 27);

        // SI 1-9 get 2 strokes, SI 10-18 get 1 stroke
        for (const hole of result) {
          if (hole.holeNumber <= 9) {
            expect(hole.strokesReceived).toBe(2);
          } else {
            expect(hole.strokesReceived).toBe(1);
          }
        }
      });

      it('shows 3 strokes for 54 handicap', () => {
        const holes = createStandardHoles();
        const scores = createHoleScores(allPars());

        const result = getHoleByHoleNetScores(scores, holes, 54);

        for (const hole of result) {
          expect(hole.strokesReceived).toBe(3);
        }
      });
    });

    describe('edge cases', () => {
      it('returns empty array for empty scores', () => {
        const holes = createStandardHoles();

        const result = getHoleByHoleNetScores([], holes, 18);

        expect(result).toEqual([]);
      });

      it('returns empty array for empty holes', () => {
        const scores = createHoleScores(allPars());

        const result = getHoleByHoleNetScores(scores, [], 18);

        expect(result).toEqual([]);
      });

      it('handles missing holes gracefully', () => {
        const holes = createStandardHoles();
        // Only front 9 scores
        const scores = createHoleScores([4, 3, 5, 4, 4, 3, 4, 5, 4]);

        const result = getHoleByHoleNetScores(scores, holes, 0);

        expect(result.length).toBe(9);
      });

      it('skips scores for non-existent holes', () => {
        const holes = createStandardHoles();
        const scores: HoleScore[] = [
          { holeNumber: 1, strokes: 4 },
          { holeNumber: 19, strokes: 5 }, // Non-existent
          { holeNumber: 2, strokes: 3 },
        ];

        const result = getHoleByHoleNetScores(scores, holes, 0);

        expect(result.length).toBe(2);
        expect(result[0].holeNumber).toBe(1);
        expect(result[1].holeNumber).toBe(2);
      });

      it('skips null strokes', () => {
        const holes = createStandardHoles();
        const scores: HoleScore[] = [
          { holeNumber: 1, strokes: 4 },
          { holeNumber: 2, strokes: null as any },
          { holeNumber: 3, strokes: 5 },
        ];

        const result = getHoleByHoleNetScores(scores, holes, 0);

        expect(result.length).toBe(2);
        expect(result[0].holeNumber).toBe(1);
        expect(result[1].holeNumber).toBe(3);
      });

      it('skips undefined strokes', () => {
        const holes = createStandardHoles();
        const scores: HoleScore[] = [
          { holeNumber: 1, strokes: 4 },
          { holeNumber: 2, strokes: undefined as any },
          { holeNumber: 3, strokes: 5 },
        ];

        const result = getHoleByHoleNetScores(scores, holes, 0);

        expect(result.length).toBe(2);
      });
    });

    describe('mixed scores', () => {
      it('calculates varied scores correctly', () => {
        const holes = createStandardHoles();
        // Birdie, par, bogey, double
        const scores: HoleScore[] = [
          { holeNumber: 1, strokes: 3 }, // Birdie on par 4
          { holeNumber: 2, strokes: 3 }, // Par on par 3
          { holeNumber: 3, strokes: 6 }, // Bogey on par 5
          { holeNumber: 4, strokes: 6 }, // Double on par 4
        ];

        const result = getHoleByHoleNetScores(scores, holes, 0);

        expect(result[0].netToPar).toBe(-1); // Birdie
        expect(result[1].netToPar).toBe(0); // Par
        expect(result[2].netToPar).toBe(1); // Bogey
        expect(result[3].netToPar).toBe(2); // Double
      });

      it('adjusts net to par with handicap', () => {
        const holes = createStandardHoles();
        // All bogeys gross
        const scores: HoleScore[] = [
          { holeNumber: 1, strokes: 5 }, // Bogey gross, SI 1
          { holeNumber: 2, strokes: 4 }, // Bogey gross, SI 2
          { holeNumber: 3, strokes: 6 }, // Bogey gross, SI 3
        ];

        const result = getHoleByHoleNetScores(scores, holes, 18);

        // With 1 stroke each hole, bogeys become net pars
        expect(result[0].netToPar).toBe(0);
        expect(result[1].netToPar).toBe(0);
        expect(result[2].netToPar).toBe(0);
      });
    });
  });
});
