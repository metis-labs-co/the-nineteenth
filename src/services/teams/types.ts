/**
 * Team Service Types
 *
 * Type definitions for team service operations.
 */

import type { Player } from '@/types/database.types';

// =====================================================
// SUPABASE QUERY RESPONSE TYPES
// =====================================================

/**
 * Raw team member from Supabase join query
 */
export interface TeamMemberQueryRow {
  team_id: string;
  player_id: string;
  joined_at: string;
  player: Player | null;
}

/**
 * Raw team from Supabase query with nested team_members
 */
export interface TeamQueryRow {
  id: string;
  competition_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  team_members: TeamMemberQueryRow[];
}

/**
 * Raw competition player from Supabase query
 */
export interface CompetitionPlayerQueryRow {
  player_id: string;
  player: Player | null;
}

// =====================================================
// INPUT/ERROR TYPES
// =====================================================

export interface CreateTeamInput {
  competitionId: string;
  name: string;
  memberIds: string[];
}

export interface TeamServiceError extends Error {
  code: 'NOT_FOUND' | 'DUPLICATE' | 'VALIDATION' | 'DATABASE' | 'UNKNOWN';
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Creates a typed TeamServiceError
 */
export function createError(
  message: string,
  code: TeamServiceError['code']
): TeamServiceError {
  const error = new Error(message) as TeamServiceError;
  error.code = code;
  return error;
}

/**
 * Convert database Player to app Player format
 */
export function toAppPlayer(dbPlayer: Player): import('@/types').Player {
  return {
    id: dbPlayer.id,
    name: dbPlayer.name,
    email: dbPlayer.email,
    phone: dbPlayer.phone ?? undefined,
    handicap: dbPlayer.handicap,
    photoUrl: dbPlayer.photo_url ?? undefined,
    createdAt: new Date(dbPlayer.created_at),
    updatedAt: new Date(dbPlayer.updated_at),
  };
}
