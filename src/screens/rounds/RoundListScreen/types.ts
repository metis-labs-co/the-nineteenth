/**
 * Types for RoundListScreen
 */

import type { RoundListCardData } from '@/components/rounds';

export interface PlayingPartner {
  id: string;
  name: string;
  handicap?: number;
}

export type RoundTab = 'active' | 'history';

// Player info for round (matches RoundListCard's internal type)
export interface RoundPlayerInfo {
  id: string;
  name: string;
}

// Re-export RoundListCardData as RoundItem for internal use
export type RoundItem = RoundListCardData;

export interface RoundListData {
  active: RoundItem[];
  history: RoundItem[];
}

export interface UseRoundFiltersReturn {
  selectedTab: RoundTab;
  setSelectedTab: (tab: RoundTab) => void;
  displayedRounds: RoundItem[];
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
