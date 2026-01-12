/**
 * Types for AddRoundScreen
 */

import type { GameType, TeamFormat, TeamWithMembers, SkinsPoolSource } from '@/types/database.types';
import type { RootStackScreenProps } from '@/navigation/types';
import type { SkinsConfig } from '@/types';

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
  // Skins game configuration
  skinsEnabled: boolean;
  skinsConfig: SkinsConfig | null;
  // Pool source for skins (Phase 2: Prize Pool integration)
  skinsPoolSource: SkinsPoolSource;
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
  skinsEnabled: false,
  skinsConfig: null,
  skinsPoolSource: 'direct',
};

/**
 * Form validation errors
 */
export type FormErrors = Record<string, string>;

/**
 * Props for AddRoundScreen
 */
export type AddRoundScreenProps = RootStackScreenProps<'AddRound'>;

/**
 * Props for TeamPreviewCard
 */
export interface TeamPreviewCardProps {
  team: TeamWithMembers;
}
