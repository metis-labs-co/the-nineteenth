/**
 * useRoundFilters - Manages round filter state (active/history tabs)
 */

import { useState, useMemo } from 'react';
import type { RoundTab, RoundListData, UseRoundFiltersReturn } from '../types';

export function useRoundFilters(rounds: RoundListData | undefined): UseRoundFiltersReturn {
  const [selectedTab, setSelectedTab] = useState<RoundTab>('active');

  const activeRounds = useMemo(() => rounds?.active || [], [rounds?.active]);
  const historyRounds = useMemo(() => rounds?.history || [], [rounds?.history]);

  const displayedRounds = useMemo(
    () => (selectedTab === 'active' ? activeRounds : historyRounds),
    [selectedTab, activeRounds, historyRounds]
  );

  return {
    selectedTab,
    setSelectedTab,
    displayedRounds,
    activeRounds,
    historyRounds,
  };
}
