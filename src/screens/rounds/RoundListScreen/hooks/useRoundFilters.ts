/**
 * useRoundFilters - Manages round type filter state for the recent rounds list
 */

import { useState, useMemo } from 'react';
import type { RoundTypeFilter, RoundItem, RoundListData, UseRoundFiltersReturn } from '../types';

function filterByType(rounds: RoundItem[], filter: RoundTypeFilter): RoundItem[] {
  if (filter === 'all') return rounds;

  return rounds.filter((round) => {
    switch (filter) {
      case 'skins':
        return round.hasSkins === true;
      case 'wolf':
        return round.hasWolf === true;
      case 'match':
        return !round.hasSkins && !round.hasWolf && round.players && round.players.length > 1;
      case 'practice':
        return !round.hasSkins && !round.hasWolf && (!round.players || round.players.length <= 1);
      default:
        return true;
    }
  });
}

export function useRoundFilters(rounds: RoundListData | undefined): UseRoundFiltersReturn {
  const [roundTypeFilter, setRoundTypeFilter] = useState<RoundTypeFilter>('all');

  const activeRounds = useMemo(() => rounds?.active || [], [rounds?.active]);
  const historyRounds = useMemo(() => rounds?.history || [], [rounds?.history]);

  const filteredHistoryRounds = useMemo(
    () => filterByType(historyRounds, roundTypeFilter),
    [historyRounds, roundTypeFilter]
  );

  return {
    roundTypeFilter,
    setRoundTypeFilter,
    filteredHistoryRounds,
    activeRounds,
    historyRounds,
  };
}
