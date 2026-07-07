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
      case 'matchplay':
        return round.gameType === 'match-play';
      case 'practice':
        // Practice = round not tracked for handicap (source 'none'), matching the
        // "Practice" breakdown card in My Stats.
        return round.handicapSource === 'none';
      case 'handicap':
        // Handicap = round tracked for handicap (any source other than 'none';
        // a null source defaults to 'profile'), matching the "Handicap" card.
        return round.handicapSource !== 'none';
      case 'ninehole':
        return (
          round.nineType === 'front9' || round.nineType === 'back9' || round.totalHoles === 9
        );
      default:
        return true;
    }
  });
}

export function useRoundFilters(
  rounds: RoundListData | undefined,
  initialFilter: RoundTypeFilter = 'all'
): UseRoundFiltersReturn {
  const [roundTypeFilter, setRoundTypeFilter] = useState<RoundTypeFilter>(initialFilter);

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
