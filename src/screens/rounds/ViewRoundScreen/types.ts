import type { TabItem } from '@/components/common/Tabs';

export type TabKey =
  | 'details'
  | 'scorecard'
  | 'stats'
  | 'match'
  | 'skins'
  | 'wolf'
  | 'payouts'
  | 'teamScores'
  | 'scrambleTeamScore'
  | 'scrambleLeaderboard'
  | 'scrambleContributions'
  | 'leaderboard';

export const BASE_TABS: TabItem<TabKey>[] = [
  { key: 'details', label: 'Details' },
  { key: 'scorecard', label: 'Scorecard' },
];
