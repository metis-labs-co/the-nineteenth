/**
 * Types and constants for RoundDetailsStep
 */

import type { RoundDetailsFormData, GameType, TeeBoxFormData, SimplifiedRoundFormData } from '@/schemas/competition';
import type { TeeBox, Venue } from '@/types/database.types';
import type { CourseWithFavoriteStatus, VenueCourseDisplayItem } from '@/hooks/useVenues';

// Type for favorite courses which include their venue
export type FavoriteCourseWithVenue = CourseWithFavoriteStatus & { venue: Venue };

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
  'match-play': 'Match Play',
  ambrose: 'Ambrose',
  'best-ball': 'Best Ball',
  scramble: 'Scramble',
};

export const GAME_TYPES: GameTypeOption[] = [
  { value: 'stableford', label: 'Stableford', description: 'Points-based scoring (most popular)' },
  { value: 'stroke', label: 'Stroke Play', description: 'Count total strokes' },
  { value: 'match-play', label: 'Match Play', description: 'Hole-by-hole competition' },
  { value: 'ambrose', label: 'Ambrose', description: 'Team-based best ball' },
  { value: 'best-ball', label: 'Best Ball', description: 'Best score from team counts' },
  { value: 'scramble', label: 'Scramble', description: 'Team picks best shot each time' },
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
  isPremium: boolean;
  onUpdate: (updates: Partial<RoundDetailsFormData>) => void;
  onRemove: () => void;
  onOpenCourseModal: () => void;
  onOpenTeeModal: () => void;
  onOpenMatchTypeModal: () => void;
}

export interface CourseSelectionModalProps {
  visible: boolean;
  displayItems: VenueCourseDisplayItem[];
  favoriteCourses: FavoriteCourseWithVenue[];
  courseSearchQuery: string;
  isLoading: boolean;
  isSearching: boolean;
  onCourseSelect: (course: CourseWithFavoriteStatus, venue: Venue) => void;
  onSearchChange: (query: string) => void;
  onClose: () => void;
}

export interface MatchTypeModalProps {
  visible: boolean;
  selectedMatchType: GameType;
  availableGameTypes: GameTypeOption[];
  onSelect: (matchType: GameType) => void;
  onClose: () => void;
}

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

export function getFilteredGameTypes(allowedGameTypes?: GameType[]): GameTypeOption[] {
  if (!allowedGameTypes || allowedGameTypes.length === 0) {
    return GAME_TYPES.map((gt) => ({ ...gt, disabled: false, upgradeRequired: false }));
  }
  return GAME_TYPES.map((gt) => ({
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
  isPremium?: boolean;
}

// Re-export types from schemas for convenience
export type { RoundDetailsFormData, GameType, TeeBoxFormData, SimplifiedRoundFormData };
