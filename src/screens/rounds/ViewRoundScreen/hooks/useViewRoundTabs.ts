import { useMemo } from 'react';
import type { TabItem } from '@/components/common/Tabs';
import { BASE_TABS, type TabKey } from '../types';

interface UseViewRoundTabsParams {
  isMatchPlayRound: boolean;
  isTeamMatchPlayRound: boolean;
  isShambleRound: boolean;
  isScrambleRound: boolean;
  isStrokePlayRound: boolean;
  hasSkinsGame: boolean;
  hasWolfGame: boolean;
  hasPayoutsTab: boolean;
}

export function useViewRoundTabs({
  isMatchPlayRound,
  isTeamMatchPlayRound,
  isShambleRound,
  isScrambleRound,
  isStrokePlayRound,
  hasSkinsGame,
  hasWolfGame,
  hasPayoutsTab,
}: UseViewRoundTabsParams) {
  return useMemo<TabItem<TabKey>[]>(() => {
    const baseTabs = isScrambleRound
      ? BASE_TABS.filter((tab) => tab.key !== 'scorecard')
      : [...BASE_TABS];

    const result: TabItem<TabKey>[] = baseTabs;

    if (isMatchPlayRound || isTeamMatchPlayRound) {
      result.push({ key: 'match' as const, label: 'Match' });
    }

    if (isShambleRound) {
      result.push({ key: 'teamScores' as const, label: 'Team Scores' });
    }

    if (isScrambleRound) {
      result.push({ key: 'scrambleTeamScore' as const, label: 'Scorecard' });
      result.push({ key: 'scrambleLeaderboard' as const, label: 'Leaderboard' });
      result.push({ key: 'scrambleContributions' as const, label: 'Contributions' });
    }

    if (isStrokePlayRound) {
      result.push({ key: 'leaderboard' as const, label: 'Leaderboard' });
    }

    if (hasSkinsGame) {
      result.push({ key: 'skins' as const, label: 'Skins' });
    }

    if (hasWolfGame) {
      result.push({ key: 'wolf' as const, label: 'Wolf' });
    }

    if (hasPayoutsTab) {
      result.push({ key: 'payouts' as const, label: 'Payouts' });
    }

    return result;
  }, [isMatchPlayRound, isTeamMatchPlayRound, isShambleRound, isScrambleRound, isStrokePlayRound, hasSkinsGame, hasWolfGame, hasPayoutsTab]);
}
