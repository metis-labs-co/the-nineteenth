/**
 * Score Mismatch Service Types
 *
 * Shared types and error handling for the score mismatch service modules.
 */

import { supabase } from '@/services/supabase/client';

// These tables exist in the DB but haven't been added to generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fromTable = (table: string): any => (supabase as any).from(table);

// ============================================================================
// TYPES
// ============================================================================

export interface ScoreEntry {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  scorer_id: string;
  strokes: number;
  putts?: number | null;
  penalties?: number | null;
  created_at: string;
  updated_at: string;
}

/** A single conflicting entry in an N-way score mismatch */
export interface MismatchEntry {
  scorer_id: string;
  strokes: number;
}

export interface ScoreMismatch {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  /** Legacy 2-way columns (scoring pairs flow). Nullable when entries[] is populated. */
  self_score: number | null;
  partner_score: number | null;
  self_scorer_id: string | null;
  partner_scorer_id: string | null;
  /** Full N-way conflict list. Populated for multi-scorer mismatches. */
  entries: MismatchEntry[] | null;
  status: 'pending' | 'resolved';
  resolved_score?: number | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  // Joined data (optional, populated when fetching with player details)
  player?: { id: string; name: string } | null;
}

export interface ScoreSubmissionStatus {
  id: string;
  round_id: string;
  player_id: string;
  partner_id: string | null;
  bypass_available_at: string | null;
  bypassed_at: string | null;
  bypassed: boolean;
  created_at: string;
  updated_at: string;
}

/** A scorer who hasn't finished entering all their scores yet (multi-scorer rounds) */
export interface IncompleteScorer {
  scorerId: string;
  scorerName: string;
  progress: { completed: number; total: number };
}

export interface SubmissionReadiness {
  canSubmit: boolean;
  reason?:
    | 'waiting_for_partner'
    | 'waiting_for_other_scorers'
    | 'unresolved_mismatches'
    | 'incomplete_scores';
  partnerName?: string;
  mismatchCount?: number;
  partnerProgress?: { completed: number; total: number };
  /** Multi-scorer: scorers still owing entries before submission can proceed */
  incompleteScorers?: IncompleteScorer[];
}

export interface PartnerProgress {
  complete: boolean;
  partnerName: string;
  progress: { completed: number; total: number };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface ScoreMismatchServiceError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'UNKNOWN';
}

export function createError(
  message: string,
  code: ScoreMismatchServiceError['code']
): ScoreMismatchServiceError {
  const error = new Error(message) as ScoreMismatchServiceError;
  error.code = code;
  return error;
}
