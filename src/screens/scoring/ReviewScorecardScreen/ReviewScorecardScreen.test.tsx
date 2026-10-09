/** Review finish screen: real caller/hook, banner, actions and scorecard tab. */
import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import ReviewScorecardScreen from './index';
import { useScorecardStore } from '@/store/scorecardStore';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { Hole, Player, Scorecard } from '@/types';
import type { NineType } from '@/types/database/enums';

jest.mock('@/store/scorecardStore', () => ({ useScorecardStore: jest.fn() }));
jest.mock('@/hooks/useSocialAccess', () => ({ useSocialAccess: () => ({ isRestricted: false }) }));
jest.mock('@/hooks', () => ({
  useAuth: () => ({ player: { id: 'p1' } }),
  useConfirmationDialog: () => ({ dialogConfig: null, showDialog: jest.fn(), dismissDialog: jest.fn() }),
}));
jest.mock('@/hooks/useScoreMismatch', () => ({
  usePendingMismatches: () => ({ data: mockPendingMismatches }),
  useResolveMismatch: () => ({ mutateAsync: jest.fn(), isPending: false }),
  usePartnerStatus: (...args: unknown[]) => mockPartnerStatus(...args),
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
const mockStatsTab = jest.fn((_props: unknown) => null);
const mockShotLogList = jest.fn((_props: unknown) => null);
const mockContributions = jest.fn((_props: unknown) => null);
const mockScrambleLeaderboard = jest.fn((_props: unknown) => null);
const mockLeaderboard = jest.fn((_props: unknown) => null);
const mockMatchScorecard = jest.fn((_props: unknown) => null);
const mockMatchLeaderboard = jest.fn((_props: unknown) => null);
const mockSubMatchLeaderboard = jest.fn((_props: unknown) => null);
const mockSkins = jest.fn((_props: unknown) => null);
const mockWolf = jest.fn((_props: unknown) => null);
let mockPendingMismatches: { id: string; hole_number: number }[] = [];
const mockMismatchModal = jest.fn((_props: unknown) => null);
const mockSubmission = jest.fn();
const mockPartnerStatus = jest.fn((..._args: unknown[]) => ({ data: null }));
const mockTabs = jest.fn();
jest.mock('@/screens/rounds/ViewRoundScreen/tabs/StatsTab', () => ({ StatsTab: (props: unknown) => mockStatsTab(props) }));
jest.mock('@/components/features/shots/ShotLogList', () => ({ ShotLogList: (props: unknown) => mockShotLogList(props) }));
jest.mock('@/components/features/bag/BagClubPickerSheet', () => ({ BagClubPickerSheet: () => null }));
jest.mock('@/components/scoring', () => ({ MismatchResolutionModal: (props: unknown) => mockMismatchModal(props) }));
jest.mock('@/components/leaderboard', () => ({ SubMatchLeaderboardTab: (props: unknown) => mockSubMatchLeaderboard(props) }));
jest.mock('./hooks', () => ({
  useScoreReview: jest.requireActual('./hooks/useScoreReview').useScoreReview,
  useReviewScorecardTabs: () => mockTabs(),
  useScrambleTeams: () => [],
  // Observe the actual Review caller while keeping its validation callback live.
  useScoreSubmission: (params: { validateScores: () => unknown }) => {
    mockSubmission(params);
    return {
      isSubmitting: false, isRefreshing: false, pendingSyncs: 0, syncError: null,
      handleSubmit: params.validateScores, handleSyncPress: jest.fn(), handleRefresh: jest.fn(),
      getOfflineStatus: () => 'synced', showMismatchModal: false,
      setShowMismatchModal: jest.fn(), dialogConfig: null, dismissDialog: jest.fn(),
    };
  },
}));
jest.mock('./components', () => ({
  ScorecardTabContent: jest.requireActual('./components/ScorecardTabContent').ScorecardTabContent,
  ReviewActions: jest.requireActual('./components/ReviewActions').ReviewActions,
  ContributionsTabContent: (props: unknown) => mockContributions(props),
  ScrambleLeaderboardTab: (props: unknown) => mockScrambleLeaderboard(props),
  LeaderboardTabContent: (props: unknown) => mockLeaderboard(props),
  MatchScorecardTabContent: (props: unknown) => mockMatchScorecard(props),
  MatchPlayLeaderboardTab: (props: unknown) => mockMatchLeaderboard(props),
  SkinsTabContent: (props: unknown) => mockSkins(props),
  WolfTabContent: (props: unknown) => mockWolf(props),
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

const defaultTabs = {
  activeTab: 'scorecard', tabs: [], showTabs: false, handleTabChange: jest.fn(),
  effectiveGameType: 'stroke', isScramble: false, isShamble: false,
  isMatchPlayTeam: false, isSubMatchRound: false, roundDetails: null,
  scoringPairsRequired: false, skinsGame: null, wolfGame: null,
  hasWolfGame: false, hasPayoutsTab: false, hasStats: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPendingMismatches = [];
  mockTabs.mockReturnValue(defaultTabs);
});

function lastProps(mock: jest.Mock): any {
  return mock.mock.calls[mock.mock.calls.length - 1][0];
}

const review = () => <ReviewScorecardScreen navigation={navigation} route={route} />;

describe('ReviewScorecardScreen — ended early', () => {
  describe.each(['full', 'back9'] as const)('played tab routing (%s)', (nineType) => {
    it.each([
      ['stats', mockStatsTab, { hasStats: true }],
      ['contributions', mockContributions, { isShamble: true }],
      ['leaderboard', mockLeaderboard, {}],
      ['leaderboard', mockScrambleLeaderboard, { isScramble: true }],
    ] as const)('updates %s display holes when only the cutoff changes', (activeTab, target, flags) => {
      const state = setupStore(nineType);
      mockTabs.mockReturnValue({ ...defaultTabs, activeTab, ...flags });
      const { rerender } = render(review());
      expect(lastProps(target).holes.map((hole: Hole) => hole.number)).toEqual(
        nineType === 'back9' ? [10, 11, 12, 13, 14, 15, 16, 17, 18] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
      );
      state.holesPlayed = 6;
      rerender(review());
      expect(lastProps(target).holes.map((hole: Hole) => hole.number)).toEqual(
        nineType === 'back9' ? [10, 11, 12, 13, 14, 15] : [1, 2, 3, 4, 5, 6]
      );
      expect(lastProps(mockSubmission).holeCount).toBe(6);
      expect(mockPartnerStatus).toHaveBeenLastCalledWith('round-1', 'p1', 6);
      state.holesPlayed = 3;
      rerender(review());
      expect(lastProps(target).holes.map((hole: Hole) => hole.number)).toEqual(
        nineType === 'back9' ? [10, 11, 12] : [1, 2, 3]
      );
      state.holesPlayed = null;
      rerender(review());
      expect(lastProps(target).holes.map((hole: Hole) => hole.number)).toEqual(state.holes.map((hole) => hole.number));
    });

    it('forwards physical played hole numbers and current progress to the shot log', () => {
      const state = setupStore(nineType, 6);
      mockTabs.mockReturnValue({ ...defaultTabs, activeTab: 'shots' });
      const { rerender } = render(review());
      expect(lastProps(mockShotLogList).holeNumbers).toEqual(nineType === 'back9' ? [10, 11, 12, 13, 14, 15] : [1, 2, 3, 4, 5, 6]);
      expect(lastProps(mockShotLogList).totalHoles).toBe(6);
      state.holesPlayed = 3;
      rerender(review());
      expect(lastProps(mockShotLogList).holeNumbers).toEqual(nineType === 'back9' ? [10, 11, 12] : [1, 2, 3]);
      expect(lastProps(mockShotLogList).totalHoles).toBe(3);
    });
  });

  it('keeps the tee-derived leaderboard daily handicap from planned par after cutoff changes', () => {
    const state = setupStore();
    state.currentPlayers = [{ ...player, handicap: 10 }];
    mockedStore.mockReturnValue({ ...state, selectedTeeData: { slopeRating: 113, courseRating: 72 } } as any);
    mockTabs.mockReturnValue({ ...defaultTabs, activeTab: 'leaderboard', effectiveGameType: 'stableford' });
    const { rerender } = render(review());
    expect(lastProps(mockLeaderboard).dailyHandicaps).toEqual({ p1: 9 });
    mockedStore.mockReturnValue({ ...state, selectedTeeData: { slopeRating: 113, courseRating: 72 }, holesPlayed: 6 } as any);
    rerender(review());
    expect(lastProps(mockLeaderboard).holes).toHaveLength(6);
    expect(lastProps(mockLeaderboard).dailyHandicaps).toEqual({ p1: 9 });
  });

  it.each([
    ['scorecard', mockMatchScorecard, { isMatchPlayTeam: true }],
    ['leaderboard', mockMatchLeaderboard, { isMatchPlayTeam: true }],
    ['leaderboard', mockSubMatchLeaderboard, { isSubMatchRound: true }],
  ] as const)('keeps planned holes for match context on %s', (activeTab, target, flags) => {
    const state = setupStore('back9', 6);
    mockTabs.mockReturnValue({ ...defaultTabs, activeTab, ...flags });
    render(review());
    expect(lastProps(target).holes).toBe(state.holes);
  });

  it('forwards played progress to the Wolf tab', () => {
    const state = setupStore('back9', 6);
    mockTabs.mockReturnValue({ ...defaultTabs, activeTab: 'wolf', wolfGame: { id: 'wolf-1' }, hasWolfGame: true });
    const { rerender } = render(review());
    expect(lastProps(mockWolf).totalHoles).toBe(6);
    state.holesPlayed = 3;
    rerender(review());
    expect(lastProps(mockWolf).totalHoles).toBe(3);
  });

  it.each([
    ['stats', mockStatsTab, { hasStats: true }],
    ['contributions', mockContributions, { isShamble: true }],
    ['leaderboard', mockLeaderboard, {}],
    ['leaderboard', mockScrambleLeaderboard, { isScramble: true }],
  ] as const)('keeps planned holes on ordinary %s tabs', (activeTab, target, flags) => {
    const state = setupStore();
    mockTabs.mockReturnValue({ ...defaultTabs, activeTab, ...flags });
    render(review());
    expect(lastProps(target).holes).toBe(state.holes);
    expect(lastProps(mockSubmission).holeCount).toBe(18);
    expect(mockPartnerStatus).toHaveBeenLastCalledWith('round-1', 'p1', 18);
  });

  it('keeps ordinary back-nine shot progress at nine holes', () => {
    setupStore('back9');
    mockTabs.mockReturnValue({ ...defaultTabs, activeTab: 'shots' });
    render(review());
    expect(lastProps(mockShotLogList).totalHoles).toBe(9);
    expect(Object.keys(lastProps(mockShotLogList).holeStrokeCounts)).toEqual(['10', '11', '12', '13', '14', '15', '16', '17', '18']);
  });
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


describe('Review readiness and mismatch routing', () => {
  it.each(['full', 'back9'] as const)('keeps planned readiness and every pending modal row (%s)', (nineType) => {
    setupStore(nineType);
    mockPendingMismatches = [{ id: 'played', hole_number: 12 }, { id: 'later', hole_number: 17 }];
    render(review());
    expect(lastProps(mockSubmission).playedHoleNumbers).toBeUndefined();
    expect(lastProps(mockSubmission).holeCount).toBe(nineType === 'back9' ? 9 : 18);
    expect(lastProps(mockMismatchModal).mismatches).toBe(mockPendingMismatches);
  });

  it.each(['full', 'back9'] as const)('forwards physical readiness holes through cutoff-only changes (%s)', (nineType) => {
    const state = setupStore(nineType, 6);
    const { rerender } = render(review());
    expect(lastProps(mockSubmission).playedHoleNumbers).toEqual(nineType === 'back9' ? [10, 11, 12, 13, 14, 15] : [1, 2, 3, 4, 5, 6]);
    state.holesPlayed = 3;
    rerender(review());
    expect(lastProps(mockSubmission).playedHoleNumbers).toEqual(nineType === 'back9' ? [10, 11, 12] : [1, 2, 3]);
    expect(lastProps(mockSubmission).holeCount).toBe(3);
    state.holesPlayed = null;
    rerender(review());
    expect(lastProps(mockSubmission).playedHoleNumbers).toBeUndefined();
  });

  it.each(['full', 'back9'] as const)('limits actual mismatch-modal rows through cutoff-only changes (%s)', (nineType) => {
    const state = setupStore(nineType, 6);
    mockPendingMismatches = nineType === 'back9'
      ? [{ id: 'before-nine', hole_number: 3 }, { id: 'retained', hole_number: 12 }, { id: 'boundary', hole_number: 15 }, { id: 'later', hole_number: 16 }]
      : [{ id: 'retained', hole_number: 3 }, { id: 'boundary', hole_number: 6 }, { id: 'later', hole_number: 7 }];
    const { rerender } = render(review());
    expect(lastProps(mockMismatchModal).mismatches.map((row: { id: string }) => row.id)).toEqual(['retained', 'boundary']);
    state.holesPlayed = 3;
    rerender(review());
    expect(lastProps(mockMismatchModal).mismatches.map((row: { id: string }) => row.id)).toEqual(['retained']);
    state.holesPlayed = null;
    rerender(review());
    expect(lastProps(mockMismatchModal).mismatches).toBe(mockPendingMismatches);
  });

  it.each([0, -3, 2.5, NaN])('keeps ordinary readiness for an invalid early-end marker (%s)', (marker) => {
    setupStore('back9', marker);
    render(review());
    expect(lastProps(mockSubmission).playedHoleNumbers).toBeUndefined();
    expect(lastProps(mockSubmission).holeCount).toBe(9);
    expect(screen.queryByTestId('ended-early-banner')).toBeNull();
  });

  it.each([0, -3, 2.5, NaN])('keeps every modal row for an invalid early-end marker (%s)', (marker) => {
    setupStore('back9', marker);
    mockPendingMismatches = [{ id: 'outside-nine', hole_number: 3 }, { id: 'planned', hole_number: 17 }];
    render(review());
    expect(lastProps(mockMismatchModal).mismatches).toBe(mockPendingMismatches);
  });
});


describe('Review skins preview', () => {
  function showSkins(roundDetails: unknown = null) {
    mockTabs.mockReturnValue({
      ...defaultTabs, activeTab: 'skins', skinsGame: { id: 'skins-1' }, roundDetails,
    });
  }

  it.each(['full', 'back9'] as const)('keeps ordinary planned %s counts while the round row loads', (nineType) => {
    setupStore(nineType);
    showSkins();
    render(review());
    expect(lastProps(mockSkins).holeCounts).toEqual(nineType === 'full'
      ? { plannedHoles: 18, holesPlayed: 18 } : { plannedHoles: 9, holesPlayed: 9 });
  });

  it('falls back to eighteen when neither the round row nor planned holes are loaded', () => {
    const state = setupStore();
    state.holes = [];
    showSkins();
    render(review());
    expect(lastProps(mockSkins).holeCounts).toEqual({ plannedHoles: 18, holesPlayed: 18 });
  });

  it('keeps authoritative already-ended counts ahead of the local cutoff', () => {
    setupStore('back9', 8);
    showSkins({ nine_type: 'back9', holes_played: 4 });
    render(review());
    expect(lastProps(mockSkins).holeCounts).toEqual({ plannedHoles: 9, holesPlayed: 4 });
  });

  it('preserves an explicit full-length server count ahead of the local cutoff', () => {
    setupStore('full', 6);
    showSkins({ nine_type: 'full', holes_played: 18 });
    render(review());
    expect(lastProps(mockSkins).holeCounts).toEqual({ plannedHoles: 18, holesPlayed: 18 });
  });

  it.each(['full', 'back9'] as const)('uses the local offline cutoff with planned %s pricing while the server end is unset', (nineType) => {
    const state = setupStore(nineType, 6);
    const roundDetails = { nine_type: nineType, holes_played: null };
    showSkins(roundDetails);
    const { rerender } = render(review());
    expect(lastProps(mockSkins).holeCounts).toEqual(nineType === 'full'
      ? { plannedHoles: 18, holesPlayed: 6 } : { plannedHoles: 9, holesPlayed: 6 });
    state.holesPlayed = 3;
    rerender(review());
    expect(lastProps(mockSkins).holeCounts).toEqual(nineType === 'full'
      ? { plannedHoles: 18, holesPlayed: 3 } : { plannedHoles: 9, holesPlayed: 3 });
    state.holesPlayed = null;
    rerender(review());
    expect(lastProps(mockSkins).holeCounts).toEqual(nineType === 'full'
      ? { plannedHoles: 18, holesPlayed: 18 } : { plannedHoles: 9, holesPlayed: 9 });
    expect(roundDetails.holes_played).toBeNull();
  });

  it.each(['full', 'back9'] as const)('keeps planned %s pricing with a local cutoff while the round row loads', (nineType) => {
    const state = setupStore(nineType, 6);
    showSkins();
    const { rerender } = render(review());
    expect(lastProps(mockSkins).holeCounts).toEqual(nineType === 'full'
      ? { plannedHoles: 18, holesPlayed: 6 } : { plannedHoles: 9, holesPlayed: 6 });
    state.holesPlayed = 3;
    rerender(review());
    expect(lastProps(mockSkins).holeCounts).toEqual(nineType === 'full'
      ? { plannedHoles: 18, holesPlayed: 3 } : { plannedHoles: 9, holesPlayed: 3 });
  });

  it.each([0, -3, 2.5, NaN])('keeps ordinary counts for an invalid local marker (%s)', (marker) => {
    setupStore('back9', marker);
    showSkins({ nine_type: 'back9', holes_played: null });
    render(review());
    expect(lastProps(mockSkins).holeCounts).toEqual({ plannedHoles: 9, holesPlayed: 9 });
  });
});


describe('Review Wolf played-hole routing', () => {
  it.each(['full', 'back9'] as const)('forwards physical %s rows through cutoff-only changes', nineType => {
    const state = setupStore(nineType);
    mockTabs.mockReturnValue({ ...defaultTabs, activeTab: 'wolf', wolfGame: { id: 'wolf-1' }, hasWolfGame: true });
    const { rerender } = render(review());
    expect(lastProps(mockWolf).holeNumbers).toEqual(state.holes.map(h => h.number));
    expect(lastProps(mockWolf).totalHoles).toBe(nineType === 'full' ? 18 : 9);
    state.holesPlayed = 6;
    rerender(review());
    expect(lastProps(mockWolf).holeNumbers).toEqual(nineType === 'full' ? [1, 2, 3, 4, 5, 6] : [10, 11, 12, 13, 14, 15]);
    expect(lastProps(mockWolf).totalHoles).toBe(6);
    state.holesPlayed = 2;
    rerender(review());
    expect(lastProps(mockWolf).holeNumbers).toEqual(nineType === 'full' ? [1, 2] : [10, 11]);
    expect(lastProps(mockWolf).totalHoles).toBe(2);
    state.holesPlayed = null;
    rerender(review());
    expect(lastProps(mockWolf).holeNumbers).toEqual(state.holes.map(h => h.number));
  });
  it('forwards the existing generated eighteen-hole fallback when store holes are absent', () => {
    const state = setupStore();
    state.holes = [];
    mockTabs.mockReturnValue({ ...defaultTabs, activeTab: 'wolf', wolfGame: { id: 'wolf-1' }, hasWolfGame: true });
    render(review());
    expect(lastProps(mockWolf).holeNumbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(lastProps(mockWolf).totalHoles).toBe(18);
  });
});
