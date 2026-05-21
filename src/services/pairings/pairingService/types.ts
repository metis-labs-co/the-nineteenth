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

