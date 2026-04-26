/**
 * Team Scoring Engine Tests
 *
 * Tests for the Team Scoring engine including:
 * - Best Ball scoring (best net score per hole)
 * - Ambrose/Scramble scoring with team handicap
 * - Aggregate scoring (sum of all members)
 * - Leaderboard generation with position assignment
 * - Member contribution tracking
 */

import {
  TeamScoringEngine,
  createTeamScoringEngine,
  type TeamFormat,
} from '@/services/scoring/engines/TeamScoringEngine';
import type {
  CourseHoleData,
  ScorecardWithHandicap,
  EngineConfig,
} from '@/services/scoring/types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create course data for testing
 */
function createCourseData(
  par = 72,
  slopeRating = 113,
  courseRating = 72
): CourseHoleData {
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

/**
 * Create a scorecard with scores for testing
 */
function createScorecard(
  playerId: string,
  handicap: number,
  scores: (number | null)[],
  teamId?: string
): ScorecardWithHandicap {
  const scoresRecord: Record<string, { strokes: number }> = {};
  scores.forEach((strokes, i) => {
    if (strokes !== null) {
      scoresRecord[String(i + 1)] = { strokes };
    }
  });

  return {
    scorecard: {
      id: `sc-${playerId}`,
      round_id: 'round-1',
      player_id: playerId,
      scores: scoresRecord,
      total_gross: scores.filter((s) => s !== null).reduce((a, b) => a! + b!, 0),
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
    teamId,
  };
}

/**
 * Create 18 scores with all pars for the standard course
 */
function allPars(): number[] {
  return [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
}

/**
 * Create 18 scores with all bogeys
 */
function allBogeys(): number[] {
  return [5, 4, 6, 5, 5, 4, 5, 6, 5, 5, 4, 6, 5, 5, 4, 5, 6, 5];
}

/**
 * Create 18 scores with all birdies
 */
function allBirdies(): number[] {
  return [3, 2, 4, 3, 3, 2, 3, 4, 3, 3, 2, 4, 3, 3, 2, 3, 4, 3];
}

// ============================================================================
// Tests
// ============================================================================

describe('TeamScoringEngine', () => {
  // ==========================================================================
  // Engine Properties
  // ==========================================================================
  describe('engine properties', () => {
    it('has correct gameType for best-ball', () => {
      const engine = createTeamScoringEngine('best-ball');
      expect(engine.gameType).toBe('best-ball');
    });

    it('has higherIsBetter = true for best-ball', () => {
      const engine = createTeamScoringEngine('best-ball');
      expect(engine.higherIsBetter).toBe(true);
    });

    it('has higherIsBetter = false for scramble', () => {
      const engine = createTeamScoringEngine('scramble');
      expect(engine.higherIsBetter).toBe(false);
    });

    it('has higherIsBetter = false for aggregate', () => {
      const engine = createTeamScoringEngine('aggregate');
      expect(engine.higherIsBetter).toBe(false);
    });
  });

  // ==========================================================================
  // calculateScore - Single Scorecard
  // ==========================================================================
  describe('calculateScore', () => {
    it('calculates individual score within team context', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const scorecard = createScorecard('p1', 0, allPars(), 'team-1');
      const result = engine.calculateScore(scorecard, courseData);

      // For best-ball (Stableford), pars = 2 points each = 36
      expect(result.rawScore).toBe(36);
      expect(result.stablefordPoints).toBe(36);
      expect(result.grossScore).toBe(72);
    });

    it('applies handicap for individual calculation', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      // 18 handicap with 85% allowance = ~15 strokes
      const scorecard = createScorecard('p1', 18, allPars(), 'team-1');
      const result = engine.calculateScore(scorecard, courseData);

      // Should have more than 36 points due to handicap strokes
      expect(result.rawScore).toBeGreaterThan(36);
    });

    it('handles empty scores', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: {},
          total_gross: 0,
          total_net: 0,
          total_points: 0,
          ball_totals: null,
          status: 'in-progress',
          submitted_at: null,
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
        handicap: 0,
        teamId: 'team-1',
      };

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(0);
      expect(result.grossScore).toBe(0);
    });

    it('uses net score for aggregate format', () => {
      const engine = createTeamScoringEngine('aggregate');
      const courseData = createCourseData();

      const scorecard = createScorecard('p1', 0, allPars(), 'team-1');
      const result = engine.calculateScore(scorecard, courseData);

      // For aggregate, rawScore = net score = 72
      expect(result.rawScore).toBe(72);
      expect(result.netScore).toBe(72);
    });
  });

  // ==========================================================================
  // calculateLeaderboard
  // ==========================================================================
  describe('calculateLeaderboard', () => {
    it('returns empty array for no scorecards', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const result = engine.calculateLeaderboard([], courseData);
      expect(result).toEqual([]);
    });

    it('sorts teams by score (higher first for best-ball)', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const team1 = createScorecard('t1', 0, allPars(), 'team-1'); // 36 pts
      const team2 = createScorecard('t2', 0, allBirdies(), 'team-2'); // 54 pts
      const team3 = createScorecard('t3', 0, allBogeys(), 'team-3'); // 18 pts

      const result = engine.calculateLeaderboard([team1, team2, team3], courseData);

      expect(result[0].teamId).toBe('team-2'); // 54 pts
      expect(result[1].teamId).toBe('team-1'); // 36 pts
      expect(result[2].teamId).toBe('team-3'); // 18 pts
    });

    it('sorts teams by score (lower first for aggregate)', () => {
      const engine = createTeamScoringEngine('aggregate');
      const courseData = createCourseData();

      const team1 = createScorecard('t1', 0, allPars(), 'team-1'); // 72 net
      const team2 = createScorecard('t2', 0, allBirdies(), 'team-2'); // 54 net
      const team3 = createScorecard('t3', 0, allBogeys(), 'team-3'); // 90 net

      const result = engine.calculateLeaderboard([team1, team2, team3], courseData);

      expect(result[0].teamId).toBe('team-2'); // 54 (lowest)
      expect(result[1].teamId).toBe('team-1'); // 72
      expect(result[2].teamId).toBe('team-3'); // 90 (highest)
    });

    it('handles ties with position assignment', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const team1 = createScorecard('t1', 0, allPars(), 'team-1'); // 36 pts
      const team2 = createScorecard('t2', 0, allPars(), 'team-2'); // 36 pts
      const team3 = createScorecard('t3', 0, allBogeys(), 'team-3'); // 18 pts

      const result = engine.calculateLeaderboard([team1, team2, team3], courseData);

      expect(result[0].position).toBe(1);
      expect(result[0].tied).toBe(true);
      expect(result[1].position).toBe(1);
      expect(result[1].tied).toBe(true);
      expect(result[2].position).toBe(3); // Skips 2
      expect(result[2].tied).toBe(false);
    });

    it('sets isTeamResult = true for all entries', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const team1 = createScorecard('t1', 0, allPars(), 'team-1');

      const result = engine.calculateLeaderboard([team1], courseData);

      expect(result[0].isTeamResult).toBe(true);
      expect(result[0].teamId).toBe('team-1');
    });

    it('uses player_id if no teamId provided', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const scorecard = createScorecard('p1', 0, allPars()); // No teamId

      const result = engine.calculateLeaderboard([scorecard], courseData);

      expect(result[0].participantId).toBe('p1');
    });
  });

  // ==========================================================================
  // Score Parsing
  // ==========================================================================
  describe('score parsing', () => {
    it('handles numeric scores (legacy format)', () => {
      const engine = createTeamScoringEngine('best-ball');
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
          } as any,
          total_gross: 12,
          total_net: 0,
          total_points: 0,
          ball_totals: null,
          status: 'completed',
          submitted_at: null,
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
        handicap: 0,
        teamId: 'team-1',
      };

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.grossScore).toBe(12);
    });

    it('handles object scores with strokes property', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: {
            '1': { strokes: 4, putts: 2 },
            '2': { strokes: 3, putts: 1 },
          },
          total_gross: 7,
          total_net: 0,
          total_points: 0,
          ball_totals: null,
          status: 'completed',
          submitted_at: null,
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
        handicap: 0,
        teamId: 'team-1',
      };

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.grossScore).toBe(7);
    });

    it('ignores invalid hole numbers', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: {
            '1': { strokes: 4 },
            '19': { strokes: 5 }, // Invalid
            'abc': { strokes: 3 }, // Invalid
            '0': { strokes: 4 }, // Invalid
          },
          total_gross: 0,
          total_net: 0,
          total_points: 0,
          ball_totals: null,
          status: 'completed',
          submitted_at: null,
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
        handicap: 0,
        teamId: 'team-1',
      };

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.grossScore).toBe(4); // Only hole 1 counted
    });

    it('handles null scores', () => {
      const engine = createTeamScoringEngine('best-ball');
      const courseData = createCourseData();

      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: null as any,
          total_gross: 0,
          total_net: 0,
          total_points: 0,
          ball_totals: null,
          status: 'in-progress',
          submitted_at: null,
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
        handicap: 0,
        teamId: 'team-1',
      };

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.grossScore).toBe(0);
      expect(result.rawScore).toBe(0);
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================
  describe('createTeamScoringEngine', () => {
    it('creates best-ball engine by default', () => {
      const engine = createTeamScoringEngine();
      expect(engine.higherIsBetter).toBe(true);
    });

    it('creates engine for each format', () => {
      const formats: TeamFormat[] = ['best-ball', 'scramble', 'aggregate', 'shamble'];

      for (const format of formats) {
        const engine = createTeamScoringEngine(format);
        expect(engine).toBeInstanceOf(TeamScoringEngine);
      }
    });

    it('creates separate instances', () => {
      const engine1 = createTeamScoringEngine('best-ball');
      const engine2 = createTeamScoringEngine('best-ball');

      expect(engine1).not.toBe(engine2);
    });
  });
});
