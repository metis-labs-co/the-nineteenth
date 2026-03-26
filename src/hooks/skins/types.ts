/**
 * Skins Hooks - Type Definitions
 *
 * Shared types for skins game hooks.
 */

import type { TeamFormat } from '@/types/database/enums';
import type { SkinsHoleScores, SkinsTeamHoleScores, SkinsScoringType } from '@/types/database/skins.types';

// =====================================================
// ERROR TYPES
// =====================================================

/**
 * Error type for skins service operations
 */
export interface SkinsServiceError extends Error {
  code: 'NOT_FOUND' | 'VALIDATION' | 'DATABASE' | 'PERMISSION' | 'UNKNOWN';
}

// =====================================================
// INPUT TYPES
// =====================================================

/**
 * Input for processing a skins hole (individual)
 */
export interface ProcessSkinsHoleInput {
  skinsGameId: string;
  holeNumber: number;
  holeScores: SkinsHoleScores;
}

/**
 * Input for processing a team skins hole
 */
export interface ProcessTeamSkinsHoleInput {
  skinsGameId: string;
  holeNumber: number;
  teamScores: SkinsTeamHoleScores;
  teamFormat: TeamFormat;
  /** Skip is_team_skins validation (used when auto-detected from round format) */
  skipTeamValidation?: boolean;
}

/**
 * Input for processing skins (used by useProcessSkinsIfNeeded)
 */
export interface ProcessSkinsInput {
  roundId: string;
  holeNumber: number;
  /** Player scores - map of playerId to gross strokes */
  playerScores: Record<string, number>;
  /** Team scores (for team skins) - map of teamId to gross strokes */
  teamScores?: Record<string, number>;
  /** Team format (for team skins) */
  teamFormat?: TeamFormat;
  /** Force processing even if scores seem incomplete */
  force?: boolean;
}

/**
 * Result from processing skins
 */
export interface ProcessSkinsResult {
  /** Whether processing was attempted */
  processed: boolean;
  /** Whether the hole had a winner */
  hasWinner?: boolean;
  /** Winner name for display */
  winnerName?: string;
  /** Winnings amount for the hole */
  winningsAmount?: number;
  /** Carryover amount if no winner */
  carryoverAmount?: number;
  /** Error message if processing failed */
  error?: string;
}

// =====================================================
// STATISTICS TYPES
// =====================================================

/**
 * Player skins statistics from the database
 */
export interface SkinsPlayerStatistics {
  id: string;
  player_id: string;
  games_played: number;
  games_won: number;
  total_holes_played: number;
  total_holes_won: number;
  total_holes_tied: number;
  total_buy_ins: number;
  total_winnings: number;
  total_net_result: number;
  current_win_streak: number;
  longest_win_streak: number;
  win_rate: number | null;
  hole_win_rate: number | null;
  last_game_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Leaderboard entry from the get_skins_leaderboard RPC
 */
export interface SkinsLeaderboardEntry {
  rank: number;
  player_id: string;
  games_played: number;
  games_won: number;
  total_holes_won: number;
  total_winnings: number;
  total_net_result: number;
  win_rate: number | null;
  hole_win_rate: number | null;
  current_win_streak: number;
  longest_win_streak: number;
  // Joined player data
  player?: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
}

/**
 * Game history entry with details
 */
export interface SkinsGameHistoryEntry {
  id: string;
  round_id: string;
  pot_type: string;
  pot_value: number;
  scoring_type: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  // Joined data
  round?: {
    id: string;
    round_number: number;
    date: string | null;
    course?: {
      id: string;
      name: string;
    };
    competition?: {
      id: string;
      name: string;
    };
  };
  payout?: {
    buy_in: number;
    total_winnings: number;
    net_result: number;
    holes_won: number;
    holes_tied: number;
    holes_lost: number;
  };
}

/**
 * Options for leaderboard query
 */
export interface SkinsLeaderboardOptions {
  /** Maximum number of entries to fetch */
  limit?: number;
  /** Minimum games played to be included */
  minGames?: number;
  /** Only include friends (requires current user) */
  friendsOnly?: boolean;
}

/**
 * Options for game history query
 */
export interface SkinsGameHistoryOptions {
  /** Maximum number of entries to fetch */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}
