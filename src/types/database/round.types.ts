/**
 * Round Database Types
 * Rounds, pairings, and round players
 */

import type { GameType, RoundStatus, TeamFormat } from './enums';
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
  selected_tee: TeeBox | null; // Selected tee box for this round (JSONB)

  // Team round settings (added for team support)
  is_team_round: boolean; // TRUE if this round uses team scoring
  team_format: TeamFormat | null; // 'best-ball', 'scramble', 'aggregate', 'match-play-team'

  // Scoring pairs
  scoring_pairs_required: boolean; // TRUE if scoring pairs must be set up before round starts

  // Multi-ball scoring (solo rounds only)
  ball_count: number; // 1-4, defaults to 1. Requires Social tier+ for > 1

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
}

/**
 * Round player with player details populated
 */
export interface RoundPlayerWithPlayer extends RoundPlayer {
  player?: Player;
  added_by_player?: Player;
}
