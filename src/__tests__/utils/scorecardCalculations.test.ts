/**
 * Scorecard Calculations Tests
 *
 * Tests for shared utility functions for calculating player statistics and totals
 * for scorecard displays. Tests calculatePlayerStats, calculateParTotals,
 * splitHolesByNine, generateDefaultHoles, and calculateHoleStableford.
 */

import {
  calculatePlayerStats,
  calculateParTotals,
  splitHolesByNine,
  generateDefaultHoles,
  calculateHoleStableford,
  type ScorecardPlayerData,
  type ScoresRecord,
} from '@/utils/scorecardCalculations';
import { create18Holes } from './testFixtures';
import type { Hole } from '@/types/database.types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a ScorecardPlayerData object for testing
 */
function createScorecardPlayerData(
  playerId: string,
  playerName: string,
  handicap: number | null,
  scores: ScoresRecord | null = null
): ScorecardPlayerData {
  return {
    id: playerId,
    playerId,
    player: {
      id: playerId,
      name: playerName,
      handicap,
    },
    scores,
    hasScorecard: scores !== null,
  };
}

/**
 * Create scores for all 18 holes based on par with offset
 */
function createFullScores(holes: Hole[], scoreOffset = 0): ScoresRecord {
  const scores: ScoresRecord = {};
  holes.forEach((hole) => {
    scores[String(hole.number)] = {
      strokes: hole.par + scoreOffset,
    };
  });
  return scores;
}

/**
 * Create scores for specific holes only
 */
function createPartialScores(
  holes: Hole[],
  holeNumbers: number[],
  scoreOffset = 0
): ScoresRecord {
  const scores: ScoresRecord = {};
  holeNumbers.forEach((num) => {
    const hole = holes.find((h) => h.number === num);
    if (hole) {
      scores[String(num)] = {
        strokes: hole.par + scoreOffset,
      };
    }
  });
  return scores;
}

/**
 * Create a Par 3 course (all par 3s)
 */
function createPar3Course(): Hole[] {
  return Array.from({ length: 18 }, (_, i) => ({
    number: (i + 1) as Hole['number'],
    par: 3 as const,
    strokeIndex: i + 1,
  }));
}

/**
 * Create a course with mixed par values
 */
function createMixedParCourse(): Hole[] {
  // Par distribution: 3-4-5-3-4-5-3-4-5 (front), 3-4-5-3-4-5-3-4-5 (back)
  const pars: (3 | 4 | 5)[] = [3, 4, 5, 3, 4, 5, 3, 4, 5, 3, 4, 5, 3, 4, 5, 3, 4, 5];
  return pars.map((par, i) => ({
    number: (i + 1) as Hole['number'],
    par,
    strokeIndex: i + 1,
  }));
}

// ============================================================================
// calculatePlayerStats Tests
// ============================================================================

describe('calculatePlayerStats', () => {
  const holes = create18Holes();

  describe('basic calculations', () => {
    it('calculates stats for a player with full scores at par', () => {
      const scores = createFullScores(holes, 0); // Play to par
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'John Smith', 18, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        playerId: 'player-1',
        playerName: 'John Smith',
        handicap: 18,
        hasScores: true,
      });

      // For par 72 course (sum of all pars)
      const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
      expect(stats[0].totalGross).toBe(totalPar);
      expect(stats[0].totalNet).toBe(totalPar - 18); // Gross minus handicap
    });

    it('calculates stats for a player scoring over par', () => {
      const scores = createFullScores(holes, 1); // 1 over par per hole
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'John Smith', 10, scores),
      ];

      const stats = calculatePlayerStats(players, holes);
      const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

      expect(stats[0].totalGross).toBe(totalPar + 18); // 18 strokes over par
      expect(stats[0].totalNet).toBe(totalPar + 18 - 10); // Gross minus handicap
    });

    it('calculates stats for a player scoring under par', () => {
      const scores = createFullScores(holes, -1); // 1 under par per hole
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Pro Player', 0, scores),
      ];

      const stats = calculatePlayerStats(players, holes);
      const totalPar = holes.reduce((sum, h) => sum + h.par, 0);

      expect(stats[0].totalGross).toBe(totalPar - 18);
      expect(stats[0].totalNet).toBe(totalPar - 18); // Same as gross for 0 handicap
    });

    it('calculates stats for multiple players', () => {
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Player One', 10, createFullScores(holes, 0)),
        createScorecardPlayerData('player-2', 'Player Two', 20, createFullScores(holes, 2)),
        createScorecardPlayerData('player-3', 'Player Three', 5, createFullScores(holes, -1)),
      ];

      const stats = calculatePlayerStats(players, holes);

      expect(stats).toHaveLength(3);
      expect(stats[0].playerName).toBe('Player One');
      expect(stats[1].playerName).toBe('Player Two');
      expect(stats[2].playerName).toBe('Player Three');
    });
  });

  describe('front 9 / back 9 aggregation', () => {
    it('correctly splits scores between front 9 and back 9', () => {
      const scores = createFullScores(holes, 0);
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Test Player', 18, scores),
      ];

      const stats = calculatePlayerStats(players, holes);
      const front9Par = holes.filter((h) => h.number <= 9).reduce((sum, h) => sum + h.par, 0);
      const back9Par = holes.filter((h) => h.number > 9).reduce((sum, h) => sum + h.par, 0);

      expect(stats[0].front9Gross).toBe(front9Par);
      expect(stats[0].back9Gross).toBe(back9Par);
      expect(stats[0].front9Gross + stats[0].back9Gross).toBe(stats[0].totalGross);
    });

    it('handles different scores on front vs back 9', () => {
      // Front 9: par, Back 9: +2 per hole
      const scores: ScoresRecord = {};
      holes.forEach((hole) => {
        const offset = hole.number <= 9 ? 0 : 2;
        scores[String(hole.number)] = { strokes: hole.par + offset };
      });

      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Test Player', 0, scores),
      ];

      const stats = calculatePlayerStats(players, holes);
      const front9Par = holes.filter((h) => h.number <= 9).reduce((sum, h) => sum + h.par, 0);
      const back9Par = holes.filter((h) => h.number > 9).reduce((sum, h) => sum + h.par, 0);

      expect(stats[0].front9Gross).toBe(front9Par);
      expect(stats[0].back9Gross).toBe(back9Par + 18); // 9 holes * 2 over
    });
  });

  describe('Stableford calculations', () => {
    it('calculates Stableford points for par scores (2 points per hole)', () => {
      const scores = createFullScores(holes, 0); // All par
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Test Player', 0, scores), // 0 handicap = no strokes
      ];

      const stats = calculatePlayerStats(players, holes);

      // 0 handicap, all par = 2 points per hole = 36 total
      expect(stats[0].totalStableford).toBe(36);
      expect(stats[0].front9Stableford).toBe(18); // 9 holes * 2 points
      expect(stats[0].back9Stableford).toBe(18);
    });

    it('calculates Stableford for bogey golf (1 point per hole for 0 handicap)', () => {
      const scores = createFullScores(holes, 1); // All bogey
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Test Player', 0, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      // 0 handicap, all bogey = 1 point per hole = 18 total
      expect(stats[0].totalStableford).toBe(18);
    });

    it('calculates Stableford with handicap strokes', () => {
      // 18 handicap gets 1 stroke per hole
      const scores = createFullScores(holes, 1); // All bogey gross
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Test Player', 18, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      // 18 handicap + bogey gross = net par = 2 points per hole = 36 total
      expect(stats[0].totalStableford).toBe(36);
    });

    it('calculates Stableford for birdie scores', () => {
      const scores = createFullScores(holes, -1); // All birdie
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Pro Player', 0, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      // 0 handicap, all birdie = 3 points per hole = 54 total
      expect(stats[0].totalStableford).toBe(54);
    });

    it('calculates Stableford for double bogey scores (0 points)', () => {
      const scores = createFullScores(holes, 2); // All double bogey
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Test Player', 0, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      // 0 handicap, all double bogey = 0 points
      expect(stats[0].totalStableford).toBe(0);
    });
  });

  describe('empty scores handling', () => {
    it('handles player with null scores', () => {
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'No Scores', 15, null),
      ];

      const stats = calculatePlayerStats(players, holes);

      expect(stats[0].hasScores).toBe(false);
      expect(stats[0].totalGross).toBe(0);
      expect(stats[0].totalNet).toBe(-15); // 0 - handicap
      expect(stats[0].totalStableford).toBe(0);
    });

    it('handles player with empty scores object', () => {
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Empty Scores', 15, {}),
      ];

      const stats = calculatePlayerStats(players, holes);

      expect(stats[0].hasScores).toBe(false);
      expect(stats[0].totalGross).toBe(0);
    });

    it('handles partial scores (some holes missing)', () => {
      // Only score holes 1-9
      const scores = createPartialScores(holes, [1, 2, 3, 4, 5, 6, 7, 8, 9], 0);
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Partial Round', 18, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      expect(stats[0].hasScores).toBe(true);
      expect(stats[0].back9Gross).toBe(0); // No back 9 scores
      expect(stats[0].back9Stableford).toBe(0);
    });

    it('handles scores with 0 strokes as missing', () => {
      const scores: ScoresRecord = {
        '1': { strokes: 4 },
        '2': { strokes: 0 }, // Treated as not scored
        '3': { strokes: 5 },
      };
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Test', 0, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      // Only holes 1 and 3 count
      expect(stats[0].front9Gross).toBe(9); // 4 + 5
    });
  });

  describe('edge cases', () => {
    it('handles player with null handicap', () => {
      const scores = createFullScores(holes, 0);
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'No Handicap', null, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      expect(stats[0].handicap).toBe(0); // Defaults to 0
      expect(stats[0].totalNet).toBe(stats[0].totalGross); // Net = Gross when handicap is 0
    });

    it('handles player with null player info', () => {
      const players: ScorecardPlayerData[] = [
        {
          id: 'player-1',
          playerId: 'player-1',
          player: null,
          scores: createFullScores(holes, 0),
          hasScorecard: true,
        },
      ];

      const stats = calculatePlayerStats(players, holes);

      expect(stats[0].playerName).toBe('Unknown');
      expect(stats[0].handicap).toBe(0);
    });

    it('handles empty players array', () => {
      const stats = calculatePlayerStats([], holes);
      expect(stats).toHaveLength(0);
    });

    it('handles high handicap player (36+)', () => {
      const scores = createFullScores(holes, 2); // Double bogey
      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'High Handicapper', 36, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      // 36 handicap = 2 strokes per hole
      // Double bogey gross - 2 strokes = par net = 2 points per hole
      expect(stats[0].totalStableford).toBe(36);
    });

    it('handles very low scores (eagles, etc.)', () => {
      const scores: ScoresRecord = {};
      holes.forEach((hole) => {
        // Eagle on par 4s and 5s, par on par 3s
        const strokes = hole.par === 3 ? 3 : hole.par - 2;
        scores[String(hole.number)] = { strokes };
      });

      const players: ScorecardPlayerData[] = [
        createScorecardPlayerData('player-1', 'Scratch Player', 0, scores),
      ];

      const stats = calculatePlayerStats(players, holes);

      // Check that Stableford accounts for eagles (4 points)
      expect(stats[0].totalStableford).toBeGreaterThan(36); // Better than all par
    });
  });
});

// ============================================================================
// calculateParTotals Tests
// ============================================================================

describe('calculateParTotals', () => {
  describe('standard 18-hole course', () => {
    it('calculates par totals for standard course', () => {
      const holes = create18Holes();
      const result = calculateParTotals(holes);

      const expectedTotal = holes.reduce((sum, h) => sum + h.par, 0);
      const expectedFront9 = holes.filter((h) => h.number <= 9).reduce((sum, h) => sum + h.par, 0);
      const expectedBack9 = holes.filter((h) => h.number > 9).reduce((sum, h) => sum + h.par, 0);

      expect(result.total).toBe(expectedTotal);
      expect(result.front9).toBe(expectedFront9);
      expect(result.back9).toBe(expectedBack9);
      expect(result.front9 + result.back9).toBe(result.total);
    });
  });

  describe('par 3 course', () => {
    it('calculates par totals for all par 3 course', () => {
      const holes = createPar3Course();
      const result = calculateParTotals(holes);

      expect(result.total).toBe(54); // 18 * 3
      expect(result.front9).toBe(27); // 9 * 3
      expect(result.back9).toBe(27);
    });
  });

  describe('mixed par values', () => {
    it('calculates par totals for mixed par course', () => {
      const holes = createMixedParCourse();
      const result = calculateParTotals(holes);

      // 6 par 3s, 6 par 4s, 6 par 5s = 18 + 24 + 30 = 72
      expect(result.total).toBe(72);
      // Each 9 has 3+4+5+3+4+5+3+4+5 = 36
      expect(result.front9).toBe(36);
      expect(result.back9).toBe(36);
    });

    it('handles uneven par distribution between nines', () => {
      // Front: all par 3s (27), Back: all par 5s (45)
      const holes: Hole[] = [
        ...Array.from({ length: 9 }, (_, i) => ({
          number: (i + 1) as Hole['number'],
          par: 3 as const,
          strokeIndex: i + 1,
        })),
        ...Array.from({ length: 9 }, (_, i) => ({
          number: (i + 10) as Hole['number'],
          par: 5 as const,
          strokeIndex: i + 10,
        })),
      ];

      const result = calculateParTotals(holes);

      expect(result.front9).toBe(27);
      expect(result.back9).toBe(45);
      expect(result.total).toBe(72);
    });
  });

  describe('less than 18 holes', () => {
    it('handles 9-hole course (front 9 only)', () => {
      const holes = create18Holes().slice(0, 9);
      const result = calculateParTotals(holes);

      const expectedFront9 = holes.reduce((sum, h) => sum + h.par, 0);

      expect(result.front9).toBe(expectedFront9);
      expect(result.back9).toBe(0);
      expect(result.total).toBe(expectedFront9);
    });

    it('handles 9-hole course (back 9 only)', () => {
      const holes = create18Holes().slice(9, 18);
      const result = calculateParTotals(holes);

      const expectedBack9 = holes.reduce((sum, h) => sum + h.par, 0);

      expect(result.front9).toBe(0);
      expect(result.back9).toBe(expectedBack9);
      expect(result.total).toBe(expectedBack9);
    });

    it('handles partial holes (e.g., 12 holes)', () => {
      const holes = create18Holes().slice(0, 12);
      const result = calculateParTotals(holes);

      const front9 = holes.filter((h) => h.number <= 9);
      const back9 = holes.filter((h) => h.number > 9);

      expect(result.front9).toBe(front9.reduce((sum, h) => sum + h.par, 0));
      expect(result.back9).toBe(back9.reduce((sum, h) => sum + h.par, 0));
    });

    it('handles empty holes array', () => {
      const result = calculateParTotals([]);

      expect(result.front9).toBe(0);
      expect(result.back9).toBe(0);
      expect(result.total).toBe(0);
    });
  });
});

// ============================================================================
// splitHolesByNine Tests
// ============================================================================

describe('splitHolesByNine', () => {
  describe('standard split', () => {
    it('correctly splits 18 holes into front and back 9', () => {
      const holes = create18Holes();
      const result = splitHolesByNine(holes);

      expect(result.front9).toHaveLength(9);
      expect(result.back9).toHaveLength(9);

      // Verify front 9 contains holes 1-9
      expect(result.front9.map((h) => h.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

      // Verify back 9 contains holes 10-18
      expect(result.back9.map((h) => h.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    });

    it('preserves hole data after split', () => {
      const holes = create18Holes();
      const result = splitHolesByNine(holes);

      // Check that hole data is preserved
      const hole5 = result.front9.find((h) => h.number === 5);
      const originalHole5 = holes.find((h) => h.number === 5);

      expect(hole5).toEqual(originalHole5);

      const hole15 = result.back9.find((h) => h.number === 15);
      const originalHole15 = holes.find((h) => h.number === 15);

      expect(hole15).toEqual(originalHole15);
    });
  });

  describe('less than 18 holes', () => {
    it('handles 9-hole course', () => {
      const holes = create18Holes().slice(0, 9);
      const result = splitHolesByNine(holes);

      expect(result.front9).toHaveLength(9);
      expect(result.back9).toHaveLength(0);
    });

    it('handles back 9 only course', () => {
      const holes = create18Holes().slice(9, 18);
      const result = splitHolesByNine(holes);

      expect(result.front9).toHaveLength(0);
      expect(result.back9).toHaveLength(9);
    });

    it('handles partial round (e.g., 6 holes)', () => {
      const holes = create18Holes().slice(0, 6);
      const result = splitHolesByNine(holes);

      expect(result.front9).toHaveLength(6);
      expect(result.back9).toHaveLength(0);
    });

    it('handles holes spanning both nines but not complete', () => {
      // Holes 7-14 (3 front, 5 back)
      const holes = create18Holes().filter((h) => h.number >= 7 && h.number <= 14);
      const result = splitHolesByNine(holes);

      expect(result.front9).toHaveLength(3); // Holes 7, 8, 9
      expect(result.back9).toHaveLength(5); // Holes 10, 11, 12, 13, 14
    });

    it('handles empty array', () => {
      const result = splitHolesByNine([]);

      expect(result.front9).toHaveLength(0);
      expect(result.back9).toHaveLength(0);
    });
  });

  describe('unsorted input', () => {
    it('handles unsorted holes array', () => {
      const holes = create18Holes();
      // Shuffle the array
      const shuffled = [...holes].sort(() => Math.random() - 0.5);

      const result = splitHolesByNine(shuffled);

      // Should still correctly separate by hole number
      expect(result.front9.every((h) => h.number <= 9)).toBe(true);
      expect(result.back9.every((h) => h.number > 9)).toBe(true);
    });
  });
});

// ============================================================================
// generateDefaultHoles Tests
// ============================================================================

describe('generateDefaultHoles', () => {
  describe('creates 18 holes', () => {
    it('generates exactly 18 holes', () => {
      const holes = generateDefaultHoles();
      expect(holes).toHaveLength(18);
    });

    it('holes are numbered 1-18 sequentially', () => {
      const holes = generateDefaultHoles();
      const numbers = holes.map((h) => h.number);
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    });
  });

  describe('correct par distribution', () => {
    it('has valid par values (3, 4, or 5)', () => {
      const holes = generateDefaultHoles();
      holes.forEach((hole) => {
        expect([3, 4, 5]).toContain(hole.par);
      });
    });

    it('has a reasonable total par (70-74 range)', () => {
      const holes = generateDefaultHoles();
      const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
      expect(totalPar).toBeGreaterThanOrEqual(70);
      expect(totalPar).toBeLessThanOrEqual(74);
    });

    it('has at least 2 par 3s per nine', () => {
      const holes = generateDefaultHoles();
      const front9Par3s = holes.filter((h) => h.number <= 9 && h.par === 3);
      const back9Par3s = holes.filter((h) => h.number > 9 && h.par === 3);

      expect(front9Par3s.length).toBeGreaterThanOrEqual(2);
      expect(back9Par3s.length).toBeGreaterThanOrEqual(2);
    });

    it('has at least 1 par 5 per nine', () => {
      const holes = generateDefaultHoles();
      const front9Par5s = holes.filter((h) => h.number <= 9 && h.par === 5);
      const back9Par5s = holes.filter((h) => h.number > 9 && h.par === 5);

      expect(front9Par5s.length).toBeGreaterThanOrEqual(1);
      expect(back9Par5s.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('unique stroke indexes', () => {
    it('has unique stroke indexes 1-18', () => {
      const holes = generateDefaultHoles();
      const strokeIndexes = holes.map((h) => h.strokeIndex);

      // Check all unique
      expect(new Set(strokeIndexes).size).toBe(18);

      // Check range is 1-18
      expect(Math.min(...strokeIndexes)).toBe(1);
      expect(Math.max(...strokeIndexes)).toBe(18);
    });

    it('stroke indexes are valid (1-18)', () => {
      const holes = generateDefaultHoles();
      holes.forEach((hole) => {
        expect(hole.strokeIndex).toBeGreaterThanOrEqual(1);
        expect(hole.strokeIndex).toBeLessThanOrEqual(18);
      });
    });

    it('hardest hole (SI 1) is typically a par 5', () => {
      const holes = generateDefaultHoles();
      const hardestHole = holes.find((h) => h.strokeIndex === 1);
      // SI 1 is usually on a par 5 or long par 4
      expect(hardestHole?.par).toBeGreaterThanOrEqual(4);
    });

    it('easiest hole (SI 18) is typically a par 3', () => {
      const holes = generateDefaultHoles();
      const easiestHole = holes.find((h) => h.strokeIndex === 18);
      // SI 18 is usually on a par 3 or short par 4
      expect(easiestHole?.par).toBeLessThanOrEqual(4);
    });
  });

  describe('returns new array each call', () => {
    it('returns a new array instance', () => {
      const holes1 = generateDefaultHoles();
      const holes2 = generateDefaultHoles();

      expect(holes1).not.toBe(holes2); // Different references
      expect(holes1).toEqual(holes2); // But same content
    });
  });
});

// ============================================================================
// calculateHoleStableford Tests
// ============================================================================

describe('calculateHoleStableford', () => {
  const _par4Hole = { number: 1 as const, par: 4 as const, strokeIndex: 9 };

  describe('all point scenarios (0-4+)', () => {
    it('returns 0 points for no score (0 strokes)', () => {
      expect(calculateHoleStableford(0, 4, 0, 9)).toBe(0);
    });

    it('returns 0 points for double bogey or worse', () => {
      // Par 4, 0 handicap, 6 strokes = double bogey = 0 points
      expect(calculateHoleStableford(6, 4, 0, 9)).toBe(0);
      // Triple bogey
      expect(calculateHoleStableford(7, 4, 0, 9)).toBe(0);
      // Blow up hole
      expect(calculateHoleStableford(10, 4, 0, 9)).toBe(0);
    });

    it('returns 1 point for bogey', () => {
      // Par 4, 0 handicap, 5 strokes = bogey = 1 point
      expect(calculateHoleStableford(5, 4, 0, 9)).toBe(1);
    });

    it('returns 2 points for par', () => {
      // Par 4, 0 handicap, 4 strokes = par = 2 points
      expect(calculateHoleStableford(4, 4, 0, 9)).toBe(2);
    });

    it('returns 3 points for birdie', () => {
      // Par 4, 0 handicap, 3 strokes = birdie = 3 points
      expect(calculateHoleStableford(3, 4, 0, 9)).toBe(3);
    });

    it('returns 4 points for eagle', () => {
      // Par 4, 0 handicap, 2 strokes = eagle = 4 points
      expect(calculateHoleStableford(2, 4, 0, 9)).toBe(4);
    });

    it('returns 5 points for albatross or better', () => {
      // Par 5, 0 handicap, 2 strokes = albatross = 5 points
      expect(calculateHoleStableford(2, 5, 0, 9)).toBe(5);
      // Hole in one on par 4 (3 under) = 5 points
      expect(calculateHoleStableford(1, 4, 0, 9)).toBe(5);
    });
  });

  describe('with handicap strokes', () => {
    it('applies handicap strokes correctly', () => {
      // 18 handicap on SI 9 (gets 1 stroke)
      // Par 4, 5 strokes gross = bogey gross = par net = 2 points
      expect(calculateHoleStableford(5, 4, 18, 9)).toBe(2);
    });

    it('high handicap gets 2 strokes on low SI holes', () => {
      // 36 handicap on SI 1 (gets 2 strokes)
      // Par 4, 6 strokes gross = double bogey gross = par net = 2 points
      expect(calculateHoleStableford(6, 4, 36, 1)).toBe(2);
    });

    it('no strokes on high SI holes for low handicap', () => {
      // 9 handicap on SI 18 (gets 0 strokes)
      // Par 3, 4 strokes = bogey = 1 point
      expect(calculateHoleStableford(4, 3, 9, 18)).toBe(1);
    });

    it('9 handicap gets stroke on SI 9 but not SI 10', () => {
      // 9 handicap on SI 9 (gets 1 stroke)
      expect(calculateHoleStableford(5, 4, 9, 9)).toBe(2); // Bogey gross = par net

      // 9 handicap on SI 10 (gets 0 strokes)
      expect(calculateHoleStableford(5, 4, 9, 10)).toBe(1); // Bogey gross = bogey net
    });
  });

  describe('different par values', () => {
    it('calculates correctly for par 3', () => {
      expect(calculateHoleStableford(3, 3, 0, 1)).toBe(2); // Par
      expect(calculateHoleStableford(2, 3, 0, 1)).toBe(3); // Birdie
      expect(calculateHoleStableford(1, 3, 0, 1)).toBe(4); // Hole in one
    });

    it('calculates correctly for par 5', () => {
      expect(calculateHoleStableford(5, 5, 0, 1)).toBe(2); // Par
      expect(calculateHoleStableford(4, 5, 0, 1)).toBe(3); // Birdie
      expect(calculateHoleStableford(3, 5, 0, 1)).toBe(4); // Eagle
      expect(calculateHoleStableford(2, 5, 0, 1)).toBe(5); // Albatross
    });
  });

  describe('edge cases', () => {
    it('handles negative handicap (plus player)', () => {
      // +2 player effectively plays harder
      // Actually the getStrokesReceived returns 0 for handicap <= 0
      expect(calculateHoleStableford(4, 4, -2, 9)).toBe(2); // Par still = 2
    });

    it('handles zero handicap', () => {
      expect(calculateHoleStableford(4, 4, 0, 9)).toBe(2); // Par = 2
    });

    it('handles very high strokes (picked up)', () => {
      expect(calculateHoleStableford(12, 4, 0, 9)).toBe(0);
    });

    it('handles minimum valid stroke (1)', () => {
      // Hole in one on par 3
      expect(calculateHoleStableford(1, 3, 0, 9)).toBe(4); // Eagle equivalent
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('scorecardCalculations integration', () => {
  it('calculatePlayerStats uses correct par totals', () => {
    const holes = generateDefaultHoles();
    const parTotals = calculateParTotals(holes);
    const scores = createFullScores(holes, 0);

    const players: ScorecardPlayerData[] = [
      createScorecardPlayerData('player-1', 'Test', 0, scores),
    ];

    const stats = calculatePlayerStats(players, holes);

    expect(stats[0].totalGross).toBe(parTotals.total);
    expect(stats[0].front9Gross).toBe(parTotals.front9);
    expect(stats[0].back9Gross).toBe(parTotals.back9);
  });

  it('splitHolesByNine produces arrays that calculateParTotals can process', () => {
    const holes = generateDefaultHoles();
    const { front9, back9 } = splitHolesByNine(holes);

    const front9Par = calculateParTotals(front9);
    const back9Par = calculateParTotals(back9);
    const fullPar = calculateParTotals(holes);

    expect(front9Par.total).toBe(fullPar.front9);
    expect(back9Par.total).toBe(fullPar.back9);
  });

  it('calculateHoleStableford matches calculatePlayerStats for single hole', () => {
    const holes = generateDefaultHoles();
    const hole = holes[0]; // First hole

    // Single score
    const scores: ScoresRecord = {
      [String(hole.number)]: { strokes: hole.par + 1 }, // Bogey
    };

    const players: ScorecardPlayerData[] = [
      createScorecardPlayerData('player-1', 'Test', 18, scores),
    ];

    const stats = calculatePlayerStats(players, holes);
    const directCalc = calculateHoleStableford(hole.par + 1, hole.par, 18, hole.strokeIndex);

    expect(stats[0].totalStableford).toBe(directCalc);
  });
});
