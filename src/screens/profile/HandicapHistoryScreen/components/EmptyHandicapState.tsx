/**
 * EmptyHandicapState - Empty state when player has no handicap history
 *
 * Shown when the player hasn't completed any rounds with
 * handicap differentials calculated.
 */

import React from 'react';
import { EmptyState } from '@/components/common';

export function EmptyHandicapState() {
  return (
    <EmptyState
      title="No Social Handicap Yet"
      message="Complete rounds to start your Social Handicap. It is unique to The Nineteenth and is not an official golf handicap."
      icon="chart-timeline-variant"
    />
  );
}
