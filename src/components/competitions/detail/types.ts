/**
 * Shared types for Competition Detail components
 */

import type { ColorPalette } from '@/context/ThemeContext';
import type {
  Competition,
  Round,
  Course,
  RoundStatus,
  SkinsConfig,
} from '@/types/database.types';

/**
 * Extended round data with course and club details
 */
export interface RoundWithCourse extends Round {
  course: (Course & {
    clubs?: {
      name: string;
      city: string | null;
      state: string | null;
      /** GPS coordinates — present when the query selects them from the clubs table */
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  }) | null;
  /** Whether this round has an active skins game */
  has_skins?: boolean;
  /** Skins configuration if enabled */
  skins_config?: SkinsConfig | null;
  /** Whether this round has an active wolf game */
  has_wolf?: boolean;
  /**
   * Optional joined competition info — present when the parent screen needs
   * to display the comp name on the round card (e.g. cross-competition lists
   * like Home). Not populated by the CompetitionDetail query because the
   * comp context is already shown in that screen's page header.
   */
  competition?: {
    id: string;
    name: string;
  } | null;
  /**
   * Optional roster — populated for standalone rounds shown in cross-context
   * lists (e.g. Home's in-progress carousel) so the card can list the
   * playing group. Empty/undefined for competition rounds, which surface
   * players via the dedicated competition Players tab.
   */
  players?: { id: string; name: string }[];
}

/**
 * Player data from competition_players join
 */
export interface CompetitionPlayer {
  player_id: string;
  status: string;
  player: {
    id: string;
    name: string;
    email: string | null;
    handicap: number | null;
    photo_url: string | null;
  } | null;
}

/**
 * Competition data with all related information
 */
export interface CompetitionData {
  competition: Competition;
  rounds: RoundWithCourse[];
  players: CompetitionPlayer[];
}

// Display labels live in the canonical source; re-exported for existing import paths.
export { HANDICAP_SYSTEM_LABELS, GAME_TYPE_LABELS } from '@/constants/statusConfig';

/**
 * Round status config for styling
 */
export interface RoundStatusConfig {
  label: string;
  backgroundColor: string;
  textColor: string;
  icon: string;
}

/**
 * Get round status configuration (factory function for dynamic theme colors)
 */
export const getRoundStatusConfig = (colors: ColorPalette): Record<RoundStatus, RoundStatusConfig> => ({
  upcoming: {
    label: 'Upcoming',
    backgroundColor: colors.gray200,
    textColor: colors.gray700,
    icon: 'clock-outline',
  },
  'in-progress': {
    label: 'In Progress',
    backgroundColor: colors.warningLight,
    textColor: colors.warningDark,
    icon: 'play-circle-outline',
  },
  completed: {
    label: 'Completed',
    backgroundColor: colors.gray200,
    textColor: colors.gray700,
    icon: 'check-circle-outline',
  },
});
