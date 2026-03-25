/**
 * Competition Database Types
 * Competition metadata and player relationships
 */

import type {
  CompetitionType,
  CompetitionVisibility,
  CompetitionStatus,
  HandicapSystem,
  HandicapSource,
  TeamMode,
  InvitationStatus,
} from './enums';
import type { KnockoutConfig } from './knockout.types';

/**
 * Point system configuration (stored in Competition.point_system JSONB)
 * Defines how round results convert to competition points
 */
export interface PointSystemConfig {
  type: 'position' | 'custom'; // position-based or custom rules
  rules: Record<string, number>; // e.g., { "1": 10, "2": 8, "3": 6, "default": 0 }
  matchPlay?: {
    win: number; // Points for winning a match
    draw: number; // Points for halving a match
    loss: number; // Points for losing a match
  };
}

/**
 * Default point system configuration
 */
export const DEFAULT_POINT_SYSTEM: PointSystemConfig = {
  type: 'position',
  rules: {
    '1': 10,
    '2': 8,
    '3': 6,
    '4': 5,
    '5': 4,
    '6': 3,
    '7': 2,
    '8': 1,
    default: 0,
  },
  matchPlay: {
    win: 3,
    draw: 1,
    loss: 0,
  },
};

/**
 * Golf competition metadata
 * MVP: Single round per competition
 * Extended: Support for teams and multiple game types
 */
export interface Competition {
  id: string; // UUID
  name: string;
  description: string | null;
  competition_type: CompetitionType; // 'knockout' or 'event'
  start_date: string; // ISO date (YYYY-MM-DD)
  end_date: string | null; // ISO date - required for 'event', optional for 'knockout'
  handicap_system: HandicapSystem;
  handicap_source: HandicapSource; // 'profile' = profile handicap, 'calculated' = Social Index, 'none' = no adjustments
  visibility: CompetitionVisibility;
  invite_code: string; // e.g., "COMP-12345"
  organizer_id: string; // UUID, references auth.users(id)
  status: CompetitionStatus;

  // Team settings (added for teams support)
  team_mode: TeamMode; // 'none', 'fixed', or 'per-round'
  team_size: number | null; // 2-4, NULL if team_mode is 'none'
  point_system: PointSystemConfig; // Config for converting round results to competition points

  // Knockout settings (null for event competitions)
  knockout_config: KnockoutConfig | null;

  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  deleted_at: string | null; // ISO timestamp, soft delete
}

/**
 * Many-to-many join table
 * Links players to competitions
 */
export interface CompetitionPlayer {
  competition_id: string; // UUID, references competitions(id)
  player_id: string; // UUID, references players(id)
  status: InvitationStatus; // 'accepted' for MVP
  invited_at: string; // ISO timestamp
  responded_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
}

/**
 * Individual standings entry (returned by get_competition_individual_standings function)
 */
export interface IndividualStandingsEntry {
  rank: number;
  player_id: string; // UUID
  player_name: string;
  handicap: number;
  total_points: number; // Competition points
  rounds_played: number;
}
