/**
 * Type definitions for RoundDetailsTab components
 */

import type { RoundWithCourse } from '@/hooks/useRoundDetails';
import type { Hole } from '@/types/database.types';
import type { RoundStatus } from '@/types/database/enums';

export interface RoundDetailsTabProps {
  round: RoundWithCourse;
  isOrganizer?: boolean;
  /** Whether the current user may add round photos (i.e. is a participant). */
  canAddPhotos?: boolean;
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
  /** Fired when the card is tapped. When undefined, the card renders
   *  without a tap affordance (read-only display). */
  onEditPress?: () => void;
  /** Fired when the toggle flips. When undefined the toggle renders
   *  as a read-only status pill. */
  onToggleEnabled?: (enabled: boolean) => void | Promise<void>;
  /** Suppress the "Scoring Pairs" heading — useful when the section is
   *  rendered inside a container (e.g. a sub-tab) that already labels
   *  this content. Defaults to false. */
  hideTitle?: boolean;
  /** Optional map of player id → team name. When provided, each player
   *  in a pair row gets a small italic team label under their name.
   *  Used by the Groups tab's scoring-pairs sub-tab so organisers can
   *  see at a glance which team each player belongs to. */
  teamNameByPlayer?: Map<string, string>;
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
  currentUserId?: string;
}
