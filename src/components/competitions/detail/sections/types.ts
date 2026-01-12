/**
 * Shared types and constants for DetailsTab sections
 */

import type { Competition, Course, CompetitionType, HandicapSystem, TeamMode } from '@/types/database.types';
import type { CompetitionPrizePool, PoolAllocationSummary } from '@/types';
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

export interface PrizePoolSectionProps {
  /** The prize pool (null if none configured) */
  pool: CompetitionPrizePool | null;
  /** Allocation summary with used/remaining amounts (null if no pool) */
  summary: PoolAllocationSummary | null;
  /** Whether the current user is the competition organizer */
  isOrganizer: boolean;
  /** Whether the pool is locked (any round has started) */
  isLocked: boolean;
  /** Number of rounds in the competition (for auto-split display) */
  roundCount?: number;
  /** Competition ID (for auto-split status) */
  competitionId?: string;
  /** Number of players in the competition (for auto-split status) */
  playerCount?: number;
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
