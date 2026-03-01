/**
 * Test fixtures for Leagues feature
 *
 * Provides factory functions for creating league-related test data:
 * - Leagues (active, archived, with overrides)
 * - League players (with embedded player details)
 * - League rounds (with realistic handicap differentials)
 * - Leaderboard entries (ranked, with counting rounds)
 * - Eligible scorecards (for tag-round flow)
 */

import type {
  League,
  LeaguePlayer,
  LeagueRound,
  LeagueLeaderboardEntry,
} from '@/types/database';
import type { EligibleScorecard } from '@/services/api/leagues';

// ============================================================================
// Constants
// ============================================================================

/** Realistic handicap differentials for test data (lower = better) */
const SAMPLE_DIFFERENTIALS = [
  8.2, 12.5, 10.1, 14.8, 9.3, 11.7, 13.4, 7.9, 15.2, 10.6,
  12.0, 8.8, 14.1, 9.7, 11.3, 16.5, 7.4, 13.8, 10.9, 12.3,
];

/** Default player set for league fixtures */
const DEFAULT_PLAYERS = [
  { id: 'player-1', name: 'Sam Mitchell', photo_url: null },
  { id: 'player-2', name: 'Jake Williams', photo_url: null },
  { id: 'player-3', name: 'Lucy Chen', photo_url: null },
  { id: 'player-4', name: 'Tom O\'Brien', photo_url: null },
  { id: 'player-5', name: 'Emma Davis', photo_url: null },
  { id: 'player-6', name: 'Ryan Park', photo_url: null },
];

// ============================================================================
// League Fixtures
// ============================================================================

/**
 * Create a test league with sensible defaults
 */
export function createTestLeague(overrides: Partial<League> = {}): League {
  return {
    id: 'league-1',
    name: 'Weekend Warriors',
    description: 'Casual league for the Saturday crew',
    created_by: 'player-1',
    invite_code: 'LGE-AB12C',
    league_type: 'ongoing',
    status: 'active',
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-01-15T08:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create an archived league
 */
export function createArchivedLeague(overrides: Partial<League> = {}): League {
  return createTestLeague({
    id: 'league-archived',
    name: '2025 Summer Series',
    description: 'Completed summer league',
    status: 'archived',
    invite_code: 'LGE-ZZ99X',
    ...overrides,
  });
}

/**
 * Create multiple leagues for list testing
 */
export function createTestLeagues(count: number = 3): League[] {
  const templates = [
    { name: 'Weekend Warriors', description: 'Casual league for the Saturday crew' },
    { name: 'Melbourne Metro League', description: 'Cross-course competition around Melbourne' },
    { name: 'Office Golf League', description: 'Monthly rounds with the work crew' },
    { name: 'The Sandbelt Series', description: 'Premium courses only' },
    { name: 'Summer Twilight League', description: null },
  ];

  return Array.from({ length: count }, (_, i) => {
    const template = templates[i % templates.length];
    return createTestLeague({
      id: `league-${i + 1}`,
      name: template.name,
      description: template.description,
      invite_code: `LGE-${String.fromCharCode(65 + i)}${String.fromCharCode(66 + i)}${i + 1}${i + 2}${String.fromCharCode(67 + i)}`,
      created_at: new Date(2026, 0, 15 - i).toISOString(),
      updated_at: new Date(2026, 0, 15 - i).toISOString(),
    });
  });
}

// ============================================================================
// League Player Fixtures
// ============================================================================

/**
 * League player with embedded player details (matches API response shape)
 */
export interface LeaguePlayerWithDetails extends LeaguePlayer {
  player: { id: string; name: string; photo_url: string | null };
}

/**
 * Create a league player membership
 */
export function createTestLeaguePlayer(
  overrides: Partial<LeaguePlayer> & {
    player?: { id: string; name: string; photo_url: string | null };
  } = {}
): LeaguePlayerWithDetails {
  const playerId = overrides.player_id ?? 'player-1';
  const playerInfo = overrides.player ?? DEFAULT_PLAYERS.find((p) => p.id === playerId) ?? {
    id: playerId,
    name: `Player ${playerId}`,
    photo_url: null,
  };

  return {
    league_id: 'league-1',
    player_id: playerId,
    status: 'accepted',
    joined_at: '2026-01-15T08:00:00.000Z',
    created_at: '2026-01-15T08:00:00.000Z',
    ...overrides,
    player: playerInfo,
  };
}

/**
 * Create a full set of league players (default: 6 players)
 */
export function createTestLeaguePlayers(
  leagueId: string = 'league-1',
  count: number = 6
): LeaguePlayerWithDetails[] {
  return DEFAULT_PLAYERS.slice(0, count).map((player, i) =>
    createTestLeaguePlayer({
      league_id: leagueId,
      player_id: player.id,
      player,
      joined_at: new Date(2026, 0, 15 + i).toISOString(),
      created_at: new Date(2026, 0, 15 + i).toISOString(),
    })
  );
}

// ============================================================================
// League Round Fixtures
// ============================================================================

/**
 * Create a league round (tagged scorecard)
 */
export function createTestLeagueRound(overrides: Partial<LeagueRound> = {}): LeagueRound {
  return {
    id: 'lr-1',
    league_id: 'league-1',
    scorecard_id: 'scorecard-1',
    player_id: 'player-1',
    handicap_differential: 12.5,
    tagged_at: '2026-02-10T10:00:00.000Z',
    created_at: '2026-02-10T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create multiple league rounds for a player with realistic differentials
 */
export function createTestLeagueRounds(
  playerId: string = 'player-1',
  leagueId: string = 'league-1',
  count: number = 5
): LeagueRound[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(2026, 1, 1 + i * 7); // Weekly rounds
    return createTestLeagueRound({
      id: `lr-${playerId}-${i + 1}`,
      league_id: leagueId,
      scorecard_id: `scorecard-${playerId}-${i + 1}`,
      player_id: playerId,
      handicap_differential: SAMPLE_DIFFERENTIALS[i % SAMPLE_DIFFERENTIALS.length],
      tagged_at: date.toISOString(),
      created_at: date.toISOString(),
    });
  });
}

// ============================================================================
// Leaderboard Fixtures
// ============================================================================

/**
 * Create a single leaderboard entry
 */
export function createTestLeaderboardEntry(
  overrides: Partial<LeagueLeaderboardEntry> = {}
): LeagueLeaderboardEntry {
  return {
    player_id: 'player-1',
    name: 'Sam Mitchell',
    photo_url: null,
    rounds_played: 8,
    rounds_counting: 3, // Best 3 of 8 (WHS table)
    avg_differential: 9.1,
    best_differential: 7.4,
    rank: 1,
    ...overrides,
  };
}

/**
 * Create a full leaderboard with realistic data
 *
 * Generates a ranked leaderboard where each player has varying rounds
 * and differentials, sorted by avg_differential (lower = better).
 */
export function createTestLeaderboard(playerCount: number = 6): LeagueLeaderboardEntry[] {
  const entries: LeagueLeaderboardEntry[] = [
    {
      player_id: 'player-1',
      name: 'Sam Mitchell',
      photo_url: null,
      rounds_played: 12,
      rounds_counting: 4,
      avg_differential: 8.6,
      best_differential: 7.4,
      rank: 1,
    },
    {
      player_id: 'player-3',
      name: 'Lucy Chen',
      photo_url: null,
      rounds_played: 10,
      rounds_counting: 3,
      avg_differential: 10.2,
      best_differential: 8.2,
      rank: 2,
    },
    {
      player_id: 'player-6',
      name: 'Ryan Park',
      photo_url: null,
      rounds_played: 8,
      rounds_counting: 3,
      avg_differential: 11.5,
      best_differential: 9.3,
      rank: 3,
    },
    {
      player_id: 'player-2',
      name: 'Jake Williams',
      photo_url: null,
      rounds_played: 15,
      rounds_counting: 5,
      avg_differential: 12.8,
      best_differential: 10.1,
      rank: 4,
    },
    {
      player_id: 'player-4',
      name: 'Tom O\'Brien',
      photo_url: null,
      rounds_played: 6,
      rounds_counting: 2,
      avg_differential: 14.3,
      best_differential: 12.5,
      rank: 5,
    },
    {
      player_id: 'player-5',
      name: 'Emma Davis',
      photo_url: null,
      rounds_played: 3,
      rounds_counting: 1,
      avg_differential: 16.1,
      best_differential: 16.1,
      rank: 6,
    },
  ];

  return entries.slice(0, playerCount);
}

// ============================================================================
// Eligible Scorecard Fixtures
// ============================================================================

/**
 * Create an eligible scorecard for the tag-round flow
 */
export function createTestEligibleScorecard(
  overrides: Partial<EligibleScorecard> = {}
): EligibleScorecard {
  return {
    id: 'scorecard-eligible-1',
    round_id: 'round-1',
    player_id: 'player-1',
    handicap_differential: 11.3,
    status: 'submitted',
    created_at: '2026-02-20T14:00:00.000Z',
    course_name: 'Sandringham Golf Links',
    club_name: 'Sandringham Golf Club',
    total_gross: 85,
    ...overrides,
  };
}

/**
 * Create multiple eligible scorecards for the tag-round list
 */
export function createTestEligibleScorecards(count: number = 4): EligibleScorecard[] {
  const courses = [
    { course_name: 'Sandringham Golf Links', club_name: 'Sandringham Golf Club', total_gross: 85 },
    { course_name: 'Kingston Heath', club_name: 'Kingston Heath Golf Club', total_gross: 92 },
    { course_name: 'Woodlands Course', club_name: 'The Woodlands Golf Club', total_gross: 88 },
    { course_name: 'Yarra Yarra', club_name: 'Yarra Yarra Golf Club', total_gross: 79 },
    { course_name: 'Peninsula North', club_name: 'Peninsula Kingswood CC', total_gross: 91 },
  ];

  return Array.from({ length: count }, (_, i) => {
    const course = courses[i % courses.length];
    const date = new Date(2026, 1, 20 - i * 7);
    return createTestEligibleScorecard({
      id: `scorecard-eligible-${i + 1}`,
      round_id: `round-${i + 1}`,
      handicap_differential: SAMPLE_DIFFERENTIALS[i],
      created_at: date.toISOString(),
      ...course,
    });
  });
}

// ============================================================================
// Preset Scenarios
// ============================================================================

/**
 * Empty league — just created, only the creator is a member, no rounds
 */
export const emptyLeagueScenario = {
  league: createTestLeague({ name: 'New League', description: null }),
  players: [createTestLeaguePlayer({ player_id: 'player-1' })],
  leaderboard: [] as LeagueLeaderboardEntry[],
  myRounds: [] as LeagueRound[],
};

/**
 * Active league with full data — multiple players, rounds, leaderboard
 */
export const activeLeagueScenario = {
  league: createTestLeague(),
  players: createTestLeaguePlayers('league-1', 6),
  leaderboard: createTestLeaderboard(6),
  myRounds: createTestLeagueRounds('player-1', 'league-1', 5),
  eligibleScorecards: createTestEligibleScorecards(3),
};

/**
 * Archived league — read-only, no tagging allowed
 */
export const archivedLeagueScenario = {
  league: createArchivedLeague(),
  players: createTestLeaguePlayers('league-archived', 4),
  leaderboard: createTestLeaderboard(4),
  myRounds: createTestLeagueRounds('player-1', 'league-archived', 8),
  eligibleScorecards: [] as EligibleScorecard[],
};
