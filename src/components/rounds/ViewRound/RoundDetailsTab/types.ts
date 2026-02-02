/**
 * Type definitions for RoundDetailsTab components
 */

import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import type { Hole } from '@/types/database.types';
import type { RoundStatus } from '@/types/database/enums';

export interface RoundDetailsTabProps {
  round: RoundWithCourse;
  isOrganizer?: boolean;
  onEditPress?: () => void;
  onCourseSelectPress?: () => void;
}

export interface HoleTableProps {
  holes: Hole[];
  selectedTee: string | null;
  useMetres: boolean;
}

export interface ScoringPairsSectionProps {
  roundId: string;
  scoringPairsRequired: boolean;
  isPremium: boolean;
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
