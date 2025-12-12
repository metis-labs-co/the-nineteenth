/**
 * Scoring Utility Tests
 *
 * Tests for all scoring calculations including:
 * - (4) Score team Best Ball round - verify best score used
 * - (5) Score team Scramble round - verify single team score
 * - (6) Score Match Play round - verify match result calculation and early finish
 * - Individual Stableford and Stroke scoring
 */

import {
  getStrokesOnHole,
  getStrokesReceived,
  calculateNetScore,
  calculateStablefordPoints,
  calculateStablefordPointsNet,
  calculateMatchPlayHole,
  calculateScrambleTeamHandicap,
  calculateBestBallScore,
  calculateBestBallStablefordPoints,
  calculateAggregateTeamScore,
  calculateTeamMatchPlayHoleResult,
  calculateMatchPlayStatus,
  calculateStatistics,
  sortLeaderboard,
  getScoreDescription,
} from '@/utils/scoring';
import {
  createTestPlayer,
  create18Holes,
  createTestScorecard,
  createCompletedScorecard,
} from './testFixtures';
import type { Hole } from '@/types/database.types';

// ============================================================================
// Individual Scoring Tests
// ============================================================================

describe('Individual Scoring', () => {
  const holes = create18Holes();

  describe('getStrokesOnHole / getStrokesReceived', () => {
    it('returns 0 strokes for 0 or negative handicap', () => {
      expect(getStrokesOnHole(0, holes[0])).toBe(0);
      expect(getStrokesOnHole(-1, holes[0])).toBe(0);
      expect(getStrokesReceived(0, 1)).toBe(0);
      expect(getStrokesReceived(-5, 10)).toBe(0);
    });

    it('calculates correct strokes for low handicap (< 18)', () => {
      // Handicap 10: gets 1 stroke on holes with stroke index 1-10
      const hole1 = holes.find((h) => h.strokeIndex === 1)!;
      const hole10 = holes.find((h) => h.strokeIndex === 10)!;
      const hole11 = holes.find((h) => h.strokeIndex === 11)!;

      expect(getStrokesOnHole(10, hole1)).toBe(1);
      expect(getStrokesOnHole(10, hole10)).toBe(1);
      expect(getStrokesOnHole(10, hole11)).toBe(0);
    });

    it('calculates correct strokes for exact 18 handicap', () => {
      // Handicap 18: gets 1 stroke on all holes
      holes.forEach((hole) => {
        expect(getStrokesOnHole(18, hole)).toBe(1);
      });
    });

    it('calculates correct strokes for high handicap (> 18)', () => {
      // Handicap 27: base = 1, additional on holes 1-9 = 2 strokes on 9 holes
      const hole1 = holes.find((h) => h.strokeIndex === 1)!;
      const hole9 = holes.find((h) => h.strokeIndex === 9)!;
      const hole10 = holes.find((h) => h.strokeIndex === 10)!;

      expect(getStrokesOnHole(27, hole1)).toBe(2); // 27/18=1 base + 1 extra
      expect(getStrokesOnHole(27, hole9)).toBe(2);
      expect(getStrokesOnHole(27, hole10)).toBe(1); // Only base stroke
    });

    it('calculates correct strokes for 36 handicap', () => {
      // Handicap 36: gets 2 strokes on all holes
      holes.forEach((hole) => {
        expect(getStrokesOnHole(36, hole)).toBe(2);
      });
    });
  });

  describe('calculateNetScore', () => {
    it('calculates net score correctly', () => {
      const hole = holes[0]; // Par 4, SI 7
      const player = createTestPlayer({ handicap: 18 });

      // Gross 5, 1 stroke received = Net 4
      expect(calculateNetScore(5, player.handicap, hole)).toBe(4);

      // Gross 4, 1 stroke received = Net 3
      expect(calculateNetScore(4, player.handicap, hole)).toBe(3);
    });

    it('handles no strokes received', () => {
      const hole = holes[0];
      const player = createTestPlayer({ handicap: 0 });

      expect(calculateNetScore(5, player.handicap, hole)).toBe(5);
    });
  });

  describe('calculateStablefordPoints', () => {
    it('awards correct points for different scores', () => {
      const parFourHole: Hole = { number: 1, par: 4, strokeIndex: 10 };
      const handicap = 18; // Gets 1 stroke on this hole

      // Gross 3 on par 4 with 1 stroke = Net 2 = Eagle = 4 points
      expect(calculateStablefordPoints(3, handicap, parFourHole)).toBe(4);

      // Gross 4 on par 4 with 1 stroke = Net 3 = Birdie = 3 points
      expect(calculateStablefordPoints(4, handicap, parFourHole)).toBe(3);

      // Gross 5 on par 4 with 1 stroke = Net 4 = Par = 2 points
      expect(calculateStablefordPoints(5, handicap, parFourHole)).toBe(2);

      // Gross 6 on par 4 with 1 stroke = Net 5 = Bogey = 1 point
      expect(calculateStablefordPoints(6, handicap, parFourHole)).toBe(1);

      // Gross 7 on par 4 with 1 stroke = Net 6 = Double bogey = 0 points
      expect(calculateStablefordPoints(7, handicap, parFourHole)).toBe(0);
    });

    it('awards 0 points for double bogey or worse', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 18 };
      const handicap = 0;

      expect(calculateStablefordPoints(6, handicap, hole)).toBe(0); // Double bogey
      expect(calculateStablefordPoints(7, handicap, hole)).toBe(0); // Triple bogey
      expect(calculateStablefordPoints(10, handicap, hole)).toBe(0); // Pick up
    });
  });

  describe('calculateStablefordPointsNet', () => {
    it('awards points based on net strokes relative to par', () => {
      // Albatross or better
      expect(calculateStablefordPointsNet(1, 4, 0)).toBe(5); // Ace on par 4

      // Eagle
      expect(calculateStablefordPointsNet(2, 4, 0)).toBe(4);
      expect(calculateStablefordPointsNet(3, 4, 1)).toBe(4); // 3 gross - 1 stroke = 2 net

      // Birdie
      expect(calculateStablefordPointsNet(3, 4, 0)).toBe(3);

      // Par
      expect(calculateStablefordPointsNet(4, 4, 0)).toBe(2);

      // Bogey
      expect(calculateStablefordPointsNet(5, 4, 0)).toBe(1);

      // Double bogey or worse
      expect(calculateStablefordPointsNet(6, 4, 0)).toBe(0);
    });
  });
});

// ============================================================================
// Team Best Ball Scoring Tests
// ============================================================================

describe('Team Best Ball Scoring', () => {
  const holes = create18Holes();

  describe('calculateBestBallScore', () => {
    it('returns the best (lowest) net score among team members', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };

      // Stroke calculation: baseStrokes = floor(hcp/18), additionalStroke = SI <= (hcp % 18) ? 1 : 0
      const playerScores = [
        { strokes: 5, handicap: 10 }, // SI 5 <= 10, gets 1 stroke. Net: 5 - 1 = 4
        { strokes: 4, handicap: 5 },  // SI 5 <= 5, gets 1 stroke. Net: 4 - 1 = 3
        { strokes: 6, handicap: 18 }, // SI 5 <= 0, gets 1 stroke (base). Net: 6 - 1 = 5
      ];

      const result = calculateBestBallScore(playerScores, hole);

      expect(result).not.toBeNull();
      expect(result!.bestNetScore).toBe(3); // Best net is 3 (player 2)
    });

    it('correctly identifies best score when handicaps differ significantly', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 1 }; // SI 1

      const playerScores = [
        { strokes: 6, handicap: 36 }, // Net: 6 - 2 = 4
        { strokes: 4, handicap: 5 },  // Net: 4 - 1 = 3
        { strokes: 5, handicap: 10 }, // Net: 5 - 1 = 4
      ];

      const result = calculateBestBallScore(playerScores, hole);

      expect(result).not.toBeNull();
      expect(result!.bestNetScore).toBe(3);
      expect(result!.bestStrokes).toBe(4);
    });

    it('returns null for empty player scores', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };
      const result = calculateBestBallScore([], hole);
      expect(result).toBeNull();
    });

    it('returns null if no valid scores (all zeros)', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };
      const playerScores = [
        { strokes: 0, handicap: 10 },
        { strokes: 0, handicap: 15 },
      ];

      const result = calculateBestBallScore(playerScores, hole);
      expect(result).toBeNull();
    });

    it('handles two-person best ball correctly', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 10 };

      const playerScores = [
        { strokes: 5, handicap: 12 }, // Net: 5 - 1 = 4 (Par)
        { strokes: 3, handicap: 8 },  // Net: 3 - 0 = 3 (Birdie)
      ];

      const result = calculateBestBallScore(playerScores, hole);

      expect(result!.bestNetScore).toBe(3);
      expect(result!.bestStrokes).toBe(3);
    });
  });

  describe('calculateBestBallStablefordPoints', () => {
    it('returns the best Stableford points among team members', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };

      const playerScores = [
        { strokes: 5, handicap: 5 },  // Net 4 = Par = 2 points
        { strokes: 4, handicap: 10 }, // Net 3 = Birdie = 3 points
        { strokes: 6, handicap: 15 }, // Net 5 = Bogey = 1 point
      ];

      const points = calculateBestBallStablefordPoints(playerScores, hole);

      expect(points).toBe(3); // Best is 3 points
    });

    it('excludes picked up scores (10+)', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };

      const playerScores = [
        { strokes: 10, handicap: 36 }, // Picked up - excluded
        { strokes: 5, handicap: 5 },   // Net 4 = Par = 2 points
      ];

      const points = calculateBestBallStablefordPoints(playerScores, hole);

      expect(points).toBe(2); // Picked up score ignored
    });

    it('returns 0 if all scores are invalid', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };

      const playerScores = [
        { strokes: 0, handicap: 10 },
        { strokes: 10, handicap: 15 }, // Picked up
      ];

      const points = calculateBestBallStablefordPoints(playerScores, hole);

      expect(points).toBe(0);
    });
  });

  describe('Best Ball 18-hole round scoring', () => {
    it('calculates total team best ball score for full round', () => {
      const holes = create18Holes();

      // Two-person team
      const team1Scores = [
        { playerId: 'p1', handicap: 10 },
        { playerId: 'p2', handicap: 20 },
      ];

      let totalBestBallPoints = 0;

      holes.forEach((hole) => {
        // Simulate scores where one player always has better net
        const playerScores = team1Scores.map((p, i) => ({
          strokes: hole.par + i, // p1 plays to par, p2 plays bogey
          handicap: p.handicap,
        }));

        const points = calculateBestBallStablefordPoints(playerScores, hole);
        totalBestBallPoints += points;
      });

      // With p1 (handicap 10) playing to par gross on every hole,
      // they get strokes on 10 holes, so best ball should be high
      expect(totalBestBallPoints).toBeGreaterThan(36); // More than default par
    });
  });
});

// ============================================================================
// Team Scramble Scoring Tests
// ============================================================================

describe('Team Scramble Scoring', () => {
  describe('calculateScrambleTeamHandicap', () => {
    it('calculates team handicap using USGA percentages for 2 players', () => {
      // 2 players: 35% of low + 15% of high
      const handicaps = [10, 20];
      const result = calculateScrambleTeamHandicap(handicaps);

      // Expected: 10 * 0.35 + 20 * 0.15 = 3.5 + 3.0 = 6.5
      expect(result).toBe(6.5);
    });

    it('calculates team handicap for 3 players', () => {
      // 3 players: 35% + 15% + 10% of sorted handicaps
      const handicaps = [15, 5, 25]; // Sorted: 5, 15, 25
      const result = calculateScrambleTeamHandicap(handicaps);

      // Expected: 5 * 0.35 + 15 * 0.15 + 25 * 0.10 = 1.75 + 2.25 + 2.5 = 6.5
      expect(result).toBe(6.5);
    });

    it('calculates team handicap for 4 players', () => {
      // 4 players: 35% + 15% + 10% + 5% of sorted handicaps
      const handicaps = [10, 20, 15, 25]; // Sorted: 10, 15, 20, 25
      const result = calculateScrambleTeamHandicap(handicaps);

      // Expected: 10*0.35 + 15*0.15 + 20*0.10 + 25*0.05
      // = 3.5 + 2.25 + 2.0 + 1.25 = 9.0
      expect(result).toBe(9);
    });

    it('returns 0 for empty handicaps', () => {
      expect(calculateScrambleTeamHandicap([])).toBe(0);
    });

    it('handles single player', () => {
      const result = calculateScrambleTeamHandicap([15]);
      // Single player: 15 * 0.35 = 5.25, rounded to 5.3
      expect(result).toBe(5.3);
    });
  });

  describe('Scramble round scoring', () => {
    it('uses single team score (best drive) for each hole', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };
      const teamHandicaps = [10, 15, 20, 25];
      const scrambleHandicap = calculateScrambleTeamHandicap(teamHandicaps);

      // Team plays scramble and scores 4 gross
      const teamGrossScore = 4;

      // Calculate strokes received on this hole
      const strokesReceived = getStrokesReceived(scrambleHandicap, hole.strokeIndex);
      const netScore = teamGrossScore - strokesReceived;

      // Team score is a single score representing all players
      expect(netScore).toBeLessThanOrEqual(teamGrossScore);
    });
  });
});

// ============================================================================
// Team Aggregate Scoring Tests
// ============================================================================

describe('Team Aggregate Scoring', () => {
  describe('calculateAggregateTeamScore', () => {
    it('calculates sum of all player scores', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };

      const playerScores = [
        { strokes: 4, handicap: 10 },
        { strokes: 5, handicap: 15 },
        { strokes: 6, handicap: 20 },
      ];

      const result = calculateAggregateTeamScore(playerScores, hole);

      expect(result.grossTotal).toBe(15); // 4 + 5 + 6
    });

    it('calculates sum of net scores', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 1 }; // SI 1

      const playerScores = [
        { strokes: 4, handicap: 18 }, // Gets 1 stroke, net = 3
        { strokes: 5, handicap: 36 }, // Gets 2 strokes, net = 3
        { strokes: 5, handicap: 5 },  // Gets 1 stroke, net = 4
      ];

      const result = calculateAggregateTeamScore(playerScores, hole);

      expect(result.grossTotal).toBe(14);
      expect(result.netTotal).toBe(10); // 3 + 3 + 4
    });

    it('handles missing scores (zeros)', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };

      const playerScores = [
        { strokes: 4, handicap: 10 },
        { strokes: 0, handicap: 15 }, // No score
        { strokes: 5, handicap: 20 },
      ];

      const result = calculateAggregateTeamScore(playerScores, hole);

      expect(result.grossTotal).toBe(9); // Only counts valid scores
    });
  });
});

// ============================================================================
// Match Play Scoring Tests
// ============================================================================

describe('Match Play Scoring', () => {
  describe('calculateMatchPlayHole', () => {
    it('returns 1 when player1 wins the hole', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 10 };

      // Both 18 handicap (1 stroke each)
      // P1: 4 gross, net 3
      // P2: 5 gross, net 4
      const result = calculateMatchPlayHole(4, 18, 5, 18, hole);

      expect(result).toBe(1);
    });

    it('returns -1 when player2 wins the hole', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 10 };

      // P1: 5 gross, net 4
      // P2: 4 gross, net 3
      const result = calculateMatchPlayHole(5, 18, 4, 18, hole);

      expect(result).toBe(-1);
    });

    it('returns 0 for halved hole', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 10 };

      // Same gross score, same handicap = halved
      const result = calculateMatchPlayHole(4, 18, 4, 18, hole);

      expect(result).toBe(0);
    });

    it('accounts for handicap differences', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 1 }; // SI 1

      // P1: handicap 10, gets 1 stroke, gross 5, net 4
      // P2: handicap 20, gets 2 strokes, gross 6, net 4
      const result = calculateMatchPlayHole(5, 10, 6, 20, hole);

      expect(result).toBe(0); // Halved (both net 4)
    });

    it('correctly determines winner with significant handicap difference', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 1 };

      // P1: scratch (0), gross 4, net 4
      // P2: handicap 36, gets 2 strokes, gross 5, net 3
      const result = calculateMatchPlayHole(4, 0, 5, 36, hole);

      expect(result).toBe(-1); // P2 wins (net 3 < net 4)
    });
  });

  describe('calculateTeamMatchPlayHoleResult', () => {
    it('returns team1 when team1 has lower score', () => {
      const result = calculateTeamMatchPlayHoleResult(3, 4);
      expect(result).toBe('team1');
    });

    it('returns team2 when team2 has lower score', () => {
      const result = calculateTeamMatchPlayHoleResult(5, 4);
      expect(result).toBe('team2');
    });

    it('returns halved when scores are equal', () => {
      const result = calculateTeamMatchPlayHoleResult(4, 4);
      expect(result).toBe('halved');
    });

    it('returns null when scores are null', () => {
      expect(calculateTeamMatchPlayHoleResult(null, 4)).toBeNull();
      expect(calculateTeamMatchPlayHoleResult(4, null)).toBeNull();
      expect(calculateTeamMatchPlayHoleResult(null, null)).toBeNull();
    });

    it('handles pickup (score of 10) as automatic loss', () => {
      expect(calculateTeamMatchPlayHoleResult(10, 5)).toBe('team2');
      expect(calculateTeamMatchPlayHoleResult(5, 10)).toBe('team1');
      expect(calculateTeamMatchPlayHoleResult(10, 10)).toBe('halved');
    });
  });

  describe('calculateMatchPlayStatus', () => {
    it('returns "All Square" when match is tied', () => {
      const result = calculateMatchPlayStatus(5, 5, 10, 'Team A', 'Team B');

      expect(result.status).toBe('All Square');
      expect(result.leader).toBeNull();
      expect(result.margin).toBe(0);
      expect(result.isMatchOver).toBe(false);
    });

    it('returns correct status when team1 is leading', () => {
      const result = calculateMatchPlayStatus(7, 5, 12, 'Team A', 'Team B');

      expect(result.status).toBe('Team A 2 UP');
      expect(result.leader).toBe('team1');
      expect(result.margin).toBe(2);
      expect(result.isMatchOver).toBe(false);
    });

    it('returns correct status when team2 is leading', () => {
      const result = calculateMatchPlayStatus(4, 7, 11, 'Team A', 'Team B');

      expect(result.status).toBe('Team B 3 UP');
      expect(result.leader).toBe('team2');
      expect(result.margin).toBe(3);
      expect(result.isMatchOver).toBe(false);
    });

    it('detects dormie (lead equals remaining holes)', () => {
      const result = calculateMatchPlayStatus(7, 5, 16, 'Team A', 'Team B');

      expect(result.status).toBe('Team A 2 UP (Dormie)');
      expect(result.leader).toBe('team1');
      expect(result.isMatchOver).toBe(false);
    });

    it('detects match over (lead exceeds remaining holes)', () => {
      // 6 UP with 4 to play = match over "6&4"
      const result = calculateMatchPlayStatus(9, 3, 14, 'Team A', 'Team B');

      expect(result.status).toBe('Team A wins 6&4');
      expect(result.leader).toBe('team1');
      expect(result.isMatchOver).toBe(true);
    });

    it('detects early finish with 3&2', () => {
      // 3 UP with 2 to play = match over
      const result = calculateMatchPlayStatus(8, 5, 16, 'Team A', 'Team B');

      expect(result.status).toBe('Team A wins 3&2');
      expect(result.isMatchOver).toBe(true);
    });

    it('handles 1 UP win on last hole', () => {
      // 1 UP after 18 holes = match won 1 UP
      const result = calculateMatchPlayStatus(10, 9, 18, 'Team A', 'Team B');

      // At 18 holes played, 0 remaining, margin of 1 > 0 remaining
      expect(result.status).toBe('Team A wins 1&0');
      expect(result.isMatchOver).toBe(true);
    });
  });

  describe('Match Play early finish scenarios', () => {
    it('ends match 7&6 when appropriate', () => {
      // After 12 holes, if one team is 7 UP
      const result = calculateMatchPlayStatus(9, 2, 12, 'Team A', 'Team B');

      expect(result.status).toBe('Team A wins 7&6');
      expect(result.isMatchOver).toBe(true);
    });

    it('match continues when leader cannot close out', () => {
      // After 15 holes, 2 UP with 3 to play - can still be caught
      const result = calculateMatchPlayStatus(8, 6, 15, 'Team A', 'Team B');

      expect(result.status).toBe('Team A 2 UP');
      expect(result.isMatchOver).toBe(false);
    });
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe('Statistics Calculation', () => {
  describe('calculateStatistics', () => {
    it('calculates correct statistics for completed scorecard', () => {
      const holes = create18Holes();
      const scorecard = createCompletedScorecard('p1', 'r1', holes, 0);

      const stats = calculateStatistics(scorecard, holes);

      expect(stats.totalPutts).toBeGreaterThanOrEqual(0);
      expect(stats.avgPutts).toBeGreaterThanOrEqual(0);
      expect(stats.birdiesOrBetter + stats.pars + stats.bogeys + stats.doubleBogeyOrWorse).toBe(18);
    });

    it('returns zeros for empty scorecard', () => {
      const holes = create18Holes();
      const scorecard = createTestScorecard({ scores: {} });

      const stats = calculateStatistics(scorecard, holes);

      expect(stats.totalPutts).toBe(0);
      expect(stats.avgPutts).toBe(0);
      expect(stats.birdiesOrBetter).toBe(0);
      expect(stats.pars).toBe(0);
    });
  });

  describe('getScoreDescription', () => {
    it('returns correct descriptions', () => {
      expect(getScoreDescription(1, 4)).toBe('Albatross');
      expect(getScoreDescription(2, 4)).toBe('Eagle');
      expect(getScoreDescription(3, 4)).toBe('Birdie');
      expect(getScoreDescription(4, 4)).toBe('Par');
      expect(getScoreDescription(5, 4)).toBe('Bogey');
      expect(getScoreDescription(6, 4)).toBe('Double Bogey');
      expect(getScoreDescription(7, 4)).toBe('Triple Bogey');
      expect(getScoreDescription(8, 4)).toBe('+4');
    });
  });

  describe('sortLeaderboard', () => {
    it('sorts by net score ascending', () => {
      const entries = [
        { totalNet: 72, totalGross: 80 },
        { totalNet: 70, totalGross: 78 },
        { totalNet: 74, totalGross: 82 },
      ];

      const sorted = sortLeaderboard(entries);

      expect(sorted[0].totalNet).toBe(70);
      expect(sorted[1].totalNet).toBe(72);
      expect(sorted[2].totalNet).toBe(74);
    });

    it('uses gross score as tiebreaker', () => {
      const entries = [
        { totalNet: 72, totalGross: 82 },
        { totalNet: 72, totalGross: 78 },
        { totalNet: 72, totalGross: 80 },
      ];

      const sorted = sortLeaderboard(entries);

      expect(sorted[0].totalGross).toBe(78);
      expect(sorted[1].totalGross).toBe(80);
      expect(sorted[2].totalGross).toBe(82);
    });
  });
});
