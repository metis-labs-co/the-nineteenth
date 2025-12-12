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
} from '@/types/database.types';

/**
 * Extended round data with course and venue details
 */
export interface RoundWithCourse extends Round {
  course: (Course & {
    venues?: {
      name: string;
      city: string | null;
      state: string | null;
    } | null;
  }) | null;
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
  'golf-australia': 'Golf Australia',
  'gross-only': 'Gross Only',
};

/**
 * Game type display labels
 */
export const GAME_TYPE_LABELS: Record<GameType, string> = {
  'stableford': 'Stableford',
  'stroke': 'Stroke Play',
  'match-play': 'Match Play',
  'ambrose': 'Ambrose',
  'best-ball': 'Best Ball',
  'scramble': 'Scramble',
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
