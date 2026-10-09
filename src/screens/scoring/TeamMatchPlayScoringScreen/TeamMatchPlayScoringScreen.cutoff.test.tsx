import React from 'react';
import { render, createMockNavigation } from '@/__tests__/utils/renderHelpers';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import TeamMatchPlayScoringScreen from './index';
import { useScorecardStore } from '@/store/scorecardStore';
import { useRoundDetails } from '@/hooks/useRoundDetails';
import { useTeamMatchPlayState } from './hooks';

jest.mock('@/components/common', () => ({ LoadingSpinner: () => null }));
jest.mock('@/components/scorecard', () => ({}));
jest.mock('./components', () => ({}));
jest.mock('@/store/subscriptionStore', () => ({ useIsSuperAdmin: () => false }));
jest.mock('@/store/scorecardStore', () => ({ useScorecardStore: jest.fn() }));
jest.mock('@/hooks/useRoundDetails', () => ({ useRoundDetails: jest.fn() }));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({ teams: [], isLoading: true }),
}));
jest.mock('@/hooks/rounds', () => ({
  useSubMatches: () => ({}),
  useUpdateSubMatchResult: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/hooks/competitions', () => ({ useCompetitionInfo: () => ({}) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({}) }));
jest.mock('@/hooks/usePlayingHandicap', () => ({ calculatePlayingHandicap: jest.fn() }));
jest.mock('@/hooks', () => ({ useOnlineStatus: () => true, useProcessSkinsIfNeeded: () => ({}) }));
jest.mock('@/hooks/scorecard', () => ({
  usePlayedHoleRange: jest.requireActual('@/hooks/scorecard/usePlayedHoleRange').usePlayedHoleRange,
  useOfflineSync: () => ({}),
  useEndRoundEarly: () => ({ canEndRoundEarly: false, sheetProps: {} }),
}));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({}) }));
jest.mock('./hooks', () => ({
  useTeamMatchPlayScores: () => ({}),
  useTeamMatchPlayState: jest.fn(() => ({})),
  useTeamMatchPlayNavigation: () => ({}),
}));

const planned = create18Holes();
const screenProps = {
  navigation: createMockNavigation(),
  route: { params: { roundId: 'round' } },
} as unknown as React.ComponentProps<typeof TeamMatchPlayScoringScreen>;

it.each([18, 9])(
  'forwards store cutoff and planned %i-hole context even with played-only course holes',
  (count) => {
    const holes = planned.slice(count === 9 ? 9 : 0);
    const state = { currentPlayers: [], holes, holesPlayed: 3 };
    jest
      .mocked(useScorecardStore)
      .mockImplementation((selector: any) => (selector ? selector(state) : state));
    jest.mocked(useRoundDetails).mockReturnValue({
      data: { nine_type: count === 9 ? 'back9' : 'full', course: { holes: holes.slice(0, 3) } },
      isLoading: true,
    } as any);
    render(<TeamMatchPlayScoringScreen {...screenProps} />);
    expect(useTeamMatchPlayState).toHaveBeenLastCalledWith(
      expect.objectContaining({ totalHoles: count, plannedHoles: holes, holesPlayed: 3 })
    );
  }
);

it('uses the round planned count when an ended store has no planned holes yet', () => {
  const state = { currentPlayers: [], holes: [], holesPlayed: 3 };
  jest
    .mocked(useScorecardStore)
    .mockImplementation((selector: any) => (selector ? selector(state) : state));
  jest.mocked(useRoundDetails).mockReturnValue({
    data: { nine_type: 'back9', course: { holes: planned.slice(9, 12) } },
    isLoading: true,
  } as any);
  render(<TeamMatchPlayScoringScreen {...screenProps} />);
  expect(useTeamMatchPlayState).toHaveBeenLastCalledWith(
    expect.objectContaining({ totalHoles: 9, plannedHoles: [], holesPlayed: 3 })
  );
});

it.each([null, 0, -1, 1.5, NaN, Infinity])(
  'preserves original course-derived count with normal/invalid marker %s',
  (marker) => {
    const state = { currentPlayers: [], holes: planned, holesPlayed: marker };
    jest
      .mocked(useScorecardStore)
      .mockImplementation((selector: any) => (selector ? selector(state) : state));
    jest
      .mocked(useRoundDetails)
      .mockReturnValue({
        data: { nine_type: 'back9', course: { holes: planned } },
        isLoading: true,
      } as any);
    render(<TeamMatchPlayScoringScreen {...screenProps} />);
    expect(useTeamMatchPlayState).toHaveBeenLastCalledWith(
      expect.objectContaining({ totalHoles: 9 })
    );
  }
);
