/**
 * Shared types and constants for DetailsTab sections
 */

import type { Competition, Course, CompetitionType, HandicapSystem, TeamMode } from '@/types/database.types';
import type { CompetitionPrizePool, PrizePoolPlacement } from '@/types';
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
  courses: (Course & { clubs?: { name: string; city: string | null; state: string | null } | null })[];
  onViewCourse?: (course: Course) => void;
}

export interface PrizePoolSectionProps {
  /** The prize pool (null if none configured) */
  pool: CompetitionPrizePool | null;
  /** Placement breakdown with payout amounts */
  placements: PrizePoolPlacement[];
  /** Whether the current user is the competition organizer */
  isOrganizer: boolean;
  /** Whether the pool is locked (any round has started) */
  isLocked: boolean;
  /** Handler for add pool button (organizers only, when no pool) */
  onAddPress?: () => void;
  /** Handler for edit pool button (organizers only, when pool exists and not locked) */
  onEditPress?: () => void;
  /** Handler for view transactions link */
  onViewTransactionsPress?: () => void;
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
  'knockout': 'Knockout',
  'event': 'Event',
};

export const competitionTypeDescriptions: Record<CompetitionType, string> = {
  'knockout': 'A bracket-style elimination competition',
  'event': 'Fixed-term competition with an end date',
};

export const handicapSystemLabels: Record<HandicapSystem, string> = {
  'honor': 'Honour System',
  whs: 'World Handicap System',
  'gross-only': 'Gross Only',
};

export const teamModeLabels: Record<TeamMode, string> = {
  'none': 'Individual',
  'fixed': 'Fixed Teams',
  'per-round': 'Per-Round Teams',
};
