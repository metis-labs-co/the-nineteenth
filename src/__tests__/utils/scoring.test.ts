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
  getScoreColor,
  calculatePlayingHandicap,
  calculateTotalScore,
  calculateAmbroseScore,
} from '@/utils/scoring';
import {
  createTestPlayer,
  create18Holes,
  createTestScorecard,
  createCompletedScorecard,
} from './testFixtures';
import type { Hole, Player as DBPlayer } from '@/types/database.types';
import type { Scorecard as AppScorecard, Player as AppPlayer } from '@/types';

/**
 * Helper to create an app-level Scorecard with player attached
 * Converts from database type to app type and attaches the player
 */
function createScorecardWithPlayer(
  playerId: string,
  roundId: string,
  holes: Hole[],
  player: DBPlayer,
  scoreOffset = 0
): AppScorecard {
  const dbScorecard = createCompletedScorecard(playerId, roundId, holes, scoreOffset);
  return {
    id: dbScorecard.id,
    roundId: dbScorecard.round_id,
    playerId: dbScorecard.player_id,
    player: {
      id: player.id,
      name: player.name,
      email: player.email,
      phone: player.phone,
      handicap: player.handicap ?? undefined,
      photoUrl: player.photo_url,
    } as AppPlayer,
    scores: dbScorecard.scores as { [holeNumber: number]: any },
    totalGross: dbScorecard.total_gross,
    totalNet: dbScorecard.total_net,
    status: dbScorecard.status,
    submittedAt: dbScorecard.submitted_at ? new Date(dbScorecard.submitted_at) : undefined,
    submittedBy: dbScorecard.submitted_by ?? undefined,
    createdAt: new Date(dbScorecard.created_at),
    updatedAt: new Date(dbScorecard.updated_at),
  };
}

/**
 * Helper to create an app-level Scorecard with custom scores and player attached
 */
function createCustomScorecardWithPlayer(
  player: DBPlayer,
  scores: { [holeNumber: string]: { strokes: number; putts?: number } }
): AppScorecard {
  const dbScorecard = createTestScorecard({
    player_id: player.id,
    scores: scores as any,
  });
  return {
    id: dbScorecard.id,
    roundId: dbScorecard.round_id,
    playerId: dbScorecard.player_id,
    player: {
      id: player.id,
      name: player.name,
      email: player.email,
      phone: player.phone,
      handicap: player.handicap ?? undefined,
      photoUrl: player.photo_url,
    } as AppPlayer,
    scores: dbScorecard.scores as { [holeNumber: number]: any },
    totalGross: dbScorecard.total_gross,
    totalNet: dbScorecard.total_net,
    status: dbScorecard.status,
    submittedAt: dbScorecard.submitted_at ? new Date(dbScorecard.submitted_at) : undefined,
    submittedBy: dbScorecard.submitted_by ?? undefined,
    createdAt: new Date(dbScorecard.created_at),
    updatedAt: new Date(dbScorecard.updated_at),
  };
}

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
      expect(calculateNetScore(5, player.handicap ?? 0, hole)).toBe(4);

      // Gross 4, 1 stroke received = Net 3
      expect(calculateNetScore(4, player.handicap ?? 0, hole)).toBe(3);
    });

    it('handles no strokes received', () => {
      const hole = holes[0];
      const player = createTestPlayer({ handicap: 0 });

      expect(calculateNetScore(5, player.handicap ?? 0, hole)).toBe(5);
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

    it('returns 0 for empty player scores array', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 5 };

      const points = calculateBestBallStablefordPoints([], hole);

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

    it('handles 5+ players (uses fallback percentage)', () => {
      // 5 players: first 4 use defined percentages, 5th uses fallback 0.05
      // Sorted: 5, 10, 15, 20, 25
      const handicaps = [15, 25, 5, 20, 10];
      const result = calculateScrambleTeamHandicap(handicaps);

      // Expected: 5*0.35 + 10*0.15 + 15*0.10 + 20*0.05 + 25*0.05
      // = 1.75 + 1.5 + 1.5 + 1.0 + 1.25 = 7.0
      expect(result).toBe(7);
    });

    it('handles 6 players (multiple fallback percentages)', () => {
      // 6 players: positions 5 and 6 use fallback 0.05
      const handicaps = [10, 12, 14, 16, 18, 20];
      const result = calculateScrambleTeamHandicap(handicaps);

      // Expected: 10*0.35 + 12*0.15 + 14*0.10 + 16*0.05 + 18*0.05 + 20*0.05
      // = 3.5 + 1.8 + 1.4 + 0.8 + 0.9 + 1.0 = 9.4
      expect(result).toBe(9.4);
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

      const stats = calculateStatistics(scorecard as any, holes);

      expect(stats.totalPutts).toBeGreaterThanOrEqual(0);
      expect(stats.avgPutts).toBeGreaterThanOrEqual(0);
      expect(stats.birdiesOrBetter + stats.pars + stats.bogeys + stats.doubleBogeyOrWorse).toBe(18);
    });

    it('returns zeros for empty scorecard', () => {
      const holes = create18Holes();
      const scorecard = createTestScorecard({ scores: {} });

      const stats = calculateStatistics(scorecard as any, holes);

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

  describe('getScoreColor', () => {
    it('returns green for under par scores', () => {
      expect(getScoreColor(3, 4)).toBe('#22c55e'); // Birdie
      expect(getScoreColor(2, 4)).toBe('#22c55e'); // Eagle
      expect(getScoreColor(1, 4)).toBe('#22c55e'); // Albatross
    });

    it('returns blue for par', () => {
      expect(getScoreColor(4, 4)).toBe('#3b82f6');
      expect(getScoreColor(3, 3)).toBe('#3b82f6');
      expect(getScoreColor(5, 5)).toBe('#3b82f6');
    });

    it('returns orange for bogey', () => {
      expect(getScoreColor(5, 4)).toBe('#f59e0b');
      expect(getScoreColor(4, 3)).toBe('#f59e0b');
    });

    it('returns red for double bogey or worse', () => {
      expect(getScoreColor(6, 4)).toBe('#ef4444'); // Double bogey
      expect(getScoreColor(7, 4)).toBe('#ef4444'); // Triple bogey
      expect(getScoreColor(10, 4)).toBe('#ef4444'); // Pickup
    });
  });
});

// ============================================================================
// Playing Handicap Calculation Tests (USGA Formula)
// ============================================================================

describe('Playing Handicap Calculation', () => {
  describe('calculatePlayingHandicap', () => {
    it('calculates playing handicap with standard USGA formula', () => {
      // Playing Handicap = Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
      // Example: 15 index, slope 125, course rating 72.0, par 72
      // = 15 × (125/113) + (72.0 - 72) = 15 × 1.106 + 0 = 16.59 ≈ 17
      const result = calculatePlayingHandicap(15, 125, 72.0, 72);
      expect(result).toBe(17);
    });

    it('calculates playing handicap with default slope rating (113)', () => {
      // With default slope of 113: 15 × (113/113) + (70 - 72) = 15 + (-2) = 13
      const result = calculatePlayingHandicap(15, 113, 70.0, 72);
      expect(result).toBe(13);
    });

    it('handles course rating higher than par', () => {
      // 18 index, slope 130, course rating 74.5, par 72
      // = 18 × (130/113) + (74.5 - 72) = 18 × 1.15 + 2.5 = 20.7 + 2.5 = 23.2 ≈ 23
      const result = calculatePlayingHandicap(18, 130, 74.5, 72);
      expect(result).toBe(23);
    });

    it('handles course rating lower than par', () => {
      // 18 index, slope 110, course rating 68.5, par 72
      // = 18 × (110/113) + (68.5 - 72) = 18 × 0.973 + (-3.5) = 17.5 - 3.5 = 14 ≈ 14
      const result = calculatePlayingHandicap(18, 110, 68.5, 72);
      expect(result).toBe(14);
    });

    it('handles zero handicap index (scratch golfer)', () => {
      // 0 index: 0 × (125/113) + (72 - 72) = 0
      const result = calculatePlayingHandicap(0, 125, 72.0, 72);
      expect(result).toBe(0);
    });

    it('handles high handicap index', () => {
      // 36 index, slope 125, course rating 70, par 72
      // = 36 × (125/113) + (70 - 72) = 36 × 1.106 - 2 = 39.8 - 2 = 37.8 ≈ 38
      const result = calculatePlayingHandicap(36, 125, 70.0, 72);
      expect(result).toBe(38);
    });

    it('handles plus handicap (negative index)', () => {
      // -2 index (plus 2), slope 125, course rating 72, par 72
      // = -2 × (125/113) + (72 - 72) = -2.21 ≈ -2
      const result = calculatePlayingHandicap(-2, 125, 72.0, 72);
      expect(result).toBe(-2);
    });

    it('rounds to nearest integer', () => {
      // Test rounding: 14.5 should round to 15, 14.4 to 14
      // 14.5 index, slope 113, course rating 72, par 72 = 14.5 (rounds to 15)
      const result = calculatePlayingHandicap(14.5, 113, 72.0, 72);
      expect(result).toBe(15);
    });

    it('uses default slope rating when not provided', () => {
      // Call without slopeRating parameter to test default value of 113
      // 18 index, default slope 113, course rating 72, par 72
      // = 18 × (113/113) + (72 - 72) = 18
      const result = calculatePlayingHandicap(18, undefined as any, 72.0, 72);
      expect(result).toBe(18);
    });
  });
});

// ============================================================================
// Total Score Calculation Tests
// ============================================================================

describe('Total Score Calculation', () => {
  const holes = create18Holes();

  describe('calculateTotalScore for Stroke Play', () => {
    it('calculates gross and net totals for stroke play', () => {
      const player = createTestPlayer({ handicap: 18 });
      const scorecard = createScorecardWithPlayer(player.id, 'round-1', holes, player, 0);

      const result = calculateTotalScore(scorecard, holes, 'stroke');

      // With scoreOffset 0, each hole is scored at par
      // totalGross = sum of all pars = 72 (for standard course)
      expect(result.gross).toBe(72);
      // Net = gross - 18 strokes (1 per hole for 18 handicap)
      expect(result.net).toBe(72 - 18);
      expect(result.points).toBeUndefined();
    });

    it('calculates correctly for over-par round', () => {
      const player = createTestPlayer({ handicap: 10 });
      const scorecard = createScorecardWithPlayer(player.id, 'round-1', holes, player, 1); // +1 over par each hole

      const result = calculateTotalScore(scorecard, holes, 'stroke');

      // Gross = 72 + 18 = 90
      expect(result.gross).toBe(90);
      // Net = 90 - 10 strokes = 80
      expect(result.net).toBe(80);
    });

    it('calculates correctly for under-par round', () => {
      const player = createTestPlayer({ handicap: 5 });
      const scorecard = createScorecardWithPlayer(player.id, 'round-1', holes, player, -1); // -1 under par each hole

      const result = calculateTotalScore(scorecard, holes, 'stroke');

      // Gross = 72 - 18 = 54
      expect(result.gross).toBe(54);
      // Net = 54 - 5 = 49
      expect(result.net).toBe(49);
    });

    it('handles zero handicap player', () => {
      const player = createTestPlayer({ handicap: 0 });
      const scorecard = createScorecardWithPlayer(player.id, 'round-1', holes, player, 0);

      const result = calculateTotalScore(scorecard, holes, 'stroke');

      expect(result.gross).toBe(72);
      expect(result.net).toBe(72); // No strokes received
    });
  });

  describe('calculateTotalScore for Stableford', () => {
    it('calculates Stableford points correctly', () => {
      const player = createTestPlayer({ handicap: 18 });
      const scorecard = createScorecardWithPlayer(player.id, 'round-1', holes, player, 0);

      const result = calculateTotalScore(scorecard, holes, 'stableford');

      // With 18 handicap and gross par on every hole:
      // Each hole gets 1 stroke, so net = par - 1 = birdie = 3 points per hole
      // 18 holes × 3 points = 54 points
      expect(result.gross).toBe(72);
      expect(result.points).toBe(54);
      expect(result.net).toBe(54); // For Stableford, net = points
    });

    it('handles high Stableford round (many eagles with 36 handicap)', () => {
      const player = createTestPlayer({ handicap: 36 });
      const scorecard = createScorecardWithPlayer(player.id, 'round-1', holes, player, 0);

      const result = calculateTotalScore(scorecard, holes, 'stableford');

      // With 36 handicap and gross par on every hole:
      // Each hole gets 2 strokes, so net = par - 2 = eagle = 4 points per hole
      // 18 holes × 4 points = 72 points
      expect(result.points).toBe(72);
    });

    it('handles low Stableford round (many double bogeys)', () => {
      const player = createTestPlayer({ handicap: 0 });
      const scorecard = createScorecardWithPlayer(player.id, 'round-1', holes, player, 2); // Double bogey each hole

      const result = calculateTotalScore(scorecard, holes, 'stableford');

      // Double bogey = 0 points on each hole
      expect(result.points).toBe(0);
    });
  });

  describe('calculateTotalScore edge cases', () => {
    it('handles empty scorecard (no scores)', () => {
      const player = createTestPlayer({ handicap: 18 });
      const scorecard = createCustomScorecardWithPlayer(player, {});

      const result = calculateTotalScore(scorecard, holes, 'stroke');

      expect(result.gross).toBe(0);
      expect(result.net).toBe(0);
    });

    it('handles partial scorecard (only some holes scored)', () => {
      const player = createTestPlayer({ handicap: 18 });
      const scorecard = createCustomScorecardWithPlayer(player, {
        '1': { strokes: 5, putts: 2 },
        '2': { strokes: 4, putts: 2 },
        '3': { strokes: 6, putts: 3 },
      });

      const result = calculateTotalScore(scorecard, holes, 'stroke');

      expect(result.gross).toBe(15); // 5 + 4 + 6
      // Net depends on strokes received per hole
      expect(result.net).toBeLessThan(15);
    });

    it('handles missing player handicap (defaults to 0)', () => {
      const dbScorecard = createCompletedScorecard('player-1', 'round-1', holes, 0);
      // No player attached, so handicap defaults to 0
      // Convert to app scorecard without player
      const scorecard: AppScorecard = {
        id: dbScorecard.id,
        roundId: dbScorecard.round_id,
        playerId: dbScorecard.player_id,
        scores: dbScorecard.scores as { [holeNumber: number]: any },
        totalGross: dbScorecard.total_gross,
        totalNet: dbScorecard.total_net,
        status: dbScorecard.status,
        createdAt: new Date(dbScorecard.created_at),
        updatedAt: new Date(dbScorecard.updated_at),
      };

      const result = calculateTotalScore(scorecard, holes, 'stroke');

      expect(result.gross).toBe(72);
      expect(result.net).toBe(72); // No strokes received
    });

    it('handles unsupported game type (neither stroke nor stableford)', () => {
      const player = createTestPlayer({ handicap: 18 });
      const scorecard = createScorecardWithPlayer(player.id, 'round-1', holes, player, 0);

      // Cast to test unsupported game type
      const result = calculateTotalScore(scorecard, holes, 'match-play' as any);

      // Should still calculate gross but not net/points for unsupported types
      expect(result.gross).toBe(72);
      expect(result.net).toBe(0); // No calculation for unsupported type
      expect(result.points).toBeUndefined();
    });

    it('skips holes with zero strokes', () => {
      const player = createTestPlayer({ handicap: 18 });
      const scorecard = createCustomScorecardWithPlayer(player, {
        '1': { strokes: 5, putts: 2 },
        '2': { strokes: 0, putts: 0 }, // Not played
        '3': { strokes: 4, putts: 2 },
      });

      const result = calculateTotalScore(scorecard, holes, 'stroke');

      expect(result.gross).toBe(9); // 5 + 4 (hole 2 skipped)
    });
  });
});

// ============================================================================
// Ambrose Team Scoring Tests
// ============================================================================

describe('Ambrose Team Scoring', () => {
  const holes = create18Holes();

  describe('calculateAmbroseScore', () => {
    it('selects best score and applies team handicap', () => {
      const hole = holes[0]; // Par 4, SI 7
      const teamScores = [5, 6, 4, 7]; // Best is 4
      const teamHandicap = 10;

      const result = calculateAmbroseScore(teamScores, teamHandicap, hole);

      // Best score is 4, gets strokes based on SI 7 and handicap 10
      // SI 7 <= 10 % 18 = 10, so gets 1 stroke
      // Net = 4 - 1 = 3
      expect(result).toBe(3);
    });

    it('handles all same scores', () => {
      const hole = holes[0];
      const teamScores = [5, 5, 5, 5];
      const teamHandicap = 18;

      const result = calculateAmbroseScore(teamScores, teamHandicap, hole);

      // Best is 5, with 18 handicap gets 1 stroke on every hole
      // Net = 5 - 1 = 4
      expect(result).toBe(4);
    });

    it('handles single player team', () => {
      const hole = holes[0];
      const teamScores = [5];
      const teamHandicap = 18;

      const result = calculateAmbroseScore(teamScores, teamHandicap, hole);

      expect(result).toBe(4); // 5 - 1 stroke = 4
    });

    it('handles zero team handicap', () => {
      const hole = holes[0];
      const teamScores = [4, 5, 6];
      const teamHandicap = 0;

      const result = calculateAmbroseScore(teamScores, teamHandicap, hole);

      expect(result).toBe(4); // Best score, no strokes received
    });

    it('handles high team handicap (2+ strokes per hole)', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 1 }; // SI 1
      const teamScores = [6, 7, 8];
      const teamHandicap = 36; // 2 strokes per hole

      const result = calculateAmbroseScore(teamScores, teamHandicap, hole);

      expect(result).toBe(4); // 6 - 2 = 4
    });
  });
});

// ============================================================================
// Edge Cases & Negative Handicap Tests
// ============================================================================

describe('Edge Cases', () => {
  const holes = create18Holes();

  describe('Picked-up scores (10+)', () => {
    it('handles picked-up score in Stableford (returns 0 points)', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 10 };
      const handicap = 18;

      // Gross 10 (picked up) should still calculate but result in 0 points
      const points = calculateStablefordPoints(10, handicap, hole);

      expect(points).toBe(0);
    });

    it('handles picked-up score in statistics', () => {
      const scorecard = createTestScorecard({
        scores: {
          '1': { strokes: 10, putts: 0 }, // Picked up
          '2': { strokes: 4, putts: 2 },
          '3': { strokes: 5, putts: 2 },
        },
      });

      const stats = calculateStatistics(scorecard as any, holes);

      // Picked-up score of 10 on par 4 = +6 = doubleBogeyOrWorse
      expect(stats.doubleBogeyOrWorse).toBe(1);
    });
  });

  describe('Zero handicap edge cases', () => {
    it('scratch golfer receives no strokes on any hole', () => {
      holes.forEach((hole) => {
        expect(getStrokesOnHole(0, hole)).toBe(0);
      });
    });

    it('scratch golfer net equals gross', () => {
      const hole = holes[0];
      const gross = 5;

      expect(calculateNetScore(gross, 0, hole)).toBe(5);
    });
  });

  describe('Negative (plus) handicap handling', () => {
    it('plus handicap returns 0 strokes on all holes', () => {
      // Plus 5 handicap = -5
      holes.forEach((hole) => {
        expect(getStrokesOnHole(-5, hole)).toBe(0);
      });
    });

    it('getStrokesReceived returns 0 for negative handicap', () => {
      expect(getStrokesReceived(-5, 1)).toBe(0);
      expect(getStrokesReceived(-10, 18)).toBe(0);
    });

    it('net score equals gross for plus handicap', () => {
      const hole = holes[0];

      expect(calculateNetScore(4, -5, hole)).toBe(4);
    });
  });

  describe('getStrokesReceived boundary conditions', () => {
    it('returns correct strokes when strokeIndex equals handicap mod 18', () => {
      // Handicap 10: strokeIndex 10 === 10 % 18, so should get stroke
      expect(getStrokesReceived(10, 10)).toBe(1);
      // Handicap 10: strokeIndex 11 > 10, so should NOT get additional stroke
      expect(getStrokesReceived(10, 11)).toBe(0);
    });

    it('returns correct strokes when strokeIndex is greater than handicap mod 18', () => {
      // Handicap 5: strokeIndex 6 > 5, so should NOT get additional stroke
      expect(getStrokesReceived(5, 6)).toBe(0);
      expect(getStrokesReceived(5, 18)).toBe(0);
    });

    it('handles exact 18 handicap - strokeIndex comparison with 0', () => {
      // Handicap 18: 18 % 18 = 0, so strokeIndex <= 0 is never true
      // Every hole gets exactly 1 base stroke, no additional
      expect(getStrokesReceived(18, 1)).toBe(1);
      expect(getStrokesReceived(18, 18)).toBe(1);
    });

    it('handles handicap 19 - strokeIndex 1 gets additional stroke', () => {
      // Handicap 19: 19 % 18 = 1, so SI 1 gets additional stroke
      expect(getStrokesReceived(19, 1)).toBe(2); // 1 base + 1 additional
      expect(getStrokesReceived(19, 2)).toBe(1); // 1 base only
    });
  });

  describe('Very high handicap edge cases', () => {
    it('54 handicap receives 3 strokes per hole', () => {
      holes.forEach((hole) => {
        expect(getStrokesOnHole(54, hole)).toBe(3);
      });
    });

    it('calculates correct strokes for handicap 45', () => {
      // 45 / 18 = 2 base strokes
      // 45 % 18 = 9 extra strokes on SI 1-9
      const holeSI1 = holes.find((h) => h.strokeIndex === 1)!;
      const holeSI9 = holes.find((h) => h.strokeIndex === 9)!;
      const holeSI10 = holes.find((h) => h.strokeIndex === 10)!;

      expect(getStrokesOnHole(45, holeSI1)).toBe(3); // 2 + 1
      expect(getStrokesOnHole(45, holeSI9)).toBe(3); // 2 + 1
      expect(getStrokesOnHole(45, holeSI10)).toBe(2); // 2 + 0
    });
  });

  describe('Statistics with varied score types', () => {
    it('counts all score categories correctly', () => {
      const scorecard = createTestScorecard({
        scores: {
          '1': { strokes: 2, putts: 1 },  // Par 4, eagle (-2)
          '2': { strokes: 2, putts: 1 },  // Par 3, birdie (-1)
          '3': { strokes: 5, putts: 2 },  // Par 5, par (0)
          '4': { strokes: 5, putts: 2 },  // Par 4, bogey (+1)
          '5': { strokes: 6, putts: 2 },  // Par 4, double (+2)
          '6': { strokes: 5, putts: 2 },  // Par 3, double (+2)
        },
      });

      const stats = calculateStatistics(scorecard as any, holes.slice(0, 6));

      expect(stats.birdiesOrBetter).toBe(2); // Eagle + Birdie
      expect(stats.pars).toBe(1);
      expect(stats.bogeys).toBe(1);
      expect(stats.doubleBogeyOrWorse).toBe(2);
    });

    it('calculates fairway percentage correctly', () => {
      const par4And5Holes = holes.filter((h) => h.par >= 4);
      const scorecard = createTestScorecard({
        scores: {},
      });

      // Add scores for par 4/5 holes with varied fairway hits
      let fairwaysHit = 0;
      par4And5Holes.forEach((hole, index) => {
        const hit = index % 2 === 0; // Every other hole
        if (hit) fairwaysHit++;
        scorecard.scores[hole.number.toString()] = {
          strokes: hole.par,
          putts: 2,
          fairwayHit: hit,
        };
      });

      const stats = calculateStatistics(scorecard as any, holes);

      expect(stats.fairwaysHit).toBe(fairwaysHit);
      expect(stats.fairwayPercentage).toBeCloseTo((fairwaysHit / par4And5Holes.length) * 100, 1);
    });

    it('calculates GIR percentage correctly', () => {
      const scorecard = createTestScorecard({
        scores: {},
      });

      // Hit 12 out of 18 greens
      holes.forEach((hole, index) => {
        scorecard.scores[hole.number.toString()] = {
          strokes: hole.par,
          putts: 2,
          greenInRegulation: index < 12, // First 12 holes hit GIR
        };
      });

      const stats = calculateStatistics(scorecard as any, holes);

      expect(stats.greensInRegulation).toBe(12);
      expect(stats.girPercentage).toBeCloseTo((12 / 18) * 100, 1);
    });

    it('handles holes with missing putts data', () => {
      const scorecard = createTestScorecard({
        scores: {
          '1': { strokes: 4 }, // No putts data
          '2': { strokes: 5, putts: 2 },
          '3': { strokes: 4, putts: 1 },
        },
      });

      const stats = calculateStatistics(scorecard as any, holes.slice(0, 3));

      // Should handle missing putts gracefully (undefined || 0 = 0)
      expect(stats.totalPutts).toBe(3); // 0 + 2 + 1
      expect(stats.avgPutts).toBe(1); // 3 / 3
    });

    it('handles par 3 course (no par 4/5 holes for fairway calculation)', () => {
      // Create a par 3 course (all holes are par 3)
      const par3Holes: Hole[] = Array.from({ length: 9 }, (_, i) => ({
        number: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
        par: 3,
        strokeIndex: i + 1,
      }));

      const scorecard = createTestScorecard({
        scores: {},
      });

      // Add scores for all par 3 holes
      par3Holes.forEach((hole) => {
        scorecard.scores[hole.number.toString()] = {
          strokes: 3,
          putts: 2,
          fairwayHit: true, // Fairway hit doesn't apply to par 3s
          greenInRegulation: true,
        };
      });

      const stats = calculateStatistics(scorecard as any, par3Holes);

      // With no par 4/5 holes, fairway percentage should be 0 (not NaN)
      expect(stats.fairwayPercentage).toBe(0);
      expect(stats.girPercentage).toBeCloseTo((9 / 9) * 100, 1); // 100%
    });
  });

  describe('Match play with extreme scores', () => {
    it('handles both players picking up', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 10 };

      // Both pick up at 10
      const result = calculateMatchPlayHole(10, 18, 10, 18, hole);

      expect(result).toBe(0); // Halved
    });

    it('correctly awards hole when one player picks up', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 10 };

      // P1 picks up (10), P2 makes 6
      const result = calculateMatchPlayHole(10, 18, 6, 18, hole);

      expect(result).toBe(-1); // P2 wins
    });
  });
});
