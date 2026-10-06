import type { RootStackParamList } from './types';

/**
 * Shape accepted by `navigation.reset(...)` — the subset we build here.
 */
export interface PostSubmitResetState {
  index: number;
  routes: {
    name: keyof RootStackParamList;
    params?: RootStackParamList[keyof RootStackParamList];
  }[];
}

/**
 * Build the navigation stack to reset to after a scorecard is submitted.
 *
 * The user lands on `ViewRound`. For competition rounds we must place the
 * competition's `CompetitionDetail` screen *underneath* `ViewRound` in the
 * stack. `ViewRoundScreen`'s back handler navigates to `CompetitionDetail`,
 * which — when an instance already exists below — pops back to it rather than
 * pushing a fresh copy. Without this underlying screen, back on `ViewRound`
 * pushes a new `CompetitionDetail`, whose own back pops straight to
 * `ViewRound`, trapping the user bouncing between the two screens.
 *
 * Standalone rounds have no competition, so the stack is just
 * `[MainTabs, ViewRound]` and back returns to the tabs.
 */
export function buildPostSubmitResetState(
  roundId: string,
  competitionId?: string | null
): PostSubmitResetState {
  const isCompetitionRound = !!competitionId && competitionId !== 'standalone';

  if (isCompetitionRound) {
    return {
      index: 2,
      routes: [
        { name: 'MainTabs' },
        { name: 'CompetitionDetail', params: { id: competitionId, initialTab: 'rounds' } },
        { name: 'ViewRound', params: { roundId, competitionId } },
      ],
    };
  }

  return {
    index: 1,
    routes: [
      { name: 'MainTabs' },
      { name: 'ViewRound', params: { roundId, competitionId: undefined } },
    ],
  };
}
