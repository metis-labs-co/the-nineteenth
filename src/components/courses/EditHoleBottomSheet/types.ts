/**
 * Types for EditHoleBottomSheet component
 */

import type { Hole, TeeBox } from '@/types/database/base';

export interface EditHoleBottomSheetProps {
  /** Whether the bottom sheet is visible */
  visible: boolean;
  /** Callback when the sheet is closed */
  onClose: () => void;
  /** The hole being edited */
  hole: Hole;
  /** All holes in the course (for SI uniqueness validation) */
  allHoles: Hole[];
  /** Available tees for yardage editing */
  courseTees: TeeBox[];
  /** Currently selected tee (for default focus) */
  selectedTee?: string | null;
  /** Callback when hole is saved */
  onSave: (updatedHole: Hole) => void;
  /** Whether the save operation is in progress */
  loading?: boolean;
}

export interface EditHoleFormState {
  par: 3 | 4 | 5;
  strokeIndex: number;
  /** Yardages can be undefined during editing (empty input) */
  yardages: Record<string, number | undefined>;
}

export interface ValidationErrors {
  par?: string;
  strokeIndex?: string;
  yardages?: Record<string, string>;
}

export const PAR_OPTIONS = [3, 4, 5] as const;

export type ParValue = (typeof PAR_OPTIONS)[number];
