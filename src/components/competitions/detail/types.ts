/**
 * Shared types for Competition Detail components
 */

import type { ColorPalette } from '@/context/ThemeContext';
import type {
  Competition,
  Round,
  Course,
  RoundStatus,
  HandicapSystem,
  GameType,
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

/**
 * Handicap system display labels
 */
export const HANDICAP_SYSTEM_LABELS: Record<HandicapSystem, string> = {
  'honor': 'Honour System',
  whs: 'World Handicap System',
  'gross-only': 'Gross Only',
};

/**
 * Game type display labels
 */
export const GAME_TYPE_LABELS: Record<GameType, string> = {
  'stableford': 'Stableford',
  'stroke': 'Stroke Play',
  'par': 'Par',
  'match-play': 'Match Play',
  'best-ball': 'Best Ball',
  'scramble': 'Scramble',
  'shamble': 'Shamble',
};

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
