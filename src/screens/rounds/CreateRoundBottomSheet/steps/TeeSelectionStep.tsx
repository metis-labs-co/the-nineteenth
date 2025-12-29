/**
 * TeeSelectionStep - Second step in the create round wizard
 *
 * Features:
 * - Display selected course info
 * - List available tee boxes
 * - Option to skip tee selection
 */

import React, { memo } from 'react';
import { TeeSelector } from '@/components/common';
import type { TeeBox } from '@/types/database.types';
import type { SelectedCourse } from '../types';

interface TeeSelectionStepProps {
  selectedCourse: SelectedCourse;
  selectedTee: TeeBox | null;
  onSelectTee: (tee: TeeBox) => void;
  onSkipTeeSelection: () => void;
}

export const TeeSelectionStep = memo(function TeeSelectionStep({
  selectedCourse,
  selectedTee,
  onSelectTee,
  onSkipTeeSelection,
}: TeeSelectionStepProps) {
  return (
    <TeeSelector
      tees={selectedCourse.tees ?? []}
      selectedTee={selectedTee}
      onSelectTee={onSelectTee}
      variant="list"
      showBanner
      courseInfo={{
        courseName: selectedCourse.courseName,
        venue: selectedCourse.venue,
      }}
      onSkip={onSkipTeeSelection}
    />
  );
});
