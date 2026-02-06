/**
 * TeeSelector Type Definitions
 *
 * Shared types for all TeeSelector variant components.
 */

import type { TeeBox, Venue } from '@/types/database.types';
import type { PlayerGender } from '@/types/database/player.types';

// ===========================================================================
// VARIANT TYPE
// ===========================================================================

export type TeeSelectorVariant = 'pills' | 'cards' | 'list';

// ===========================================================================
// COURSE INFO (for list variant banner)
// ===========================================================================

export interface TeeSelectorCourseInfo {
  courseName: string;
  venue?: Venue | null;
}

/**
 * Player info for daily handicap preview in tee selection
 */
export interface TeePreviewPlayer {
  id: string;
  name: string;
  handicap?: number | null;
  gender?: PlayerGender | null;
}

// ===========================================================================
// MAIN COMPONENT PROPS
// ===========================================================================

export interface TeeSelectorProps {
  /** Available tee boxes */
  tees: TeeBox[];
  /** Currently selected tee (by name for pills, full object for cards/list) */
  selectedTee: TeeBox | string | null;
  /** Callback when a tee is selected */
  onSelectTee: (tee: TeeBox) => void;
  /** Visual variant */
  variant?: TeeSelectorVariant;
  /** Whether to show yardage in pills variant (default: false) */
  showYardage?: boolean;
  /** Whether to show course banner in list variant (default: true) */
  showBanner?: boolean;
  /** Course info for list variant banner */
  courseInfo?: TeeSelectorCourseInfo;
  /** Callback for skip button in list variant */
  onSkip?: () => void;
  /** Whether the selector is disabled (for cards variant) */
  disabled?: boolean;
  /** Label shown above pills variant */
  label?: string;
  /** Test ID for testing */
  testID?: string;
}

// ===========================================================================
// VARIANT-SPECIFIC PROPS
// ===========================================================================

export interface TeeSelectorPillsProps {
  tees: TeeBox[];
  selectedTee: TeeBox | string | null;
  onSelectTee: (tee: TeeBox) => void;
  showYardage?: boolean;
  label?: string;
  testID?: string;
}

export interface TeeSelectorCardsProps {
  tees: TeeBox[];
  selectedTee: TeeBox | string | null;
  onSelectTee: (tee: TeeBox) => void;
  disabled?: boolean;
  testID?: string;
}

export interface TeeSelectorListProps {
  tees: TeeBox[];
  selectedTee: TeeBox | string | null;
  onSelectTee: (tee: TeeBox) => void;
  showBanner?: boolean;
  courseInfo?: TeeSelectorCourseInfo;
  onSkip?: () => void;
  testID?: string;
  /** Players for daily handicap preview (optional) */
  players?: TeePreviewPlayer[];
  /** Course par for daily handicap calculation (optional) */
  coursePar?: number;
}

// ===========================================================================
// SHARED ITEM PROPS
// ===========================================================================

export interface TeeItemProps {
  tee: TeeBox;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}
