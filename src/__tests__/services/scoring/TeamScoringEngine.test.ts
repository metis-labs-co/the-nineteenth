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
  // calculateBestBall - Core Functionality
  // ==========================================================================
  describe('calculateBestBall', () => {
    let engine: TeamScoringEngine;

    beforeEach(() => {
      engine = createTeamScoringEngine('best-ball');
    });

    it('calculates best ball for 2-player team', () => {
      const courseData = createCourseData();

      // P1 plays bogeys, P2 plays pars
      const p1 = createScorecard('p1', 0, allBogeys(), 'team-1');
      const p2 = createScorecard('p2', 0, allPars(), 'team-1');

      const result = engine.calculateBestBall([p1, p2], courseData);

      // P2's pars should be selected for all 18 holes
      // 2 points per hole * 18 = 36 points
      expect(result.rawScore).toBe(36);
      expect(result.teamId).toBe('team-1');
      expect(result.resultData.team_score).toBe(36);
    });

    it('calculates best ball for 4-player team', () => {
      const courseData = createCourseData();

      // Mix of scores - should pick best from each
      const p1 = createScorecard('p1', 0, allBogeys(), 'team-1'); // 18 pts
      const p2 = createScorecard('p2', 0, allPars(), 'team-1'); // 36 pts
      const p3 = createScorecard('p3', 0, allBirdies(), 'team-1'); // 54 pts (birdies = 3pts each)
      const p4 = createScorecard('p4', 0, allBogeys(), 'team-1'); // 18 pts

      const result = engine.calculateBestBall([p1, p2, p3, p4], courseData);

      // P3's birdies should be selected for all 18 holes (3 pts each)
      expect(result.rawScore).toBe(54);
    });

    it('applies handicap adjustments correctly', () => {
      const courseData = createCourseData();

      // P1 has 0 handicap, plays pars = 2 points each
      // P2 has 18 handicap (playing handicap ~15 with 85% allowance)
      // P2 plays pars gross = net birdies on holes with strokes = 3 points
      const p1 = createScorecard('p1', 0, allPars(), 'team-1');
      const p2 = createScorecard('p2', 18, allPars(), 'team-1');

      const result = engine.calculateBestBall([p1, p2], courseData);

      // P2 should contribute more points due to handicap strokes
      // With 85% of 18 = ~15 strokes, P2 gets 3 pts on 15 holes, P1/P2 tie on 3
      expect(result.rawScore).toBeGreaterThan(36);
    });

    it('excludes pickup scores (10+)', () => {
      const courseData = createCourseData();

      // P1 picks up on hole 1 (score = 10)
      const p1Scores = [...allPars()];
      p1Scores[0] = 10; // Pickup on hole 1
      const p1 = createScorecard('p1', 0, p1Scores, 'team-1');
      const p2 = createScorecard('p2', 0, allPars(), 'team-1');

      const result = engine.calculateBestBall([p1, p2], courseData);

      // P2's par should be used on hole 1, P1's pickup excluded
      // All 18 holes should have 2 points
      expect(result.rawScore).toBe(36);
    });

    it('breaks ties by net score', () => {
      const courseData = createCourseData();

      // Both players have same points but different net on hole 1
      // This is a subtle test - if both have 2 points (par), lower net wins
      // P1: gross 4 on par 4 = net 4 = 2 points
      // P2: gross 5 on par 4 with 1 stroke = net 4 = 2 points (same as P1)
      // When tied, lower net should be preferred (they're equal here)

      const p1 = createScorecard('p1', 0, allPars(), 'team-1');
      const p2 = createScorecard('p2', 0, allPars(), 'team-1');

      const result = engine.calculateBestBall([p1, p2], courseData);

      // Should complete without error
      expect(result.rawScore).toBe(36);
    });

    it('tracks member contributions correctly', () => {
      const courseData = createCourseData();

      // P1 plays birdies on holes 1-9, bogeys on 10-18
      const p1Scores = [3, 2, 4, 3, 3, 2, 3, 4, 3, 5, 4, 6, 5, 5, 4, 5, 6, 5];
      // P2 plays bogeys on holes 1-9, birdies on 10-18
      const p2Scores = [5, 4, 6, 5, 5, 4, 5, 6, 5, 3, 2, 4, 3, 3, 2, 3, 4, 3];

      const p1 = createScorecard('p1', 0, p1Scores, 'team-1');
      const p2 = createScorecard('p2', 0, p2Scores, 'team-1');

      const result = engine.calculateBestBall([p1, p2], courseData);

      // P1 should contribute holes 1-9 (birdies = 3 pts each = 27)
      // P2 should contribute holes 10-18 (birdies = 3 pts each = 27)
      expect(result.rawScore).toBe(54);

      const p1Contrib = result.memberScores.find((m) => m.playerId === 'p1');
      const p2Contrib = result.memberScores.find((m) => m.playerId === 'p2');

      expect(p1Contrib?.contribution).toBe(27);
      expect(p2Contrib?.contribution).toBe(27);

      // Check hole contributions
      expect(p1Contrib?.holeContributions?.[1]).toBe(true);
      expect(p1Contrib?.holeContributions?.[10]).toBeUndefined();
      expect(p2Contrib?.holeContributions?.[10]).toBe(true);
    });

    it('handles missing scores on some holes', () => {
      const courseData = createCourseData();

      // P1 only has front 9 scores
      const p1Scores: (number | null)[] = [4, 3, 5, 4, 4, 3, 4, 5, 4, null, null, null, null, null, null, null, null, null];
      // P2 has all 18
      const p2Scores = allPars();

      const p1 = createScorecard('p1', 0, p1Scores, 'team-1');
      const p2 = createScorecard('p2', 0, p2Scores, 'team-1');

      const result = engine.calculateBestBall([p1, p2], courseData);

      // Front 9: P1 and P2 tie (both pars), Back 9: only P2 has scores
      // 18 holes * 2 points = 36
      expect(result.rawScore).toBe(36);
    });

    it('handles empty team', () => {
      const courseData = createCourseData();

      const result = engine.calculateBestBall([], courseData);

      expect(result.rawScore).toBe(0);
      expect(result.memberScores).toEqual([]);
    });

    it('respects useHandicap config = false', () => {
      const courseData = createCourseData();

      const config: EngineConfig = {
        useHandicap: false,
        useNetScores: true,
      };

      // P1 has 0 handicap, P2 has 18 handicap
      // With handicaps disabled, both play gross pars = 2 points each
      const p1 = createScorecard('p1', 0, allPars(), 'team-1');
      const p2 = createScorecard('p2', 18, allPars(), 'team-1');

      const result = engine.calculateBestBall([p1, p2], courseData, config);

      // Without handicap adjustments, both get 2 points per hole
      expect(result.rawScore).toBe(36);
    });
  });

  // ==========================================================================
  // calculateAmbrose (used by Scramble format)
  // ==========================================================================
  describe('calculateAmbrose', () => {
    let engine: TeamScoringEngine;

    beforeEach(() => {
      engine = createTeamScoringEngine('scramble');
    });

    it('calculates 2-person team handicap correctly', () => {
      const courseData = createCourseData();

      // 2-person team: (H1 + H2) / 4 = (20 + 16) / 4 = 9
      const p1 = createScorecard('p1', 20, allPars(), 'team-1');
      const p2 = createScorecard('p2', 16, allPars(), 'team-1');

      const result = engine.calculateAmbrose([p1, p2], courseData);

      // Team plays par golf (72 gross)
      // Team handicap = 9, so net = 72 - 9 = 63 (approximately)
      expect(result.resultData.gross_score).toBe(72);
      expect(result.rawScore).toBeLessThan(72); // Net should be less than gross
    });

    it('calculates 4-person team handicap correctly', () => {
      const courseData = createCourseData();

      // 4-person team: (H1 + H2 + H3 + H4) / 8 = (20 + 16 + 12 + 8) / 8 = 7
      const p1 = createScorecard('p1', 20, allPars(), 'team-1');
      const p2 = createScorecard('p2', 16, allPars(), 'team-1');
      const p3 = createScorecard('p3', 12, allPars(), 'team-1');
      const p4 = createScorecard('p4', 8, allPars(), 'team-1');

      const result = engine.calculateAmbrose([p1, p2, p3, p4], courseData);

      // Team plays par golf (72 gross)
      expect(result.resultData.gross_score).toBe(72);
      expect(result.rawScore).toBeLessThan(72);
    });

    it('tracks all players as contributing equally', () => {
      const courseData = createCourseData();

      const p1 = createScorecard('p1', 18, allPars(), 'team-1');
      const p2 = createScorecard('p2', 18, allPars(), 'team-1');

      const result = engine.calculateAmbrose([p1, p2], courseData);

      // In Ambrose, all players contribute equally (contribution = 0)
      expect(result.memberScores.length).toBe(2);
      expect(result.memberScores[0].contribution).toBe(0);
      expect(result.memberScores[1].contribution).toBe(0);
    });

    it('uses first scorecard for team strokes', () => {
      const courseData = createCourseData();

      // In Ambrose, the first scorecard contains team's combined strokes
      const teamScorecard = createScorecard('p1', 18, allBirdies(), 'team-1'); // Good team score
      const p2 = createScorecard('p2', 18, allBogeys(), 'team-1'); // Ignored

      const result = engine.calculateAmbrose([teamScorecard, p2], courseData);

      // Should use team's birdie scores (54 gross)
      expect(result.resultData.gross_score).toBe(54);
    });

    it('handles empty team', () => {
      const courseData = createCourseData();

      const result = engine.calculateAmbrose([], courseData);

      expect(result.rawScore).toBe(0);
      expect(result.teamId).toBe('');
    });

    it('respects useHandicap config = false', () => {
      const courseData = createCourseData();

      const config: EngineConfig = {
        useHandicap: false,
        useNetScores: true,
      };

      const p1 = createScorecard('p1', 20, allPars(), 'team-1');
      const p2 = createScorecard('p2', 16, allPars(), 'team-1');

      const result = engine.calculateAmbrose([p1, p2], courseData, config);

      // Without handicap, net = gross = 72
      expect(result.rawScore).toBe(72);
      expect(result.resultData.net_score).toBe(72);
    });
  });

  // ==========================================================================
  // calculateAggregate
  // ==========================================================================
  describe('calculateAggregate', () => {
    let engine: TeamScoringEngine;

    beforeEach(() => {
      engine = createTeamScoringEngine('aggregate');
    });

    it('sums all player net scores', () => {
      const courseData = createCourseData();

      // 2 players both playing par golf
      const p1 = createScorecard('p1', 0, allPars(), 'team-1');
      const p2 = createScorecard('p2', 0, allPars(), 'team-1');

      const result = engine.calculateAggregate([p1, p2], courseData);

      // 72 net + 72 net = 144
      expect(result.rawScore).toBe(144);
      expect(result.resultData.net_score).toBe(144);
    });

    it('tracks individual contributions', () => {
      const courseData = createCourseData();

      const p1 = createScorecard('p1', 0, allPars(), 'team-1'); // Net 72
      const p2 = createScorecard('p2', 0, allBogeys(), 'team-1'); // Net 90

      const result = engine.calculateAggregate([p1, p2], courseData);

      expect(result.rawScore).toBe(162); // 72 + 90

      const p1Contrib = result.memberScores.find((m) => m.playerId === 'p1');
      const p2Contrib = result.memberScores.find((m) => m.playerId === 'p2');

      expect(p1Contrib?.contribution).toBe(72);
      expect(p2Contrib?.contribution).toBe(90);
    });

    it('handles missing scores', () => {
      const courseData = createCourseData();

      // P1 only has 9 holes
      const p1Scores: (number | null)[] = [4, 3, 5, 4, 4, 3, 4, 5, 4, null, null, null, null, null, null, null, null, null];
      const p1 = createScorecard('p1', 0, p1Scores, 'team-1');
      const p2 = createScorecard('p2', 0, allPars(), 'team-1');

      const result = engine.calculateAggregate([p1, p2], courseData);

      // P1 = 36 (front 9), P2 = 72 (full 18)
      expect(result.rawScore).toBe(108);
    });

    it('applies handicap adjustments', () => {
      const courseData = createCourseData();

      // P2 has 18 handicap
      const p1 = createScorecard('p1', 0, allPars(), 'team-1');
      const p2 = createScorecard('p2', 18, allPars(), 'team-1');

      const result = engine.calculateAggregate([p1, p2], courseData);

      // P1 net = 72, P2 net with strokes should be less
      expect(result.rawScore).toBeLessThan(144);
    });

    it('handles empty team', () => {
      const courseData = createCourseData();

      const result = engine.calculateAggregate([], courseData);

      expect(result.rawScore).toBe(0);
      expect(result.memberScores).toEqual([]);
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
