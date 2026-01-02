/**
 * RoundListEmpty - Empty state when no rounds match filters
 */

import React from 'react';
import { EmptyState } from '@/components/common';
import type { RoundTab } from '../types';

interface RoundListEmptyProps {
  selectedTab: RoundTab;
}

export function RoundListEmpty({ selectedTab }: RoundListEmptyProps) {
  const isActive = selectedTab === 'active';

  return (
    <EmptyState
      title={isActive ? 'No Active Rounds' : 'No Completed Rounds'}
      message={
        isActive
          ? 'Tap the button above to start scoring a round'
          : 'Your completed rounds will appear here'
      }
      icon="golf"
      compact
    />
  );
}
