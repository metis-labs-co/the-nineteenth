/**
 * RoundListEmpty - Empty state when no recent rounds match the filters
 */

import React from 'react';
import { EmptyState } from '@/components/common';
import type { RoundScopeFilter } from '../types';

interface RoundListEmptyProps {
  /** Current screen scope, so the message names what is actually missing. */
  scope?: RoundScopeFilter;
}

const MESSAGES: Record<RoundScopeFilter, string> = {
  all: 'Your completed rounds will appear here',
  social: 'Your completed social rounds will appear here',
  comps: 'Your completed competition rounds will appear here',
};

export function RoundListEmpty({ scope = 'all' }: RoundListEmptyProps) {
  return (
    <EmptyState
      title="No Recent Rounds"
      message={MESSAGES[scope]}
      icon="golf"
      compact
    />
  );
}
