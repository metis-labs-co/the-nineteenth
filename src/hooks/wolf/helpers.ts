/**
 * Wolf Hooks - Helper Functions
 *
 * Shared helper functions and types for Wolf hooks.
 */

import { supabase } from '@/services/supabase/client';
import type { WolfServiceError, WolfServiceErrorCode } from '@/types/database/wolf.types';

// =====================================================
// RAW DB TYPES (until Supabase types are regenerated)
// =====================================================

export interface RawWolfGame {
  id: string;
  round_id: string;
  participant_ids: string[];
  wolf_order: string[];
  scoring_type: 'gross' | 'net';
  blind_wolf_enabled: boolean;
  pot_enabled: boolean;
  pot_value_per_point: number | null;
  currency: string;
  status: 'active' | 'completed' | 'cancelled';
  disclaimer_accepted_at: string | null;
  disclaimer_accepted_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface RawWolfHoleDecision {
  id: string;
  wolf_game_id: string;
  hole_number: number;
  wolf_id: string;
  is_blind_wolf: boolean;
  partner_id: string | null;
  hole_scores: Record<string, number> | null;
  is_tie: boolean;
  wolf_team_won: boolean | null;
  points_awarded: Record<string, number> | null;
  decided_at: string | null;
  calculated_at: string | null;
}

// =====================================================
// DB TABLE HELPERS
// Wolf tables aren't in generated Supabase types yet.
// These helpers reduce the `as 'players'` boilerplate.
// =====================================================

type SupabaseResult<T> = { data: T | null; error: { message: string } | null };

/** Query wolf_games table */
export function wolfGamesTable() {
  return supabase.from('wolf_games' as 'players');
}

/** Query wolf_hole_decisions table */
export function wolfDecisionsTable() {
  return supabase.from('wolf_hole_decisions' as 'players');
}

/** Query wolf_payouts table */
export function wolfPayoutsTable() {
  return supabase.from('wolf_payouts' as 'players');
}

/** Cast Supabase result to typed result */
export function castResult<T>(result: unknown): SupabaseResult<T> {
  return result as SupabaseResult<T>;
}

/** Cast Supabase array result */
export function castArrayResult<T>(result: unknown): SupabaseResult<T[]> {
  return result as SupabaseResult<T[]>;
}

/**
 * Creates a typed WolfServiceError
 */
export function createError(
  message: string,
  code: WolfServiceErrorCode
): WolfServiceError & Error {
  const error = new Error(message) as WolfServiceError & Error;
  error.code = code;
  return error;
}

/**
 * Type guard to check if an error is a WolfServiceError
 */
export function isWolfServiceError(error: unknown): error is WolfServiceError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as WolfServiceError).code === 'string' &&
    ['NOT_FOUND', 'VALIDATION', 'DATABASE', 'PERMISSION', 'TIE', 'UNKNOWN'].includes(
      (error as WolfServiceError).code
    )
  );
}

/**
 * Get a user-friendly error message from a WolfServiceError
 */
export function getWolfErrorMessage(error: unknown): string {
  if (isWolfServiceError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
