/**
 * Type definitions for RoundDetailsTab components
 */

import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import type { Hole } from '@/types/database.types';

export interface RoundDetailsTabProps {
  round: RoundWithCourse;
  isOrganizer?: boolean;
  isPremium?: boolean;
  onEditPress?: () => void;
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
  onManagePress?: () => void;
}
