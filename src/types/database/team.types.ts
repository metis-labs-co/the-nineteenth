/**
 * Team Database Types
 * Teams, team members, and team results
 */

import type { Player } from './player.types';

/**
 * Team for competition-wide or per-round team play
 */
export interface Team {
  id: string; // UUID
  competition_id: string; // UUID, references competitions(id)
  name: string; // Team name, unique within competition

  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Team member join table entry
 */
export interface TeamMember {
  team_id: string; // UUID, references teams(id)
  player_id: string; // UUID, references players(id)
  joined_at: string; // ISO timestamp

  // Populated fields (from joins)
  player?: Player;
}

/**
 * Team with members populated
 */
export interface TeamWithMembers extends Team {
  members: TeamMember[];
}

/**
 * Team standings entry (returned by get_competition_team_standings function)
 */
export interface TeamStandingsEntry {
  rank: number;
  team_id: string; // UUID
  team_name: string;
  total_points: number; // Competition points
  rounds_played: number;
  avg_handicap: number;
}

/**
 * Round result for any game type
 * Supports both individual and team results
 */
export interface RoundResult {
  id: string; // UUID
  round_id: string; // UUID, references rounds(id)

  // Participant (either player_id OR team_id, not both)
  player_id: string | null; // UUID, references players(id)
  team_id: string | null; // UUID, references teams(id)

  // Raw score data
  raw_score: number | null; // Primary score (Stableford points, gross strokes, etc.)
  raw_result_data: RoundResultData; // Format-specific data

  // Position and points
  position: number | null; // 1, 2, 3... (NULL for match play without standings)
  competition_points: number; // Points earned toward competition standings

  // Result type
  is_team_result: boolean;

  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp

  // Populated fields (from joins)
  player?: Player;
  team?: TeamWithMembers;
}

/**
 * Format-specific result data (stored in RoundResult.raw_result_data JSONB)
 */
export interface RoundResultData {
  // For Stableford
  stableford_points?: number;

  // For Stroke Play
  gross_score?: number;
  net_score?: number;

  // For Par Game
  par_score?: number;

  // For Match Play
  opponent_id?: string; // player_id or team_id of opponent
  match_result?: 'win' | 'loss' | 'halved';
  holes_won?: number;
  holes_lost?: number;
  holes_halved?: number;
  final_margin?: string; // e.g., "3&2", "1 up", "A/S" (all square)
  hole_by_hole?: MatchPlayHoleResult[];

  // For Team formats
  team_score?: number;
  contributing_player_id?: string; // For best-ball, who contributed on each hole
}

/**
 * Individual hole result for match play
 */
export interface MatchPlayHoleResult {
  hole_number: number;
  player_score: number;
  opponent_score: number;
  result: 'won' | 'lost' | 'halved';
  cumulative_status: string; // e.g., "1 UP", "2 DN", "AS"
}
