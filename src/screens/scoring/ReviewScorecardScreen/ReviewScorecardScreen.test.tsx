/** Review finish screen: real review hook, banner and scorecard tab. */
import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import ReviewScorecardScreen from './index';
import { useScorecardStore } from '@/store/scorecardStore';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { Player, Scorecard } from '@/types';
import type { NineType } from '@/types/database/enums';

jest.mock('@/store/scorecardStore', () => ({ useScorecardStore: jest.fn() }));
jest.mock('@/hooks/useSocialAccess', () => ({ useSocialAccess: () => ({ isRestricted: false }) }));
jest.mock('@/hooks', () => ({
  useAuth: () => ({ player: { id: 'p1' } }),
  useConfirmationDialog: () => ({ dialogConfig: null, showDialog: jest.fn(), dismissDialog: jest.fn() }),
}));
jest.mock('@/hooks/useScoreMismatch', () => ({
  usePendingMismatches: () => ({ data: [] }),
  useResolveMismatch: () => ({ mutateAsync: jest.fn(), isPending: false }),
  usePartnerStatus: () => ({ data: null }),
}));
jest.mock('@/hooks/scorecard', () => ({
  useRoundScoringPairs: () => ({ scoringPairsEnabled: false, myScorer: null }),
  useScorecardsRealtime: jest.fn(),
}));
jest.mock('@/hooks/rounds', () => ({ useRoundScorecards: () => ({ data: [] }) }));
jest.mock('@/hooks/shots', () => ({
  useDeleteShot: () => ({ mutate: jest.fn() }),
  useSetShotClub: () => ({ mutate: jest.fn() }),
}));
jest.mock('@/hooks/queries/useBag', () => ({ useBag: () => ({ data: [] }) }));
jest.mock('@/screens/rounds/ViewRoundScreen/tabs/StatsTab', () => ({ StatsTab: () => null }));
jest.mock('@/components/features/shots/ShotLogList', () => ({ ShotLogList: () => null }));
jest.mock('@/components/features/bag/BagClubPickerSheet', () => ({ BagClubPickerSheet: () => null }));
jest.mock('@/components/scoring', () => ({ MismatchResolutionModal: () => null }));
jest.mock('@/components/leaderboard', () => ({ SubMatchLeaderboardTab: () => null }));
jest.mock('./hooks', () => ({
  useScoreReview: jest.requireActual('./hooks/useScoreReview').useScoreReview,
  useReviewScorecardTabs: () => ({
    activeTab: 'scorecard', tabs: [], showTabs: false, handleTabChange: jest.fn(),
    effectiveGameType: 'stroke', isScramble: false, isShamble: false,
    isMatchPlayTeam: false, isSubMatchRound: false, roundDetails: null,
    scoringPairsRequired: false, skinsGame: null, wolfGame: null,
    hasWolfGame: false, hasPayoutsTab: false, hasStats: false,
  }),
  useScrambleTeams: () => [],
  // Submission is out of this task's scope; keep its validation callback live.
  useScoreSubmission: ({ validateScores }: { validateScores: () => unknown }) => ({
    isSubmitting: false, isRefreshing: false, pendingSyncs: 0, syncError: null,
    handleSubmit: validateScores, handleSyncPress: jest.fn(), handleRefresh: jest.fn(),
    getOfflineStatus: () => 'synced', showMismatchModal: false,
    setShowMismatchModal: jest.fn(), dialogConfig: null, dismissDialog: jest.fn(),
  }),
}));
jest.mock('./components', () => ({
  ScorecardTabContent: jest.requireActual('./components/ScorecardTabContent').ScorecardTabContent,
  ReviewActions: jest.requireActual('./components/ReviewActions').ReviewActions,
  IncompleteScoresModal: () => null,
  ReviewLoadingState: () => null,
  ReviewEmptyState: () => null,
}));

const mockedStore = useScorecardStore as jest.MockedFunction<typeof useScorecardStore>;
const player = { id: 'p1', name: 'Alice', handicap: 0 } as Player;
const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;
const route = { params: { roundId: 'round-1' } } as any;

function setupStore(nineType: NineType = 'full', holesPlayed: number | null = null) {
  const allHoles = create18Holes();
  const holes = nineType === 'back9' ? allHoles.slice(9) : allHoles;
  const scores: Scorecard['scores'] = {};
  for (const hole of holes) scores[hole.number] = { strokes: hole.par };
  const state = {
    currentRoundId: 'round-1', currentPlayers: [player],
    groupScorecards: new Map([['p1', {
      id: 'sc-p1', roundId: 'round-1', playerId: 'p1', scores,
      totalGross: 0, totalNet: 0, status: 'in-progress',
      createdAt: new Date('2026-10-07'), updatedAt: new Date('2026-10-07'),
    }]]),
    holes, gameType: 'stroke', getPlayerScore: (_id: string, number: number) => scores[number],
    submitScorecards: jest.fn(), resetRound: jest.fn(), setCurrentHole: jest.fn(),
    selectedTeeData: null, handicapSource: 'profile', startHole: 1,
    allowedPlayerIds: [], isMultiBall: false, ballCount: 1, nineType, holesPlayed,
  };
  mockedStore.mockReturnValue(state as any);
  return state;
}

const review = () => <ReviewScorecardScreen navigation={navigation} route={route} />;

describe('ReviewScorecardScreen — ended early', () => {
  it.each(['full', 'back9'] as const)('shows the ended-early banner without a Finish action (%s)', (nineType) => {
    setupStore(nineType, 6);
    render(review());
    expect(screen.getByText(`Ended after 6 of ${nineType === 'full' ? 18 : 9}`)).toBeTruthy();
    expect(screen.queryByText('Finish')).toBeNull();
    expect(screen.queryByTestId('ended-early-finish')).toBeNull();
  });

  it('forwards only cutoff changes to the real back-nine scorecard tab', () => {
    const state = setupStore('back9');
    const { rerender } = render(review());
    expect(screen.getByText('17')).toBeTruthy();
    state.holesPlayed = 6;
    rerender(review());
    // Hole 15 has SI 18, so use hole 17 to distinguish rows from stroke indexes.
    expect(screen.queryByText('17')).toBeNull();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getAllByText('23').length).toBeGreaterThan(0);
    state.holesPlayed = 3;
    rerender(review());
    expect(screen.queryByText('15')).toBeNull();
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
  });

  it('uses played-range validation through the finish-screen submit action', () => {
    const state = setupStore('full', 6);
    const scores = state.groupScorecards.get('p1')!.scores;
    delete scores[18];
    render(review());
    fireEvent.press(screen.getByLabelText('Submit all scores'));
    expect(screen.getByLabelText('Submit all scores')).toBeTruthy();
    delete scores[6];
    fireEvent.press(screen.getByLabelText('Submit all scores'));
    expect(screen.queryByLabelText('Submit all scores')).toBeNull();
  });

  it.each([null, 0, -3, 2.5, NaN])('keeps planned rows and hides the banner for an unset or invalid marker (%s)', (holesPlayed) => {
    setupStore('full', holesPlayed);
    render(review());
    expect(screen.queryByTestId('ended-early-banner')).toBeNull();
    expect(screen.getAllByText('18').length).toBeGreaterThan(0);
  });
});
