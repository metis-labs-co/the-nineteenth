/**
 * useRoundFilters - Manages the two filters on the rounds list.
 *
 * `roundScope` (all / social / comps) scopes the whole screen and is applied
 * first; `roundTypeFilter` then narrows the Recent Rounds list only.
 */

import { useState, useMemo } from 'react';
import type {
  RoundScopeFilter,
  RoundTypeFilter,
  RoundItem,
  RoundListData,
  UseRoundFiltersReturn,
} from '../types';

/**
 * Whether a round belongs in the given scope. Takes the flag rather than the
 * round so the in-progress carousel — which carries a different row shape —
 * can share the same rule.
 */
export function matchesRoundScope(
  isCompetitionRound: boolean,
  scope: RoundScopeFilter
): boolean {
  if (scope === 'all') return true;
  return scope === 'comps' ? isCompetitionRound : !isCompetitionRound;
}

/** A RoundItem is a competition round unless it is explicitly standalone. */
export function isCompetitionRoundItem(round: RoundItem): boolean {
  return round.isStandalone === false || !!round.competition?.id;
}

function filterByScope(rounds: RoundItem[], scope: RoundScopeFilter): RoundItem[] {
  if (scope === 'all') return rounds;
  return rounds.filter((round) =>
    matchesRoundScope(isCompetitionRoundItem(round), scope)
  );
}

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
  initialFilter: RoundTypeFilter = 'all',
  initialScope: RoundScopeFilter = 'all'
): UseRoundFiltersReturn {
  const [roundTypeFilter, setRoundTypeFilter] = useState<RoundTypeFilter>(initialFilter);
  const [roundScope, setRoundScope] = useState<RoundScopeFilter>(initialScope);

  const activeRounds = useMemo(
    () => filterByScope(rounds?.active || [], roundScope),
    [rounds?.active, roundScope]
  );
  const historyRounds = useMemo(
    () => filterByScope(rounds?.history || [], roundScope),
    [rounds?.history, roundScope]
  );

  const filteredHistoryRounds = useMemo(
    () => filterByType(historyRounds, roundTypeFilter),
    [historyRounds, roundTypeFilter]
  );

  return {
    roundTypeFilter,
    setRoundTypeFilter,
    roundScope,
    setRoundScope,
    filteredHistoryRounds,
    activeRounds,
    historyRounds,
  };
}
