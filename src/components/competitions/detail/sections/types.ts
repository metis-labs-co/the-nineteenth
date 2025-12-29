/**
 * Shared types and constants for DetailsTab sections
 */

import type { Competition, Course, CompetitionType, HandicapSystem, TeamMode } from '@/types/database.types';
import type { RoundWithCourse } from '../types';

// =====================================================
// PROPS TYPES
// =====================================================

export interface CompetitionInfoSectionProps {
  competition: Competition;
  rounds: RoundWithCourse[];
  playerCount: number;
  isOrganizer: boolean;
  onEdit: () => void;
}

export interface CurrentStandingSectionProps {
  standing: { position: number; points: number };
}

export interface SettingsSectionProps {
  competition: Competition;
  isOrganizer: boolean;
  onEdit: () => void;
}

export interface CoursesSectionProps {
  courses: (Course & { venues?: { name: string; city: string | null; state: string | null } | null })[];
  onViewCourse?: (course: Course) => void;
}

export interface EditableDetailRowProps {
  label: string;
  value: string;
  isEditable: boolean;
  onPress?: () => void;
  icon?: string;
  chip?: boolean;
  chipColor?: string;
}

// =====================================================
// LABEL HELPERS
// =====================================================

export const competitionTypeLabels: Record<CompetitionType, string> = {
  'league': 'League',
  'event': 'Event',
};

export const competitionTypeDescriptions: Record<CompetitionType, string> = {
  'league': 'Ongoing competition with no fixed end date',
  'event': 'Fixed-term competition with an end date',
};

export const handicapSystemLabels: Record<HandicapSystem, string> = {
  'honor': 'Honour System',
  'golf-australia': 'Golf Australia',
  'gross-only': 'Gross Only',
};

export const teamModeLabels: Record<TeamMode, string> = {
  'none': 'Individual',
  'fixed': 'Fixed Teams',
  'per-round': 'Per-Round Teams',
};
