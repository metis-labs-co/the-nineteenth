/**
 * Wolf Hooks - Helper Functions
 *
 * Shared helper functions and types for Wolf hooks.
 */

import { supabase } from '@/services/supabase/client';

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
 * Get a user-friendly error message from an unknown error
 */
export function getWolfErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
