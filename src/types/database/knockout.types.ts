/**
 * Knockout Tournament Database Types
 * Single elimination + full consolation bracket system
 */

// =====================================================
// ENUMS
// =====================================================

export type BracketType = 'main' | 'consolation';

export type KnockoutMatchStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'bye';

export type SeedingMethod = 'handicap' | 'random';

// =====================================================
// CONFIG
// =====================================================

export type ValidPlayerCount = 4 | 8 | 16 | 32;

export interface KnockoutConfig {
  playerCount: ValidPlayerCount;
  seedingMethod: SeedingMethod;
  bracketGenerated: boolean;
}

// =====================================================
// TABLES
// =====================================================

/**
 * A single match in the knockout bracket
 */
export interface KnockoutMatch {
  id: string;
  competition_id: string;
  round_id: string;
  bracket_type: BracketType;
  bracket_position: number;
  stage: number;
  player1_id: string | null;
  player2_id: string | null;
  seed1: number | null;
  seed2: number | null;
  winner_id: string | null;
  loser_id: string | null;
  player1_score: number | null;
  player2_score: number | null;
  next_match_id: string | null;
  next_match_slot: 1 | 2 | null;
  consolation_match_id: string | null;
  consolation_match_slot: 1 | 2 | null;
  status: KnockoutMatchStatus;
  pairing_id: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// COMPOSITE / VIEW TYPES
// =====================================================

/**
 * Match with joined player details for display
 */
export interface KnockoutMatchWithPlayers extends KnockoutMatch {
  player1?: { id: string; name: string; photo_url?: string | null } | null;
  player2?: { id: string; name: string; photo_url?: string | null } | null;
  winner?: { id: string; name: string } | null;
  /** Formatted score label e.g. "36 pts vs 32 pts" or "72 vs 75" */
  scoreLabel?: string;
}

/**
 * A single stage of the bracket (e.g. Quarter Finals)
 */
export interface BracketStage {
  stage: number;
  stageName: string;
  matches: KnockoutMatchWithPlayers[];
}

/**
 * Full bracket data organized for display
 */
export interface BracketData {
  mainBracket: BracketStage[];
  consolationBracket: BracketStage[];
  totalStages: number;
  playerCount: number;
}
