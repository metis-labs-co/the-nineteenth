/**
 * Competition Points Tests
 *
 * Tests for competition points calculation and standings aggregation:
 * - (7) Competition leaderboard - verify points aggregation across mixed formats
 * - (8) Team leaderboard - verify team standings
 */

import {
  calculateCompetitionPoints,
  calculateMatchPlayPoints,
  aggregateCompetitionStandings,
  STANDARD_POINT_SYSTEM,
  LEAGUE_POINT_SYSTEM,
  type RoundResult,
  type MatchResult,
  type RoundResultsForAggregation,
  type PointSystemRules,
} from '@/utils/competitionPoints';

// ============================================================================
// calculateCompetitionPoints Tests
// ============================================================================

describe('Competition Points', () => {
  describe('calculateCompetitionPoints', () => {
    describe('Stableford scoring (higher is better)', () => {
      it('sorts Stableford scores descending and assigns positions', () => {
        const results: RoundResult[] = [
          { participantId: 'p1', rawScore: 30 },
          { participantId: 'p2', rawScore: 40 },
          { participantId: 'p3', rawScore: 35 },
        ];

        const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);

        // Should be sorted: 40 (p2), 35 (p3), 30 (p1)
        expect(scored[0].participantId).toBe('p2');
        expect(scored[0].position).toBe(1);
        expect(scored[0].competitionPoints).toBe(10);

        expect(scored[1].participantId).toBe('p3');
        expect(scored[1].position).toBe(2);
        expect(scored[1].competitionPoints).toBe(8);

        expect(scored[2].participantId).toBe('p1');
        expect(scored[2].position).toBe(3);
        expect(scored[2].competitionPoints).toBe(6);
      });

      it('awards highest points to highest Stableford score', () => {
        const results: RoundResult[] = [
          { participantId: 'p1', rawScore: 36 },
          { participantId: 'p2', rawScore: 42 },
        ];

        const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);

        expect(scored[0].participantId).toBe('p2'); // 42 points
        expect(scored[0].competitionPoints).toBe(10); // 1st place
      });
    });

    describe('Stroke play scoring (lower is better)', () => {
      it('sorts Stroke scores ascending and assigns positions', () => {
        const results: RoundResult[] = [
          { participantId: 'p1', rawScore: 75 },
          { participantId: 'p2', rawScore: 68 },
          { participantId: 'p3', rawScore: 72 },
        ];

        const scored = calculateCompetitionPoints(results, 'stroke', STANDARD_POINT_SYSTEM);

        // Should be sorted: 68 (p2), 72 (p3), 75 (p1)
        expect(scored[0].participantId).toBe('p2');
        expect(scored[0].position).toBe(1);
        expect(scored[0].competitionPoints).toBe(10);

        expect(scored[1].participantId).toBe('p3');
        expect(scored[1].position).toBe(2);
        expect(scored[1].competitionPoints).toBe(8);

        expect(scored[2].participantId).toBe('p1');
        expect(scored[2].position).toBe(3);
        expect(scored[2].competitionPoints).toBe(6);
      });

      it('awards highest points to lowest stroke score', () => {
        const results: RoundResult[] = [
          { participantId: 'p1', rawScore: 78 },
          { participantId: 'p2', rawScore: 65 },
        ];

        const scored = calculateCompetitionPoints(results, 'stroke', STANDARD_POINT_SYSTEM);

        expect(scored[0].participantId).toBe('p2'); // 65 strokes
        expect(scored[0].competitionPoints).toBe(10);
      });
    });

    describe('Tie handling', () => {
      it('handles ties with averaged points for 2-way tie', () => {
        const results: RoundResult[] = [
          { participantId: 'p1', rawScore: 36 },
          { participantId: 'p2', rawScore: 36 },
          { participantId: 'p3', rawScore: 34 },
        ];

        const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);

        // p1 and p2 tie for 1st place
        // Average of 1st (10) and 2nd (8) = 9
        const tied = scored.filter((s) => s.rawScore === 36);
        expect(tied).toHaveLength(2);
        expect(tied[0].position).toBe(1);
        expect(tied[0].tied).toBe(true);
        expect(tied[0].competitionPoints).toBe(9);
        expect(tied[1].competitionPoints).toBe(9);

        // p3 gets 3rd place
        const third = scored.find((s) => s.participantId === 'p3');
        expect(third!.position).toBe(3);
        expect(third!.competitionPoints).toBe(6);
        expect(third!.tied).toBe(false);
      });

      it('handles 3-way tie for first place', () => {
        const results: RoundResult[] = [
          { participantId: 'p1', rawScore: 38 },
          { participantId: 'p2', rawScore: 38 },
          { participantId: 'p3', rawScore: 38 },
          { participantId: 'p4', rawScore: 35 },
        ];

        const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);

        // 3-way tie for 1st: average of positions 1, 2, 3 = (10 + 8 + 6) / 3 = 8
        const tiedPlayers = scored.filter((s) => s.rawScore === 38);
        expect(tiedPlayers).toHaveLength(3);
        tiedPlayers.forEach((p) => {
          expect(p.position).toBe(1);
          expect(p.tied).toBe(true);
          expect(p.competitionPoints).toBe(8);
        });

        // p4 gets 4th place
        const fourth = scored.find((s) => s.participantId === 'p4');
        expect(fourth!.position).toBe(4);
        expect(fourth!.competitionPoints).toBe(5);
      });

      it('handles multiple tie groups', () => {
        const results: RoundResult[] = [
          { participantId: 'p1', rawScore: 40 },
          { participantId: 'p2', rawScore: 40 },
          { participantId: 'p3', rawScore: 35 },
          { participantId: 'p4', rawScore: 35 },
        ];

        const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);

        // Tie for 1st: (10 + 8) / 2 = 9
        const first = scored.filter((s) => s.rawScore === 40);
        expect(first[0].position).toBe(1);
        expect(first[0].competitionPoints).toBe(9);

        // Tie for 3rd: (6 + 5) / 2 = 5.5 -> rounds to 6
        const third = scored.filter((s) => s.rawScore === 35);
        expect(third[0].position).toBe(3);
        expect(third[0].competitionPoints).toBe(6);
      });
    });

    describe('Edge cases', () => {
      it('returns empty array for no results', () => {
        const scored = calculateCompetitionPoints([], 'stableford', STANDARD_POINT_SYSTEM);
        expect(scored).toEqual([]);
      });

      it('handles single participant', () => {
        const results: RoundResult[] = [{ participantId: 'p1', rawScore: 36 }];

        const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);

        expect(scored).toHaveLength(1);
        expect(scored[0].position).toBe(1);
        expect(scored[0].competitionPoints).toBe(10);
        expect(scored[0].tied).toBe(false);
      });

      it('uses default points for positions beyond defined array', () => {
        const results: RoundResult[] = Array.from({ length: 15 }, (_, i) => ({
          participantId: `p${i + 1}`,
          rawScore: 40 - i,
        }));

        const scored = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);

        // Position 9+ should get default points (1)
        const lastPlace = scored.find((s) => s.position === 15);
        expect(lastPlace!.competitionPoints).toBe(1);
      });

      it('gives 0 points when no default is defined', () => {
        const customSystem: PointSystemRules = {
          positionPoints: [10, 8, 6],
          // No defaultPoints defined
        };

        const results: RoundResult[] = [
          { participantId: 'p1', rawScore: 40 },
          { participantId: 'p2', rawScore: 38 },
          { participantId: 'p3', rawScore: 36 },
          { participantId: 'p4', rawScore: 34 },
          { participantId: 'p5', rawScore: 32 },
        ];

        const scored = calculateCompetitionPoints(results, 'stableford', customSystem);

        expect(scored[3].competitionPoints).toBe(0); // Position 4
        expect(scored[4].competitionPoints).toBe(0); // Position 5
      });
    });

    describe('individualRule modes', () => {
      describe('mode: raw_score', () => {
        it('uses each participant\'s rawScore as the competition points', () => {
          const results: RoundResult[] = [
            { participantId: 'p1', rawScore: 51 },
            { participantId: 'p2', rawScore: 44 },
            { participantId: 'p3', rawScore: 42 },
            { participantId: 'p4', rawScore: 39 },
            { participantId: 'p5', rawScore: 38 },
            { participantId: 'p6', rawScore: 33 },
            { participantId: 'p7', rawScore: 31 },
            { participantId: 'p8', rawScore: 30 },
          ];

          const scored = calculateCompetitionPoints(
            results,
            'stableford',
            STANDARD_POINT_SYSTEM,
            { mode: 'raw_score' }
          );

          // Positions still assigned by raw score (Stableford = higher better)
          expect(scored[0].participantId).toBe('p1');
          expect(scored[0].position).toBe(1);
          expect(scored[7].participantId).toBe('p8');
          expect(scored[7].position).toBe(8);

          // Competition points are the raw Stableford totals — NOT 10/8/6/...
          expect(scored[0].competitionPoints).toBe(51);
          expect(scored[1].competitionPoints).toBe(44);
          expect(scored[2].competitionPoints).toBe(42);
          expect(scored[3].competitionPoints).toBe(39);
          expect(scored[4].competitionPoints).toBe(38);
          expect(scored[5].competitionPoints).toBe(33);
          expect(scored[6].competitionPoints).toBe(31);
          expect(scored[7].competitionPoints).toBe(30);
        });

        it('preserves tie grouping but each tied participant gets their own raw score', () => {
          const results: RoundResult[] = [
            { participantId: 'p1', rawScore: 36 },
            { participantId: 'p2', rawScore: 36 },
            { participantId: 'p3', rawScore: 30 },
          ];

          const scored = calculateCompetitionPoints(
            results,
            'stableford',
            STANDARD_POINT_SYSTEM,
            { mode: 'raw_score' }
          );

          const tiedPair = scored.filter((s) => s.position === 1);
          expect(tiedPair).toHaveLength(2);
          expect(tiedPair[0].tied).toBe(true);
          expect(tiedPair[0].competitionPoints).toBe(36);
          expect(tiedPair[1].competitionPoints).toBe(36);

          const third = scored.find((s) => s.participantId === 'p3');
          expect(third!.position).toBe(3);
          expect(third!.tied).toBe(false);
          expect(third!.competitionPoints).toBe(30);
        });
      });

      describe('mode: win_tie_loss', () => {
        it('awards win/loss values by position with no tie', () => {
          const results: RoundResult[] = [
            { participantId: 'p1', rawScore: 40 },
            { participantId: 'p2', rawScore: 35 },
          ];

          const scored = calculateCompetitionPoints(
            results,
            'stableford',
            STANDARD_POINT_SYSTEM,
            { mode: 'win_tie_loss', values: { win: 2, tie: 1, loss: 0 } }
          );

          expect(scored[0].position).toBe(1);
          expect(scored[0].competitionPoints).toBe(2);
          expect(scored[1].position).toBe(2);
          expect(scored[1].competitionPoints).toBe(0);
        });

        it('awards tie value to all tied participants', () => {
          const results: RoundResult[] = [
            { participantId: 'p1', rawScore: 36 },
            { participantId: 'p2', rawScore: 36 },
            { participantId: 'p3', rawScore: 30 },
          ];

          const scored = calculateCompetitionPoints(
            results,
            'stableford',
            STANDARD_POINT_SYSTEM,
            { mode: 'win_tie_loss', values: { win: 2, tie: 1, loss: 0 } }
          );

          const tied = scored.filter((s) => s.position === 1);
          expect(tied).toHaveLength(2);
          tied.forEach((p) => expect(p.competitionPoints).toBe(1));

          const third = scored.find((s) => s.participantId === 'p3');
          expect(third!.competitionPoints).toBe(0);
        });
      });

      describe('mode: positional', () => {
        it('matches default behaviour when no rule is supplied', () => {
          const results: RoundResult[] = [
            { participantId: 'p1', rawScore: 40 },
            { participantId: 'p2', rawScore: 35 },
          ];

          const a = calculateCompetitionPoints(results, 'stableford', STANDARD_POINT_SYSTEM);
          const b = calculateCompetitionPoints(
            results,
            'stableford',
            STANDARD_POINT_SYSTEM,
            { mode: 'positional' }
          );

          expect(a.map((s) => s.competitionPoints)).toEqual(b.map((s) => s.competitionPoints));
        });

        it('uses the rule.rules map when provided to override the base pointSystem', () => {
          const results: RoundResult[] = [
            { participantId: 'p1', rawScore: 40 },
            { participantId: 'p2', rawScore: 35 },
          ];

          const scored = calculateCompetitionPoints(
            results,
            'stableford',
            STANDARD_POINT_SYSTEM,
            { mode: 'positional', rules: { '1': 5, '2': 3, default: 0 } }
          );

          expect(scored[0].competitionPoints).toBe(5);
          expect(scored[1].competitionPoints).toBe(3);
        });
      });
    });
  });

  // ============================================================================
  // calculateMatchPlayPoints Tests
  // ============================================================================

  describe('calculateMatchPlayPoints', () => {
    it('returns win points for a win', () => {
      const result: MatchResult = {
        participantId: 'p1',
        opponentId: 'p2',
        result: 'win',
        margin: '3&2',
      };

      const points = calculateMatchPlayPoints(result, STANDARD_POINT_SYSTEM);

      expect(points).toBe(2); // Standard win = 2
    });

    it('returns draw points for a draw', () => {
      const result: MatchResult = {
        participantId: 'p1',
        opponentId: 'p2',
        result: 'draw',
        margin: 'A/S',
      };

      const points = calculateMatchPlayPoints(result, STANDARD_POINT_SYSTEM);

      expect(points).toBe(1);
    });

    it('returns loss points for a loss', () => {
      const result: MatchResult = {
        participantId: 'p1',
        opponentId: 'p2',
        result: 'loss',
        margin: '2&1',
      };

      const points = calculateMatchPlayPoints(result, STANDARD_POINT_SYSTEM);

      expect(points).toBe(0);
    });

    it('uses league point system when specified', () => {
      const winResult: MatchResult = {
        participantId: 'p1',
        opponentId: 'p2',
        result: 'win',
      };

      const points = calculateMatchPlayPoints(winResult, LEAGUE_POINT_SYSTEM);

      expect(points).toBe(3); // League win = 3
    });

    it('uses default values when matchPlay config is missing', () => {
      const customSystem: PointSystemRules = {
        positionPoints: [10, 8, 6],
        // No matchPlay config
      };

      const result: MatchResult = {
        participantId: 'p1',
        opponentId: 'p2',
        result: 'win',
      };

      const points = calculateMatchPlayPoints(result, customSystem);

      expect(points).toBe(2); // Default win = 2
    });
  });

  // ============================================================================
  // aggregateCompetitionStandings Tests
  // ============================================================================

  describe('aggregateCompetitionStandings', () => {
    describe('Single round', () => {
      it('returns standings for single round', () => {
        const round1: RoundResultsForAggregation = {
          roundId: 'r1',
          results: [
            { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
            { participantId: 'p2', rawScore: 36, position: 2, tied: false, competitionPoints: 8 },
            { participantId: 'p3', rawScore: 34, position: 3, tied: false, competitionPoints: 6 },
          ],
        };

        const standings = aggregateCompetitionStandings([round1]);

        expect(standings).toHaveLength(3);
        expect(standings[0].participantId).toBe('p1');
        expect(standings[0].totalPoints).toBe(10);
        expect(standings[0].position).toBe(1);
        expect(standings[0].roundsPlayed).toBe(1);
      });
    });

    describe('Multiple rounds', () => {
      it('aggregates points across multiple rounds', () => {
        const round1: RoundResultsForAggregation = {
          roundId: 'r1',
          results: [
            { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
            { participantId: 'p2', rawScore: 36, position: 2, tied: false, competitionPoints: 8 },
          ],
        };

        const round2: RoundResultsForAggregation = {
          roundId: 'r2',
          results: [
            { participantId: 'p1', rawScore: 34, position: 2, tied: false, competitionPoints: 8 },
            { participantId: 'p2', rawScore: 40, position: 1, tied: false, competitionPoints: 10 },
          ],
        };

        const standings = aggregateCompetitionStandings([round1, round2]);

        // Both players have 18 total points (10+8)
        expect(standings).toHaveLength(2);
        expect(standings[0].totalPoints).toBe(18);
        expect(standings[1].totalPoints).toBe(18);
        expect(standings[0].roundsPlayed).toBe(2);
      });

      it('handles participants with different round counts', () => {
        const round1: RoundResultsForAggregation = {
          roundId: 'r1',
          results: [
            { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
            { participantId: 'p2', rawScore: 36, position: 2, tied: false, competitionPoints: 8 },
          ],
        };

        const round2: RoundResultsForAggregation = {
          roundId: 'r2',
          results: [
            { participantId: 'p1', rawScore: 34, position: 1, tied: false, competitionPoints: 10 },
            // p2 didn't play round 2
          ],
        };

        const standings = aggregateCompetitionStandings([round1, round2]);

        const p1 = standings.find((s) => s.participantId === 'p1')!;
        const p2 = standings.find((s) => s.participantId === 'p2')!;

        expect(p1.roundsPlayed).toBe(2);
        expect(p1.totalPoints).toBe(20);
        expect(p2.roundsPlayed).toBe(1);
        expect(p2.totalPoints).toBe(8);
      });
    });

    describe('Tie handling in standings', () => {
      it('handles ties in total points', () => {
        const round1: RoundResultsForAggregation = {
          roundId: 'r1',
          results: [
            { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
            { participantId: 'p2', rawScore: 36, position: 2, tied: false, competitionPoints: 10 },
          ],
        };

        const standings = aggregateCompetitionStandings([round1]);

        expect(standings[0].position).toBe(1);
        expect(standings[0].tied).toBe(true);
        expect(standings[1].position).toBe(1);
        expect(standings[1].tied).toBe(true);
      });
    });

    describe('Round points breakdown', () => {
      it('tracks round points breakdown for each participant', () => {
        const round1: RoundResultsForAggregation = {
          roundId: 'r1',
          results: [
            { participantId: 'p1', rawScore: 38, position: 1, tied: false, competitionPoints: 10 },
          ],
        };

        const round2: RoundResultsForAggregation = {
          roundId: 'r2',
          results: [
            { participantId: 'p1', rawScore: 35, position: 2, tied: false, competitionPoints: 8 },
          ],
        };

        const standings = aggregateCompetitionStandings([round1, round2]);

        expect(standings[0].roundPoints).toEqual([
          { roundId: 'r1', points: 10, position: 1 },
          { roundId: 'r2', points: 8, position: 2 },
        ]);
      });
    });

    describe('Edge cases', () => {
      it('returns empty array for no results', () => {
        const standings = aggregateCompetitionStandings([]);
        expect(standings).toEqual([]);
      });

      it('handles round with no results', () => {
        const round1: RoundResultsForAggregation = {
          roundId: 'r1',
          results: [],
        };

        const standings = aggregateCompetitionStandings([round1]);
        expect(standings).toEqual([]);
      });
    });
  });
});

// ============================================================================
// Integration: Mixed Format Competition
// ============================================================================

describe('Mixed Format Competition Integration', () => {
  it('aggregates points from Stableford, Stroke, and Match Play rounds', () => {
    // Round 1: Stableford
    const stablefordResults: RoundResult[] = [
      { participantId: 'p1', rawScore: 40 },
      { participantId: 'p2', rawScore: 38 },
      { participantId: 'p3', rawScore: 36 },
    ];
    const round1Scored = calculateCompetitionPoints(
      stablefordResults,
      'stableford',
      STANDARD_POINT_SYSTEM
    );

    // Round 2: Stroke Play
    const strokeResults: RoundResult[] = [
      { participantId: 'p1', rawScore: 75 },
      { participantId: 'p2', rawScore: 70 },
      { participantId: 'p3', rawScore: 72 },
    ];
    const round2Scored = calculateCompetitionPoints(
      strokeResults,
      'stroke',
      STANDARD_POINT_SYSTEM
    );

    // Round 3: Match Play (manual points assignment)
    const matchPlayPoints = [
      { participantId: 'p1', competitionPoints: 2 }, // 1 win
      { participantId: 'p2', competitionPoints: 1 }, // 1 draw
      { participantId: 'p3', competitionPoints: 3 }, // 1 win + 1 draw
    ];
    const round3Results = matchPlayPoints.map((mp) => ({
      participantId: mp.participantId,
      rawScore: 0,
      position: 0,
      tied: false,
      competitionPoints: mp.competitionPoints,
    }));

    // Aggregate all rounds
    const allRounds: RoundResultsForAggregation[] = [
      { roundId: 'r1', results: round1Scored },
      { roundId: 'r2', results: round2Scored },
      { roundId: 'r3', results: round3Results },
    ];

    const standings = aggregateCompetitionStandings(allRounds);

    // Calculate expected totals:
    // p1: R1=10 (1st), R2=6 (3rd), R3=2 (1 win) = 18
    // p2: R1=8 (2nd), R2=10 (1st), R3=1 (1 draw) = 19
    // p3: R1=6 (3rd), R2=8 (2nd), R3=3 = 17

    expect(standings).toHaveLength(3);

    const p1 = standings.find((s) => s.participantId === 'p1')!;
    const p2 = standings.find((s) => s.participantId === 'p2')!;
    const p3 = standings.find((s) => s.participantId === 'p3')!;

    expect(p1.totalPoints).toBe(18);
    expect(p2.totalPoints).toBe(19);
    expect(p3.totalPoints).toBe(17);

    // p2 should be leading
    expect(standings[0].participantId).toBe('p2');
    expect(standings[0].position).toBe(1);
  });
});

// ============================================================================
// Integration: Team Standings
// ============================================================================

describe('Team Standings Integration', () => {
  it('calculates team standings based on round results', () => {
    // 4 teams competing across 3 rounds
    const round1: RoundResultsForAggregation<string> = {
      roundId: 'r1',
      results: [
        { participantId: 'team-a', rawScore: 72, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-b', rawScore: 70, position: 2, tied: false, competitionPoints: 8 },
        { participantId: 'team-c', rawScore: 68, position: 3, tied: false, competitionPoints: 6 },
        { participantId: 'team-d', rawScore: 65, position: 4, tied: false, competitionPoints: 5 },
      ],
    };

    const round2: RoundResultsForAggregation<string> = {
      roundId: 'r2',
      results: [
        { participantId: 'team-b', rawScore: 75, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-d', rawScore: 73, position: 2, tied: false, competitionPoints: 8 },
        { participantId: 'team-a', rawScore: 70, position: 3, tied: false, competitionPoints: 6 },
        { participantId: 'team-c', rawScore: 68, position: 4, tied: false, competitionPoints: 5 },
      ],
    };

    const round3: RoundResultsForAggregation<string> = {
      roundId: 'r3',
      results: [
        { participantId: 'team-c', rawScore: 78, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-a', rawScore: 76, position: 2, tied: false, competitionPoints: 8 },
        { participantId: 'team-b', rawScore: 74, position: 3, tied: false, competitionPoints: 6 },
        { participantId: 'team-d', rawScore: 72, position: 4, tied: false, competitionPoints: 5 },
      ],
    };

    const teamStandings = aggregateCompetitionStandings([round1, round2, round3]);

    // Expected totals:
    // team-a: 10 + 6 + 8 = 24
    // team-b: 8 + 10 + 6 = 24
    // team-c: 6 + 5 + 10 = 21
    // team-d: 5 + 8 + 5 = 18

    expect(teamStandings).toHaveLength(4);

    const teamA = teamStandings.find((t) => t.participantId === 'team-a')!;
    const teamB = teamStandings.find((t) => t.participantId === 'team-b')!;
    const teamC = teamStandings.find((t) => t.participantId === 'team-c')!;
    const teamD = teamStandings.find((t) => t.participantId === 'team-d')!;

    expect(teamA.totalPoints).toBe(24);
    expect(teamB.totalPoints).toBe(24);
    expect(teamC.totalPoints).toBe(21);
    expect(teamD.totalPoints).toBe(18);

    // team-a and team-b should tie for 1st
    expect(teamA.position).toBe(1);
    expect(teamA.tied).toBe(true);
    expect(teamB.position).toBe(1);
    expect(teamB.tied).toBe(true);

    // All teams played 3 rounds
    teamStandings.forEach((team) => {
      expect(team.roundsPlayed).toBe(3);
    });
  });

  it('calculates team standings with Best Ball round format', () => {
    // Simulate Best Ball team round results
    const bestBallRound: RoundResultsForAggregation<string> = {
      roundId: 'best-ball-1',
      results: [
        { participantId: 'team-eagles', rawScore: 42, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-birdies', rawScore: 40, position: 2, tied: false, competitionPoints: 8 },
        { participantId: 'team-pars', rawScore: 38, position: 3, tied: false, competitionPoints: 6 },
        { participantId: 'team-bogeys', rawScore: 36, position: 4, tied: false, competitionPoints: 5 },
      ],
    };

    const standings = aggregateCompetitionStandings([bestBallRound]);

    expect(standings[0].participantId).toBe('team-eagles');
    expect(standings[0].totalPoints).toBe(10);
    expect(standings[0].position).toBe(1);

    expect(standings[3].participantId).toBe('team-bogeys');
    expect(standings[3].totalPoints).toBe(5);
    expect(standings[3].position).toBe(4);
  });
});
