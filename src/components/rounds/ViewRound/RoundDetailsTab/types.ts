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
