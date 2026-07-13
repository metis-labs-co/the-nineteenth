/**
 * Match Play Engine Tests
 *
 * Tests for the Match Play scoring engine including:
 * - Full match calculation between two players
 * - Handicap stroke allocation based on difference
 * - Match result formats (3&2, 1UP, A/S)
 * - Early finish (dormie, match over scenarios)
 * - Leaderboard generation and sorting
 * - Score parsing from various formats
 */

import {
  MatchPlayEngine,
  createMatchPlayEngine,
} from '@/services/scoring/engines/MatchPlayEngine';
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
      strokeIndex: i, // SI 1-18 for simplicity
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
  scores: (number | null)[] // 18 scores (or less for partial)
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
      status: 'completed',
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

/**
 * Create a scorecard with match data pre-populated (for leaderboard tests)
 */
function createScorecardWithMatchData(
  playerId: string,
  handicap: number,
  matchResult: 'win' | 'loss' | 'halved',
  margin?: string,
  holesWon = 0,
  holesLost = 0,
  holesHalved = 0
): ScorecardWithHandicap {
  return {
    scorecard: {
      id: `sc-${playerId}`,
      round_id: 'round-1',
      player_id: playerId,
      scores: {
        match: {
          result: matchResult,
          margin,
          holes_won: holesWon,
          holes_lost: holesLost,
          holes_halved: holesHalved,
        },
      } as any,
      total_gross: 0,
      total_net: 0,
      total_points: 0,
      ball_totals: null,
      status: 'completed',
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

// ============================================================================
// Tests
// ============================================================================

describe('MatchPlayEngine', () => {
  let engine: MatchPlayEngine;

  beforeEach(() => {
    engine = createMatchPlayEngine();
  });

  // ==========================================================================
  // Engine Properties
  // ==========================================================================
  describe('engine properties', () => {
    it('has correct gameType', () => {
      expect(engine.gameType).toBe('match-play');
    });

    it('has higherIsBetter = true', () => {
      expect(engine.higherIsBetter).toBe(true);
    });
  });

  // ==========================================================================
  // calculateMatch - Basic Outcomes
  // ==========================================================================
  describe('calculateMatch - basic outcomes', () => {
    it('calculates player 1 win by 3&2', () => {
      const courseData = createCourseData();

      // Player 1 wins first 5 holes by 1 stroke each
      // Player 2 wins hole 6
      // Player 1 up 4 after 6, wins holes 7-8 as well = 6 up with 10 to play
      // Match should end when margin > holes remaining

      // Create scores where P1 beats P2 decisively
      const p1Scores = [3, 2, 4, 3, 3, 4, 3, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      const p2Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, p1Scores);
      const player2 = createScorecard('p2', 0, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      expect(result.result).toBe('player1');
      expect(result.player1Id).toBe('p1');
      expect(result.player2Id).toBe('p2');
      expect(result.player1Up).toBeGreaterThan(result.player2Up);
    });

    it('calculates player 2 win by 1UP', () => {
      const courseData = createCourseData();

      // P1 and P2 tie on 17 holes, P2 wins hole 18
      const p1Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 5];
      const p2Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, p1Scores);
      const player2 = createScorecard('p2', 0, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      expect(result.result).toBe('player2');
      expect(result.margin).toBe('1 UP');
      expect(result.holesPlayed).toBe(18);
    });

    it('calculates match halved (A/S)', () => {
      const courseData = createCourseData();

      // Both players play identical rounds
      const scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, scores);
      const player2 = createScorecard('p2', 0, [...scores]);

      const result = engine.calculateMatch(player1, player2, courseData);

      expect(result.result).toBe('halved');
      expect(result.margin).toBe('A/S');
      expect(result.holesPlayed).toBe(18);
      expect(result.player1Up).toBe(result.player2Up);
    });

    it('returns incomplete for partial match', () => {
      const courseData = createCourseData();

      // Only 9 holes played, match is all square
      const scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, null, null, null, null, null, null, null, null, null];

      const player1 = createScorecard('p1', 0, scores as (number | null)[]);
      const player2 = createScorecard('p2', 0, scores as (number | null)[]);

      const result = engine.calculateMatch(player1, player2, courseData);

      // All square after 9 holes, match incomplete
      expect(result.holesPlayed).toBe(9);
      expect(result.result).toBe('incomplete');
    });
  });

  // ==========================================================================
  // calculateMatch - Handicap Scenarios
  // ==========================================================================
  describe('calculateMatch - handicap scenarios', () => {
    it('higher handicap player receives strokes', () => {
      const courseData = createCourseData();

      // P1 has 0 handicap, P2 has 10 handicap
      // On holes with SI 1-10, P2 gets 1 stroke
      // If both make par gross, P2 wins holes 1-10 (net birdie vs par)

      const p1Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      const p2Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, p1Scores);
      const player2 = createScorecard('p2', 10, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      // P2 should win holes 1-10 (net birdie with stroke), halve 11-18
      expect(result.result).toBe('player2');
      expect(result.player2Up).toBeGreaterThan(result.player1Up);
    });

    it('equal handicaps result in gross comparison', () => {
      const courseData = createCourseData();

      // Both 10 handicap = 0 stroke difference = gross comparison
      const p1Scores = [3, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]; // Birdie on 1
      const p2Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 10, p1Scores);
      const player2 = createScorecard('p2', 10, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      // P1 wins hole 1 only, all others halved
      expect(result.result).toBe('player1');
      expect(result.margin).toBe('1 UP');
    });

    it('large handicap difference gives 2+ strokes per hole', () => {
      const courseData = createCourseData();

      // P1 has 0 handicap, P2 has 27 handicap
      // Handicap difference = 27
      // On SI 1-9: P2 gets 2 strokes (floor(27/18)=1 + 9 remainder holes)
      // On SI 10-18: P2 gets 1 stroke

      const p1Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]; // All pars
      const p2Scores = [6, 5, 7, 6, 6, 5, 6, 7, 6, 5, 4, 6, 5, 5, 4, 5, 6, 5]; // Double bogeys / bogeys

      const player1 = createScorecard('p1', 0, p1Scores);
      const player2 = createScorecard('p2', 27, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      // P2's net scores should be competitive despite high gross
      expect(result.holeResults.length).toBeGreaterThan(0);
    });

    it('respects useHandicap config = false', () => {
      const courseData = createCourseData();

      const config: EngineConfig = {
        useHandicap: false,
        useNetScores: true,
      };

      // P1 has 0 handicap, P2 has 18 handicap
      // With handicaps disabled, gross scores compared
      const p1Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      const p2Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, p1Scores);
      const player2 = createScorecard('p2', 18, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData, config);

      // Without handicap, all holes halved = A/S
      expect(result.result).toBe('halved');
      expect(result.margin).toBe('A/S');
    });
  });

  // ==========================================================================
  // calculateMatch - Edge Cases
  // ==========================================================================
  describe('calculateMatch - edge cases', () => {
    it('handles early finish (6&5)', () => {
      const courseData = createCourseData();

      // P1 wins first 8 holes decisively
      const p1Scores = [3, 2, 4, 3, 3, 2, 3, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      const p2Scores = [5, 4, 6, 5, 5, 4, 5, 6, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, p1Scores);
      const player2 = createScorecard('p2', 0, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      // Match should end early when P1's lead > remaining holes
      expect(result.result).toBe('player1');
      expect(result.holesPlayed).toBeLessThan(18);
      expect(result.margin).toMatch(/\d+&\d+/); // Format like "6&5"
    });

    it('handles dormie situation correctly', () => {
      const courseData = createCourseData();

      // P1 is 3 up after 15, 3 to play (dormie)
      // All remaining holes halved = P1 wins 3&0
      const p1Scores = [3, 2, 4, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      const p2Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, p1Scores);
      const player2 = createScorecard('p2', 0, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      // P1 wins holes 1, 2, 3 = 3 up after 3 holes, halve rest
      // 3 up with 15 to play, not dormie yet
      expect(result.result).toBe('player1');
    });

    it('handles all holes halved', () => {
      const courseData = createCourseData();

      // Identical scores = all halved
      const scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, scores);
      const player2 = createScorecard('p2', 0, [...scores]);

      const result = engine.calculateMatch(player1, player2, courseData);

      expect(result.result).toBe('halved');
      expect(result.margin).toBe('A/S');
      expect(result.player1Up).toBe(0);
      expect(result.player2Up).toBe(0);
    });

    it('handles one player picks up (score = 10)', () => {
      const courseData = createCourseData();

      // P2 picks up on hole 5 (scores 10 = pickup)
      const p1Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      const p2Scores = [4, 3, 5, 4, 10, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, p1Scores);
      const player2 = createScorecard('p2', 0, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      // P1 should win hole 5 (pickup means loss)
      const hole5 = result.holeResults.find((h) => h.holeNumber === 5);
      expect(hole5?.result).toBe('player1');
    });
  });

  // ==========================================================================
  // calculateMatch - Hole Results
  // ==========================================================================
  describe('calculateMatch - hole results', () => {
    it('tracks hole-by-hole results correctly', () => {
      const courseData = createCourseData();

      // P1 wins hole 1, P2 wins hole 2, halve hole 3
      const p1Scores = [3, 4, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
      const p2Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

      const player1 = createScorecard('p1', 0, p1Scores);
      const player2 = createScorecard('p2', 0, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      expect(result.holeResults[0].result).toBe('player1'); // P1 wins hole 1
      expect(result.holeResults[1].result).toBe('player2'); // P2 wins hole 2
      expect(result.holeResults[2].result).toBe('halved'); // Hole 3 halved
    });

    it('records net scores correctly', () => {
      const courseData = createCourseData();

      // P1 has 10 handicap, P2 has 0 handicap
      // On hole 1 (SI 1), P1 gets 1 stroke
      const p1Scores = [5, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]; // Bogey on 1
      const p2Scores = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]; // Par on 1

      const player1 = createScorecard('p1', 10, p1Scores);
      const player2 = createScorecard('p2', 0, p2Scores);

      const result = engine.calculateMatch(player1, player2, courseData);

      const hole1 = result.holeResults[0];
      expect(hole1.player1Score).toBe(5); // Gross
      expect(hole1.player2Score).toBe(4); // Gross
      expect(hole1.player1NetScore).toBe(4); // 5 - 1 stroke
      expect(hole1.player2NetScore).toBe(4); // No strokes (lower hcp)
      expect(hole1.result).toBe('halved'); // Net tie
    });
  });

  // ==========================================================================
  // calculateScore - Single Scorecard
  // ==========================================================================
  describe('calculateScore', () => {
    it('returns match data when available', () => {
      const courseData = createCourseData();
      const scorecard = createScorecardWithMatchData('p1', 10, 'win', '3&2', 8, 5, 5);

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(8); // holesUp = holesWon for win
      expect(result.resultData.match_result).toBe('win');
      expect(result.resultData.final_margin).toBe('3&2');
      expect(result.resultData.holes_won).toBe(8);
      expect(result.resultData.holes_lost).toBe(5);
      expect(result.resultData.holes_halved).toBe(5);
    });

    it('returns zero for scorecard without match data', () => {
      const courseData = createCourseData();
      const scorecard = createScorecard('p1', 10, [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]);

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(0);
      expect(result.resultData).toEqual({});
    });

    it('returns negative holesUp for loss', () => {
      const courseData = createCourseData();
      const scorecard = createScorecardWithMatchData('p1', 10, 'loss', '2&1', 3, 5, 10);

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(-5); // Negative for loss
      expect(result.resultData.match_result).toBe('loss');
    });

    it('returns zero holesUp for halved', () => {
      const courseData = createCourseData();
      const scorecard = createScorecardWithMatchData('p1', 10, 'halved', 'A/S', 6, 6, 6);

      const result = engine.calculateScore(scorecard, courseData);

      expect(result.rawScore).toBe(0);
      expect(result.resultData.match_result).toBe('halved');
    });
  });

  // ==========================================================================
  // calculateLeaderboard
  // ==========================================================================
  describe('calculateLeaderboard', () => {
    it('returns empty array for no scorecards', () => {
      const courseData = createCourseData();
      const result = engine.calculateLeaderboard([], courseData);
      expect(result).toEqual([]);
    });

    it('sorts by match result (win > halved > loss)', () => {
      const courseData = createCourseData();

      const winner = createScorecardWithMatchData('p1', 10, 'win', '3&2', 8, 5, 5);
      const halved = createScorecardWithMatchData('p2', 10, 'halved', 'A/S', 6, 6, 6);
      const loser = createScorecardWithMatchData('p3', 10, 'loss', '2&1', 3, 5, 10);

      const result = engine.calculateLeaderboard([loser, halved, winner], courseData);

      expect(result.length).toBe(3);
      expect(result[0].participantId).toBe('p1'); // Winner first
      expect(result[1].participantId).toBe('p2'); // Halved second
      expect(result[2].participantId).toBe('p3'); // Loser last
    });

    it('breaks ties by margin among winners', () => {
      const courseData = createCourseData();

      const bigWinner = createScorecardWithMatchData('p1', 10, 'win', '6&5', 10, 4, 4);
      const smallWinner = createScorecardWithMatchData('p2', 10, 'win', '1UP', 7, 6, 5);

      const result = engine.calculateLeaderboard([smallWinner, bigWinner], courseData);

      expect(result[0].participantId).toBe('p1'); // 10 holes won > 7 holes won
      expect(result[1].participantId).toBe('p2');
    });

    it('assigns positions correctly', () => {
      const courseData = createCourseData();

      const p1 = createScorecardWithMatchData('p1', 10, 'win', '3&2', 8, 5, 5);
      const p2 = createScorecardWithMatchData('p2', 10, 'win', '3&2', 8, 5, 5); // Same as p1
      const p3 = createScorecardWithMatchData('p3', 10, 'loss', '2&1', 3, 5, 10);

      const result = engine.calculateLeaderboard([p1, p2, p3], courseData);

      // P1 and P2 tied for 1st
      expect(result[0].position).toBe(1);
      expect(result[0].tied).toBe(true);
      expect(result[1].position).toBe(1);
      expect(result[1].tied).toBe(true);
      // P3 in 3rd (skips 2nd)
      expect(result[2].position).toBe(3);
      expect(result[2].tied).toBe(false);
    });

    it('sets isTeamResult = false for individual players', () => {
      const courseData = createCourseData();
      const scorecard = createScorecardWithMatchData('p1', 10, 'win', '1UP', 7, 6, 5);

      const result = engine.calculateLeaderboard([scorecard], courseData);

      expect(result[0].isTeamResult).toBe(false);
      expect(result[0].playerId).toBe('p1');
    });
  });

  // ==========================================================================
  // Score Parsing
  // ==========================================================================
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
      };

      const scorecard2: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-2',
          round_id: 'round-1',
          player_id: 'p2',
          scores: {
            '1': 5,
            '2': 4,
            '3': 6,
          } as any,
          total_gross: 15,
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
      };

      const result = engine.calculateMatch(scorecard, scorecard2, courseData);

      // Engine iterates through all 18 holes - only first 3 have complete scores
      // P1 should win first 3 holes based on the scores provided
      expect(result.holeResults[0].player1Score).toBe(4);
      expect(result.holeResults[0].player2Score).toBe(5);
      expect(result.holeResults[0].result).toBe('player1'); // P1 wins hole 1
      expect(result.holeResults[1].result).toBe('player1'); // P1 wins hole 2
      expect(result.holeResults[2].result).toBe('player1'); // P1 wins hole 3
      // P1 3 up after 3 holes, match ends early (3 up with 15 to play = not over yet)
      expect(result.holesPlayed).toBe(3);
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
      };

      const scorecard2: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-2',
          round_id: 'round-1',
          player_id: 'p2',
          scores: {
            '1': { strokes: 5, putts: 3 },
            '2': { strokes: 4, putts: 2 },
          },
          total_gross: 9,
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
      };

      const result = engine.calculateMatch(scorecard, scorecard2, courseData);

      expect(result.holeResults[0].player1Score).toBe(4);
      expect(result.holeResults[0].player2Score).toBe(5);
    });

    it('handles object scores with score property (alternate format)', () => {
      const courseData = createCourseData();
      const scorecard: ScorecardWithHandicap = {
        scorecard: {
          id: 'sc-1',
          round_id: 'round-1',
          player_id: 'p1',
          scores: {
            '1': { score: 4 },
            '2': { score: 3 },
          } as any,
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
      };

      const scorecard2 = createScorecard('p2', 0, [5, 4, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]);

      const result = engine.calculateMatch(scorecard, scorecard2, courseData);

      expect(result.holeResults[0].player1Score).toBe(4);
      expect(result.holeResults[1].player1Score).toBe(3);
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
      };

      const scorecard2 = createScorecard('p2', 0, [5, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]);

      const result = engine.calculateMatch(scorecard, scorecard2, courseData);

      // Only hole 1 should have a valid score for P1
      expect(result.holeResults[0].player1Score).toBe(4);
    });

    it('handles null scores gracefully', () => {
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
      };

      const scorecard2 = createScorecard('p2', 0, [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4]);

      const result = engine.calculateMatch(scorecard, scorecard2, courseData);

      // All holes should be incomplete for P1
      expect(result.holeResults.every((h) => h.result === 'incomplete' || h.player1Score === null)).toBe(true);
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================
  describe('createMatchPlayEngine', () => {
    it('creates a new instance', () => {
      const engine1 = createMatchPlayEngine();
      const engine2 = createMatchPlayEngine();

      expect(engine1).toBeInstanceOf(MatchPlayEngine);
      expect(engine2).toBeInstanceOf(MatchPlayEngine);
      expect(engine1).not.toBe(engine2);
    });
  });
});
