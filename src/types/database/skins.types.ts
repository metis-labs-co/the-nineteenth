/**
 * Skins Game Types
 * Types for the skins gambling side-game feature
 */

// =====================================================
// ENUMS
// =====================================================

/** How the pot is calculated */
export type SkinsPotType = 'per_hole' | 'total_pot';

/** Scoring method for determining hole winners */
export type SkinsScoringType = 'gross' | 'net';

/** Status of a skins game */
export type SkinsGameStatus = 'active' | 'completed' | 'cancelled';

// =====================================================
// HOLE SCORE DATA
// =====================================================

/**
 * Score data for a single player on a hole
 * Used in the hole_scores JSONB field
 */
export interface SkinsHoleScoreData {
  /** Raw strokes taken */
  gross: number;
  /** Net score after handicap adjustment */
  net: number;
  /** Handicap strokes received on this hole */
  strokes_received: number;
}

/**
 * Map of player IDs to their hole score data
 * Format: { "player-uuid": { gross, net, strokes_received } }
 */
export type SkinsHoleScores = Record<string, SkinsHoleScoreData>;

// =====================================================
// SKINS GAME
// =====================================================

/**
 * A skins game associated with a round
 * Represents the gambling side-game configuration
 */
export interface SkinsGame {
  id: string;
  round_id: string;
  pairing_id: string | null;
  participant_ids: string[];
  pot_type: SkinsPotType;
  pot_value: number;
  currency: string;
  scoring_type: SkinsScoringType;
  status: SkinsGameStatus;
  disclaimer_accepted_at: string;
  disclaimer_accepted_by: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Participant info for display purposes
 */
export interface SkinsParticipant {
  id: string;
  name: string;
  handicap: number | null;
}

/**
 * Skins game with populated participant details
 */
export interface SkinsGameWithParticipants extends SkinsGame {
  participants: SkinsParticipant[];
}

// =====================================================
// SKINS RESULT
// =====================================================

/**
 * Result of a single hole in a skins game
 */
export interface SkinsResult {
  id: string;
  skins_game_id: string;
  hole_number: number;
  winner_id: string | null;
  is_carryover: boolean;
  hole_scores: SkinsHoleScores;
  hole_pot_value: number;
  carryover_to_next: number;
  payout_amount: number;
  calculated_at: string;
}

/**
 * Winner info for display purposes
 */
export interface SkinsWinner {
  id: string;
  name: string;
}

/**
 * Skins result with populated winner details
 */
export interface SkinsResultWithWinner extends SkinsResult {
  winner: SkinsWinner | null;
}

// =====================================================
// SKINS PAYOUT
// =====================================================

/**
 * Final payout summary for a player in a skins game
 */
export interface SkinsPayout {
  id: string;
  skins_game_id: string;
  player_id: string;
  buy_in: number;
  total_winnings: number;
  net_result: number;
  holes_won: number;
  holes_tied: number;
  holes_lost: number;
  calculated_at: string;
}

/**
 * Player info for payout display
 */
export interface SkinsPayoutPlayer {
  id: string;
  name: string;
}

/**
 * Skins payout with populated player details
 */
export interface SkinsPayoutWithPlayer extends SkinsPayout {
  player: SkinsPayoutPlayer;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for creating a new skins game
 */
export interface CreateSkinsGameInput {
  round_id: string;
  pairing_id?: string;
  participant_ids: string[];
  pot_type: SkinsPotType;
  pot_value: number;
  currency?: string;
  scoring_type: SkinsScoringType;
}

/**
 * Input for processing a hole result
 */
export interface ProcessSkinsHoleInput {
  skins_game_id: string;
  hole_number: number;
  hole_scores: SkinsHoleScores;
}

// =====================================================
// SUMMARY / AGGREGATE TYPES
// =====================================================

/**
 * Complete summary of a skins game for display
 */
export interface SkinsGameSummary {
  game: SkinsGameWithParticipants;
  results: SkinsResultWithWinner[];
  payouts: SkinsPayoutWithPlayer[];
  /** Current accumulated carryover amount */
  current_carryover: number;
  /** Number of holes completed */
  holes_completed: number;
  /** Total pot value for the game */
  total_pot: number;
  /** Value per hole (for total_pot type, this is total/18) */
  per_hole_value: number;
}

/**
 * Configuration for setting up a skins game
 * Used in round setup UI
 */
export interface SkinsConfig {
  pot_type: SkinsPotType;
  pot_value: number;
  scoring_type: SkinsScoringType;
  currency?: string;
}

/**
 * Debt transaction for settlement
 */
export interface SkinsDebtTransaction {
  from_player_id: string;
  to_player_id: string;
  amount: number;
}

/**
 * Net position for a player (winnings minus buy-in)
 */
export interface SkinsNetPosition {
  player_id: string;
  net_amount: number;
}
