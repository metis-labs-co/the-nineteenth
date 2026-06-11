/**
 * RoundListEmpty - Empty state when no recent rounds match filters
 */

import React from 'react';
import { EmptyState } from '@/components/common';

export function RoundListEmpty() {
  return (
    <EmptyState
      title="No Recent Rounds"
      message="Your completed rounds will appear here"
      icon="golf"
      compact
    />
  );
}
