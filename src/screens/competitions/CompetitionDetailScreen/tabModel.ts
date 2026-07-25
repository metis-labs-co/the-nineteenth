import type { TabItem } from '@/components/common/Tabs';
import type { CompetitionStatus, CompetitionType } from '@/types/database/enums';

export type CompetitionDetailTab =
  | 'details'
  | 'rounds'
  | 'players'
  | 'teams'
  | 'leaderboard'
  | 'bracket'
  | 'stats'
  | 'payouts'
  | 'skins'
  | 'breakdown';

export type CompetitionDetailRole = 'organizer' | 'competitor';

interface TabAvailability {
  roundsCount: number;
  playersCount: number;
  teams: boolean;
  stats: boolean;
  breakdown: boolean;
  payouts: boolean;
  skins: boolean;
  skinsCount?: number;
}

interface BuildCompetitionDetailTabsOptions {
  role: CompetitionDetailRole;
  competitionType: CompetitionType;
  status: CompetitionStatus;
  availability: TabAvailability;
}

export function getDefaultCompetitionDetailTab(
  role: CompetitionDetailRole,
  competitionType: CompetitionType
): CompetitionDetailTab {
  if (role === 'organizer') return 'details';
  return competitionType === 'knockout' ? 'bracket' : 'leaderboard';
}

export function reconcileCompetitionDetailTab(
  requestedTab: CompetitionDetailTab,
  tabs: TabItem<CompetitionDetailTab>[],
  role: CompetitionDetailRole,
  competitionType: CompetitionType
): CompetitionDetailTab {
  return tabs.some((tab) => tab.key === requestedTab)
    ? requestedTab
    : getDefaultCompetitionDetailTab(role, competitionType);
}

export function buildCompetitionDetailTabs({
  role,
  competitionType,
  status,
  availability,
}: BuildCompetitionDetailTabsOptions): TabItem<CompetitionDetailTab>[] {
  const isCompleted = status === 'completed';
  const primaryTab: TabItem<CompetitionDetailTab> =
    competitionType === 'knockout'
      ? { key: 'bracket', label: 'Bracket' }
      : { key: 'leaderboard', label: isCompleted ? 'Results' : 'Standings' };

  if (role === 'competitor') {
    return [
      primaryTab,
      { key: 'rounds', label: 'Rounds', count: availability.roundsCount },
      { key: 'players', label: 'Players', count: availability.playersCount },
      ...(isCompleted && availability.payouts
        ? [{ key: 'payouts' as const, label: 'Payouts' }]
        : []),
    ];
  }

  return [
    { key: 'details', label: 'Details' },
    { key: 'rounds', label: 'Rounds', count: availability.roundsCount },
    primaryTab,
    ...(availability.stats ? [{ key: 'stats' as const, label: 'Stats' }] : []),
    ...(availability.breakdown
      ? [{ key: 'breakdown' as const, label: 'Breakdown' }]
      : []),
    { key: 'players', label: 'Players', count: availability.playersCount },
    ...(availability.teams ? [{ key: 'teams' as const, label: 'Teams' }] : []),
    ...(availability.payouts ? [{ key: 'payouts' as const, label: 'Payouts' }] : []),
    ...(availability.skins
      ? [
          {
            key: 'skins' as const,
            label: 'Skins',
            count: availability.skinsCount,
          },
        ]
      : []),
  ];
}
