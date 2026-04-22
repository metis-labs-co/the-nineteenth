/**
 * Type definitions for RoundDetailsTab components
 */

import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import type { Hole } from '@/types/database.types';
import type { RoundStatus } from '@/types/database/enums';

export interface RoundDetailsTabProps {
  round: RoundWithCourse;
  isOrganizer?: boolean;
  onCourseSelectPress?: () => void;
  /** Navigation target for upgrade prompts opened from per-field sheets. */
  onUpgradePress?: () => void;
}

export interface HoleTableProps {
  holes: Hole[];
  selectedTee: string | null;
  useMetres: boolean;
}

export interface ScoringPairsSectionProps {
  roundId: string;
  scoringPairsRequired: boolean;
  cardBackground: string;
  roundStatus: RoundStatus;
  onEditPress?: () => void;
  /** Number of players in the round. When > 4 the pair-management UI
   *  moves to the Groups tab (this section just shows a toggle + note);
   *  when ≤ 4 the management card stays here since there's no Groups
   *  tab. Optional — defaults to treating the section as management-
   *  capable (legacy behaviour). */
  playerCount?: number;
  /** Fired when the toggle flips. When undefined the toggle renders
   *  read-only. */
  onToggleEnabled?: (enabled: boolean) => void | Promise<void>;
}

export interface SkinsGameSectionProps {
  roundId: string;
  roundStatus: RoundStatus;
  cardBackground: string;
  onEditPress?: () => void;
}

export interface WolfGameSectionProps {
  roundId: string;
  roundStatus: RoundStatus;
  cardBackground: string;
  onEditPress?: () => void;
}

export interface PlayersSectionProps {
  roundId: string;
  cardBackground: string;
}
