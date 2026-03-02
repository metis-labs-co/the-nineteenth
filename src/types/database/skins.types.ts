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

/** Where the pot money comes from */
export type SkinsPoolSource = 'direct' | 'prize_pool';

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
// TEAM HOLE SCORE DATA
// =====================================================

/**
 * Score data for a team on a hole (team skins)
 * Used in the hole_scores JSONB field for team skins
 */
export interface SkinsTeamHoleScoreData {
  /** Team score for the hole (calculated based on format) */
  team_score: number;
  /** Individual scores for each team member */
  member_scores: Record<string, SkinsHoleScoreData>;
  /** Player who contributed the winning score (for best-ball format) */
  contributing_player_id?: string;
}

/**
 * Map of team IDs to their hole score data
 * Format: { "team-uuid": { team_score, member_scores: { player_id: {...} } } }
 */
export type SkinsTeamHoleScores = Record<string, SkinsTeamHoleScoreData>;

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
  /** Individual player participants (for individual skins) */
  participant_ids: string[];
  pot_type: SkinsPotType;
  pot_value: number;
  currency: string;
  scoring_type: SkinsScoringType;
  pool_source: SkinsPoolSource;
  /** Amount drawn from competition prize pool (when pool_source='prize_pool') */
  pool_draw_amount: number;
  /** Amount of carryover returned to pool on game completion */
  carryover_returned: number;
  status: SkinsGameStatus;
  disclaimer_accepted_at: string;
  disclaimer_accepted_by: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  /** TRUE if this is a team-based skins game */
  is_team_skins: boolean;
  /** Team participants (for team skins) - array of team UUIDs */
  participant_team_ids: string[] | null;
}

/**
 * Participant info for display purposes (individual skins)
 */
export interface SkinsParticipant {
  id: string;
  name: string;
  handicap: number | null;
}

/**
 * Team participant info for display purposes (team skins)
 */
export interface SkinsTeamParticipant {
  id: string;
  name: string;
  /** Team members */
  members: SkinsParticipant[];
}

/**
 * Skins game with populated participant details (individual)
 */
export interface SkinsGameWithParticipants extends SkinsGame {
  participants: SkinsParticipant[];
}

/**
 * Skins game with populated team participant details (team skins)
 */
export interface SkinsGameWithTeamParticipants extends SkinsGame {
  teams: SkinsTeamParticipant[];
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
  /** Player who won this hole (individual skins), NULL if carryover */
  winner_id: string | null;
  /** Team that won this hole (team skins), NULL if carryover */
  team_winner_id: string | null;
  is_carryover: boolean;
  /** Hole scores - either SkinsHoleScores (individual) or SkinsTeamHoleScores (team) */
  hole_scores: SkinsHoleScores | SkinsTeamHoleScores;
  hole_pot_value: number;
  carryover_to_next: number;
  payout_amount: number;
  calculated_at: string;
}

/**
 * Winner info for display purposes (individual)
 */
export interface SkinsWinner {
  id: string;
  name: string;
}

/**
 * Team winner info for display purposes (team skins)
 */
export interface SkinsTeamWinner {
  id: string;
  name: string;
  members: { id: string; name: string }[];
}

/**
 * Skins result with populated winner details (individual)
 */
export interface SkinsResultWithWinner extends SkinsResult {
  winner: SkinsWinner | null;
}

/**
 * Skins result with populated team winner details (team skins)
 */
export interface SkinsResultWithTeamWinner extends SkinsResult {
  team_winner: SkinsTeamWinner | null;
}

// =====================================================
// SKINS PAYOUT
// =====================================================

/**
 * Final payout summary for a player or team in a skins game
 */
export interface SkinsPayout {
  id: string;
  skins_game_id: string;
  /** Player this payout is for (individual skins) - NULL for team payouts */
  player_id: string | null;
  /** Team this payout is for (team skins) - NULL for individual payouts */
  team_id: string | null;
  /** TRUE if this is a team-level payout */
  is_team_payout: boolean;
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
 * Team info for payout display
 */
export interface SkinsPayoutTeam {
  id: string;
  name: string;
  members: { id: string; name: string }[];
}

/**
 * Skins payout with populated player details (individual)
 */
export interface SkinsPayoutWithPlayer extends SkinsPayout {
  player: SkinsPayoutPlayer | null;
}

/**
 * Skins payout with populated team details (team skins)
 */
export interface SkinsPayoutWithTeam extends SkinsPayout {
  team: SkinsPayoutTeam;
  /** Per-member split amount (net_result / member count) */
  per_member_amount: number;
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for creating a new skins game (supports both individual and team skins)
 */
export interface CreateSkinsGameInput {
  round_id: string;
  pairing_id?: string;
  /** Individual player participants (required for individual skins) */
  participant_ids: string[];
  pot_type: SkinsPotType;
  pot_value: number;
  currency?: string;
  scoring_type: SkinsScoringType;
  pool_source?: SkinsPoolSource;
  /** Prize pool ID when funding from competition prize pool */
  pool_id?: string;
  /** TRUE if this is a team-based skins game */
  is_team_skins?: boolean;
  /** Team UUIDs participating (required for team skins) */
  participant_team_ids?: string[];
}

/**
 * Input for creating a new team skins game
 */
export interface CreateTeamSkinsGameInput {
  round_id: string;
  /** Team UUIDs participating (2-4 teams) */
  participant_team_ids: string[];
  pot_type: SkinsPotType;
  pot_value: number;
  currency?: string;
  scoring_type: SkinsScoringType;
  pool_source?: SkinsPoolSource;
  /** Prize pool ID when funding from competition prize pool */
  pool_id?: string;
}

/**
 * Input for processing a hole result (individual)
 */
export interface ProcessSkinsHoleInput {
  skins_game_id: string;
  hole_number: number;
  hole_scores: SkinsHoleScores;
}

/**
 * Input for processing a team hole result (team skins)
 */
export interface ProcessTeamSkinsHoleInput {
  skins_game_id: string;
  hole_number: number;
  team_scores: SkinsTeamHoleScores;
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
 * Configuration for skins game pool source
 * Specifies where the pot money comes from
 */
export interface SkinsPoolSourceConfig {
  /** Source of the pot funds */
  source: SkinsPoolSource;
  /** Prize pool ID when source is 'prize_pool' */
  pool_id: string | null;
  /** Amount to draw from prize pool (may be less than pot_value if insufficient funds) */
  draw_amount: number | null;
}

/**
 * Debt transaction for settlement (individual)
 */
export interface SkinsDebtTransaction {
  from_player_id: string;
  to_player_id: string;
  amount: number;
}

/**
 * Debt transaction for team settlement (team skins)
 */
export interface SkinsTeamDebtTransaction {
  from_team_id: string;
  to_team_id: string;
  amount: number;
  /** Per-member amount for display */
  per_member_amount: number;
}

/**
 * Net position for a player (winnings minus buy-in)
 */
export interface SkinsNetPosition {
  player_id: string;
  net_amount: number;
}

/**
 * Net position for a team (winnings minus buy-in)
 */
export interface SkinsTeamNetPosition {
  team_id: string;
  net_amount: number;
  /** Per-member amount for display */
  per_member_amount: number;
}

// =====================================================
// TEAM WINNER DETERMINATION
// =====================================================

/**
 * Result of determining the team hole winner
 */
export interface TeamHoleWinnerResult {
  /** Winning team ID (null if carryover) */
  winnerTeamId: string | null;
  /** TRUE if this hole was tied */
  isCarryover: boolean;
  /** The minimum score achieved */
  minScore: number;
  /** Team IDs that tied for lowest score */
  tiedTeamIds: string[];
}
