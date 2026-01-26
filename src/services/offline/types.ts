/**
 * Offline Database Types
 *
 * Shared types for SQLite database operations.
 */

import type * as SQLite from 'expo-sqlite';

/**
 * Raw scorecard row from SQLite
 */
export interface ScorecardRow {
  id: string;
  round_id: string;
  player_id: string;
  player_name: string;
  player_handicap: number;
  total_gross: number;
  total_net: number;
  total_points: number;
  status: string;
  submitted_at: string | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
  is_synced: number;
  is_standalone: number;
}

/**
 * Raw hole score row from SQLite
 */
export interface HoleScoreRow {
  id: number;
  scorecard_id: string;
  hole_number: number;
  strokes: number;
  putts: number | null;
  fairway_hit: number;
  green_in_regulation: number;
  penalties: number;
  ball_scores: string | null;
  scored_by: string | null;
  shot_contributions: string | null;
  updated_at: string;
}

/**
 * Raw hole row from SQLite
 */
export interface HoleRow {
  id: number;
  round_id: string;
  hole_number: number;
  par: number;
  stroke_index: number;
  yardage: number | null;
}

/**
 * Raw pending sync row from SQLite
 */
export interface PendingSyncRow {
  id: number;
  type: string;
  action: string;
  data: string;
  timestamp: string;
  retry_count: number;
}

/**
 * Database instance type
 */
export type DatabaseInstance = SQLite.SQLiteDatabase;

/**
 * Database getter function type
 */
export type GetDbFn = () => Promise<DatabaseInstance>;
