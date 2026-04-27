/**
 * Round Query Types
 *
 * Type definitions for Supabase query responses used in round data hooks.
 * Centralizes complex type definitions to keep hooks focused and maintainable.
 */

import type { Hole, TeeBox, TeamFormat, Player as DBPlayer } from '@/types/database.types';
import type { PlayerGender } from '@/types/database/player.types';
import type { BallCount } from '@/types/multiball.types';

// =====================================================
// SUPABASE QUERY RESPONSE TYPES
// =====================================================

/**
 * Player data returned from Supabase joins (subset of full Player type)
 */
export interface SupabasePlayerData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  handicap: number | null;
  handicap_index?: number | null; // Social Handicap Index (calculated from app rounds)
  gender?: PlayerGender | null; // For WHS Daily Handicap consistency factor
  photo_url?: string | null;
}

/**
 * Course data returned from Supabase joins
 */
export interface SupabaseCourseData {
  id: string;
  name: string;
  holes?: Hole[];
}

/**
 * Team config for standalone scramble rounds (stored in rounds.team_config JSONB)
 */
export interface StandaloneTeamConfig {
  teams: {
    id: string;
    name: string;
    memberIds: string[];
  }[];
}

/**
 * Round data returned from Supabase queries
 */
export interface SupabaseRoundData {
  id: string;
  competition_id: string | null;
  status: string | null;
  game_type: string | null;
  is_team_round: boolean | null;
  team_format: TeamFormat | null;
  scoring_pairs_required: boolean | null;
  ball_count: number | null;
  handicap_source: string | null;
  nine_type: string | null;
  selected_tee: TeeBox | null;
  team_config: StandaloneTeamConfig | null;
  courses: SupabaseCourseData | null;
}

/**
 * Team member data from Supabase joins
 */
export interface SupabaseTeamMemberData {
  team_id: string;
  player_id: string;
  joined_at: string;
  players: SupabasePlayerData | null;
}

/**
 * Team data returned from Supabase queries
 */
export interface SupabaseTeamData {
  id: string;
  competition_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
  team_members: SupabaseTeamMemberData[] | null;
}

/**
 * Competition player data from Supabase joins
 */
export interface SupabaseCompetitionPlayerData {
  player_id: string;
  players: SupabasePlayerData | null;
}

// =====================================================
// QUERY SELECT STRINGS
// =====================================================

/**
 * Select string for round metadata query
 */
export const ROUND_METADATA_SELECT = `
  id,
  competition_id,
  status,
  game_type,
  is_team_round,
  team_format,
  scoring_pairs_required,
  ball_count,
  handicap_source,
  nine_type,
  selected_tee,
  team_config,
  courses!course_id (
    id,
    name
  )
`;

/**
 * Select string for round with course holes
 */
export const ROUND_WITH_HOLES_SELECT = `
  id,
  game_type,
  is_team_round,
  team_format,
  scoring_pairs_required,
  ball_count,
  handicap_source,
  selected_tee,
  courses!course_id (
    id,
    name,
    holes
  )
`;

/**
 * Select string for team data with members
 */
export const TEAMS_WITH_MEMBERS_SELECT = `
  id,
  competition_id,
  name,
  color,
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
      handicap_index,
      gender,
      photo_url
    )
  )
`;

/**
 * Select string for competition players
 */
export const COMPETITION_PLAYERS_SELECT = `
  player_id,
  players!player_id (
    id,
    name,
    email,
    phone,
    handicap,
    handicap_index,
    gender
  )
`;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Helper to create a full DBPlayer from partial Supabase data
 */
export function createDBPlayer(data: SupabasePlayerData): DBPlayer {
  return {
    id: data.id,
    name: data.name,
    email: data.email || '',
    phone: data.phone,
    handicap: data.handicap,
    gender: data.gender ?? null, // For WHS Daily Handicap consistency factor
    photo_url: data.photo_url ?? null,
    // Default values for required fields not fetched
    golf_id: null,
    handicap_updated_at: null,
    handicap_index: data.handicap_index ?? null,
    handicap_index_updated_at: null,
    home_club_id: null,
    is_placeholder: false,
    created_by: null,
    linked_player_id: null,
    push_enabled: false,
    push_competition_updates: false,
    push_friend_requests: false,
    push_scorecard_updates: false,
    push_league_updates: false,
    equipped_badge_id: null,
    equipped_frame_id: null,
    equipped_title_id: null,
    created_at: '',
    updated_at: '',
  };
}

/**
 * Default holes (fallback if course has no hole data)
 */
export const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({
  number: (i + 1) as Hole['number'],
  par: ([4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][i] || 4) as Hole['par'],
  strokeIndex: [7, 15, 1, 11, 5, 17, 9, 3, 13, 8, 16, 2, 12, 6, 18, 10, 4, 14][i] || i + 1,
  yardages: { white: 350 + i * 15 },
}));

// =====================================================
// STATE TYPES
// =====================================================

/**
 * Round data state returned by useRoundData hook
 */
export interface RoundDataState {
  courseName: string | null;
  courseId: string | null;
  courseTees: TeeBox[];
  selectedTee: string | null;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  fetchError: string | null;
  isLoading: boolean;
  scoringPairsEnabled: boolean;
  ballCount: BallCount;
  isSoloRound: boolean;
}

/**
 * Parameters for useRoundData hook
 */
export interface UseRoundDataParams {
  roundId: string;
  competitionId: string;
  currentUserId?: string;
}
