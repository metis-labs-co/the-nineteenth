/**
 * Par Game Scoring Tests
 *
 * Tests for calculateParScore function which awards +1 (win), 0 (square), or -1 (loss)
 * based on net score relative to par.
 *
 * Scoring Rules:
 * - Net birdie or better (net score ≤ par - 1) = +1 (Win)
 * - Net par (net score = par) = 0 (Square)
 * - Net bogey or worse (net score ≥ par + 1) = -1 (Loss)
 */

import { calculateParScore } from '@/utils/scoring';
import { PAR_GAME_POINTS } from '@/constants/scoring';

describe('calculateParScore', () => {
  describe('basic scoring without strokes received', () => {
    it('returns +1 for net birdie (1 under par)', () => {
      // 3 strokes on par 4, no strokes received = net 3 = birdie
      expect(calculateParScore(3, 4, 0)).toBe(PAR_GAME_POINTS.WIN);
      expect(calculateParScore(3, 4, 0)).toBe(1);
    });

    it('returns +1 for net eagle (2 under par)', () => {
      // 2 strokes on par 4, no strokes received = net 2 = eagle
      expect(calculateParScore(2, 4, 0)).toBe(PAR_GAME_POINTS.WIN);
      expect(calculateParScore(2, 4, 0)).toBe(1);
    });

    it('returns +1 for albatross (3+ under par)', () => {
      // 1 stroke on par 4 (hole in one on par 4) = albatross
      expect(calculateParScore(1, 4, 0)).toBe(PAR_GAME_POINTS.WIN);
      // 2 strokes on par 5 = albatross
      expect(calculateParScore(2, 5, 0)).toBe(PAR_GAME_POINTS.WIN);
    });

    it('returns 0 for net par', () => {
      // 4 strokes on par 4 = par
      expect(calculateParScore(4, 4, 0)).toBe(PAR_GAME_POINTS.SQUARE);
      expect(calculateParScore(4, 4, 0)).toBe(0);
      // 3 strokes on par 3 = par
      expect(calculateParScore(3, 3, 0)).toBe(PAR_GAME_POINTS.SQUARE);
      // 5 strokes on par 5 = par
      expect(calculateParScore(5, 5, 0)).toBe(PAR_GAME_POINTS.SQUARE);
    });

    it('returns -1 for net bogey', () => {
      // 5 strokes on par 4 = bogey
      expect(calculateParScore(5, 4, 0)).toBe(PAR_GAME_POINTS.LOSS);
      expect(calculateParScore(5, 4, 0)).toBe(-1);
    });

    it('returns -1 for net double bogey or worse', () => {
      // 6 strokes on par 4 = double bogey
      expect(calculateParScore(6, 4, 0)).toBe(PAR_GAME_POINTS.LOSS);
      // 7 strokes on par 4 = triple bogey
      expect(calculateParScore(7, 4, 0)).toBe(PAR_GAME_POINTS.LOSS);
      // 10 strokes on par 4 = +6
      expect(calculateParScore(10, 4, 0)).toBe(PAR_GAME_POINTS.LOSS);
    });
  });

  describe('scoring with strokes received', () => {
    it('converts gross bogey to net par with 1 stroke received', () => {
      // 5 strokes on par 4 with 1 stroke received = net 4 = par
      expect(calculateParScore(5, 4, 1)).toBe(PAR_GAME_POINTS.SQUARE);
      expect(calculateParScore(5, 4, 1)).toBe(0);
    });

    it('converts gross bogey to net birdie with 2 strokes received', () => {
      // 5 strokes on par 4 with 2 strokes received = net 3 = birdie
      expect(calculateParScore(5, 4, 2)).toBe(PAR_GAME_POINTS.WIN);
      expect(calculateParScore(5, 4, 2)).toBe(1);
    });

    it('converts gross par to net birdie with 1 stroke received', () => {
      // 4 strokes on par 4 with 1 stroke received = net 3 = birdie
      expect(calculateParScore(4, 4, 1)).toBe(PAR_GAME_POINTS.WIN);
    });

    it('converts gross double bogey to net bogey with 1 stroke received', () => {
      // 6 strokes on par 4 with 1 stroke received = net 5 = bogey
      expect(calculateParScore(6, 4, 1)).toBe(PAR_GAME_POINTS.LOSS);
    });

    it('handles high handicap with 2 strokes on a hole', () => {
      // 7 strokes on par 4 with 2 strokes received = net 5 = bogey
      expect(calculateParScore(7, 4, 2)).toBe(PAR_GAME_POINTS.LOSS);
      // 6 strokes on par 4 with 2 strokes received = net 4 = par
      expect(calculateParScore(6, 4, 2)).toBe(PAR_GAME_POINTS.SQUARE);
      // 5 strokes on par 4 with 2 strokes received = net 3 = birdie
      expect(calculateParScore(5, 4, 2)).toBe(PAR_GAME_POINTS.WIN);
    });

    it('handles very high handicap with 3+ strokes on a hole', () => {
      // 8 strokes on par 5 with 3 strokes received = net 5 = par
      expect(calculateParScore(8, 5, 3)).toBe(PAR_GAME_POINTS.SQUARE);
      // 7 strokes on par 5 with 3 strokes received = net 4 = birdie
      expect(calculateParScore(7, 5, 3)).toBe(PAR_GAME_POINTS.WIN);
    });
  });

  describe('edge cases', () => {
    it('handles hole in one on par 3 (birdie)', () => {
      expect(calculateParScore(1, 3, 0)).toBe(PAR_GAME_POINTS.WIN);
    });

    it('handles hole in one on par 4 (eagle/albatross - still win)', () => {
      expect(calculateParScore(1, 4, 0)).toBe(PAR_GAME_POINTS.WIN);
    });

    it('handles par 3 holes', () => {
      expect(calculateParScore(2, 3, 0)).toBe(PAR_GAME_POINTS.WIN); // birdie
      expect(calculateParScore(3, 3, 0)).toBe(PAR_GAME_POINTS.SQUARE); // par
      expect(calculateParScore(4, 3, 0)).toBe(PAR_GAME_POINTS.LOSS); // bogey
    });

    it('handles par 5 holes', () => {
      expect(calculateParScore(4, 5, 0)).toBe(PAR_GAME_POINTS.WIN); // birdie
      expect(calculateParScore(5, 5, 0)).toBe(PAR_GAME_POINTS.SQUARE); // par
      expect(calculateParScore(6, 5, 0)).toBe(PAR_GAME_POINTS.LOSS); // bogey
    });

    it('handles zero strokes received (scratch golfer)', () => {
      expect(calculateParScore(4, 4, 0)).toBe(PAR_GAME_POINTS.SQUARE);
      expect(calculateParScore(3, 4, 0)).toBe(PAR_GAME_POINTS.WIN);
      expect(calculateParScore(5, 4, 0)).toBe(PAR_GAME_POINTS.LOSS);
    });
  });

  describe('running totals scenarios', () => {
    it('can sum scores across multiple holes', () => {
      // Simulate a 4-hole stretch for a player
      const scores = [
        calculateParScore(4, 4, 1), // gross 4 - 1 = net 3 on par 4 = WIN (+1)
        calculateParScore(3, 3, 0), // gross 3 on par 3 = SQUARE (0)
        calculateParScore(6, 5, 1), // gross 6 - 1 = net 5 on par 5 = SQUARE (0)
        calculateParScore(5, 4, 0), // gross 5 on par 4 = LOSS (-1)
      ];

      const totalParScore = scores.reduce((sum, score) => sum + score, 0);
      expect(totalParScore).toBe(0); // +1 + 0 + 0 + -1 = 0 (even)
    });

    it('can produce positive running total', () => {
      const scores = [
        calculateParScore(3, 4, 0), // birdie = +1
        calculateParScore(4, 4, 1), // net birdie = +1
        calculateParScore(4, 4, 0), // par = 0
      ];

      const totalParScore = scores.reduce((sum, score) => sum + score, 0);
      expect(totalParScore).toBe(2); // +1 + +1 + 0 = +2
    });

    it('can produce negative running total', () => {
      const scores = [
        calculateParScore(5, 4, 0), // bogey = -1
        calculateParScore(6, 4, 0), // double bogey = -1
        calculateParScore(4, 4, 0), // par = 0
      ];

      const totalParScore = scores.reduce((sum, score) => sum + score, 0);
      expect(totalParScore).toBe(-2); // -1 + -1 + 0 = -2
    });
  });
});
