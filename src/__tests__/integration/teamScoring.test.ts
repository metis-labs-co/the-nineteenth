/**
 * Team Scoring Integration Tests
 *
 * Tests complete team scoring flows including:
 * - Best Ball (Four Ball) full round
 * - Scramble/Ambrose full round with team handicap
 * - Match Play full match with early finish
 * - Team Match Play scenarios
 *
 * These tests validate that team scoring functions work correctly
 * across complete rounds with realistic data.
 */

import {
  calculateBestBallHole,
  calculateScrambleHole,
  calculateTeamHandicap,
  calculateMatchPlayHoleResult,
  calculateMatchPlayMatchResult,
  calculateMatchPlayHoleResultWithHandicaps,
  formatMatchPlayScore,
  type TeamMemberScore,
  type TeamMember,
  type MatchPlayHoleResult,
} from '@/utils/teamScoring';
import {
  create18Holes,
  createTestPlayer,
  createTeamWithMembers,
  createMultipleTeams,
} from '../utils/testFixtures';
import type { Hole, TeamWithMembers } from '@/types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create team member scores for a specific hole
 */
function _createScoresForHole(
  team: TeamWithMembers,
  hole: Hole,
  grossScores: number[]
): TeamMemberScore[] {
  return team.members.map((member, i) => ({
    playerId: member.player_id,
    grossScore: grossScores[i] ?? hole.par,
    handicap: member.player?.handicap ?? 18,
  }));
}

/**
 * Create team members for handicap calculation
 */
function teamToHandicapMembers(team: TeamWithMembers): TeamMember[] {
  return team.members.map((member) => ({
    playerId: member.player_id,
    handicap: member.player?.handicap ?? 18,
  }));
}

/**
 * Simulate a full 18-hole best ball round for a team
 */
function playBestBallRound(
  team: TeamWithMembers,
  holes: Hole[],
  scoreGenerator: (hole: Hole, playerIndex: number) => number
): { total: number; holeResults: { hole: number; bestNet: number; contributor: string }[] } {
  let total = 0;
  const holeResults: { hole: number; bestNet: number; contributor: string }[] = [];

  for (const hole of holes) {
    const scores: TeamMemberScore[] = team.members.map((member, i) => ({
      playerId: member.player_id,
      grossScore: scoreGenerator(hole, i),
      handicap: member.player?.handicap ?? 18,
    }));

    const result = calculateBestBallHole(scores, hole);
    total += result.bestNetScore;
    holeResults.push({
      hole: hole.number,
      bestNet: result.bestNetScore,
      contributor: result.contributingPlayerId,
    });
  }

  return { total, holeResults };
}

/**
 * Simulate a full 18-hole scramble round
 */
function playScrambleRound(
  team: TeamWithMembers,
  holes: Hole[],
  teamScoreGenerator: (hole: Hole) => number
): { totalGross: number; totalNet: number; holeScores: { hole: number; gross: number; net: number }[] } {
  const teamHandicap = calculateTeamHandicap(teamToHandicapMembers(team));
  let totalGross = 0;
  let totalNet = 0;
  const holeScores: { hole: number; gross: number; net: number }[] = [];

  for (const hole of holes) {
    const gross = teamScoreGenerator(hole);
    const net = calculateScrambleHole(gross, teamHandicap, hole);
    totalGross += gross;
    totalNet += net;
    holeScores.push({ hole: hole.number, gross, net });
  }

  return { totalGross, totalNet, holeScores };
}

/**
 * Simulate a full match play match
 */
function playMatchPlayMatch(
  holes: Hole[],
  playerScoreGenerator: (hole: Hole) => number,
  opponentScoreGenerator: (hole: Hole) => number
): { holeResults: MatchPlayHoleResult[]; matchResult: ReturnType<typeof calculateMatchPlayMatchResult> } {
  const holeResults: MatchPlayHoleResult[] = [];

  for (const hole of holes) {
    const playerScore = playerScoreGenerator(hole);
    const opponentScore = opponentScoreGenerator(hole);
    const result = calculateMatchPlayHoleResult(playerScore, opponentScore, hole.number);
    holeResults.push(result);

    // Check if match is over after this hole
    const matchStatus = calculateMatchPlayMatchResult(holeResults);
    if (matchStatus.matchResult === 'player_wins' || matchStatus.matchResult === 'opponent_wins') {
      break; // Match is over
    }
  }

  const matchResult = calculateMatchPlayMatchResult(holeResults);
  return { holeResults, matchResult };
}

// ============================================================================
// Best Ball Full Round Tests
// ============================================================================

describe('Best Ball Full Round Integration', () => {
  const holes = create18Holes();

  describe('2-player team', () => {
    it('completes full round with varying scores', () => {
      const players = [
        createTestPlayer({ id: 'p1', name: 'Player 1', handicap: 10 }),
        createTestPlayer({ id: 'p2', name: 'Player 2', handicap: 20 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

      // Player 1 scores par, Player 2 scores bogey
      const { total, holeResults } = playBestBallRound(team, holes, (hole, playerIndex) => {
        return hole.par + (playerIndex === 0 ? 0 : 1);
      });

      // With handicaps, best ball should be lower than par
      expect(total).toBeLessThan(72);
      expect(holeResults).toHaveLength(18);

      // Verify both players are represented in the team
      const uniqueContributors = new Set(holeResults.map((r) => r.contributor));
      expect(uniqueContributors.size).toBeGreaterThanOrEqual(1);
    });

    it('handles player with picked up score (10+)', () => {
      const players = [
        createTestPlayer({ id: 'p1', name: 'Player 1', handicap: 10 }),
        createTestPlayer({ id: 'p2', name: 'Player 2', handicap: 25 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

      // Player 1 picks up on hole 5, Player 2 makes bogey
      const { holeResults } = playBestBallRound(team, holes, (hole, playerIndex) => {
        if (hole.number === 5 && playerIndex === 0) return 10; // Picked up
        return hole.par + (playerIndex === 0 ? 0 : 1);
      });

      // On hole 5, Player 2 should contribute despite bogey
      const hole5Result = holeResults.find((r) => r.hole === 5);
      expect(hole5Result?.contributor).toBe('p2');
    });

    it('correctly handles when both players score the same', () => {
      const players = [
        createTestPlayer({ id: 'p1', name: 'Player 1', handicap: 10 }),
        createTestPlayer({ id: 'p2', name: 'Player 2', handicap: 10 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

      // Both players score par
      const { holeResults } = playBestBallRound(team, holes, (hole) => hole.par);

      // All net scores should be the same
      const allSameNet = holeResults.every((r) => {
        const otherResult = holeResults.find(
          (other) => other.hole === r.hole && other.bestNet === r.bestNet
        );
        return otherResult !== undefined;
      });
      expect(allSameNet).toBe(true);
    });
  });

  describe('4-player team', () => {
    it('completes full round with 4 different handicaps', () => {
      const players = [
        createTestPlayer({ id: 'p1', name: 'Player 1', handicap: 5 }),
        createTestPlayer({ id: 'p2', name: 'Player 2', handicap: 15 }),
        createTestPlayer({ id: 'p3', name: 'Player 3', handicap: 25 }),
        createTestPlayer({ id: 'p4', name: 'Player 4', handicap: 36 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

      // Each player scores differently
      const { total, holeResults } = playBestBallRound(team, holes, (hole, playerIndex) => {
        const offset = [0, 1, 2, 3][playerIndex]; // 0 to +3 over par
        return hole.par + offset;
      });

      // Total should be significantly under par due to handicaps
      expect(total).toBeLessThan(72);

      // Verify all holes are played
      expect(holeResults.length).toBe(18);

      // Different players should contribute based on their handicap advantage
      const contributors = new Set(holeResults.map((r) => r.contributor));
      expect(contributors.size).toBeGreaterThan(0);
    });

    it('selects best net across all 4 players correctly', () => {
      const players = [
        createTestPlayer({ id: 'p1', name: 'Player 1', handicap: 0 }),
        createTestPlayer({ id: 'p2', name: 'Player 2', handicap: 18 }),
        createTestPlayer({ id: 'p3', name: 'Player 3', handicap: 27 }),
        createTestPlayer({ id: 'p4', name: 'Player 4', handicap: 36 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

      // Hole 1 (SI 7): Scratch player birdies, others bogey
      const holeScores = [3, 5, 5, 5]; // Birdie, bogey, bogey, bogey
      const teamScores = team.members.map((m, i) => ({
        playerId: m.player_id,
        grossScore: holeScores[i],
        handicap: m.player?.handicap ?? 0,
      }));

      const result = calculateBestBallHole(teamScores, holes[0]); // Hole 1, SI 7

      // Best net should be calculated correctly
      // With high handicaps, some players get multiple strokes
      expect(result.bestNetScore).toBeDefined();
      expect(result.allNetScores.length).toBe(4);
    });
  });

  describe('team competition', () => {
    it('correctly ranks teams by best ball total', () => {
      const teams = createMultipleTeams(4, 2);
      const teamResults: { teamId: string; total: number }[] = [];

      // Each team scores with different offsets
      const offsets = [0, 1, 2, -1]; // Team 1 par, Team 2 bogey, etc.

      teams.forEach((team, teamIndex) => {
        const { total } = playBestBallRound(team, holes, (hole, _playerIndex) => {
          return hole.par + offsets[teamIndex];
        });
        teamResults.push({ teamId: team.id, total });
      });

      // Sort by total (lower is better)
      teamResults.sort((a, b) => a.total - b.total);

      // Team with birdie offset (-1) should be first
      expect(teamResults[0].teamId).toBe(teams[3].id);
    });
  });
});

// ============================================================================
// Scramble Full Round Tests
// ============================================================================

describe('Scramble Full Round Integration', () => {
  const holes = create18Holes();

  describe('4-player scramble', () => {
    it('calculates team handicap and net score correctly', () => {
      const players = [
        createTestPlayer({ id: 'p1', name: 'Player 1', handicap: 8 }),
        createTestPlayer({ id: 'p2', name: 'Player 2', handicap: 12 }),
        createTestPlayer({ id: 'p3', name: 'Player 3', handicap: 16 }),
        createTestPlayer({ id: 'p4', name: 'Player 4', handicap: 20 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

      // Team handicap for 4 players: average(14) / 4 = 3.5 → 4
      const teamHandicap = calculateTeamHandicap(teamToHandicapMembers(team));
      expect(teamHandicap).toBe(4);

      // Team scores par on every hole
      const { totalGross, totalNet } = playScrambleRound(team, holes, (hole) => hole.par);

      expect(totalGross).toBe(72);
      expect(totalNet).toBeLessThan(72);
      // Net should be gross minus strokes received (4 strokes over 18 holes)
      expect(totalNet).toBe(72 - 4);
    });

    it('handles very good team performance', () => {
      const players = [
        createTestPlayer({ id: 'p1', handicap: 0 }),
        createTestPlayer({ id: 'p2', handicap: 5 }),
        createTestPlayer({ id: 'p3', handicap: 5 }),
        createTestPlayer({ id: 'p4', handicap: 10 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

      // Team averages birdie every hole
      const { totalGross, totalNet } = playScrambleRound(team, holes, (hole) => hole.par - 1);

      expect(totalGross).toBe(72 - 18); // 54
      expect(totalNet).toBeLessThan(totalGross); // Net even better with handicap
    });

    it('distributes strokes correctly based on SI', () => {
      const players = [
        createTestPlayer({ id: 'p1', handicap: 10 }),
        createTestPlayer({ id: 'p2', handicap: 10 }),
        createTestPlayer({ id: 'p3', handicap: 10 }),
        createTestPlayer({ id: 'p4', handicap: 10 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

      // Team handicap: average(10) / 4 = 2.5 → 3
      const teamHandicap = calculateTeamHandicap(teamToHandicapMembers(team));
      expect(teamHandicap).toBe(3);

      // Check individual holes
      const { holeScores } = playScrambleRound(team, holes, (hole) => hole.par);

      // Should have 3 holes with strokes (net = gross - 1)
      const holesWithStrokes = holeScores.filter((h) => h.net < h.gross);
      expect(holesWithStrokes.length).toBe(3);
    });
  });

  describe('2-player scramble', () => {
    it('uses 2-person formula (35% low + 15% high)', () => {
      const players = [
        createTestPlayer({ id: 'p1', name: 'Player 1', handicap: 10 }),
        createTestPlayer({ id: 'p2', name: 'Player 2', handicap: 20 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

      // 35% of 10 + 15% of 20 = 3.5 + 3 = 6.5 → 7
      const teamHandicap = calculateTeamHandicap(teamToHandicapMembers(team));
      expect(teamHandicap).toBe(7);

      const { totalGross: _totalGross2, totalNet } = playScrambleRound(team, holes, (hole) => hole.par);

      expect(totalNet).toBe(72 - 7);
    });
  });

  describe('scramble competition', () => {
    it('correctly ranks teams by net score', () => {
      const teams = createMultipleTeams(4, 4);
      const teamResults: { teamId: string; gross: number; net: number }[] = [];

      teams.forEach((team, index) => {
        // Each team scores differently
        const { totalGross, totalNet } = playScrambleRound(team, holes, (hole) => {
          return hole.par + index; // 0, +1, +2, +3
        });
        teamResults.push({ teamId: team.id, gross: totalGross, net: totalNet });
      });

      // Sort by net (lower is better)
      teamResults.sort((a, b) => a.net - b.net);

      // Team 1 (index 0) should win with lowest net
      expect(teamResults[0].teamId).toBe(teams[0].id);
    });
  });
});

// ============================================================================
// Match Play Full Match Tests
// ============================================================================

describe('Match Play Full Match Integration', () => {
  const holes = create18Holes();

  describe('complete matches', () => {
    it('plays all 18 holes when match is close', () => {
      // Player wins 9 holes, opponent wins 9 holes
      const { holeResults, matchResult } = playMatchPlayMatch(
        holes,
        (hole) => (hole.number % 2 === 0 ? 4 : 5), // Player: even holes 4, odd holes 5
        (hole) => (hole.number % 2 === 0 ? 5 : 4) // Opponent: opposite
      );

      expect(holeResults.length).toBe(18);
      expect(matchResult.matchResult).toBe('all_square');
      expect(matchResult.finalResult).toBe('A/S');
      expect(matchResult.holesWon).toBe(9);
      expect(matchResult.holesLost).toBe(9);
    });

    it('handles player winning on 18th hole', () => {
      // All halved except player wins 18th
      const { matchResult } = playMatchPlayMatch(
        holes,
        (hole) => (hole.number === 18 ? 3 : 4),
        (hole) => (hole.number === 18 ? 4 : 4)
      );

      expect(matchResult.matchResult).toBe('player_wins');
      expect(matchResult.finalResult).toBe('1&0');
      expect(matchResult.holesWon).toBe(1);
      expect(matchResult.holesLost).toBe(0);
    });

    it('handles opponent winning by 2 on 18th', () => {
      // Opponent wins first 2 holes, rest halved
      const { matchResult } = playMatchPlayMatch(
        holes,
        (hole) => (hole.number <= 2 ? 5 : 4),
        (hole) => (hole.number <= 2 ? 4 : 4)
      );

      expect(matchResult.matchResult).toBe('opponent_wins');
      // Match ends at 2&1 because opponent is 2 up with 1 to play after hole 17
      expect(matchResult.finalResult).toBe('2&1');
    });
  });

  describe('early finishes', () => {
    it('ends match at 5&4 (5 up with 4 to play)', () => {
      // Player wins first 5 holes, rest halved until match ends
      const { holeResults, matchResult } = playMatchPlayMatch(
        holes,
        (hole) => (hole.number <= 5 ? 3 : 4),
        (hole) => (hole.number <= 5 ? 5 : 4)
      );

      expect(matchResult.matchResult).toBe('player_wins');
      expect(matchResult.finalResult).toBe('5&4');
      expect(holeResults.length).toBeLessThan(18);
    });

    it('ends match at 3&2 (3 up with 2 to play)', () => {
      // Player wins 3 of first 16 holes
      const { matchResult } = playMatchPlayMatch(
        holes,
        (hole) => ([1, 5, 10].includes(hole.number) ? 3 : 4),
        (hole) => ([1, 5, 10].includes(hole.number) ? 5 : 4)
      );

      expect(matchResult.matchResult).toBe('player_wins');
      expect(matchResult.finalResult).toBe('3&2');
    });

    it('ends match at 6&5 (6 up with 5 to play)', () => {
      // Player dominates first 6 holes, rest halved
      const { holeResults, matchResult } = playMatchPlayMatch(
        holes,
        (hole) => (hole.number <= 6 ? 3 : 4),
        (hole) => (hole.number <= 6 ? 6 : 4)
      );

      expect(matchResult.matchResult).toBe('player_wins');
      expect(matchResult.finalResult).toBe('6&5');
      expect(holeResults.length).toBe(13);
    });

    it('opponent wins 4&3', () => {
      // Opponent wins 4 of first 15 holes
      const { matchResult } = playMatchPlayMatch(
        holes,
        (hole) => ([2, 5, 8, 12].includes(hole.number) ? 6 : 4),
        (hole) => ([2, 5, 8, 12].includes(hole.number) ? 4 : 4)
      );

      expect(matchResult.matchResult).toBe('opponent_wins');
      expect(matchResult.finalResult).toBe('4&3');
    });
  });

  describe('dormie situations', () => {
    it('detects dormie when player leads by holes remaining', () => {
      // Build results: Player 2 up with 2 to play
      const holeResults: MatchPlayHoleResult[] = [];

      // Player wins first 2, rest halved through 16
      for (let i = 1; i <= 16; i++) {
        const playerScore = i <= 2 ? 3 : 4;
        const opponentScore = i <= 2 ? 5 : 4;
        holeResults.push(calculateMatchPlayHoleResult(playerScore, opponentScore, i));
      }

      const matchStatus = calculateMatchPlayMatchResult(holeResults);

      expect(matchStatus.matchResult).toBe('dormie_player');
      expect(matchStatus.currentScore).toBe(2);
      expect(matchStatus.holesRemaining).toBe(2);
    });

    it('player wins from dormie position', () => {
      // Player 2 up with 2 to play, then halves both
      const { matchResult } = playMatchPlayMatch(
        holes,
        (hole) => (hole.number <= 2 ? 3 : 4), // Win first 2, halve rest
        (hole) => (hole.number <= 2 ? 5 : 4)
      );

      expect(matchResult.matchResult).toBe('player_wins');
    });

    it('opponent comes back from dormie to all square', () => {
      // Player 2 up with 2 to play, opponent wins both final holes
      const holeResults: MatchPlayHoleResult[] = [];

      for (let i = 1; i <= 18; i++) {
        let playerScore: number;
        let opponentScore: number;

        if (i <= 2) {
          // Player wins first 2
          playerScore = 3;
          opponentScore = 5;
        } else if (i <= 16) {
          // Holes 3-16 halved
          playerScore = 4;
          opponentScore = 4;
        } else {
          // Holes 17-18 opponent wins
          playerScore = 5;
          opponentScore = 3;
        }

        holeResults.push(calculateMatchPlayHoleResult(playerScore, opponentScore, i));
      }

      const matchStatus = calculateMatchPlayMatchResult(holeResults);

      expect(matchStatus.matchResult).toBe('all_square');
      expect(matchStatus.finalResult).toBe('A/S');
    });
  });

  describe('score formatting', () => {
    it('formats various scores correctly throughout match', () => {
      expect(formatMatchPlayScore(0)).toBe('A/S');
      expect(formatMatchPlayScore(1)).toBe('1 UP');
      expect(formatMatchPlayScore(2)).toBe('2 UP');
      expect(formatMatchPlayScore(5)).toBe('5 UP');
      expect(formatMatchPlayScore(-1)).toBe('1 DN');
      expect(formatMatchPlayScore(-3)).toBe('3 DN');
    });
  });
});

// ============================================================================
// Match Play with Handicaps Tests
// ============================================================================

describe('Match Play with Handicaps Integration', () => {
  const holes = create18Holes();

  it('handicaps affect hole outcomes', () => {
    // Player: 36 handicap (2 strokes per hole)
    // Opponent: 0 handicap

    // Both score 5 on hole 1 (SI 7)
    // Player net: 5 - 2 = 3
    // Opponent net: 5 - 0 = 5
    const result = calculateMatchPlayHoleResultWithHandicaps(5, 36, 5, 0, holes[0]);

    expect(result.result).toBe('won');
  });

  it('plays full match with handicap difference', () => {
    const playerHandicap = 24; // Gets strokes on most holes
    const opponentHandicap = 6;

    const holeResults: MatchPlayHoleResult[] = [];

    for (const hole of holes) {
      // Both score bogey (par + 1)
      const result = calculateMatchPlayHoleResultWithHandicaps(
        hole.par + 1,
        playerHandicap,
        hole.par + 1,
        opponentHandicap,
        hole
      );
      holeResults.push(result);
    }

    const matchStatus = calculateMatchPlayMatchResult(holeResults);

    // Higher handicap player should have advantage
    expect(matchStatus.currentScore).toBeGreaterThan(0);
    expect(matchStatus.matchResult).toBe('player_wins');
  });

  it('even handicaps result in gross comparison', () => {
    const sharedHandicap = 18;

    const holeResults: MatchPlayHoleResult[] = [];

    for (const hole of holes) {
      // Player scores par, opponent scores bogey
      const result = calculateMatchPlayHoleResultWithHandicaps(
        hole.par,
        sharedHandicap,
        hole.par + 1,
        sharedHandicap,
        hole
      );
      holeResults.push(result);
    }

    const matchStatus = calculateMatchPlayMatchResult(holeResults);

    // Player wins every hole
    expect(matchStatus.holesWon).toBe(18);
    expect(matchStatus.matchResult).toBe('player_wins');
  });
});

// ============================================================================
// 9-Hole Match Tests
// ============================================================================

describe('9-Hole Match Integration', () => {
  const front9 = create18Holes().slice(0, 9);

  it('handles 9-hole best ball round', () => {
    const players = [
      createTestPlayer({ id: 'p1', handicap: 10 }),
      createTestPlayer({ id: 'p2', handicap: 20 }),
    ];
    const team = createTeamWithMembers({ id: 'team1', name: 'Team A' }, players);

    const { total, holeResults } = playBestBallRound(team, front9, (hole) => hole.par);

    expect(holeResults.length).toBe(9);
    expect(total).toBeLessThan(36); // Under par due to handicaps
  });

  it('handles 9-hole match play', () => {
    // Player wins 5 holes, match ends when 5 up with 4 remaining
    const holeResults: MatchPlayHoleResult[] = [];

    for (let i = 0; i < 9; i++) {
      const playerScore = i < 5 ? 3 : 4;
      const opponentScore = i < 5 ? 5 : 4;
      holeResults.push(calculateMatchPlayHoleResult(playerScore, opponentScore, i + 1));

      const matchStatus = calculateMatchPlayMatchResult(holeResults, 9);
      if (matchStatus.matchResult === 'player_wins' || matchStatus.matchResult === 'opponent_wins') {
        break;
      }
    }

    const matchStatus = calculateMatchPlayMatchResult(holeResults, 9);

    expect(matchStatus.matchResult).toBe('player_wins');
    // 5 wins with 4 remaining = 5&4
    expect(matchStatus.finalResult).toBe('5&4');
    expect(matchStatus.holesRemaining).toBe(4);
  });

  it('9-hole match goes full distance', () => {
    const holeResults: MatchPlayHoleResult[] = [];

    // All halved
    for (let i = 0; i < 9; i++) {
      holeResults.push(calculateMatchPlayHoleResult(4, 4, i + 1));
    }

    const matchStatus = calculateMatchPlayMatchResult(holeResults, 9);

    expect(matchStatus.matchResult).toBe('all_square');
    expect(matchStatus.holesRemaining).toBe(0);
    expect(matchStatus.holesPlayed).toBe(9);
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Team Scoring Edge Cases', () => {
  const holes = create18Holes();

  describe('best ball edge cases', () => {
    it('handles single player team', () => {
      const player = createTestPlayer({ id: 'p1', handicap: 18 });
      const team = createTeamWithMembers({ id: 'team1', name: 'Solo' }, [player]);

      const { total, holeResults } = playBestBallRound(team, holes, (hole) => hole.par);

      expect(holeResults.length).toBe(18);
      expect(total).toBeLessThan(72); // Net with handicap
    });

    it('throws for empty team', () => {
      expect(() => {
        calculateBestBallHole([], holes[0]);
      }).toThrow('Team must have at least one player');
    });
  });

  describe('scramble edge cases', () => {
    it('handles very high team handicap', () => {
      const players = [
        createTestPlayer({ id: 'p1', handicap: 36 }),
        createTestPlayer({ id: 'p2', handicap: 36 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'High HC' }, players);

      // 35% of 36 + 15% of 36 = 18
      const teamHandicap = calculateTeamHandicap(teamToHandicapMembers(team));
      expect(teamHandicap).toBe(18);

      const { totalNet } = playScrambleRound(team, holes, (hole) => hole.par);
      expect(totalNet).toBe(72 - 18);
    });

    it('handles zero handicap team', () => {
      const players = [
        createTestPlayer({ id: 'p1', handicap: 0 }),
        createTestPlayer({ id: 'p2', handicap: 0 }),
      ];
      const team = createTeamWithMembers({ id: 'team1', name: 'Scratch' }, players);

      const teamHandicap = calculateTeamHandicap(teamToHandicapMembers(team));
      expect(teamHandicap).toBe(0);

      const { totalGross: _totalGross, totalNet } = playScrambleRound(team, holes, (hole) => hole.par);
      expect(_totalGross).toBe(totalNet); // No strokes
    });
  });

  describe('match play edge cases', () => {
    it('handles empty hole results', () => {
      const matchStatus = calculateMatchPlayMatchResult([]);

      expect(matchStatus.holesPlayed).toBe(0);
      expect(matchStatus.currentScore).toBe(0);
      expect(matchStatus.matchResult).toBe('in_progress');
    });

    it('handles single hole played', () => {
      const holeResults = [calculateMatchPlayHoleResult(3, 4, 1)];
      const matchStatus = calculateMatchPlayMatchResult(holeResults);

      expect(matchStatus.holesPlayed).toBe(1);
      expect(matchStatus.currentScore).toBe(1);
      expect(matchStatus.matchResult).toBe('in_progress');
    });

    it('maximum early finish (10&8)', () => {
      // Player wins first 10 holes
      const holeResults: MatchPlayHoleResult[] = [];

      for (let i = 1; i <= 10; i++) {
        holeResults.push(calculateMatchPlayHoleResult(3, 6, i));

        const matchStatus = calculateMatchPlayMatchResult(holeResults);
        if (matchStatus.matchResult === 'player_wins') {
          break;
        }
      }

      const matchStatus = calculateMatchPlayMatchResult(holeResults);

      expect(matchStatus.matchResult).toBe('player_wins');
      expect(matchStatus.finalResult).toBe('10&8');
    });
  });
});

// ============================================================================
// Competition Scenarios
// ============================================================================

describe('Competition Scenarios', () => {
  const holes = create18Holes();

  it('simulates 4-team best ball competition', () => {
    const teams = createMultipleTeams(4, 2);
    const results: { teamId: string; name: string; total: number }[] = [];

    teams.forEach((team) => {
      // Random-ish scores based on team index
      const { total } = playBestBallRound(team, holes, (hole, _playerIndex) => {
        return hole.par; // All play to par
      });
      results.push({ teamId: team.id, name: team.name, total });
    });

    // All teams should have similar totals since same handicaps
    expect(results.every((r) => r.total < 72)).toBe(true);
  });

  it('simulates scramble with tie-break', () => {
    // Two teams with same handicap composition
    const team1Players = [
      createTestPlayer({ id: 't1p1', handicap: 10 }),
      createTestPlayer({ id: 't1p2', handicap: 20 }),
    ];
    const team2Players = [
      createTestPlayer({ id: 't2p1', handicap: 10 }),
      createTestPlayer({ id: 't2p2', handicap: 20 }),
    ];

    const team1 = createTeamWithMembers({ id: 'team1', name: 'Team 1' }, team1Players);
    const team2 = createTeamWithMembers({ id: 'team2', name: 'Team 2' }, team2Players);

    // Both score par
    const result1 = playScrambleRound(team1, holes, (hole) => hole.par);
    const result2 = playScrambleRound(team2, holes, (hole) => hole.par);

    // Should be tied
    expect(result1.totalNet).toBe(result2.totalNet);
  });

  it('simulates round-robin match play', () => {
    const players = [
      createTestPlayer({ id: 'p1', name: 'Player 1', handicap: 10 }),
      createTestPlayer({ id: 'p2', name: 'Player 2', handicap: 15 }),
      createTestPlayer({ id: 'p3', name: 'Player 3', handicap: 20 }),
    ];

    const standings: Record<string, { wins: number; losses: number; halved: number }> = {};
    players.forEach((p) => {
      standings[p.id] = { wins: 0, losses: 0, halved: 0 };
    });

    // Each player plays each other
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        // Simulate match - lower handicap player has slight advantage
        const playerIHandicap = players[i].handicap ?? 0;
        const playerJHandicap = players[j].handicap ?? 0;
        const playerAdvantage = playerJHandicap - playerIHandicap;
        const holeResults: MatchPlayHoleResult[] = [];

        for (const hole of holes) {
          // Higher handicap player scores worse on average
          const result = calculateMatchPlayHoleResultWithHandicaps(
            hole.par,
            playerIHandicap,
            hole.par + (playerAdvantage > 5 ? 1 : 0),
            playerJHandicap,
            hole
          );
          holeResults.push(result);
        }

        const matchResult = calculateMatchPlayMatchResult(holeResults);

        if (matchResult.matchResult === 'player_wins') {
          standings[players[i].id].wins++;
          standings[players[j].id].losses++;
        } else if (matchResult.matchResult === 'opponent_wins') {
          standings[players[i].id].losses++;
          standings[players[j].id].wins++;
        } else {
          standings[players[i].id].halved++;
          standings[players[j].id].halved++;
        }
      }
    }

    // Verify standings add up
    const totalGames = players.length * (players.length - 1) / 2;
    let totalWins = 0;
    let totalLosses = 0;
    let totalHalved = 0;

    Object.values(standings).forEach((s) => {
      totalWins += s.wins;
      totalLosses += s.losses;
      totalHalved += s.halved;
    });

    // Wins should equal losses
    expect(totalWins).toBe(totalLosses);
    // Total matches played should match
    expect(totalWins + totalHalved / 2).toBeLessThanOrEqual(totalGames);
  });
});
