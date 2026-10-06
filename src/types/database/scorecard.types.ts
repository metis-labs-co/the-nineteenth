/**
 * Scorecard Database Types
 * Scorecards, scoring pairs, and leaderboard entries
 */

import type { ScorecardStatus } from './enums';
import type { HoleScore, MultiBallHoleScore, BallTotals } from './base';
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
  // Single-ball: { "1": { strokes: 4, putts: 2 }, "2": ... }
  // Multi-ball: { "1": { balls: [{ strokes: 4 }, { strokes: 5 }] }, "2": ... }
  scores: Record<string, HoleScore | MultiBallHoleScore>;

  // Calculated Totals (for single-ball or Ball 1 in multi-ball)
  total_gross: number; // Sum of all strokes
  total_net: number; // Gross - handicap adjustments
  total_points: number; // Stableford points
  total_par_score?: number; // Par game score (+1/0/-1 per hole)

  // Per-ball totals for multi-ball rounds (null for single-ball)
  // Format: { "1": { gross, net, points }, "2": {...}, ... }
  ball_totals: Record<string, BallTotals> | null;

  // Status
  status: ScorecardStatus;

  // Submission Metadata
  submitted_at: string | null; // ISO timestamp
  submitted_by: string | null; // UUID, references players(id)

  // Offline Sync Support
  device_id: string | null; // For conflict resolution
  synced_at: string | null; // ISO timestamp
  revision?: number; // Optimistic-concurrency version (present after migration)

  // Handicap Tracking (captured at submission time)
  // These fields store the handicap data when the scorecard is synced for historical accuracy.
  // Player's WHS handicap index may change later, but these snapshots preserve the round context.
  ga_handicap_used: number | null; // Player's WHS handicap index at time of round (input value)
  daily_handicap_used: number | null; // Strokes received for this round (calculated from WHS handicap index + course/slope)
  handicap_differential: number | null; // WHS score differential (for Social Handicap Index calculation)
  course_rating_used: number | null; // Snapshot of course rating at time of round
  slope_rating_used: number | null; // Snapshot of slope rating at time of round

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
  handicap: number | null; // NUMERIC(4,1)
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

/**
 * Shot contributions for scramble format
 * Tracks which team member contributed each shot on a hole
 * Optional - used for detailed shot attribution in scramble rounds
 */
export interface ShotContributions {
  /** Player ID who hit the tee shot used */
  teeShot?: string;
  /** Player ID who hit the second shot used (par 5 only) */
  secondShot?: string;
  /** Player ID who hit the approach shot used (or chip on par 3) */
  approach?: string;
  /** Player ID who made the putt */
  putt?: string;
}
