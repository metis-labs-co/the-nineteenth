/**
 * Wolf Game Types
 * Types for the Wolf strategic partner selection side-game feature
 */

// =====================================================
// ENUMS
// =====================================================

/** Scoring method for determining hole winners */
export type WolfScoringType = 'gross' | 'net';

/** Status of a Wolf game */
export type WolfGameStatus = 'active' | 'completed' | 'cancelled';

// =====================================================
// POINT VALUES
// =====================================================

/**
 * Standard Wolf point values
 * Points awarded based on Wolf's decision and outcome
 */
export const WOLF_POINTS = {
  /** Wolf with partner wins - each team member gets 2 points */
  PARTNER_WIN: 2,
  /** Wolf with partner loses - each opponent gets 3 points */
  PARTNER_LOSE_OPPONENT: 3,
  /** Lone Wolf wins - Wolf gets 4 points */
  LONE_WOLF_WIN: 4,
  /** Lone Wolf loses - each opponent gets 1 point */
  LONE_WOLF_LOSE_OPPONENT: 1,
  /** Blind Wolf wins - Wolf gets 6 points */
  BLIND_WOLF_WIN: 6,
  /** Blind Wolf loses - each opponent gets 2 points */
  BLIND_WOLF_LOSE_OPPONENT: 2,
} as const;

/** Type for Wolf point values configuration */
export interface WolfPointValues {
  partnerWin: number;
  partnerLoseOpponent: number;
  loneWolfWin: number;
  loneWolfLoseOpponent: number;
  blindWolfWin: number;
  blindWolfLoseOpponent: number;
}

// =====================================================
// HOLE SCORE DATA
// =====================================================

/**
 * Map of player IDs to their gross scores on a hole
 * Format: { "player-uuid": gross_score }
 */
export type WolfHoleScores = Record<string, number>;

/**
 * Map of player IDs to their points awarded on a hole
 * Format: { "player-uuid": points }
 * Points can be positive (won) or 0 (tie/pushed)
 */
export type WolfPointsAwarded = Record<string, number>;

// =====================================================
// WOLF GAME
// =====================================================

/**
 * A Wolf game associated with a round
 * Represents the strategic partner selection side-game configuration
 */
export interface WolfGame {
  id: string;
  round_id: string;
  /** Player participants (3-4 players) */
  participant_ids: string[];
  /** Rotation order for Wolf selection (determines who is Wolf each hole) */
  wolf_order: string[];
  /** Whether to use gross or net scores */
  scoring_type: WolfScoringType;
  /** Whether Blind Wolf option is available */
  blind_wolf_enabled: boolean;
  /** Whether pot/betting is enabled */
  pot_enabled: boolean;
  /** Dollar value per point (null if pot not enabled) */
  pot_value_per_point: number | null;
  /** Currency code */
  currency: string;
  /** Current game status */
  status: WolfGameStatus;
  /** When disclaimer was accepted (null if pot not enabled) */
  disclaimer_accepted_at: string | null;
  /** Who accepted the disclaimer (null if pot not enabled) */
  disclaimer_accepted_by: string | null;
  /** Who created the game */
  created_by: string;
  created_at: string;
  updated_at: string;
  /** When game was finalized */
  completed_at: string | null;
}

/**
 * Participant info for display purposes
 */
export interface WolfParticipant {
  id: string;
  name: string;
  handicap: number | null;
}

/**
 * Wolf game with populated participant details
 */
export interface WolfGameWithParticipants extends WolfGame {
  participants: WolfParticipant[];
}

// =====================================================
// WOLF HOLE DECISION
// =====================================================

/**
 * A Wolf's decision and result for a single hole
 */
export interface WolfHoleDecision {
  id: string;
  wolf_game_id: string;
  hole_number: number;
  /** Player who is Wolf this hole */
  wolf_id: string;
  /** TRUE if Wolf declared blind before tee shots */
  is_blind_wolf: boolean;
  /** Partner player ID, or NULL for lone wolf/blind wolf */
  partner_id: string | null;
  /** Gross scores for all participants: { player_id: score } */
  hole_scores: WolfHoleScores | null;
  /** TRUE if best scores are tied (hole pushed) */
  is_tie: boolean;
  /** TRUE if Wolf team won, FALSE if pack won, NULL if tie or not yet calculated */
  wolf_team_won: boolean | null;
  /** Points awarded to each player: { player_id: points } */
  points_awarded: WolfPointsAwarded | null;
  /** When Wolf made their decision */
  decided_at: string | null;
  /** When hole result was calculated */
  calculated_at: string | null;
}

/**
 * Wolf decision with populated player details
 */
export interface WolfDecisionWithDetails extends WolfHoleDecision {
  /** Wolf player info */
  wolf: WolfParticipant;
  /** Partner player info (null if lone wolf) */
  partner: WolfParticipant | null;
}

// =====================================================
// WOLF PAYOUT
// =====================================================

/**
 * Final payout summary for a player in a Wolf game
 */
export interface WolfPayout {
  id: string;
  wolf_game_id: string;
  player_id: string;
  /** Total points accumulated */
  total_points: number;
  /** Total money won (points * pot_value) */
  total_winnings: number;
  /** Net profit/loss after settlement */
  net_result: number;
  calculated_at: string;
}

/**
 * Player info for payout display
 */
export interface WolfPayoutPlayer {
  id: string;
  name: string;
}

/**
 * Wolf payout with populated player details
 */
export interface WolfPayoutWithPlayer extends WolfPayout {
  player: WolfPayoutPlayer;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for creating a new Wolf game
 */
export interface CreateWolfGameInput {
  round_id: string;
  /** Player UUIDs participating (3-4 players) */
  participant_ids: string[];
  /** Optional custom rotation order (defaults to participant order) */
  wolf_order?: string[];
  scoring_type: WolfScoringType;
  blind_wolf_enabled?: boolean;
  pot_enabled?: boolean;
  pot_value?: number;
  currency?: string;
}

/**
 * Input for submitting a Wolf's partner decision
 */
export interface SubmitWolfDecisionInput {
  wolf_game_id: string;
  hole_number: number;
  /** TRUE if declaring Blind Wolf */
  is_blind_wolf: boolean;
  /** Partner player ID, or NULL for lone wolf/blind wolf */
  partner_id: string | null;
}

/**
 * Input for recording a Wolf hole result
 */
export interface RecordWolfHoleResultInput {
  wolf_game_id: string;
  hole_number: number;
  /** Gross scores for all participants: { player_id: score } */
  hole_scores: WolfHoleScores;
  /** Handicap strokes received per player per hole (for net scoring) */
  handicap_strokes?: Record<string, number>;
}

// =====================================================
// CONFIG TYPES
// =====================================================

/**
 * Configuration for setting up a Wolf game
 * Used in round setup UI
 */
export interface WolfConfig {
  scoring_type: WolfScoringType;
  blind_wolf_enabled: boolean;
  pot_enabled: boolean;
  /** Per-point value when pot is enabled */
  pot_value_per_point?: number;
  /** Currency for pot (e.g., 'AUD') */
  currency?: string;
  /** Custom Wolf rotation order */
  wolf_order?: string[];
}

// =====================================================
// RESULT TYPES
// =====================================================

/**
 * Result of determining the Wolf hole winner
 */
export interface WolfHoleResult {
  /** TRUE if Wolf team won the hole */
  wolfTeamWon: boolean;
  /** TRUE if best scores are tied (hole pushed) */
  isTie: boolean;
}

/**
 * Standing entry for a player in the Wolf game
 */
export interface WolfStandingEntry {
  player_id: string;
  name: string;
  total_points: number;
  rank: number;
  /** Net result if pot enabled */
  net_result?: number;
}

/**
 * Debt transaction for settlement
 */
export interface WolfDebtTransaction {
  from_player_id: string;
  to_player_id: string;
  amount: number;
}

// =====================================================
// SUMMARY TYPES
// =====================================================

/**
 * Complete summary of a Wolf game for display
 */
export interface WolfGameSummary {
  game: WolfGameWithParticipants;
  decisions: WolfDecisionWithDetails[];
  payouts: WolfPayoutWithPlayer[];
  standings: WolfStandingEntry[];
  /** Number of holes completed */
  holes_completed: number;
  /** Number of holes with decisions made */
  holes_decided: number;
}
