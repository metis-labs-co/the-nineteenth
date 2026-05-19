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
import type { TeeBox } from './base';

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

  // Scoring rules mode. When TRUE, rounds.rules_override takes precedence over
  // point_system at finalization. When FALSE (default), the competition's
  // point_system applies to every round and any saved per-round overrides are
  // ignored. Editing the per-round option is gated behind the Premium
  // advanced_round_rules feature.
  per_round_rules_enabled: boolean;

  // Knockout settings (null for event competitions)
  knockout_config: KnockoutConfig | null;

  // Optional WhatsApp group invite link (https://chat.whatsapp.com/<code>)
  // for organiser-led member coordination. Editable by the organiser only.
  whatsapp_group_invite_url: string | null;

  // Optional player slot capacity. NULL = unlimited.
  max_players?: number | null;
  // When true and max_players is set, joins are blocked once capacity is reached.
  lock_at_capacity?: boolean;
  // When false, the organizer is not auto-added to competition_players and does
  // not appear in pairings, scoring, or leaderboards.
  organizer_is_player?: boolean;

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
  selected_tee: TeeBox | null; // Per-player tee default for the competition (null = use round default)
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
