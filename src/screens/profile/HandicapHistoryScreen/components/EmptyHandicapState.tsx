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
      title="No Handicap History"
      message="Complete rounds to start tracking your handicap over time."
      icon="chart-timeline-variant"
    />
  );
}
