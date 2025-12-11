/**
 * Scorecard Database Types
 * Scorecards, scoring pairs, and leaderboard entries
 */

import type { ScorecardStatus } from './enums';
import type { HoleScore } from './base';
import type { Player } from './player.types';

/**
 * Player scorecard for a round
 * Stores hole-by-hole scores and totals
 * Critical for offline sync
 */
export interface Scorecard {
  id: string; // UUID
  round_id: string; // UUID, references rounds(id)
  player_id: string; // UUID, references players(id)

  // Score Data (JSONB object)
  scores: Record<string, HoleScore>; // e.g., { "1": { strokes: 4, putts: 2 }, "2": ... }

  // Calculated Totals
  total_gross: number; // Sum of all strokes
  total_net: number; // Gross - handicap adjustments
  total_points: number; // Stableford points

  // Status
  status: ScorecardStatus;

  // Submission Metadata
  submitted_at: string | null; // ISO timestamp
  submitted_by: string | null; // UUID, references players(id)

  // Offline Sync Support
  device_id: string | null; // For conflict resolution
  synced_at: string | null; // ISO timestamp

  // Metadata
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Leaderboard entry (returned by get_competition_leaderboard function)
 */
export interface LeaderboardEntry {
  rank: number;
  player_id: string; // UUID
  player_name: string;
  handicap: number; // NUMERIC(4,1)
  total_gross: number;
  total_net: number;
  total_points: number; // Stableford points
  rounds_played: number;
}

/**
 * Scoring pair relationship where one player (scorer/marker)
 * is responsible for recording another player's score.
 * This is standard golf practice where players swap scorecards.
 */
export interface ScoringPair {
  id: string; // UUID
  round_id: string; // UUID, references rounds(id)
  scorer_id: string; // UUID, references players(id) - the marker
  player_id: string; // UUID, references players(id) - player being scored
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Scoring pair with player details populated
 */
export interface ScoringPairWithPlayers extends ScoringPair {
  scorer?: Player;
  player?: Player;
}

/**
 * Input for creating a scoring pair (snake_case for database operations)
 */
export interface ScoringPairInput {
  scorer_id: string;
  player_id: string;
}

/**
 * Result of validating scoring pairs for a round
 */
export interface ScoringPairsValidation {
  is_valid: boolean;
  missing_players: string[]; // UUIDs of players without scorers
  message: string;
}
