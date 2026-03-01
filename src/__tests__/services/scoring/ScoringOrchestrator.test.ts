/**
 * Scoring Orchestrator Tests
 *
 * Tests for the scoring orchestrator including:
 * - Engine factory (correct engine for game type)
 * - Score calculation delegation
 * - Leaderboard calculation
 * - Caching behavior
 */

import { ScoringOrchestrator } from '@/services/scoring/ScoringOrchestrator';
import type { CourseHoleData, ScorecardWithHandicap } from '@/services/scoring/types';

// Helper to create course data
function createCourseData(par = 72): CourseHoleData {
  const holes = [];
  const pars = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

  for (let i = 1; i <= 18; i++) {
    holes.push({
      number: i,
      par: pars[i - 1],
      strokeIndex: i,
    });
  }

  return { holes, par, slopeRating: 113, courseRating: 72 };
}

// Helper to create scorecard
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

describe('ScoringOrchestrator', () => {
  let orchestrator: ScoringOrchestrator;

  beforeEach(() => {
    orchestrator = new ScoringOrchestrator();
  });

  // ============================================================================
  // getEngine
  // ============================================================================
  describe('getEngine', () => {
    it('returns Stableford engine for stableford game type', () => {
      const engine = orchestrator.getEngine('stableford');

      expect(engine.gameType).toBe('stableford');
      expect(engine.higherIsBetter).toBe(true);
    });

    it('returns Stroke engine for stroke game type', () => {
      const engine = orchestrator.getEngine('stroke');

      expect(engine.gameType).toBe('stroke');
      expect(engine.higherIsBetter).toBe(false);
    });

    it('returns Match Play engine for match-play game type', () => {
      const engine = orchestrator.getEngine('match-play');

      expect(engine.gameType).toBe('match-play');
    });

    it('caches engines for reuse', () => {
      const engine1 = orchestrator.getEngine('stableford');
      const engine2 = orchestrator.getEngine('stableford');

      expect(engine1).toBe(engine2);
    });

    it('creates separate engines for different game types', () => {
      const stableford = orchestrator.getEngine('stableford');
      const stroke = orchestrator.getEngine('stroke');

      expect(stableford).not.toBe(stroke);
      expect(stableford.gameType).not.toBe(stroke.gameType);
    });
  });

  // ============================================================================
  // calculateScore
  // ============================================================================
  describe('calculateScore', () => {
    it('calculates Stableford score correctly', () => {
      const courseData = createCourseData();
      const scores = courseData.holes.map((h) => h.par); // All pars
      const scorecard = createScorecard('p1', 0, scores);

      const result = orchestrator.calculateScore('stableford', scorecard, courseData);

      expect(result.rawScore).toBe(36); // 2 points * 18 holes
      expect(result.stablefordPoints).toBe(36);
    });

    it('calculates Stroke score correctly', () => {
      const courseData = createCourseData();
      const scores = courseData.holes.map((h) => h.par); // All pars = 72 total
      const scorecard = createScorecard('p1', 18, scores);

      const result = orchestrator.calculateScore('stroke', scorecard, courseData);

      // With 18 handicap, net = 72 - 18 = 54
      expect(result.grossScore).toBe(72);
    });

    it('uses cached result when available', () => {
      const orchestratorWithCache = new ScoringOrchestrator(60000); // 1 min cache
      const courseData = createCourseData();
      const scores = courseData.holes.map((h) => h.par);
      const scorecard = createScorecard('p1', 0, scores);

      const result1 = orchestratorWithCache.calculateScore('stableford', scorecard, courseData);
      const result2 = orchestratorWithCache.calculateScore('stableford', scorecard, courseData);

      expect(result1.rawScore).toBe(result2.rawScore);
    });
  });

  // ============================================================================
  // calculateLeaderboard
  // ============================================================================
  describe('calculateLeaderboard', () => {
    it('calculates Stableford leaderboard', () => {
      const courseData = createCourseData();

      const scorecard1 = createScorecard('p1', 0, courseData.holes.map((h) => h.par)); // 36 pts
      const scorecard2 = createScorecard('p2', 0, courseData.holes.map((h) => h.par - 1)); // 54 pts
      const scorecard3 = createScorecard('p3', 0, courseData.holes.map((h) => h.par + 1)); // 18 pts

      const leaderboard = orchestrator.calculateLeaderboard(
        'stableford',
        [scorecard1, scorecard2, scorecard3],
        courseData
      );

      expect(leaderboard.length).toBe(3);
      expect(leaderboard[0].participantId).toBe('p2'); // Highest points first
      expect(leaderboard[0].position).toBe(1);
      expect(leaderboard[1].participantId).toBe('p1');
      expect(leaderboard[1].position).toBe(2);
      expect(leaderboard[2].participantId).toBe('p3');
      expect(leaderboard[2].position).toBe(3);
    });

    it('calculates Stroke leaderboard (lowest first)', () => {
      const courseData = createCourseData();

      const scorecard1 = createScorecard('p1', 0, courseData.holes.map((h) => h.par)); // 72 gross
      const scorecard2 = createScorecard('p2', 0, courseData.holes.map((h) => h.par - 1)); // 54 gross
      const scorecard3 = createScorecard('p3', 0, courseData.holes.map((h) => h.par + 1)); // 90 gross

      const leaderboard = orchestrator.calculateLeaderboard(
        'stroke',
        [scorecard1, scorecard2, scorecard3],
        courseData
      );

      expect(leaderboard.length).toBe(3);
      expect(leaderboard[0].participantId).toBe('p2'); // Lowest strokes first
      expect(leaderboard[0].position).toBe(1);
    });

    it('handles empty scorecard array', () => {
      const courseData = createCourseData();

      const leaderboard = orchestrator.calculateLeaderboard('stableford', [], courseData);

      expect(leaderboard).toEqual([]);
    });

    it('handles ties with correct position assignment', () => {
      const courseData = createCourseData();
      const parScores = courseData.holes.map((h) => h.par);

      const scorecard1 = createScorecard('p1', 0, parScores);
      const scorecard2 = createScorecard('p2', 0, parScores); // Same as p1
      const scorecard3 = createScorecard('p3', 0, courseData.holes.map((h) => h.par + 1));

      const leaderboard = orchestrator.calculateLeaderboard(
        'stableford',
        [scorecard1, scorecard2, scorecard3],
        courseData
      );

      expect(leaderboard[0].position).toBe(1);
      expect(leaderboard[0].tied).toBe(true);
      expect(leaderboard[1].position).toBe(1);
      expect(leaderboard[1].tied).toBe(true);
      expect(leaderboard[2].position).toBe(3); // Skips 2
      expect(leaderboard[2].tied).toBe(false);
    });
  });

  // ============================================================================
  // Cache management
  // ============================================================================
  describe('cache management', () => {
    it('clearCache removes all cached results', () => {
      const orchestratorWithCache = new ScoringOrchestrator(60000);
      const courseData = createCourseData();
      const scorecard = createScorecard('p1', 0, courseData.holes.map((h) => h.par));

      // Populate cache
      orchestratorWithCache.calculateScore('stableford', scorecard, courseData);

      // Clear cache
      orchestratorWithCache.clearCache();

      // Next call should recalculate (no way to directly verify, but shouldn't throw)
      const result = orchestratorWithCache.calculateScore('stableford', scorecard, courseData);
      expect(result.rawScore).toBe(36);
    });

    it('clearCacheForScorecard removes specific scorecard cache', () => {
      const orchestratorWithCache = new ScoringOrchestrator(60000);
      const courseData = createCourseData();
      const scorecard = createScorecard('p1', 0, courseData.holes.map((h) => h.par));

      // Populate cache
      orchestratorWithCache.calculateScore('stableford', scorecard, courseData);

      // Clear specific scorecard
      orchestratorWithCache.clearCacheForScorecard('sc-p1');

      // Next call should recalculate
      const result = orchestratorWithCache.calculateScore('stableford', scorecard, courseData);
      expect(result.rawScore).toBe(36);
    });
  });

  // ============================================================================
  // Constructor
  // ============================================================================
  describe('constructor', () => {
    it('creates orchestrator with default cache TTL (0 = disabled)', () => {
      const orch = new ScoringOrchestrator();
      // No direct way to verify, but should work
      expect(orch).toBeInstanceOf(ScoringOrchestrator);
    });

    it('creates orchestrator with custom cache TTL', () => {
      const orch = new ScoringOrchestrator(30000);
      expect(orch).toBeInstanceOf(ScoringOrchestrator);
    });
  });
});
