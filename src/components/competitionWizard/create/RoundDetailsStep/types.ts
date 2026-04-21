/**
 * Types and constants for RoundDetailsStep
 */

import type { RoundDetailsFormData, GameType, TeeBoxFormData, SimplifiedRoundFormData } from '@/schemas/competition';
import type { TeeBox, Club } from '@/types/database.types';
import type { CourseWithFavoriteStatus, ClubCourseDisplayItem } from '@/hooks/useClubs';

// Type for favorite courses which include their club
export type FavoriteCourseWithClub = CourseWithFavoriteStatus & { club: Club };

// =====================================================
// CONSTANTS
// =====================================================

export const TEE_COLORS: Record<string, string> = {
  black: '#000000',
  blue: '#2196F3',
  white: '#FFFFFF',
  yellow: '#FFEB3B',
  red: '#F44336',
  gold: '#FFD700',
  green: '#4CAF50',
  silver: '#C0C0C0',
  orange: '#FF9800',
  purple: '#9C27B0',
};

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  stableford: 'Stableford',
  stroke: 'Stroke Play',
  par: 'Par',
  'match-play': 'Match Play',
  'best-ball': 'Best Ball',
  scramble: 'Scramble',
  shamble: 'Shamble',
};

/** Individual game types (non-team formats) */
export const INDIVIDUAL_GAME_TYPES: GameTypeOption[] = [
  { value: 'stableford', label: 'Stableford', description: 'Points-based scoring (most popular)' },
  { value: 'stroke', label: 'Stroke Play', description: 'Count total strokes' },
  { value: 'par', label: 'Par', description: 'Win/lose each hole (+1, 0, -1 scoring)' },
  { value: 'match-play', label: 'Match Play', description: 'Hole-by-hole competition' },
];

/** Team format game types */
export const TEAM_GAME_TYPES: GameTypeOption[] = [
  { value: 'best-ball', label: 'Best Ball', description: 'Best score from team counts' },
  { value: 'scramble', label: 'Scramble', description: 'Team picks best shot each time' },
  { value: 'shamble', label: 'Shamble', description: 'Best drive, then individual play' },
];

/** All game types (individual + team) */
export const GAME_TYPES: GameTypeOption[] = [
  ...INDIVIDUAL_GAME_TYPES,
  ...TEAM_GAME_TYPES,
];

// =====================================================
// TYPES
// =====================================================

export interface GameTypeOption {
  value: GameType;
  label: string;
  description: string;
  disabled?: boolean;
  upgradeRequired?: boolean;
}

export interface RoundDetailsStepProps {
  initialData?: RoundDetailsFormData[];
  onComplete: (data: RoundDetailsFormData[]) => void;
  onBack: () => void;
  allowedGameTypes?: GameType[];
  maxRoundsPerCompetition?: number;
  /** Competition start date from step 1 (DD/MM/YYYY format) - used as default for new rounds */
  competitionStartDate?: string;
}

export interface RoundCardProps {
  round: RoundDetailsFormData;
  index: number;
  errors: Record<string, string>;
  isRemovable: boolean;
  availableTees: TeeBox[];
  onUpdate: (updates: Partial<RoundDetailsFormData>) => void;
  onRemove: () => void;
  onOpenCourseModal: () => void;
  onOpenTeeModal: () => void;
  onOpenMatchTypeModal: () => void;
}

export interface CourseSelectionModalProps {
  visible: boolean;
  displayItems: ClubCourseDisplayItem[];
  favoriteCourses: FavoriteCourseWithClub[];
  courseSearchQuery: string;
  isLoading: boolean;
  isSearching: boolean;
  onCourseSelect: (course: CourseWithFavoriteStatus, club: Club) => void;
  onSearchChange: (query: string) => void;
  onClose: () => void;
}

export interface GameTypeModalProps {
  visible: boolean;
  selectedGameType: GameType;
  availableGameTypes: GameTypeOption[];
  onSelect: (gameType: GameType) => void;
  onClose: () => void;
  /** Whether to show team format options (Best Ball, Scramble, Shamble). Default: true */
  showTeamFormats?: boolean;
}

/** @deprecated Use GameTypeModalProps instead */
export type MatchTypeModalProps = GameTypeModalProps;

export interface TeeSelectionModalProps {
  visible: boolean;
  availableTees: TeeBox[];
  selectedTeeName: string | undefined;
  onSelect: (tee: TeeBox) => void;
  onClose: () => void;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function createEmptyRound(defaultDate?: string): RoundDetailsFormData {
  return {
    courseId: '',
    courseName: '',
    date: defaultDate || '',
    teeTime: '',
    matchType: 'stableford',
    scoringPairsRequired: false,
  };
}

/**
 * Get filtered game types based on subscription tier and team format visibility
 * @param allowedGameTypes - Game types allowed by subscription tier
 * @param showTeamFormats - Whether to include team formats (default: true)
 */
export function getFilteredGameTypes(
  allowedGameTypes?: GameType[],
  showTeamFormats: boolean = true
): GameTypeOption[] {
  const baseTypes = showTeamFormats ? GAME_TYPES : INDIVIDUAL_GAME_TYPES;

  if (!allowedGameTypes || allowedGameTypes.length === 0) {
    return baseTypes.map((gt) => ({ ...gt, disabled: false, upgradeRequired: false }));
  }
  return baseTypes.map((gt) => ({
    ...gt,
    disabled: !allowedGameTypes.includes(gt.value),
    upgradeRequired: !allowedGameTypes.includes(gt.value),
  }));
}

// Simplified step props for the new wizard flow
export interface SimplifiedRoundDetailsStepProps {
  initialData?: SimplifiedRoundFormData[];
  onComplete: (data: SimplifiedRoundFormData[]) => void;
  onBack: () => void;
  allowedGameTypes?: GameType[];
  maxRoundsPerCompetition?: number;
  /** Competition start date from step 1 (DD/MM/YYYY format) - used as default for new rounds */
  competitionStartDate?: string;
  /** Whether this is a team competition - controls visibility of team game types */
  enableTeams?: boolean;
}

// Re-export types from schemas for convenience
export type { RoundDetailsFormData, GameType, TeeBoxFormData, SimplifiedRoundFormData };
