/**
 * Par Engine Tests
 *
 * Pins the Par game (+1 / 0 / -1 per hole) flow at the orchestrator
 * level. Confirms the engine reuses `calculateParScore` from
 * `@/utils/scoring` so per-hole scoring matches the inline scorecard
 * renderers, and that ranking sorts higher-is-better.
 */

import { ParEngine, createParEngine } from '@/services/scoring/engines/ParEngine';
import { ScoringOrchestrator } from '@/services/scoring/ScoringOrchestrator';
import type {
  CourseHoleData,
  ScorecardWithHandicap,
  EngineConfig,
} from '@/services/scoring/types';

function createCourseData(
  par = 72,
  slopeRating = 113,
  courseRating = 72
): CourseHoleData {
  const holes = [];
  const pars = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
  for (let i = 1; i <= 18; i++) {
    holes.push({ number: i, par: pars[i - 1], strokeIndex: i });
  }
  return { holes, par, slopeRating, courseRating };
}

function createScorecard(
  playerId: string,
  handicap: number,
  scores: number[]
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
      total_net: 0,
      total_points: 0,
      ball_totals: null,
      status: 'completed' as const,
      submitted_at: new Date().toISOString(),
      submitted_by: null,
      device_id: null,
      synced_at: null,
      ga_handicap_used: null,
      daily_handicap_used: null,
      handicap_differential: null,
      course_rating_used: null,
      slope_rating_used: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    handicap,
  };
}

const PAR_SCORES = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
const ONE_OVER = PAR_SCORES.map((p) => p + 1);
const ONE_UNDER = PAR_SCORES.map((p) => p - 1);

describe('ParEngine', () => {
  let engine: ParEngine;

  beforeEach(() => {
    engine = createParEngine();
  });

  describe('properties', () => {
    it('reports gameType = par', () => {
      expect(engine.gameType).toBe('par');
    });

    it('higherIsBetter is true (more wins is better)', () => {
      expect(engine.higherIsBetter).toBe(true);
    });
  });

  describe('calculateScore', () => {
    it('all pars → 0 (every hole square)', () => {
      const sc = createScorecard('p1', 0, PAR_SCORES);
      const result = engine.calculateScore(sc, createCourseData());
      expect(result.rawScore).toBe(0);
      expect(result.resultData.par_score).toBe(0);
      expect(result.grossScore).toBe(72);
    });

    it('all bogeys with 0 handicap → -18 (every hole lost)', () => {
      const sc = createScorecard('p1', 0, ONE_OVER);
      const result = engine.calculateScore(sc, createCourseData());
      expect(result.rawScore).toBe(-18);
    });

    it('all birdies with 0 handicap → +18 (every hole won)', () => {
      const sc = createScorecard('p1', 0, ONE_UNDER);
      const result = engine.calculateScore(sc, createCourseData());
      expect(result.rawScore).toBe(18);
    });

    it('handicap strokes turn bogeys into squares on stroke holes', () => {
      // Handicap 18 → 95% allowance on standard course → ~17 strokes →
      // ≥1 stroke on most holes, turning gross bogeys into net pars (squares).
      // The exact total depends on rounding; we just verify it's well above
      // the no-handicap result of -18.
      const sc = createScorecard('p1', 18, ONE_OVER);
      const result = engine.calculateScore(sc, createCourseData());
      expect(result.rawScore).toBeGreaterThan(-18);
    });

    it('respects useHandicap = false', () => {
      const config: EngineConfig = {
        useHandicap: false,
        useNetScores: true,
      };
      const sc = createScorecard('p1', 36, ONE_OVER);
      const result = engine.calculateScore(sc, createCourseData(), config);
      expect(result.rawScore).toBe(-18);
    });

    it('skips holes with no recorded strokes', () => {
      // Front 9 only: 9 pars → 0 par-score, 27 gross
      const partial: number[] = [4, 3, 5, 4, 4, 3, 4, 5, 4];
      const sc = createScorecard('p1', 0, partial);
      const result = engine.calculateScore(sc, createCourseData());
      expect(result.rawScore).toBe(0);
      expect(result.grossScore).toBe(36);
    });
  });

  describe('calculateLeaderboard', () => {
    it('sorts higher rawScore first (more wins = better position)', () => {
      const courseData = createCourseData();
      const winner = createScorecard('winner', 0, ONE_UNDER); // +18
      const middle = createScorecard('middle', 0, PAR_SCORES); // 0
      const loser = createScorecard('loser', 0, ONE_OVER); // -18

      const board = engine.calculateLeaderboard(
        [middle, loser, winner],
        courseData
      );

      expect(board[0].participantId).toBe('winner');
      expect(board[0].rawScore).toBe(18);
      expect(board[0].position).toBe(1);
      expect(board[2].participantId).toBe('loser');
      expect(board[2].rawScore).toBe(-18);
      expect(board[2].position).toBe(3);
    });

    it('handles ties with equal positions', () => {
      const courseData = createCourseData();
      const a = createScorecard('a', 0, PAR_SCORES);
      const b = createScorecard('b', 0, PAR_SCORES);
      const c = createScorecard('c', 0, ONE_OVER);

      const board = engine.calculateLeaderboard([a, b, c], courseData);

      expect(board[0].position).toBe(1);
      expect(board[0].tied).toBe(true);
      expect(board[1].position).toBe(1);
      expect(board[1].tied).toBe(true);
      expect(board[2].position).toBe(3);
    });

    it('returns empty array for no scorecards', () => {
      expect(engine.calculateLeaderboard([], createCourseData())).toEqual([]);
    });
  });
});

describe('ScoringOrchestrator → Par routing', () => {
  // Regression for the silent fall-through to StablefordEngine. A Par
  // round routed through the orchestrator must use ParEngine, not
  // Stableford — otherwise scores come out as 0–5 points instead of
  // ±1 / 0 / -1.

  it('returns ParEngine for game type "par"', () => {
    const orchestrator = new ScoringOrchestrator();
    const engine = orchestrator.getEngine('par');
    expect(engine.gameType).toBe('par');
  });

  it('produces Par-game rawScore (not Stableford) for a Par round', () => {
    const orchestrator = new ScoringOrchestrator();
    const sc = createScorecard('p1', 0, PAR_SCORES);

    const result = orchestrator.calculateScore('par', sc, createCourseData());

    // All-par round: Par-game score is 0 (every hole square).
    // If this had silently used Stableford, rawScore would be 36 (2 pts × 18).
    expect(result.rawScore).toBe(0);
    expect(result.resultData.par_score).toBe(0);
    expect(result.resultData.stableford_points).toBeUndefined();
  });
});
