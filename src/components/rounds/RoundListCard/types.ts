// src/components/rounds/RoundListCard/types.ts

import type { WinnerInfo } from '@/components/common';

/**
 * Player information for the round
 */
export interface RoundPlayerInfo {
  id: string;
  name: string;
}

/**
 * Course information for the round
 */
export interface RoundCourse {
  id: string;
  name: string;
  /** Venue/club name where the course is located */
  venueName?: string;
  /** City where the course is located */
  city?: string;
  /** State where the course is located */
  state?: string;
}

/**
 * Competition information (if round is part of a competition)
 */
export interface RoundCompetition {
  id: string;
  name: string;
}

/**
 * User's score data for a completed round
 */
export interface UserScoreData {
  /** Total gross strokes */
  totalGross?: number | null;
  /** Total net strokes (after handicap adjustment) */
  totalNet?: number | null;
  /** Total Stableford points */
  totalPoints?: number | null;
  /** Match play result (if applicable) */
  matchResult?: {
    won: boolean;
    margin: string; // e.g., "3&2", "2&1", "1 up"
  } | null;
  /** Whether the user has a scorecard for this round */
  hasScorecard: boolean;
}

/**
 * Round data structure
 */
export interface RoundListCardData {
  /** Unique round identifier */
  id: string;
  /** Course information */
  course: RoundCourse;
  /** Competition information (optional for standalone rounds) */
  competition?: RoundCompetition | null;
  /** Round status (scheduled, in-progress, completed) */
  status: string;
  /** Date of the round (ISO string or Date) */
  date?: string | Date | null;
  /** Tee time (e.g., "10:30 AM") */
  teeTime?: string | null;
  /** Type of game (stableford, stroke, etc.) */
  gameType: string;
  /** Whether this is a team round */
  isTeamRound?: boolean;
  /** Whether this is a standalone practice round */
  isStandalone?: boolean;
  /** Round number within competition */
  roundNumber: number;
  /** Total rounds in competition */
  totalRounds: number;
  /** Number of holes completed (for in-progress rounds) */
  holesCompleted: number;
  /** Total holes in the round */
  totalHoles: number;
  /** Players in the round (for standalone/social rounds) */
  players?: RoundPlayerInfo[];
  /** User's score data (only populated for completed rounds) */
  userScore?: UserScoreData;
  /** Winner information (only for completed rounds) */
  winner?: WinnerInfo;
  /** Whether this round has an active skins game */
  hasSkins?: boolean;
  /** Whether this round has an active wolf game */
  hasWolf?: boolean;
}

export interface RoundListCardProps<T extends RoundListCardData = RoundListCardData> {
  /**
   * Round data to display
   */
  round: T;
  /**
   * Callback when the card is pressed
   */
  onPress: (round: T) => void;
  /**
   * Callback when delete is pressed (only called if swipeEnabled is true)
   */
  onDelete?: (round: T) => void;
  /**
   * Whether swipe-to-delete gesture is enabled (default: false)
   */
  swipeEnabled?: boolean;
  /**
   * Label for the action (defaults to status-based label)
   */
  actionLabel?: string;
  /**
   * Current user ID - used to display "You" instead of the user's name
   */
  currentUserId?: string;
  /**
   * Test ID for testing
   */
  testID?: string;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Formats user score for display based on game type
 * @param gameType - The type of game (stableford, stroke, match_play, etc.)
 * @param userScore - The user's score data (optional)
 * @returns Formatted score string or null if not applicable
 */
export const formatUserScore = (
  gameType: string,
  userScore?: UserScoreData
): string | null => {
  // No scorecard submitted
  if (!userScore || !userScore.hasScorecard) {
    return 'Round not submitted';
  }

  switch (gameType) {
    case 'stableford':
      // Stableford: Show points (e.g., "34pts")
      if (userScore.totalPoints != null) {
        return `${userScore.totalPoints}pts`;
      }
      return null;

    case 'stroke':
    case 'scramble':
    case 'fourball_bestball':
      // Stroke-based: Show Gross and Net (e.g., "Gross: 84, Net: 71")
      if (userScore.totalGross != null && userScore.totalNet != null) {
        return `Gross: ${userScore.totalGross}, Net: ${userScore.totalNet}`;
      }
      if (userScore.totalGross != null) {
        return `Gross: ${userScore.totalGross}`;
      }
      return null;

    case 'match_play':
      // Match Play: Show win/loss status (e.g., "Won 3&2" or "Lost 2&1")
      if (userScore.matchResult) {
        const status = userScore.matchResult.won ? 'Won' : 'Lost';
        return `${status} ${userScore.matchResult.margin}`;
      }
      return null;

    default:
      // For unknown game types, try to show available data
      if (userScore.totalPoints != null) {
        return `${userScore.totalPoints}pts`;
      }
      if (userScore.totalGross != null) {
        return `Gross: ${userScore.totalGross}`;
      }
      return null;
  }
};
