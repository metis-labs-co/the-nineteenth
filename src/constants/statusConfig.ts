/**
 * Centralized status configurations for badges and labels
 *
 * Contains all status-related display configurations to ensure
 * consistent styling across the application.
 */

import type { ColorPalette } from '@/context/ThemeContext';
import type {
  CompetitionStatus,
  RoundStatus,
  GameType,
  HandicapSystem,
} from '@/types/database.types';

/**
 * Status configuration interface for badge styling
 */
export interface StatusConfig {
  label: string;
  backgroundColor: string;
  textColor: string;
  icon?: string;
}

/**
 * Get competition status badge configuration
 */
export function getCompetitionStatusConfig(
  status: CompetitionStatus,
  colors: ColorPalette
): StatusConfig {
  const configs: Record<CompetitionStatus, StatusConfig> = {
    upcoming: {
      label: 'Upcoming',
      backgroundColor: colors.gray200,
      textColor: colors.gray700,
      icon: 'clock-outline',
    },
    'in-progress': {
      label: 'Active',
      backgroundColor: colors.successLight,
      textColor: colors.successDark,
      icon: 'play-circle-outline',
    },
    completed: {
      label: 'Completed',
      backgroundColor: colors.gray200,
      textColor: colors.gray700,
      icon: 'check-circle-outline',
    },
    cancelled: {
      label: 'Cancelled',
      backgroundColor: colors.errorLight,
      textColor: colors.errorDark,
      icon: 'close-circle-outline',
    },
  };
  return configs[status];
}

/**
 * Get round status badge configuration
 */
export function getRoundStatusConfig(
  status: RoundStatus,
  colors: ColorPalette
): StatusConfig {
  const configs: Record<RoundStatus, StatusConfig> = {
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
  };
  return configs[status];
}

/**
 * Game type display labels
 */
export const GAME_TYPE_LABELS: Record<GameType, string> = {
  stableford: 'Stableford',
  stroke: 'Stroke Play',
  'match-play': 'Match Play',
  ambrose: 'Ambrose',
  'best-ball': 'Best Ball',
  scramble: 'Scramble',
};

/**
 * Handicap system display labels
 */
export const HANDICAP_SYSTEM_LABELS: Record<HandicapSystem, string> = {
  honor: 'Honour System',
  'golf-australia': 'Golf Australia',
  'gross-only': 'Gross Only',
};

/**
 * Helper function to get game type label
 */
export function getGameTypeLabel(gameType: GameType): string {
  return GAME_TYPE_LABELS[gameType];
}

/**
 * Helper function to get handicap system label
 */
export function getHandicapSystemLabel(system: HandicapSystem): string {
  return HANDICAP_SYSTEM_LABELS[system];
}
