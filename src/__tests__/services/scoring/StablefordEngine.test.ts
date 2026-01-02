/**
 * Stableford Engine Tests
 *
 * Tests for the Stableford scoring engine including:
 * - Score calculation with handicap adjustments
 * - Leaderboard generation with position assignment
 * - Score parsing from various formats
 */

import { StablefordEngine, createStablefordEngine } from '@/services/scoring/engines/StablefordEngine';
import type { CourseHoleData, ScorecardWithHandicap, EngineConfig } from '@/services/scoring/types';

// Helper to create course data
function createCourseData(par = 72, slopeRating = 113, courseRating = 72): CourseHoleData {
  const holes = [];
  const pars = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]; // Standard par 72

  for (let i = 1; i <= 18; i++) {
    holes.push({
      number: i,
      par: pars[i - 1],
      strokeIndex: i, // SI 1-18
    });
  }

  return { holes, par, slopeRating, courseRating };
}

// Helper to create scorecard with scores
function createScorecard(
  playerId: string,
  handicap: number,
  scores: number[] // 18 scores
): ScorecardWithHandicap {
  const scoresRecord: Record<string, { strokes: number }> = {};
  scores.forEach((strokes, i) => {
    scoresRecord[String(i + 1)] = { strokes };
  });

  return {
    scorecard: {
      id: `sc-${playerId}`,
      round_id: 'round-1',
      player_id: playerId,
      scores: scoresRecord,
      total_gross: scores.reduce((a, b) => a + b, 0),
      total_net: null,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    handicap,
  };
}

describe('StablefordEngine', () => {
  let engine: StablefordEngine;

  beforeEach(() => {
    engine = createStablefordEngine();
  });

  describe('engine properties', () => {
    it('has correct gameType', () => {
      expect(engine.gameType).toBe('stableford');
    });

    it('has higherIsBetter = true', () => {
      expect(engine.higherIsBetter).toBe(true);
    });
  });

  // ============================================================================
  // calculateScore
  // ============================================================================
  describe('calculateScore', () => {
    it('calculates correct points for scratch player (0 handicap)', () => {
      const courseData = createCourseData();
      // All pars = 2 points each = 36 points total
      const scores = courseData.holes.map((h) => h.par);
      const scorecard = createScorecard('p1', 0, scores);

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(36); // All pars = 2 points * 18 holes
      expect(result.stablefordPoints).toBe(36);
      expect(result.grossScore).toBe(72);
      // Note: netScore is cumulative net strokes, not points
      expect(result.netScore).toBe(72); // Net strokes same as gross for 0 handicap
    });

    it('calculates correct points for 18 handicap player', () => {
      const courseData = createCourseData();
      // With 18 handicap index, playing handicap = round(18 * 0.95) = 17 (95% allowance)
      // Gets 1 stroke on SI 1-17, none on SI 18
      // 17 holes: net birdie = 3 pts, 1 hole: net par = 2 pts
      // Total = 17 * 3 + 1 * 2 = 53 points
      const scores = courseData.holes.map((h) => h.par);
      const scorecard = createScorecard('p1', 18, scores);

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(53); // 17 * 3 + 1 * 2 = 53 points
      expect(result.stablefordPoints).toBe(53);
      expect(result.grossScore).toBe(72);
    });

    it('calculates correct points for 36 handicap player', () => {
      const courseData = createCourseData();
      // With 36 handicap index, playing handicap = round(36 * 0.95) = 34
      // baseStrokes = floor(34/18) = 1, remainder = 34 % 18 = 16
      // SI 1-16: 2 strokes, SI 17-18: 1 stroke
      // Playing bogey golf gross (par + 1):
      // - SI 1-16: net = par + 1 - 2 = par - 1 = birdie = 3 pts (16 holes)
      // - SI 17-18: net = par + 1 - 1 = par = par = 2 pts (2 holes)
      // Total = 16 * 3 + 2 * 2 = 52 points
      const scores = courseData.holes.map((h) => h.par + 1);
      const scorecard = createScorecard('p1', 36, scores);

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(52); // 16 * 3 + 2 * 2 = 52 points
      expect(result.grossScore).toBe(90); // 72 + 18
    });

    it('handles mixed scores correctly', () => {
      const courseData = createCourseData();
      // Variety of scores on first 6 holes, par on rest
      // Hole 1: Par 4, Score 3 (birdie) = 3 pts for 0 hcp
      // Hole 2: Par 3, Score 2 (birdie) = 3 pts
      // Hole 3: Par 5, Score 5 (par) = 2 pts
      // Hole 4: Par 4, Score 5 (bogey) = 1 pt
      // Hole 5: Par 4, Score 6 (double) = 0 pts
      // Hole 6: Par 3, Score 4 (bogey) = 1 pt
      // Holes 7-18: Par = 2 pts each = 24 pts
      const scores = [3, 2, 5, 5, 6, 4, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      const scorecard = createScorecard('p1', 0, scores);

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(3 + 3 + 2 + 1 + 0 + 1 + 24); // 34 points
    });

    it('awards 5 points for albatross (net 3 under par)', () => {
      const courseData = createCourseData();
      // Hole 3 is par 5, SI 3
      // Score 2 (albatross) for 0 handicap = net 3 under = 5 points
      const scores = courseData.holes.map((h, i) => (i === 2 ? 2 : h.par)); // Albatross on hole 3
      const scorecard = createScorecard('p1', 0, scores);

      const result = engine.calculateScore(scorecard, courseData);

      // 5 points for hole 3, 2 points for rest = 5 + (17 * 2) = 39
      expect(result.rawScore).toBe(39);
    });

    it('handles empty scores', () => {
      const courseData = createCourseData();
      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: {},
          total_gross: null,
          total_net: null,
          status: 'in_progress',
          submitted_at: null,
          submitted_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        handicap: 18,
      };

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(0);
      expect(result.grossScore).toBe(0);
    });

    it('handles partial scores', () => {
      const courseData = createCourseData();
      // Only front 9 completed
      const scoresRecord: Record<string, { strokes: number }> = {};
      for (let i = 1; i <= 9; i++) {
        scoresRecord[String(i)] = { strokes: 4 }; // All 4s
      }

      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: scoresRecord,
          total_gross: 36,
          total_net: null,
          status: 'in_progress',
          submitted_at: null,
          submitted_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        handicap: 18,
      };

      const result = engine.calculateScore(scorecard, courseData);

      // Should calculate for 9 holes only
      expect(result.grossScore).toBe(36);
      expect(result.rawScore).toBeGreaterThan(0);
    });

    it('respects useHandicap config option', () => {
      const courseData = createCourseData();
      const scores = courseData.holes.map((h) => h.par);
      const scorecard = createScorecard('p1', 18, scores);

      const configNoHandicap: EngineConfig = {
        useHandicap: false,
        useNetScores: true,
      };

      const result = engine.calculateScore(scorecard, courseData, configNoHandicap);

      // Without handicap, gross pars = 2 points each = 36
      expect(result.rawScore).toBe(36);
    });

    it('handles null scores in scorecard', () => {
      const courseData = createCourseData();
      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: null as any,
          total_gross: null,
          total_net: null,
          status: 'in_progress',
          submitted_at: null,
          submitted_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        handicap: 18,
      };

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(0);
    });
  });

  // ============================================================================
  // calculateLeaderboard
  // ============================================================================
  describe('calculateLeaderboard', () => {
    it('returns empty array for no scorecards', () => {
      const courseData = createCourseData();
      const result = engine.calculateLeaderboard([], courseData);
      expect(result).toEqual([]);
    });

    it('sorts players by points (highest first)', () => {
      const courseData = createCourseData();

      // Player 1: All pars = 36 points
      const scores1 = courseData.holes.map((h) => h.par);
      const scorecard1 = createScorecard('p1', 0, scores1);

      // Player 2: All birdies = 54 points
      const scores2 = courseData.holes.map((h) => h.par - 1);
      const scorecard2 = createScorecard('p2', 0, scores2);

      // Player 3: All bogeys = 18 points
      const scores3 = courseData.holes.map((h) => h.par + 1);
      const scorecard3 = createScorecard('p3', 0, scores3);

      const result = engine.calculateLeaderboard([scorecard1, scorecard2, scorecard3], courseData);

      expect(result.length).toBe(3);
      expect(result[0].participantId).toBe('p2'); // 54 points
      expect(result[0].position).toBe(1);
      expect(result[1].participantId).toBe('p1'); // 36 points
      expect(result[1].position).toBe(2);
      expect(result[2].participantId).toBe('p3'); // 18 points
      expect(result[2].position).toBe(3);
    });

    it('handles ties correctly', () => {
      const courseData = createCourseData();

      // Two players with same score
      const scores = courseData.holes.map((h) => h.par);
      const scorecard1 = createScorecard('p1', 0, scores);
      const scorecard2 = createScorecard('p2', 0, scores);
      const scorecard3 = createScorecard('p3', 0, courseData.holes.map((h) => h.par + 1)); // Lower

      const result = engine.calculateLeaderboard([scorecard1, scorecard2, scorecard3], courseData);

      expect(result[0].position).toBe(1);
      expect(result[0].tied).toBe(true);
      expect(result[1].position).toBe(1);
      expect(result[1].tied).toBe(true);
      expect(result[2].position).toBe(3); // Skips position 2
      expect(result[2].tied).toBe(false);
    });

    it('assigns isTeamResult = false for individual players', () => {
      const courseData = createCourseData();
      const scores = courseData.holes.map((h) => h.par);
      const scorecard = createScorecard('p1', 0, scores);

      const result = engine.calculateLeaderboard([scorecard], courseData);

      expect(result[0].isTeamResult).toBe(false);
      expect(result[0].playerId).toBe('p1');
      expect(result[0].teamId).toBeUndefined();
    });

    it('calculates correct rawScore for each entry', () => {
      const courseData = createCourseData();
      const scores = courseData.holes.map((h) => h.par);
      const scorecard = createScorecard('p1', 0, scores);

      const result = engine.calculateLeaderboard([scorecard], courseData);

      expect(result[0].rawScore).toBe(36);
      expect(result[0].resultData.stableford_points).toBe(36);
    });
  });

  // ============================================================================
  // Score parsing edge cases
  // ============================================================================
  describe('score parsing', () => {
    it('handles numeric scores (legacy format)', () => {
      const courseData = createCourseData();
      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: {
            '1': 4,
            '2': 3,
            '3': 5,
          } as any, // Legacy numeric format
          total_gross: 12,
          total_net: null,
          status: 'submitted',
          submitted_at: null,
          submitted_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        handicap: 0,
      };

      const result = engine.calculateScore(scorecard, courseData);

      // Should parse numeric scores
      expect(result.grossScore).toBe(12);
    });

    it('handles object scores with strokes property', () => {
      const courseData = createCourseData();
      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: {
            '1': { strokes: 4, putts: 2 },
            '2': { strokes: 3, putts: 1 },
            '3': { strokes: 5, putts: 3 },
          },
          total_gross: 12,
          total_net: null,
          status: 'submitted',
          submitted_at: null,
          submitted_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        handicap: 0,
      };

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.grossScore).toBe(12);
    });

    it('ignores invalid hole numbers', () => {
      const courseData = createCourseData();
      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: {
            '1': { strokes: 4 },
            '19': { strokes: 5 }, // Invalid - beyond 18
            'abc': { strokes: 3 }, // Invalid - not a number
            '0': { strokes: 4 }, // Invalid - less than 1
          },
          total_gross: null,
          total_net: null,
          status: 'submitted',
          submitted_at: null,
          submitted_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        handicap: 0,
      };

      const result = engine.calculateScore(scorecard, courseData);

      // Should only count hole 1
      expect(result.grossScore).toBe(4);
    });
  });

  // ============================================================================
  // Factory function
  // ============================================================================
  describe('createStablefordEngine', () => {
    it('creates a new instance', () => {
      const engine1 = createStablefordEngine();
      const engine2 = createStablefordEngine();

      expect(engine1).toBeInstanceOf(StablefordEngine);
      expect(engine2).toBeInstanceOf(StablefordEngine);
      expect(engine1).not.toBe(engine2);
    });
  });
});
