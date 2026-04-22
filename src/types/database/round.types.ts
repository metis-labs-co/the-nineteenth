/**
 * Round Database Types
 * Rounds, pairings, and round players
 */

import type {
  GameType,
  HandicapSource,
  NineType,
  RoundFormat,
  RoundStatus,
  SubMatchResult,
  SubMatchStatus,
  TeamFormat,
} from './enums';
import type { TeeBox } from './base';
import type { Player } from './player.types';

/**
 * Individual round within a competition
 * MVP: One round per competition, Stableford only
 * Extended: Support for team rounds and multiple formats
 */
export interface Round {
  id: string; // UUID
  competition_id: string | null; // UUID, references competitions(id) - NULL for standalone rounds
  user_id: string | null; // UUID, references auth.users(id) - Owner for standalone rounds
  round_number: number; // 1 for MVP
  course_id: string; // UUID, references courses(id)
  date: string | null; // ISO date (YYYY-MM-DD)
  tee_time: string | null; // HH:MM:SS

  // Game Configuration
  game_type: GameType; // 'stableford' for MVP
  nine_type: NineType; // 'full' | 'front9' | 'back9' — standalone only
  selected_tee: TeeBox | null; // Selected tee box for this round (JSONB)

  // Team round settings (added for team support)
  is_team_round: boolean; // TRUE if this round uses team scoring
  team_format: TeamFormat | null; // 'best-ball', 'scramble', 'aggregate', 'match-play-team'

  // Round format: 'combined' = one team match (best-ball across all members);
  // 'split' = multiple independent sub-matches aggregated Ryder-Cup style.
  round_format: RoundFormat;
  // Players per sub-team when round_format = 'split'. 1 = 1v1, 2 = 2v2, 3 = 3v3.
  // NULL for combined rounds.
  sub_match_size: number | null;

  // Team match play matchup. For competitions with 3+ teams, identifies the
  // two teams squaring off in this round. NULL falls back to first two teams
  // in the competition (back-compat with 2-team rounds).
  team1_id: string | null;
  team2_id: string | null;

  // Scoring pairs
  scoring_pairs_required: boolean; // TRUE if scoring pairs must be set up before round starts

  // Multi-ball scoring (solo rounds only)
  ball_count: number; // 1-4, defaults to 1. Requires Social tier+ for > 1

  // Handicap settings
  handicap_source: HandicapSource | null; // NULL = inherit from competition or default to 'profile'

  // Status
  status: RoundStatus;

  // Metadata
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Player groupings for a round
 * MVP: Manual pairing by organizer
 * Phase 2: Auto-pairing algorithm
 */
export interface Pairing {
  id: string; // UUID
  round_id: string; // UUID, references rounds(id)
  player_ids: string[]; // Array of 2-4 player UUIDs
  tee_time: string | null; // HH:MM:SS
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Player participation in a standalone/social round
 * Tracks who is playing in casual rounds (not competition rounds)
 */
export interface RoundPlayer {
  id: string; // UUID
  round_id: string; // UUID, references rounds(id)
  player_id: string; // UUID, references players(id)
  added_by: string | null; // UUID, references players(id) - who invited them (NULL if self)
  created_at: string; // ISO timestamp
  selected_tee: TeeBox | null; // Per-player tee override (null = use round default)
}

/**
 * Round player with player details populated
 */
export interface RoundPlayerWithPlayer extends RoundPlayer {
  player?: Player;
  added_by_player?: Player;
}

/**
 * Independent head-to-head sub-match within a split team round.
 *
 * Stored in the `sub_matches` table. One row per sub-match.
 * Round result for split rounds is derived by aggregating these
 * rows Ryder-Cup style: 1 point per win, 0.5 for halved, 0 for loss.
 *
 * For team match play, `result` + `final_differential` are populated.
 * For team stroke play pairs-aggregate, `team_a_net_total` +
 * `team_b_net_total` are populated.
 */
export interface SubMatch {
  id: string; // UUID
  round_id: string; // UUID, references rounds(id)
  sort_order: number; // 0-based position within the round
  team_a_player_ids: string[]; // 1-3 players
  team_b_player_ids: string[]; // 1-3 players
  tee_time: string | null; // HH:MM:SS
  pairing_id: string | null; // UUID, references pairings(id) - physical tee group
  status: SubMatchStatus;
  result: SubMatchResult | null;
  final_differential: number | null; // signed hole differential at close (e.g. 3 for 3&2)
  team_a_net_total: number | null; // stroke play pairs-aggregate only
  team_b_net_total: number | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
