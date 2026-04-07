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

export interface ScoreMismatch {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  self_score: number;
  partner_score: number;
  self_scorer_id: string;
  partner_scorer_id: string;
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
  partner_id: string;
  bypass_available_at: string | null;
  bypassed_at: string | null;
  bypassed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubmissionReadiness {
  canSubmit: boolean;
  reason?: 'waiting_for_partner' | 'unresolved_mismatches' | 'incomplete_scores';
  partnerName?: string;
  mismatchCount?: number;
  partnerProgress?: { completed: number; total: number };
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
