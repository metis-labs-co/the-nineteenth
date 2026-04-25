/**
 * Shared types and constants for DetailsTab sections
 */

import type { Competition, Course, CompetitionType, HandicapSystem, TeamMode } from '@/types/database.types';
import type { CompetitionPrizePool, PrizePoolPlacement } from '@/types';
import type { MiniLeaderboardData } from '@/utils/miniLeaderboard';

// =====================================================
// PROPS TYPES
// =====================================================

export interface CompetitionInfoSectionProps {
  competition: Competition;
}

export interface MiniLeaderboardSectionProps {
  /** 3-row window for individual standings (null hides the whole section) */
  individual: MiniLeaderboardData | null;
  /** 3-row window for team standings (null hides only the team sub-section) */
  team: MiniLeaderboardData | null;
  /** Display label for the user's team (e.g. "Hawks") */
  teamName?: string;
  /** Called when a sub-section is tapped */
  onOpenLeaderboard: (view: 'individual' | 'team') => void;
}

export interface SettingsSectionProps {
  competition: Competition;
  isOrganizer: boolean;
  /**
   * True once any round has started scoring. Locks structural fields
   * (competition_type, team_mode, team_size) that would otherwise require
   * complex data migration if changed mid-competition.
   */
  hasStartedRound: boolean;
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
  'honor': 'Social',
  whs: 'WHS',
  'gross-only': 'Gross',
};

export const teamModeLabels: Record<TeamMode, string> = {
  'none': 'Individual',
  'fixed': 'Fixed Teams',
  'per-round': 'Per-Round Teams',
};
