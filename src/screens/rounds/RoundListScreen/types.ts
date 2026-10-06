/**
 * Types for RoundListScreen
 */

import type { RoundListCardData } from '@/components/rounds';

export interface PlayingPartner {
  id: string;
  name: string;
  handicap?: number;
}

export type RoundTypeFilter =
  | 'all'
  | 'practice'
  | 'match'
  | 'matchplay'
  | 'skins'
  | 'wolf'
  | 'handicap'
  | 'ninehole';

/**
 * Screen-wide scope. Unlike `RoundTypeFilter` (which only narrows the Recent
 * Rounds list) this scopes every section — In Progress, Upcoming and Recent —
 * so 'social' genuinely hides competition rounds from the whole screen.
 */
export type RoundScopeFilter = 'all' | 'social' | 'comps';

// Player info for round (matches RoundListCard's internal type)
export interface RoundPlayerInfo {
  id: string;
  name: string;
  photo_url?: string | null;
}

// Re-export RoundListCardData as RoundItem for internal use
export type RoundItem = RoundListCardData;

export interface RoundListData {
  active: RoundItem[];
  history: RoundItem[];
}

export interface UseRoundFiltersReturn {
  roundTypeFilter: RoundTypeFilter;
  setRoundTypeFilter: (filter: RoundTypeFilter) => void;
  roundScope: RoundScopeFilter;
  setRoundScope: (scope: RoundScopeFilter) => void;
  /** Completed rounds after both the scope and the type filter. */
  filteredHistoryRounds: RoundItem[];
  /** Non-completed rounds after the scope filter. */
  activeRounds: RoundItem[];
  historyRounds: RoundItem[];
}

export interface UseRoundListReturn {
  rounds: RoundListData | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  refetch: () => void;
  roundsPlayedCount: number;
}

export interface UseRoundActionsReturn {
  handleScoreRound: (round: RoundItem) => void;
  handleDeleteRound: (round: RoundItem) => void;
  handleConfirmDelete: () => void;
  handleCancelDelete: () => void;
  deleteDialogVisible: boolean;
  roundToDelete: RoundItem | null;
  isDeleting: boolean;
}
