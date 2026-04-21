/**
 * Test fixtures and utilities for Teams and Game Types tests
 */

import type {
  Player,
  Competition,
  Round,
  Course,
  Hole,
  Scorecard,
  Team,
  TeamWithMembers,
  RoundResult,
  PointSystemConfig,
  HoleScore,
} from '@/types/database.types';

// ============================================================================
// Player Fixtures
// ============================================================================

/**
 * Create a test player with specified properties
 */
export function createTestPlayer(overrides: Partial<Player> = {}): Player {
  const id = overrides.id || `player-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    name: `Player ${id.substring(7)}`,
    email: `${id}@test.com`,
    phone: null,
    handicap: 18,
    golf_id: null,
    handicap_updated_at: null,
    gender: null,
    handicap_index: null,
    handicap_index_updated_at: null,
    photo_url: null,
    home_club_id: null,
    push_enabled: true,
    push_competition_updates: true,
    push_friend_requests: true,
    push_scorecard_updates: true,
    push_league_updates: true,
    is_placeholder: false,
    created_by: null,
    linked_player_id: null,
    equipped_badge_id: null,
    equipped_frame_id: null,
    equipped_title_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple test players with varying handicaps
 */
export function createTestPlayers(count: number, baseHandicap = 10): Player[] {
  return Array.from({ length: count }, (_, i) =>
    createTestPlayer({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      handicap: baseHandicap + i * 5, // 10, 15, 20, 25, etc.
    })
  );
}

/**
 * Create players with specific handicaps for balanced team testing
 */
export function createPlayersWithHandicaps(handicaps: number[]): Player[] {
  return handicaps.map((handicap, i) =>
    createTestPlayer({
      id: `player-${i + 1}`,
      name: `Player ${i + 1}`,
      handicap,
    })
  );
}

// ============================================================================
// Course & Hole Fixtures
// ============================================================================

/**
 * Create a standard 18-hole course
 */
export function createTestCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'course-1',
    club_id: 'club-1',
    golfapi_course_id: null,
    golfapi_long_course_id: null,
    name: 'Test Golf Course',
    description: 'A test course for unit testing',
    num_holes: 18,
    measure_unit: null,
    holes: create18Holes(),
    holes_women: null,
    match_play_indexes: null,
    tees: [
      { name: 'Championship', color: 'blue', totalYardage: 6800, courseRating: 72.5, slopeRating: 130 },
      { name: 'Men', color: 'white', totalYardage: 6400, courseRating: 70.0, slopeRating: 125 },
      { name: 'Women', color: 'red', totalYardage: 5600, courseRating: 68.5, slopeRating: 115 },
    ],
    tees_migrated: null,
    slope_rating: 125,
    course_rating: 70.0,
    api_locked: false,
    golfapi_updated_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create standard 18 holes with realistic pars and stroke indexes
 */
export function create18Holes(): Hole[] {
  const pars: (3 | 4 | 5)[] = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
  const strokeIndexes = [7, 15, 1, 11, 5, 17, 3, 9, 13, 8, 16, 2, 12, 6, 18, 4, 10, 14];

  return pars.map((par, i) => ({
    number: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18,
    par,
    strokeIndex: strokeIndexes[i],
    yardages: { blue: 400 + i * 10, white: 380 + i * 10, red: 350 + i * 10 },
  }));
}

/**
 * Get the total par for the course (sum of all hole pars)
 */
export function getCoursePar(holes: Hole[]): number {
  return holes.reduce((sum, hole) => sum + hole.par, 0);
}

// ============================================================================
// Competition Fixtures
// ============================================================================

/**
 * Create a test competition
 */
export function createTestCompetition(overrides: Partial<Competition> = {}): Competition {
  return {
    id: 'comp-1',
    name: 'Test Competition',
    description: 'A test competition',
    competition_type: 'event',
    start_date: '2025-01-15',
    end_date: '2025-01-16',
    handicap_system: 'honor',
    handicap_source: 'profile',
    visibility: 'private',
    invite_code: 'TEST-1234',
    organizer_id: 'organizer-1',
    status: 'upcoming',
    team_mode: 'none',
    team_size: null,
    point_system: {
      type: 'position',
      rules: { '1': 10, '2': 8, '3': 6, '4': 5, '5': 4, '6': 3, '7': 2, '8': 1, default: 0 },
      matchPlay: { win: 3, draw: 1, loss: 0 },
    },
    knockout_config: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

/**
 * Create a competition with fixed teams
 */
export function createFixedTeamCompetition(teamSize: 2 | 3 | 4 = 2): Competition {
  return createTestCompetition({
    id: 'comp-fixed-teams',
    name: 'Fixed Team Competition',
    team_mode: 'fixed',
    team_size: teamSize,
  });
}

/**
 * Create a competition with per-round teams
 */
export function createPerRoundTeamCompetition(teamSize: 2 | 3 | 4 = 2): Competition {
  return createTestCompetition({
    id: 'comp-per-round-teams',
    name: 'Per-Round Team Competition',
    team_mode: 'per-round',
    team_size: teamSize,
  });
}

// ============================================================================
// Round Fixtures
// ============================================================================

/**
 * Create a test round
 */
export function createTestRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'round-1',
    competition_id: 'comp-1',
    user_id: null,
    round_number: 1,
    course_id: 'course-1',
    date: '2025-01-15',
    tee_time: '08:00:00',
    game_type: 'stableford',
    nine_type: 'full',
    selected_tee: null,
    is_team_round: false,
    team_format: null,
    round_format: 'combined',
    sub_match_size: null,
    scoring_pairs_required: false,
    ball_count: 1,
    handicap_source: null,
    status: 'upcoming',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a Best Ball team round
 */
export function createBestBallRound(overrides: Partial<Round> = {}): Round {
  return createTestRound({
    id: 'round-best-ball',
    game_type: 'best-ball',
    is_team_round: true,
    team_format: 'best-ball',
    ...overrides,
  });
}

/**
 * Create a Scramble team round
 */
export function createScrambleRound(overrides: Partial<Round> = {}): Round {
  return createTestRound({
    id: 'round-scramble',
    game_type: 'scramble',
    is_team_round: true,
    team_format: 'scramble',
    ...overrides,
  });
}

/**
 * Create a Match Play round
 */
export function createMatchPlayRound(overrides: Partial<Round> = {}): Round {
  return createTestRound({
    id: 'round-match-play',
    game_type: 'match-play',
    is_team_round: false,
    team_format: null,
    ...overrides,
  });
}

/**
 * Create a Team Match Play round
 */
export function createTeamMatchPlayRound(overrides: Partial<Round> = {}): Round {
  return createTestRound({
    id: 'round-team-match-play',
    game_type: 'match-play',
    is_team_round: true,
    team_format: 'match-play-team',
    ...overrides,
  });
}

// ============================================================================
// Team Fixtures
// ============================================================================

/**
 * Create a test team
 */
export function createTestTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    competition_id: 'comp-1',
    name: 'Team Alpha',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a team with members
 */
export function createTeamWithMembers(
  team: Partial<Team> = {},
  members: Player[] = []
): TeamWithMembers {
  const teamId = team.id || 'team-1';
  return {
    ...createTestTeam({ ...team, id: teamId }),
    members: members.map((player) => ({
      team_id: teamId,
      player_id: player.id,
      joined_at: new Date().toISOString(),
      player,
    })),
  };
}

/**
 * Create multiple teams with members for testing
 */
export function createMultipleTeams(teamCount: number, playersPerTeam: number): TeamWithMembers[] {
  const teams: TeamWithMembers[] = [];

  for (let t = 0; t < teamCount; t++) {
    const teamId = `team-${t + 1}`;
    const members: Player[] = [];

    for (let p = 0; p < playersPerTeam; p++) {
      members.push(
        createTestPlayer({
          id: `player-${t * playersPerTeam + p + 1}`,
          name: `Player ${t * playersPerTeam + p + 1}`,
          handicap: 10 + (t * playersPerTeam + p) * 3,
        })
      );
    }

    teams.push(
      createTeamWithMembers(
        { id: teamId, name: `Team ${String.fromCharCode(65 + t)}` }, // Team A, B, C, etc.
        members
      )
    );
  }

  return teams;
}

// ============================================================================
// Scorecard Fixtures
// ============================================================================

/**
 * Create a test scorecard
 */
export function createTestScorecard(overrides: Partial<Scorecard> = {}): Scorecard {
  return {
    id: 'scorecard-1',
    round_id: 'round-1',
    player_id: 'player-1',
    scores: {},
    total_gross: 0,
    total_net: 0,
    total_points: 0,
    ball_totals: null,
    status: 'not-started',
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
    ...overrides,
  };
}

/**
 * Create a completed scorecard with realistic scores
 */
export function createCompletedScorecard(
  playerId: string,
  roundId: string,
  holes: Hole[],
  scoreOffset = 0 // Add to par for each hole (positive = over par, negative = under)
): Scorecard {
  const scores: Record<string, HoleScore> = {};
  let totalGross = 0;

  holes.forEach((hole) => {
    const strokes = hole.par + scoreOffset;
    scores[hole.number.toString()] = {
      strokes,
      putts: 2,
      fairwayHit: Math.random() > 0.5,
      greenInRegulation: Math.random() > 0.6,
    };
    totalGross += strokes;
  });

  return createTestScorecard({
    id: `scorecard-${playerId}-${roundId}`,
    round_id: roundId,
    player_id: playerId,
    scores,
    total_gross: totalGross,
    status: 'completed',
  });
}

/**
 * Create scorecards for a team with varying scores
 */
export function createTeamScorecards(
  team: TeamWithMembers,
  roundId: string,
  holes: Hole[],
  scoreOffsets: number[] // One offset per team member
): Scorecard[] {
  return team.members.map((member, index) =>
    createCompletedScorecard(
      member.player_id,
      roundId,
      holes,
      scoreOffsets[index] ?? 0
    )
  );
}

// ============================================================================
// Round Result Fixtures
// ============================================================================

/**
 * Create a round result
 */
export function createRoundResult(overrides: Partial<RoundResult> = {}): RoundResult {
  return {
    id: 'result-1',
    round_id: 'round-1',
    player_id: 'player-1',
    team_id: null,
    raw_score: 36,
    raw_result_data: { stableford_points: 36 },
    position: 1,
    competition_points: 10,
    is_team_result: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a match play round result
 */
export function createMatchPlayResult(
  playerId: string,
  opponentId: string,
  result: 'win' | 'loss' | 'halved',
  margin?: string
): RoundResult {
  const points = result === 'win' ? 3 : result === 'halved' ? 1 : 0;

  return createRoundResult({
    id: `result-${playerId}`,
    player_id: playerId,
    raw_score: null,
    raw_result_data: {
      opponent_id: opponentId,
      match_result: result,
      final_margin: margin || (result === 'halved' ? 'A/S' : '2&1'),
    },
    position: null,
    competition_points: points,
  });
}

// ============================================================================
// Point System Fixtures
// ============================================================================

export const STANDARD_POINT_SYSTEM: PointSystemConfig = {
  type: 'position',
  rules: { '1': 10, '2': 8, '3': 6, '4': 5, '5': 4, '6': 3, '7': 2, '8': 1, default: 0 },
  matchPlay: { win: 3, draw: 1, loss: 0 },
};

export const LEAGUE_POINT_SYSTEM: PointSystemConfig = {
  type: 'position',
  rules: {
    '1': 25, '2': 20, '3': 18, '4': 16, '5': 14, '6': 12, '7': 10, '8': 9,
    '9': 8, '10': 7, '11': 6, '12': 5, '13': 4, '14': 3, '15': 2, '16': 1,
    default: 1,
  },
  matchPlay: { win: 3, draw: 1, loss: 0 },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate expected Stableford points for a hole
 */
export function calculateExpectedStablefordPoints(
  strokes: number,
  par: number,
  handicap: number,
  strokeIndex: number
): number {
  const strokesReceived = Math.floor(handicap / 18) + (strokeIndex <= (handicap % 18) ? 1 : 0);
  const netStrokes = strokes - strokesReceived;
  const relativeToPar = netStrokes - par;

  if (relativeToPar <= -3) return 5;
  if (relativeToPar === -2) return 4;
  if (relativeToPar === -1) return 3;
  if (relativeToPar === 0) return 2;
  if (relativeToPar === 1) return 1;
  return 0;
}

/**
 * Calculate total Stableford points for a scorecard
 */
export function calculateTotalStablefordPoints(
  scorecard: Scorecard,
  holes: Hole[],
  handicap: number
): number {
  return holes.reduce((total, hole) => {
    const holeScore = scorecard.scores[hole.number.toString()];
    // Check if it's a single-ball HoleScore (has strokes property)
    if (!holeScore || !('strokes' in holeScore) || !holeScore.strokes) return total;
    return total + calculateExpectedStablefordPoints(
      holeScore.strokes,
      hole.par,
      handicap,
      hole.strokeIndex
    );
  }, 0);
}
