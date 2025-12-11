/**
 * Types for AddRoundScreen
 */

import type { GameType, TeamFormat, Competition, TeamWithMembers } from '@/types/database.types';

/**
 * Form data for adding a new round
 */
export interface RoundFormData {
  courseId: string;
  courseName: string;
  date: string;
  teeTime: string;
  gameType: GameType;
  isTeamRound: boolean;
  teamFormat: TeamFormat | null;
  scoringPairsRequired: boolean;
}

/**
 * Initial form data values
 */
export const INITIAL_FORM_DATA: RoundFormData = {
  courseId: '',
  courseName: '',
  date: '',
  teeTime: '',
  gameType: 'stableford',
  isTeamRound: false,
  teamFormat: null,
  scoringPairsRequired: false,
};

/**
 * Form validation errors
 */
export type FormErrors = Record<string, string>;

/**
 * Props for AddRoundScreen
 */
export interface AddRoundScreenProps {
  navigation: any;
  route: {
    params: {
      competitionId: string;
    };
  };
}

/**
 * Props for TeamPreviewCard
 */
export interface TeamPreviewCardProps {
  team: TeamWithMembers;
}
