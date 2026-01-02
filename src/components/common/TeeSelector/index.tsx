/**
 * TeeSelector - Unified tee box selection component
 *
 * Provides three variants:
 * - pills: Horizontal scrollable chips (for CourseDetailScreen)
 * - cards: Grid layout with CR/Slope info (for EditRoundScreen)
 * - list: Full-screen FlatList with banner (for TeeSelectionStep in CreateRoundBottomSheet)
 *
 * This is the main entry point that routes to the appropriate variant component.
 */

import React, { memo } from 'react';
import { TeeSelectorPills } from './TeeSelectorPills';
import { TeeSelectorCards } from './TeeSelectorCards';
import { TeeSelectorList } from './TeeSelectorList';
import type { TeeSelectorProps } from './types';

// Re-export types for external consumption
export type {
  TeeSelectorProps,
  TeeSelectorVariant,
  TeeSelectorCourseInfo,
  TeeSelectorPillsProps,
  TeeSelectorCardsProps,
  TeeSelectorListProps,
  TeeItemProps,
} from './types';

// Re-export utility function for external use
export { getTeeColor, isTeeSelected } from './hooks/useTeeSelector';

// Re-export variant components for direct use if needed
export { TeeSelectorPills } from './TeeSelectorPills';
export { TeeSelectorCards } from './TeeSelectorCards';
export { TeeSelectorList } from './TeeSelectorList';

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================

export const TeeSelector = memo(function TeeSelector({
  tees,
  selectedTee,
  onSelectTee,
  variant = 'pills',
  showYardage = false,
  showBanner = true,
  courseInfo,
  onSkip,
  disabled = false,
  label,
  testID,
}: TeeSelectorProps) {
  switch (variant) {
    case 'pills':
      return (
        <TeeSelectorPills
          tees={tees}
          selectedTee={selectedTee}
          onSelectTee={onSelectTee}
          showYardage={showYardage}
          label={label}
          testID={testID}
        />
      );
    case 'cards':
      return (
        <TeeSelectorCards
          tees={tees}
          selectedTee={selectedTee}
          onSelectTee={onSelectTee}
          disabled={disabled}
          testID={testID}
        />
      );
    case 'list':
      return (
        <TeeSelectorList
          tees={tees}
          selectedTee={selectedTee}
          onSelectTee={onSelectTee}
          showBanner={showBanner}
          courseInfo={courseInfo}
          onSkip={onSkip}
          testID={testID}
        />
      );
    default:
      return null;
  }
});

export default TeeSelector;
