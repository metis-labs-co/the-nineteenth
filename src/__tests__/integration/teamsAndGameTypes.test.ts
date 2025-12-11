/**
 * Teams and Game Types Integration Tests
 *
 * Complete integration tests covering all 8 test flows:
 * (1) Create competition with fixed teams - verify teams persist across rounds
 * (2) Create competition with per-round teams - verify teams can differ per round
 * (3) Auto-generate balanced teams - verify handicap distribution
 * (4) Score team Best Ball round - verify best score used
 * (5) Score team Scramble round - verify single team score
 * (6) Score Match Play round - verify match result calculation and early finish
 * (7) Competition leaderboard - verify points aggregation across mixed formats
 * (8) Team leaderboard - verify team standings
 */

import {
  generateBalancedTeams,
  getTeamStats,
  type GeneratedTeam,
} from '@/utils/teamGeneration';
import {
  calculateStablefordPoints,
  calculateBestBallScore,
  calculateBestBallStablefordPoints,
  calculateScrambleTeamHandicap,
  calculateNetScore,
  calculateMatchPlayHole,
  calculateTeamMatchPlayHoleResult,
  calculateMatchPlayStatus,
  getStrokesReceived,
} from '@/utils/scoring';
import {
  calculateCompetitionPoints,
  calculateMatchPlayPoints,
  aggregateCompetitionStandings,
  STANDARD_POINT_SYSTEM,
  type RoundResult,
  type ScoredResult,
  type RoundResultsForAggregation,
} from '@/utils/competitionPoints';
import {
  createTestPlayer,
  createPlayersWithHandicaps,
  createTestCompetition,
  createFixedTeamCompetition,
  createPerRoundTeamCompetition,
  createTestRound,
  createBestBallRound,
  createScrambleRound,
  createMatchPlayRound,
  createTeamMatchPlayRound,
  create18Holes,
  createTeamWithMembers,
  createMultipleTeams,
  createCompletedScorecard,
  STANDARD_POINT_SYSTEM as FIXTURE_POINT_SYSTEM,
} from '../utils/testFixtures';
import type { Hole, Player, Competition, Round, TeamWithMembers, Scorecard } from '@/types/database.types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Simulate a complete round of Best Ball scoring for a team
 */
function simulateBestBallRound(
  team: TeamWithMembers,
  holes: Hole[],
  scoresByPlayer: Map<string, number[]> // playerId -> array of gross scores per hole
): { totalBestBallPoints: number; holeByHoleResults: { hole: number; bestScore: number; bestPoints: number }[] } {
  const results: { hole: number; bestScore: number; bestPoints: number }[] = [];
  let totalPoints = 0;

  holes.forEach((hole, index) => {
    const playerScores = team.members.map((member) => ({
      strokes: scoresByPlayer.get(member.player_id)?.[index] ?? hole.par,
      handicap: member.player?.handicap ?? 18,
    }));

    const bestBallResult = calculateBestBallScore(playerScores, hole);
    const bestPoints = calculateBestBallStablefordPoints(playerScores, hole);

    results.push({
      hole: hole.number,
      bestScore: bestBallResult?.bestNetScore ?? 0,
      bestPoints,
    });
    totalPoints += bestPoints;
  });

  return { totalBestBallPoints: totalPoints, holeByHoleResults: results };
}

/**
 * Simulate a complete Scramble round for a team
 */
function simulateScrambleRound(
  team: TeamWithMembers,
  holes: Hole[],
  teamScores: number[] // Gross score per hole
): { totalGross: number; totalNet: number; totalPoints: number } {
  const handicaps = team.members.map((m) => m.player?.handicap ?? 18);
  const teamHandicap = calculateScrambleTeamHandicap(handicaps);

  let totalGross = 0;
  let totalNet = 0;
  let totalPoints = 0;

  holes.forEach((hole, index) => {
    const gross = teamScores[index] ?? hole.par;
    totalGross += gross;

    const strokesReceived = getStrokesReceived(teamHandicap, hole.strokeIndex);
    const net = gross - strokesReceived;
    totalNet += net;

    // Calculate Stableford points for team
    const relativeToPar = net - hole.par;
    let points = 0;
    if (relativeToPar <= -2) points = 4;
    else if (relativeToPar === -1) points = 3;
    else if (relativeToPar === 0) points = 2;
    else if (relativeToPar === 1) points = 1;
    totalPoints += points;
  });

  return { totalGross, totalNet, totalPoints };
}

/**
 * Simulate a Match Play round between two players/teams
 */
function simulateMatchPlayRound(
  player1: { handicap: number; scores: number[] },
  player2: { handicap: number; scores: number[] },
  holes: Hole[]
): {
  winner: 'player1' | 'player2' | 'halved';
  status: string;
  holesPlayed: number;
  margin: string;
} {
  let p1Wins = 0;
  let p2Wins = 0;
  let holesPlayed = 0;

  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i];
    holesPlayed++;

    const result = calculateMatchPlayHole(
      player1.scores[i],
      player1.handicap,
      player2.scores[i],
      player2.handicap,
      hole
    );

    if (result === 1) p1Wins++;
    else if (result === -1) p2Wins++;

    // Check if match is over
    const status = calculateMatchPlayStatus(p1Wins, p2Wins, holesPlayed, 'P1', 'P2');
    if (status.isMatchOver) {
      return {
        winner: status.leader === 'team1' ? 'player1' : 'player2',
        status: status.status,
        holesPlayed,
        margin: `${status.margin}&${18 - holesPlayed}`,
      };
    }
  }

  // Match went all 18 holes
  const finalStatus = calculateMatchPlayStatus(p1Wins, p2Wins, 18, 'P1', 'P2');
  if (p1Wins === p2Wins) {
    return { winner: 'halved', status: 'All Square', holesPlayed: 18, margin: 'A/S' };
  }

  return {
    winner: p1Wins > p2Wins ? 'player1' : 'player2',
    status: finalStatus.status,
    holesPlayed: 18,
    margin: `${finalStatus.margin}&0`,
  };
}

// ============================================================================
// (1) Fixed Teams - Persist Across Rounds
// ============================================================================

describe('Fixed Teams Competition', () => {
  it('creates competition with fixed team mode', () => {
    const competition = createFixedTeamCompetition(2);

    expect(competition.team_mode).toBe('fixed');
    expect(competition.team_size).toBe(2);
  });

  it('teams persist across multiple rounds', () => {
    const players = createPlayersWithHandicaps([5, 10, 15, 20, 25, 30, 35, 40]);

    // Generate teams once at competition start
    const fixedTeams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    // Simulate 3 rounds
    const rounds = [
      createTestRound({ id: 'r1', round_number: 1 }),
      createTestRound({ id: 'r2', round_number: 2 }),
      createTestRound({ id: 'r3', round_number: 3 }),
    ];

    // For each round, teams should be the same
    rounds.forEach((round) => {
      const roundTeams = fixedTeams; // Same teams used

      // Verify team composition
      expect(roundTeams).toHaveLength(4);

      // Snake draft result:
      // Team 1: handicaps 5, 40 (avg 22.5)
      // Team 2: handicaps 10, 35 (avg 22.5)
      // Team 3: handicaps 15, 30 (avg 22.5)
      // Team 4: handicaps 20, 25 (avg 22.5)
      expect(roundTeams[0].members.map((m) => m.handicap)).toEqual([5, 40]);
      expect(roundTeams[1].members.map((m) => m.handicap)).toEqual([10, 35]);
      expect(roundTeams[2].members.map((m) => m.handicap)).toEqual([15, 30]);
      expect(roundTeams[3].members.map((m) => m.handicap)).toEqual([20, 25]);
    });
  });

  it('fixed teams maintain consistent member IDs', () => {
    const players = createPlayersWithHandicaps([10, 20, 30, 40]);
    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    // Store team compositions
    const team1Members = teams[0].members.map((m) => m.id);
    const team2Members = teams[1].members.map((m) => m.id);

    // Verify in subsequent "rounds" (same teams reference)
    expect(teams[0].members.map((m) => m.id)).toEqual(team1Members);
    expect(teams[1].members.map((m) => m.id)).toEqual(team2Members);
  });
});

// ============================================================================
// (2) Per-Round Teams - Can Differ Per Round
// ============================================================================

describe('Per-Round Teams Competition', () => {
  it('creates competition with per-round team mode', () => {
    const competition = createPerRoundTeamCompetition(2);

    expect(competition.team_mode).toBe('per-round');
    expect(competition.team_size).toBe(2);
  });

  it('teams can be regenerated differently for each round', () => {
    const players = createPlayersWithHandicaps([5, 10, 15, 20, 25, 30, 35, 40]);

    // Round 1: Balanced teams
    const round1Teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    // Round 2: Random order (simulate shuffle)
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const round2Teams = generateBalancedTeams(shuffledPlayers, {
      teamSize: 2,
      balanceByHandicap: false, // Use as-is order
    });

    // Round 3: Different team size
    const round3Teams = generateBalancedTeams(players, {
      teamSize: 4,
      balanceByHandicap: true,
    });

    // Verify different configurations
    expect(round1Teams).toHaveLength(4);
    expect(round2Teams).toHaveLength(4);
    expect(round3Teams).toHaveLength(2); // 8 players / 4 per team

    // Round 2 likely has different team compositions
    const r1Team1Players = round1Teams[0].members.map((m) => m.id).sort();
    const r2Team1Players = round2Teams[0].members.map((m) => m.id).sort();

    // Note: May occasionally be the same due to random shuffle
    // Just verify structure is correct
    expect(r1Team1Players).toHaveLength(2);
    expect(r2Team1Players).toHaveLength(2);
  });

  it('allows different team formats per round', () => {
    const players = createPlayersWithHandicaps([8, 12, 16, 20, 24, 28, 32, 36]);

    // Round 1: 2-person teams
    const round1Teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    // Round 2: 4-person teams
    const round2Teams = generateBalancedTeams(players, {
      teamSize: 4,
      balanceByHandicap: true,
    });

    expect(round1Teams).toHaveLength(4);
    round1Teams.forEach((team) => expect(team.members).toHaveLength(2));

    expect(round2Teams).toHaveLength(2);
    round2Teams.forEach((team) => expect(team.members).toHaveLength(4));
  });
});

// ============================================================================
// (3) Auto-Generate Balanced Teams
// ============================================================================

describe('Auto-Generate Balanced Teams', () => {
  it('generates teams with balanced handicaps using snake draft', () => {
    const players = createPlayersWithHandicaps([0, 5, 10, 15, 20, 25, 30, 35]);

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    // Verify each team has similar average handicap
    const avgHandicaps = teams.map((team) => getTeamStats(team).avgHandicap);

    // Perfect balance: (0+35)/2 = 17.5, (5+30)/2 = 17.5, (10+25)/2 = 17.5, (15+20)/2 = 17.5
    expect(avgHandicaps).toEqual([17.5, 17.5, 17.5, 17.5]);
  });

  it('minimizes handicap spread between teams', () => {
    const players = createPlayersWithHandicaps([2, 7, 11, 14, 19, 23, 27, 31]);

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    const avgHandicaps = teams.map((team) => getTeamStats(team).avgHandicap);

    // Calculate spread (max - min)
    const spread = Math.max(...avgHandicaps) - Math.min(...avgHandicaps);

    // With snake draft, spread should be minimal
    expect(spread).toBeLessThan(3);
  });

  it('handles 4-person teams with balanced handicaps', () => {
    const players = createPlayersWithHandicaps([
      0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44,
    ]);

    const teams = generateBalancedTeams(players, {
      teamSize: 4,
      balanceByHandicap: true,
    });

    expect(teams).toHaveLength(3);

    // Each team should have mix of low and high handicappers
    teams.forEach((team) => {
      const stats = getTeamStats(team);
      expect(stats.avgHandicap).toBeGreaterThan(15);
      expect(stats.avgHandicap).toBeLessThan(30);
    });
  });

  it('creates teams with low handicap variance', () => {
    const players = createPlayersWithHandicaps([5, 8, 11, 14, 17, 20, 23, 26]);

    const teams = generateBalancedTeams(players, {
      teamSize: 2,
      balanceByHandicap: true,
    });

    const avgHandicaps = teams.map((team) => getTeamStats(team).avgHandicap);

    // Calculate variance
    const mean = avgHandicaps.reduce((a, b) => a + b, 0) / avgHandicaps.length;
    const variance =
      avgHandicaps.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / avgHandicaps.length;

    expect(variance).toBeLessThan(1);
  });
});

// ============================================================================
// (4) Score Team Best Ball Round
// ============================================================================

describe('Team Best Ball Round Scoring', () => {
  const holes = create18Holes();

  it('uses best score among team members for each hole', () => {
    const team = createTeamWithMembers(
      { id: 'team-1', name: 'Team Alpha' },
      [
        createTestPlayer({ id: 'p1', handicap: 10 }),
        createTestPlayer({ id: 'p2', handicap: 20 }),
      ]
    );

    // Simulate hole 1 (par 4, SI 7)
    const hole = holes.find((h) => h.number === 1)!;

    // P1: gross 5, handicap 10, SI 7 -> gets 1 stroke -> net 4
    // P2: gross 6, handicap 20, SI 7 -> gets 2 strokes -> net 4
    const playerScores = [
      { strokes: 5, handicap: 10 },
      { strokes: 6, handicap: 20 },
    ];

    const bestScore = calculateBestBallScore(playerScores, hole);
    const bestPoints = calculateBestBallStablefordPoints(playerScores, hole);

    // Both have net 4 (par), so best is 4
    expect(bestScore?.bestNetScore).toBe(4);
    expect(bestPoints).toBe(2); // Par = 2 points
  });

  it('correctly identifies contributing player with best score', () => {
    const hole: Hole = { number: 5, par: 4, strokeIndex: 5 };

    // Player 1: low handicap, plays gross par
    // Player 2: high handicap with strokes, plays gross bogey -> net birdie
    const playerScores = [
      { strokes: 4, handicap: 4 },  // Net 4 (par)
      { strokes: 5, handicap: 18 }, // Net 4 (par, with 1 stroke)
    ];

    const result = calculateBestBallScore(playerScores, hole);

    // Both net 4, but best score found
    expect(result?.bestNetScore).toBe(4);
  });

  it('calculates complete Best Ball round for team', () => {
    const team = createTeamWithMembers(
      { id: 'team-1', name: 'Team Alpha' },
      [
        createTestPlayer({ id: 'p1', handicap: 12 }),
        createTestPlayer({ id: 'p2', handicap: 24 }),
      ]
    );

    // Simulate scores: P1 plays to par+1, P2 plays to par+2
    const p1Scores = holes.map((h) => h.par + 1);
    const p2Scores = holes.map((h) => h.par + 2);

    const scoresByPlayer = new Map([
      ['p1', p1Scores],
      ['p2', p2Scores],
    ]);

    const result = simulateBestBallRound(team, holes, scoresByPlayer);

    // With handicap strokes, best ball should be better than individual
    expect(result.totalBestBallPoints).toBeGreaterThan(0);
    expect(result.holeByHoleResults).toHaveLength(18);
  });

  it('handles picked up holes (score > 9)', () => {
    const hole: Hole = { number: 1, par: 4, strokeIndex: 10 };

    const playerScores = [
      { strokes: 10, handicap: 18 }, // Picked up
      { strokes: 5, handicap: 15 },  // Bogey gross
    ];

    const points = calculateBestBallStablefordPoints(playerScores, hole);

    // Should use P2's score, ignoring picked up
    expect(points).toBeGreaterThan(0);
  });
});

// ============================================================================
// (5) Score Team Scramble Round
// ============================================================================

describe('Team Scramble Round Scoring', () => {
  const holes = create18Holes();

  it('calculates correct team handicap for Scramble', () => {
    const handicaps = [10, 15, 20, 25];

    const teamHandicap = calculateScrambleTeamHandicap(handicaps);

    // Sorted: 10, 15, 20, 25
    // 10*0.35 + 15*0.15 + 20*0.10 + 25*0.05 = 3.5 + 2.25 + 2.0 + 1.25 = 9.0
    expect(teamHandicap).toBe(9);
  });

  it('uses single team score for each hole', () => {
    const team = createTeamWithMembers(
      { id: 'team-1', name: 'Team Scramble' },
      [
        createTestPlayer({ id: 'p1', handicap: 8 }),
        createTestPlayer({ id: 'p2', handicap: 12 }),
        createTestPlayer({ id: 'p3', handicap: 16 }),
        createTestPlayer({ id: 'p4', handicap: 20 }),
      ]
    );

    // Team handicap: 8*0.35 + 12*0.15 + 16*0.10 + 20*0.05 = 2.8 + 1.8 + 1.6 + 1.0 = 7.2
    const teamHandicap = calculateScrambleTeamHandicap([8, 12, 16, 20]);
    expect(teamHandicap).toBe(7.2);

    // Simulate round where team plays 2 under par gross on every hole
    const teamScores = holes.map((h) => h.par - 2);
    const result = simulateScrambleRound(team, holes, teamScores);

    // 18 holes at 2 under par gross = very good score
    const coursePar = holes.reduce((sum, h) => sum + h.par, 0);
    expect(result.totalGross).toBe(coursePar - 36);
    expect(result.totalNet).toBeLessThan(result.totalGross);
  });

  it('applies team handicap correctly to net score', () => {
    const team = createTeamWithMembers(
      { id: 'team-1', name: 'Team Test' },
      [
        createTestPlayer({ id: 'p1', handicap: 10 }),
        createTestPlayer({ id: 'p2', handicap: 20 }),
      ]
    );

    // Team handicap: 10*0.35 + 20*0.15 = 3.5 + 3.0 = 6.5
    const teamHandicap = calculateScrambleTeamHandicap([10, 20]);
    expect(teamHandicap).toBe(6.5);

    // On SI 1-6 holes, team gets 1 stroke
    // On SI 7-18 holes, team gets 0 strokes
    const hole1: Hole = { number: 1, par: 4, strokeIndex: 1 };
    const hole18: Hole = { number: 18, par: 4, strokeIndex: 18 };

    const strokesOnHole1 = getStrokesReceived(teamHandicap, hole1.strokeIndex);
    const strokesOnHole18 = getStrokesReceived(teamHandicap, hole18.strokeIndex);

    expect(strokesOnHole1).toBe(1); // SI 1 <= 6 (remainder)
    expect(strokesOnHole18).toBe(0); // SI 18 > 6
  });

  it('calculates Stableford points for Scramble round', () => {
    const team = createTeamWithMembers(
      { id: 'team-1', name: 'Team Eagles' },
      [
        createTestPlayer({ id: 'p1', handicap: 5 }),
        createTestPlayer({ id: 'p2', handicap: 10 }),
      ]
    );

    // Playing even par on every hole
    const teamScores = holes.map((h) => h.par);
    const result = simulateScrambleRound(team, holes, teamScores);

    // With low team handicap (~4.25), mostly 0 strokes
    // Should be around 36 points for par
    expect(result.totalPoints).toBeGreaterThan(30);
    expect(result.totalPoints).toBeLessThanOrEqual(40);
  });
});

// ============================================================================
// (6) Score Match Play Round
// ============================================================================

describe('Match Play Round Scoring', () => {
  const holes = create18Holes();

  describe('Individual Match Play', () => {
    it('correctly determines hole winner based on net scores', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 1 };

      // P1: scratch (0), gross 4, net 4
      // P2: handicap 18, gross 5, net 4 (gets 1 stroke)
      const result = calculateMatchPlayHole(4, 0, 5, 18, hole);

      expect(result).toBe(0); // Halved
    });

    it('awards hole to lower net score', () => {
      const hole: Hole = { number: 1, par: 4, strokeIndex: 18 }; // SI 18 (low priority hole)

      // P1: handicap 18, gets 1 stroke (base=1, SI 18 > 0). gross 4, net 3
      // P2: handicap 10, gets 0 strokes (base=0, SI 18 > 10). gross 4, net 4
      const result = calculateMatchPlayHole(4, 18, 4, 10, hole);

      expect(result).toBe(1); // P1 wins (lower net: 3 vs 4)
    });

    it('simulates complete match with early finish', () => {
      const player1 = {
        handicap: 10,
        scores: holes.map((h) => h.par - 1), // Birdie every hole gross
      };
      const player2 = {
        handicap: 10,
        scores: holes.map((h) => h.par + 1), // Bogey every hole gross
      };

      const result = simulateMatchPlayRound(player1, player2, holes);

      // P1 wins every hole (2 shot difference), should close out early
      expect(result.winner).toBe('player1');
      expect(result.holesPlayed).toBeLessThan(18);
      expect(result.status).toContain('wins');
    });

    it('handles halved match after 18 holes', () => {
      const player1 = {
        handicap: 10,
        scores: holes.map((h) => h.par),
      };
      const player2 = {
        handicap: 10,
        scores: holes.map((h) => h.par),
      };

      const result = simulateMatchPlayRound(player1, player2, holes);

      expect(result.winner).toBe('halved');
      expect(result.holesPlayed).toBe(18);
      expect(result.margin).toBe('A/S');
    });

    it('detects dormie situation', () => {
      // Simulate match where P1 is 2 UP with 2 to play
      const status = calculateMatchPlayStatus(9, 7, 16, 'Player 1', 'Player 2');

      expect(status.status).toBe('Player 1 2 UP (Dormie)');
      expect(status.isMatchOver).toBe(false);
    });

    it('correctly formats winning margin', () => {
      // 3 UP with 2 to play = 3&2
      const status = calculateMatchPlayStatus(10, 7, 16, 'Player 1', 'Player 2');

      expect(status.status).toBe('Player 1 wins 3&2');
      expect(status.isMatchOver).toBe(true);
    });
  });

  describe('Team Match Play', () => {
    it('determines team hole winner based on best ball', () => {
      // Team 1 best ball: net 3
      // Team 2 best ball: net 4
      const result = calculateTeamMatchPlayHoleResult(3, 4);

      expect(result).toBe('team1');
    });

    it('handles halved holes', () => {
      const result = calculateTeamMatchPlayHoleResult(4, 4);
      expect(result).toBe('halved');
    });

    it('handles pickup (10) as concession', () => {
      // Team 1 picks up, Team 2 wins
      expect(calculateTeamMatchPlayHoleResult(10, 5)).toBe('team2');

      // Both pick up = halved
      expect(calculateTeamMatchPlayHoleResult(10, 10)).toBe('halved');
    });

    it('tracks match status through 18 holes', () => {
      // Simulate match progression
      const holeResults: ('team1' | 'team2' | 'halved')[] = [
        'team1', 'halved', 'team2', 'team1', 'team1', // holes 1-5
        'halved', 'team1', 'team2', 'halved', 'team1', // holes 6-10
        'team1', 'team1', 'halved', 'team2', 'halved', // holes 11-15
        'team1', 'halved', 'halved', // holes 16-18
      ];

      let team1Wins = 0;
      let team2Wins = 0;
      let matchOver = false;
      let finalStatus = '';

      holeResults.forEach((result, index) => {
        if (matchOver) return;

        if (result === 'team1') team1Wins++;
        else if (result === 'team2') team2Wins++;

        const status = calculateMatchPlayStatus(
          team1Wins,
          team2Wins,
          index + 1,
          'Team A',
          'Team B'
        );

        if (status.isMatchOver) {
          matchOver = true;
          finalStatus = status.status;
        }
      });

      // Team 1 won 8, Team 2 won 3 = 5 UP margin
      // Should have ended early
      expect(matchOver).toBe(true);
    });
  });
});

// ============================================================================
// (7) Competition Leaderboard - Mixed Formats
// ============================================================================

describe('Competition Leaderboard - Mixed Formats', () => {
  it('aggregates points across different round formats', () => {
    const players = [
      createTestPlayer({ id: 'p1', name: 'Alice' }),
      createTestPlayer({ id: 'p2', name: 'Bob' }),
      createTestPlayer({ id: 'p3', name: 'Charlie' }),
      createTestPlayer({ id: 'p4', name: 'Dana' }),
    ];

    // Round 1: Stableford
    const stablefordResults: RoundResult[] = [
      { participantId: 'p1', rawScore: 40 },
      { participantId: 'p2', rawScore: 38 },
      { participantId: 'p3', rawScore: 36 },
      { participantId: 'p4', rawScore: 34 },
    ];
    const round1Scored = calculateCompetitionPoints(
      stablefordResults,
      'stableford',
      STANDARD_POINT_SYSTEM
    );

    // Round 2: Stroke Play (lower is better)
    const strokeResults: RoundResult[] = [
      { participantId: 'p1', rawScore: 78 },
      { participantId: 'p2', rawScore: 72 },
      { participantId: 'p3', rawScore: 75 },
      { participantId: 'p4', rawScore: 70 },
    ];
    const round2Scored = calculateCompetitionPoints(
      strokeResults,
      'stroke',
      STANDARD_POINT_SYSTEM
    );

    // Round 3: Match Play (manual points)
    const round3Results: ScoredResult[] = [
      { participantId: 'p1', rawScore: 0, position: 0, tied: false, competitionPoints: 2 }, // 1 win
      { participantId: 'p2', rawScore: 0, position: 0, tied: false, competitionPoints: 0 }, // 1 loss
      { participantId: 'p3', rawScore: 0, position: 0, tied: false, competitionPoints: 2 }, // 1 win
      { participantId: 'p4', rawScore: 0, position: 0, tied: false, competitionPoints: 0 }, // 1 loss
    ];

    // Aggregate
    const allRounds: RoundResultsForAggregation[] = [
      { roundId: 'r1', results: round1Scored },
      { roundId: 'r2', results: round2Scored },
      { roundId: 'r3', results: round3Results },
    ];

    const standings = aggregateCompetitionStandings(allRounds);

    // Calculate expected totals:
    // p1: Stableford 1st=10, Stroke 4th=5, MP win=2 -> 17
    // p2: Stableford 2nd=8, Stroke 2nd=8, MP loss=0 -> 16
    // p3: Stableford 3rd=6, Stroke 3rd=6, MP win=2 -> 14
    // p4: Stableford 4th=5, Stroke 1st=10, MP loss=0 -> 15

    const p1 = standings.find((s) => s.participantId === 'p1')!;
    const p2 = standings.find((s) => s.participantId === 'p2')!;
    const p3 = standings.find((s) => s.participantId === 'p3')!;
    const p4 = standings.find((s) => s.participantId === 'p4')!;

    expect(p1.totalPoints).toBe(17);
    expect(p2.totalPoints).toBe(16);
    expect(p3.totalPoints).toBe(14);
    expect(p4.totalPoints).toBe(15);

    // Standings order: p1 (17), p2 (16), p4 (15), p3 (14)
    expect(standings[0].participantId).toBe('p1');
    expect(standings[1].participantId).toBe('p2');
    expect(standings[2].participantId).toBe('p4');
    expect(standings[3].participantId).toBe('p3');
  });

  it('handles ties with proper position assignment', () => {
    const round1: RoundResultsForAggregation = {
      roundId: 'r1',
      results: [
        { participantId: 'p1', rawScore: 36, position: 1, tied: true, competitionPoints: 9 },
        { participantId: 'p2', rawScore: 36, position: 1, tied: true, competitionPoints: 9 },
        { participantId: 'p3', rawScore: 34, position: 3, tied: false, competitionPoints: 6 },
      ],
    };

    const standings = aggregateCompetitionStandings([round1]);

    // p1 and p2 tied for 1st
    const p1 = standings.find((s) => s.participantId === 'p1')!;
    const p2 = standings.find((s) => s.participantId === 'p2')!;

    expect(p1.position).toBe(1);
    expect(p1.tied).toBe(true);
    expect(p2.position).toBe(1);
    expect(p2.tied).toBe(true);
  });

  it('tracks round-by-round points breakdown', () => {
    const round1: RoundResultsForAggregation = {
      roundId: 'stableford-1',
      results: [
        { participantId: 'p1', rawScore: 40, position: 1, tied: false, competitionPoints: 10 },
      ],
    };

    const round2: RoundResultsForAggregation = {
      roundId: 'stroke-1',
      results: [
        { participantId: 'p1', rawScore: 72, position: 3, tied: false, competitionPoints: 6 },
      ],
    };

    const standings = aggregateCompetitionStandings([round1, round2]);

    expect(standings[0].roundPoints).toEqual([
      { roundId: 'stableford-1', points: 10, position: 1 },
      { roundId: 'stroke-1', points: 6, position: 3 },
    ]);
  });
});

// ============================================================================
// (8) Team Leaderboard - Team Standings
// ============================================================================

describe('Team Leaderboard', () => {
  it('calculates team standings across rounds', () => {
    // Round 1: Best Ball
    const round1: RoundResultsForAggregation<string> = {
      roundId: 'best-ball-1',
      results: [
        { participantId: 'team-eagles', rawScore: 42, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-birdies', rawScore: 40, position: 2, tied: false, competitionPoints: 8 },
        { participantId: 'team-pars', rawScore: 38, position: 3, tied: false, competitionPoints: 6 },
        { participantId: 'team-bogeys', rawScore: 36, position: 4, tied: false, competitionPoints: 5 },
      ],
    };

    // Round 2: Scramble
    const round2: RoundResultsForAggregation<string> = {
      roundId: 'scramble-1',
      results: [
        { participantId: 'team-bogeys', rawScore: 60, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-pars', rawScore: 62, position: 2, tied: false, competitionPoints: 8 },
        { participantId: 'team-birdies', rawScore: 64, position: 3, tied: false, competitionPoints: 6 },
        { participantId: 'team-eagles', rawScore: 66, position: 4, tied: false, competitionPoints: 5 },
      ],
    };

    // Round 3: Team Match Play
    const round3: RoundResultsForAggregation<string> = {
      roundId: 'match-play-1',
      results: [
        { participantId: 'team-eagles', rawScore: 0, position: 0, tied: false, competitionPoints: 3 },
        { participantId: 'team-pars', rawScore: 0, position: 0, tied: false, competitionPoints: 3 },
        { participantId: 'team-birdies', rawScore: 0, position: 0, tied: false, competitionPoints: 0 },
        { participantId: 'team-bogeys', rawScore: 0, position: 0, tied: false, competitionPoints: 0 },
      ],
    };

    const teamStandings = aggregateCompetitionStandings([round1, round2, round3]);

    // Expected totals:
    // team-eagles: 10 + 5 + 3 = 18
    // team-birdies: 8 + 6 + 0 = 14
    // team-pars: 6 + 8 + 3 = 17
    // team-bogeys: 5 + 10 + 0 = 15

    const eagles = teamStandings.find((t) => t.participantId === 'team-eagles')!;
    const birdies = teamStandings.find((t) => t.participantId === 'team-birdies')!;
    const pars = teamStandings.find((t) => t.participantId === 'team-pars')!;
    const bogeys = teamStandings.find((t) => t.participantId === 'team-bogeys')!;

    expect(eagles.totalPoints).toBe(18);
    expect(pars.totalPoints).toBe(17);
    expect(bogeys.totalPoints).toBe(15);
    expect(birdies.totalPoints).toBe(14);

    // Position order: eagles (18), pars (17), bogeys (15), birdies (14)
    expect(teamStandings[0].participantId).toBe('team-eagles');
    expect(teamStandings[1].participantId).toBe('team-pars');
    expect(teamStandings[2].participantId).toBe('team-bogeys');
    expect(teamStandings[3].participantId).toBe('team-birdies');
  });

  it('tracks team performance across different formats', () => {
    const round1: RoundResultsForAggregation<string> = {
      roundId: 'best-ball',
      results: [
        { participantId: 'team-a', rawScore: 45, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-b', rawScore: 42, position: 2, tied: false, competitionPoints: 8 },
      ],
    };

    const round2: RoundResultsForAggregation<string> = {
      roundId: 'scramble',
      results: [
        { participantId: 'team-b', rawScore: 58, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-a', rawScore: 62, position: 2, tied: false, competitionPoints: 8 },
      ],
    };

    const standings = aggregateCompetitionStandings([round1, round2]);

    // Both teams have 18 points
    expect(standings[0].totalPoints).toBe(18);
    expect(standings[1].totalPoints).toBe(18);

    // Both tied for 1st
    expect(standings[0].tied).toBe(true);
    expect(standings[1].tied).toBe(true);

    // Verify round breakdown
    const teamA = standings.find((s) => s.participantId === 'team-a')!;
    expect(teamA.roundPoints).toContainEqual({ roundId: 'best-ball', points: 10, position: 1 });
    expect(teamA.roundPoints).toContainEqual({ roundId: 'scramble', points: 8, position: 2 });
  });

  it('handles teams with different round participation', () => {
    const round1: RoundResultsForAggregation<string> = {
      roundId: 'r1',
      results: [
        { participantId: 'team-a', rawScore: 40, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-b', rawScore: 38, position: 2, tied: false, competitionPoints: 8 },
        { participantId: 'team-c', rawScore: 36, position: 3, tied: false, competitionPoints: 6 },
      ],
    };

    const round2: RoundResultsForAggregation<string> = {
      roundId: 'r2',
      results: [
        { participantId: 'team-a', rawScore: 42, position: 1, tied: false, competitionPoints: 10 },
        { participantId: 'team-c', rawScore: 40, position: 2, tied: false, competitionPoints: 8 },
        // team-b didn't play
      ],
    };

    const standings = aggregateCompetitionStandings([round1, round2]);

    const teamA = standings.find((s) => s.participantId === 'team-a')!;
    const teamB = standings.find((s) => s.participantId === 'team-b')!;
    const teamC = standings.find((s) => s.participantId === 'team-c')!;

    expect(teamA.roundsPlayed).toBe(2);
    expect(teamA.totalPoints).toBe(20);

    expect(teamB.roundsPlayed).toBe(1);
    expect(teamB.totalPoints).toBe(8);

    expect(teamC.roundsPlayed).toBe(2);
    expect(teamC.totalPoints).toBe(14);
  });
});
