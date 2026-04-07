/**
 * Pairing Service Types
 *
 * Type definitions for the pairing service.
 */

/**
 * Raw pairing from Supabase query
 */
export interface PairingQueryRow {
  id: string;
  round_id: string;
  player_ids: string[];
  tee_time: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Player lookup for enriching pairings
 */
export interface PlayerLookup {
  [playerId: string]: {
    id: string;
    name: string;
    handicap: number | null;
    photoUrl: string | null;
  };
}

/**
 * Error types for pairing service operations
 */
export interface PairingServiceError extends Error {
  code: 'NOT_FOUND' | 'DUPLICATE' | 'VALIDATION' | 'DATABASE' | 'UNKNOWN';
}

/**
 * Creates a typed PairingServiceError
 */
export function createError(
  message: string,
  code: PairingServiceError['code']
): PairingServiceError {
  const error = new Error(message) as PairingServiceError;
  error.code = code;
  return error;
}
