/**
 * Typed Supabase Queries - Teams
 *
 * This file demonstrates the "typed query helper" pattern.
 * Instead of using `as any` everywhere, we:
 * 1. Define the exact shape we expect from the database
 * 2. Make ONE type assertion in the query helper
 * 3. All consumers get full type safety
 *
 * Benefits:
 * - Single source of truth for query shapes
 * - Type errors caught at compile time in consuming code
 * - Easy to update when schema changes
 * - Reusable across hooks, services, and components
 */

import { supabase } from '@/services/supabase/client';

// ============================================================================
// Database Row Types (what Supabase returns)
// ============================================================================

/**
 * Raw shape returned by Supabase for a team with nested members
 * This matches the exact structure from the `select()` query
 */
interface TeamRowWithMembers {
  id: string;
  competition_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  team_members: {
    team_id: string;
    player_id: string;
    joined_at: string;
    players: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      handicap: number | null;
      photo_url: string | null;
    } | null;
  }[] | null;
}

/**
 * Raw shape for a round with course info
 */
interface RoundRowWithCourse {
  id: string;
  game_type: string;
  is_team_round: boolean;
  team_format: string | null;
  scoring_pairs_required: boolean;
  courses: {
    id: string;
    name: string;
    holes?: {
      number: number;
      par: number;
      strokeIndex: number;
      yardages?: { white?: number };
    }[];
  } | null;
}

/**
 * Raw shape for competition players with player details
 */
interface CompetitionPlayerRow {
  player_id: string;
  players: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    handicap: number | null;
  } | null;
}

// ============================================================================
// Transformed Types (what your app uses)
// ============================================================================

/**
 * Clean team type for use in components
 * Snake_case converted to camelCase, dates are Date objects
 */
export interface TeamWithMembers {
  id: string;
  competitionId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  members: {
    teamId: string;
    playerId: string;
    joinedAt: Date;
    player?: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      handicap: number;
      photoUrl?: string;
    };
  }[];
}

export interface RoundWithCourse {
  id: string;
  gameType: string;
  isTeamRound: boolean;
  teamFormat: string | null;
  scoringPairsRequired: boolean;
  course: {
    id: string;
    name: string;
    holes?: {
      number: number;
      par: number;
      strokeIndex: number;
      yardages?: { white?: number };
    }[];
  } | null;
}

export interface CompetitionPlayer {
  playerId: string;
  player: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    handicap: number;
  };
}

// ============================================================================
// Transform Functions (DB -> App types)
// ============================================================================

/**
 * Transform a database team row to app format
 * Centralizes the snake_case -> camelCase conversion
 */
function transformTeam(row: TeamRowWithMembers): TeamWithMembers {
  return {
    id: row.id,
    competitionId: row.competition_id,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    members: (row.team_members ?? []).map((tm) => ({
      teamId: tm.team_id,
      playerId: tm.player_id,
      joinedAt: new Date(tm.joined_at),
      player: tm.players
        ? {
            id: tm.players.id,
            name: tm.players.name,
            email: tm.players.email ?? '',
            phone: tm.players.phone ?? undefined,
            handicap: tm.players.handicap ?? 0,
            photoUrl: tm.players.photo_url ?? undefined,
          }
        : undefined,
    })),
  };
}

function transformRound(row: RoundRowWithCourse): RoundWithCourse {
  return {
    id: row.id,
    gameType: row.game_type,
    isTeamRound: row.is_team_round,
    teamFormat: row.team_format,
    scoringPairsRequired: row.scoring_pairs_required,
    course: row.courses
      ? {
          id: row.courses.id,
          name: row.courses.name,
          holes: row.courses.holes,
        }
      : null,
  };
}

function transformCompetitionPlayer(row: CompetitionPlayerRow): CompetitionPlayer | null {
  if (!row.players) return null;
  return {
    playerId: row.player_id,
    player: {
      id: row.players.id,
      name: row.players.name ?? 'Unknown',
      email: row.players.email ?? '',
      phone: row.players.phone ?? undefined,
      handicap: row.players.handicap ?? 0,
    },
  };
}

// ============================================================================
// Query Functions (the actual helpers)
// ============================================================================

/**
 * Fetch teams with members for a competition
 *
 * Usage:
 * ```ts
 * const teams = await fetchTeamsWithMembers(competitionId);
 * // teams is fully typed as TeamWithMembers[]
 * teams[0].members[0].player?.name // ✅ TypeScript knows this exists
 * ```
 */
export async function fetchTeamsWithMembers(
  competitionId: string
): Promise<TeamWithMembers[]> {
  const { data, error } = await supabase
    .from('teams')
    .select(
      `
      id,
      competition_id,
      name,
      created_at,
      updated_at,
      team_members (
        team_id,
        player_id,
        joined_at,
        players!player_id (
          id,
          name,
          email,
          phone,
          handicap,
          photo_url
        )
      )
    `
    )
    .eq('competition_id', competitionId);

  if (error) {
    throw new Error(`Failed to fetch teams: ${error.message}`);
  }

  // Single type assertion here - all consumers get full type safety
  const rows = data as TeamRowWithMembers[];
  return rows.map(transformTeam);
}

/**
 * Fetch a single round with course info
 */
export async function fetchRoundWithCourse(roundId: string): Promise<RoundWithCourse | null> {
  const { data, error } = await supabase
    .from('rounds')
    .select(
      `
      id,
      game_type,
      is_team_round,
      team_format,
      scoring_pairs_required,
      courses!course_id (
        id,
        name,
        holes
      )
    `
    )
    .eq('id', roundId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch round: ${error.message}`);
  }

  // Single type assertion
  const row = data as RoundRowWithCourse;
  return transformRound(row);
}

/**
 * Fetch accepted competition players with their details
 */
export async function fetchCompetitionPlayers(
  competitionId: string
): Promise<CompetitionPlayer[]> {
  const { data, error } = await supabase
    .from('competition_players')
    .select(
      `
      player_id,
      players!player_id (
        id,
        name,
        email,
        phone,
        handicap
      )
    `
    )
    .eq('competition_id', competitionId)
    .eq('status', 'accepted');

  if (error) {
    throw new Error(`Failed to fetch players: ${error.message}`);
  }

  // Single type assertion, then filter out nulls
  const rows = data as CompetitionPlayerRow[];
  return rows.map(transformCompetitionPlayer).filter((p): p is CompetitionPlayer => p !== null);
}

// ============================================================================
// Example: How this simplifies useRoundData.ts
// ============================================================================

/**
 * BEFORE (in useRoundData.ts):
 * ```ts
 * const { data: teamsData } = await (supabase.from('teams') as any)
 *   .select(`...`)
 *   .eq('competition_id', competitionId);
 *
 * if (teamsData) {
 *   fetchedTeams = teamsData.map((team: any) => ({
 *     id: team.id,
 *     competition_id: team.competition_id,
 *     // ... 20 more lines of manual transformation
 *     members: (team.team_members || []).map((tm: any) => ({
 *       // ... more transformation
 *     })),
 *   }));
 * }
 * ```
 *
 * AFTER:
 * ```ts
 * import { fetchTeamsWithMembers } from '@/services/supabase/queries/teams';
 *
 * const teams = await fetchTeamsWithMembers(competitionId);
 * // That's it! teams is fully typed as TeamWithMembers[]
 * ```
 *
 * Benefits:
 * 1. No `as any` in component/hook code
 * 2. Transformation logic is centralized and reusable
 * 3. TypeScript catches errors when you try to access wrong properties
 * 4. When schema changes, update ONE place instead of 15
 */
