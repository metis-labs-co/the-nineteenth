/** Real range/navigation, review handlers and footers; swipe/progress props expose the screen boundary. Persistence is mocked. */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import ScorecardEntryScreen from '@/screens/scoring/ScorecardEntryScreen';
import MatchPlayScoringScreen from '@/screens/scoring/MatchPlayScoringScreen';
import type { UseEndRoundEarlyArgs } from '@/hooks/scorecard/useEndRoundEarly';
import { create18Holes } from '@/__tests__/utils/testFixtures';

let mockHoles = create18Holes();
let mockSwipe: any;
let mockProgress: any;
let mockScoreContent: any;
let mockHeader: any;
let mockRenderedHeaders: number[] = [];
const mockCalculateHandicap = jest.fn((_args: any) => ({ playingHandicap: 11 }));
const mockSubmit = jest.fn();
const mockScoreSelect = jest.fn();
const mockPlayers = [
  { id: 'sam', name: 'Sam' },
  { id: 'ben', name: 'Ben' },
];
let mockLoading = false;
let mockRound: { competition_id: string | null; scoring_pairs_required?: boolean } | undefined;
let mockPairsFallback = false;
let mockEndArgs: UseEndRoundEarlyArgs;
const mockConfirm = jest.fn();
const mockCancel = jest.fn();
const mockStore = {
  currentRoundId: 'round',
  currentHole: 1,
  nineType: 'full',
  holesPlayed: null as number | null,
  submitScorecards: mockSubmit,
  setPlayerScore: mockScoreSelect,
  currentPlayers: mockPlayers,
  holes: mockHoles,
  isInitialized: true,
  isLoading: false,
  handicapSource: 'none',
  playerTeeMap: new Map(),
  allowedPlayerIds: ['sam', 'ben'],
  groupScorecards: new Map(),
  setCurrentHole: jest.fn((hole: number) => { mockStore.currentHole = hole; }),
  getHoleInfo: (hole: number) => mockHoles.find((h) => h.number === hole),
  getCompletedHolesCount: () => 1,
  setAllowedPlayers: jest.fn(),
};
const mockHoleResults = { 1: { player1Score: 4, player2Score: 5, winner: 'player1' } };
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: Object.assign(() => mockStore, { getState: () => mockStore }),
}));
jest.mock('@/store/subscriptionStore', () => ({ useIsSuperAdmin: () => false }));
jest.mock('@/context/ThemeContext', () => ({ useThemeColors: () => ({}), useIsDark: () => false }));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({}) }));
jest.mock('@/services/diagnostics', () => ({ pushDiagnostic: jest.fn() }));
jest.mock('@/services/activeRoundSession', () => ({ activeRoundSession: { set: jest.fn() } }));
jest.mock('@/hooks/useStatsVisibilityWithTier', () => ({ useStatsVisibilityWithTier: () => ({}) }));
jest.mock('@/hooks/useApplyAutoTeeOverrides', () => ({ useApplyAutoTeeOverrides: jest.fn() }));
jest.mock('@/hooks/activity', () => ({ useAddRoundPhotos: () => ({}) }));
jest.mock('@/hooks/usePlayingHandicap', () => ({
  calculatePlayingHandicap: (args: any) => mockCalculateHandicap(args),
}));
jest.mock('@/hooks/competitions', () => ({ useCompetitionInfo: () => ({}) }));
jest.mock('@/hooks/rounds', () => ({
  useRoundDetails: () => ({ data: mockRound }),
  useTeams: () => ({}),
  usePairings: () => ({}),
  useSubMatches: () => ({}),
  useUpdateSubMatchResult: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/hooks/rounds/mutations', () => ({ useDeleteRound: () => ({}) }));
jest.mock('@/hooks/rounds/useFinalizeSubmittedRound', () => ({
  useFinalizeSubmittedRound: () => ({}),
}));
jest.mock('@/hooks', () => ({
  useAuth: () => ({}),
  useOnlineStatus: () => true,
  useProcessSkinsIfNeeded: () => ({ processSkinsHole: () => Promise.resolve({ processed: false }) }),
  useUpdateCourseHoles: () => ({}),
  useConfirmationDialog: () => ({}),
}));
jest.mock('@/hooks/scorecard', () => ({
  usePlayedHoleRange: jest.requireActual('@/hooks/scorecard/usePlayedHoleRange').usePlayedHoleRange,
  useOfflineSync: () => ({}),
  useActiveSubMatch: () => ({}),
  useBuildAsYouPlay: () => ({ enabled: false }),
  useTeamScoring: () => ({}),
  useGroupFilter: () => ({ groupPlayers: mockPlayers }),
  useRoundData: () => ({
    courseTees: [],
    teams: [],
    gameType: 'stableford',
    teamFormat: null,
    scoringPairsEnabled: mockPairsFallback,
    playersToScore: mockPlayers,
    isLoading: mockLoading,
  }),
  useMatchPlayData: () => ({
    player1: mockPlayers[0],
    player2: mockPlayers[1],
    holes: mockHoles,
    isInitialized: true,
    isLoading: mockLoading,
  }),
  useMatchPlayScoring: () => ({
    holeResults: mockHoleResults,
    getHoleResult: () => ({ player1Score: 4, player2Score: 5 }),
    handleScoreSelect: mockScoreSelect,
    getScoreColor: () => '',
    isMatchComplete: false,
  }),
  useEndRoundEarly: (args: UseEndRoundEarlyArgs) => {
    mockEndArgs = args;
    const [visible, setVisible] = require('react').useState(false);
    return {
      canEndRoundEarly: args.isStandalone && !args.scoringPairsEnabled,
      open: () => setVisible(true),
      sheetProps: {
        visible,
        plan: {
          holesPlayed: 1,
          plannedHoles: 18,
          nineType: 'full',
          lastHoleNumber: 1,
          removedScores: [],
        },
        resultPreview: 'Sam leads',
        onConfirm: mockConfirm,
        onCancel: () => {
          mockCancel();
          setVisible(false);
        },
      },
    };
  },
}));
jest.mock('@/components/scorecard', () => ({
  RoundHeader: jest.requireActual('@/components/scorecard/RoundHeader').RoundHeader,
  EndRoundEarlySheet: jest.requireActual('@/components/scorecard/EndRoundEarlySheet')
    .EndRoundEarlySheet,
  EndedEarlyBanner: jest.requireActual('@/components/scorecard/EndedEarlyBanner').EndedEarlyBanner,
  HoleHeader: (props: any) => { mockHeader = props; mockRenderedHeaders.push(props.hole.number); const { Text } = require('react-native'); return <Text>Hole {props.hole.number}</Text>; },
  QuickScorecardView: (props: any) => { mockProgress = props; return null; },
  SwipeableHoleNavigator: (props: any) => { mockSwipe = props; return props.renderHole(props.currentHole); },
  ChangeTeesSheet: () => null,
}));
jest.mock('@/components/skins', () => ({ SkinsIndicator: () => null }));
jest.mock('@/components/wolf', () => ({ WolfIndicator: () => null }));
jest.mock('@/components/scorecard/HoleHeader/DistanceToPin', () => ({ DistanceToPin: () => null }));
jest.mock('@/components/courses', () => ({}));
jest.mock('@/components/scorecard/ShotLogging', () => ({ InlineShotToast: () => null }));
jest.mock('@/components/scorecard/DetailedStatsSheet', () => ({}));
jest.mock('@/screens/scoring/ScorecardEntryScreen/hooks', () => ({
  useScoreHandlers: jest.requireActual(
    '@/screens/scoring/ScorecardEntryScreen/hooks/useScoreHandlers'
  ).useScoreHandlers,
  useScorecardDialogs: () => ({}),
  useScorecardNavigation: jest.requireActual('@/screens/scoring/ScorecardEntryScreen/hooks/useScorecardNavigation').useScorecardNavigation,
  useScorecardSubmission: () => ({}),
  useWolfIntegration: () => ({}),
}));
jest.mock('@/screens/scoring/ScorecardEntryScreen/components', () => ({
  ScorecardDialogs: () => null,
  ScorecardScoreContent: (props: any) => { mockScoreContent = props; return null; },
  ScorecardFooter: jest.requireActual('@/screens/scoring/ScorecardEntryScreen/components/ScorecardFooter').ScorecardFooter,
}));
jest.mock('@/screens/scoring/MatchPlayScoringScreen/components', () => ({
  MatchPlayFooter: jest.requireActual('@/screens/scoring/MatchPlayScoringScreen/components/MatchPlayFooter').MatchPlayFooter,
  PlayerScoreCard: (props: any) => { mockScoreContent = props; const Card = jest.requireActual('@/screens/scoring/MatchPlayScoringScreen/components/PlayerScoreCard').PlayerScoreCard; return <Card {...props} />; },
  MatchProgress: (props: any) => { mockProgress = props; return null; },
}));

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
function screen(kind: 'general' | 'singles', competitionId = '', initialHole?: number) {
  return kind === 'general' ? (
    <ScorecardEntryScreen
      {...({
        navigation,
        route: { params: { roundId: 'round', competitionId, initialHole } },
      } as unknown as React.ComponentProps<typeof ScorecardEntryScreen>)}
    />
  ) : (
    <MatchPlayScoringScreen
      {...({
        navigation,
        route: { params: { roundId: 'round', competitionId, initialHole } },
      } as unknown as React.ComponentProps<typeof MatchPlayScoringScreen>)}
    />
  );
}

describe.each(['general', 'singles'] as const)('%s end-early caller', (kind) => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoading = false;
    mockHoles = create18Holes();
    mockStore.holes = mockHoles;
    mockStore.holesPlayed = null;
    mockStore.nineType = 'full';
    mockStore.currentHole = 1;
    mockStore.groupScorecards = new Map();
    mockProgress = undefined;
    mockRenderedHeaders = [];
    mockStore.isInitialized = true;
    mockRound = { competition_id: null, scoring_pairs_required: false };
    mockPairsFallback = false;
  });

  it('characterization: preserves loading followed by ordinary review navigation', () => {
    mockLoading = true;
    mockStore.isInitialized = false;
    const view = render(screen(kind));
    expect(
      view.getByText(kind === 'general' ? 'Loading scorecard...' : 'Loading match...')
    ).toBeTruthy();
    expect(view.queryByLabelText('View full scorecard')).toBeNull();
    mockLoading = false;
    mockStore.isInitialized = true;
    view.rerender(screen(kind));
    fireEvent.press(view.getByLabelText('View full scorecard'));
    expect(navigation.navigate).toHaveBeenCalledWith(
      kind === 'general' ? 'ReviewScorecard' : 'MatchPlayScorecard',
      kind === 'general'
        ? { roundId: 'round', competitionId: '', holes: mockHoles }
        : { roundId: 'round', competitionId: '', player1Id: 'sam', player2Id: 'ben' }
    );
  });
  it('characterization: keeps planned progress and next/previous/swipe/jump navigation', () => {
    const view = render(screen(kind));
    expect(mockSwipe.firstHole).toBe(1);
    expect(mockSwipe.totalHoles).toBe(18);
    expect(kind === 'general' ? mockProgress.holes.length : mockProgress.holeNumbers.length).toBe(18);
    fireEvent.press(view.getByText('Next Hole'));
    view.rerender(screen(kind));
    expect(mockSwipe.currentHole).toBe(2);
    fireEvent.press(view.getByText('Previous'));
    view.rerender(screen(kind));
    expect(mockSwipe.currentHole).toBe(1);
    act(() => mockSwipe.onHoleChange(4));
    view.rerender(screen(kind));
    expect(mockSwipe.currentHole).toBe(4);
    act(() => mockProgress.onHolePress(7));
    view.rerender(screen(kind));
    expect(mockSwipe.currentHole).toBe(7);
    expect(view.queryByText('Finish')).toBeNull();
  });

  if (kind === 'general') {
    it('reopens a locally ended back nine within played holes before resume selection', async () => {
      mockHoles = create18Holes().slice(9);
      mockStore.holes = mockHoles;
      mockStore.nineType = 'back9';
      mockStore.holesPlayed = 6;
      mockStore.currentHole = 18;
      mockStore.groupScorecards = new Map(mockPlayers.map((player) => [player.id, {
        scores: Object.fromEntries([10, 11, 12, 13, 14, 15].map((h) => [h, { strokes: 4 }])),
      }]));
      const view = render(screen(kind));
      view.rerender(screen(kind));
      expect(mockStore.setCurrentHole.mock.calls.every(([hole]) => hole <= 15 && hole >= 10)).toBe(true);
      expect(mockSwipe.currentHole).toBe(15);
      expect(mockProgress.holes.map((h: any) => h.number)).toEqual([10, 11, 12, 13, 14, 15]);
      expect(mockSwipe.firstHole).toBe(10);
      expect(mockSwipe.totalHoles).toBe(15);
      expect(view.getByText('Ended after 6 of 9')).toBeTruthy();
      fireEvent.press(view.getByText('Previous'));
      view.rerender(screen(kind));
      expect(mockSwipe.currentHole).toBe(14);
      expect(view.getByText('Review Scores')).toBeTruthy();
      fireEvent.press(view.getByText('Finish'));
      fireEvent.press(view.getByText('Review Scores'));
      expect(navigation.navigate).toHaveBeenLastCalledWith('ReviewScorecard', {
        roundId: 'round', competitionId: '', holes: mockHoles,
      });
      expect(mockSubmit).not.toHaveBeenCalled();
      await act(async () => { await mockScoreContent.onScoreSelect('sam', 5); });
      expect(mockScoreSelect).toHaveBeenCalledWith('sam', 14, 5, undefined);
      expect(mockScoreContent.holes).toBe(mockHoles);
      expect(mockCalculateHandicap.mock.calls.every(([args]: any[]) => args.holes === mockHoles)).toBe(true);
    });

    it('closes navigation on cutoff changes, including captured swipe and jump callbacks', () => {
      const view = render(screen(kind));
      act(() => mockSwipe.onHoleChange(7));
      view.rerender(screen(kind));
      const oldSwipe = mockSwipe.onHoleChange;
      const oldJump = mockProgress.onHolePress;
      const oldNext = mockHeader.onNext;
      mockStore.holesPlayed = 6;
      view.rerender(screen(kind));
      view.rerender(screen(kind));
      expect(mockSwipe.currentHole).toBe(6);
      expect(mockSwipe.totalHoles).toBe(6);
      mockStore.setCurrentHole.mockClear();
      act(() => { oldSwipe(8); oldJump(9); oldNext(); });
      view.rerender(screen(kind));
      expect(mockStore.setCurrentHole).not.toHaveBeenCalled();
      fireEvent.press(view.getByText('Previous'));
      view.rerender(screen(kind));
      expect(mockSwipe.currentHole).toBe(5);
      fireEvent.press(view.getByText('Next Hole'));
      view.rerender(screen(kind));
      expect(mockSwipe.currentHole).toBe(6);
      mockStore.setCurrentHole.mockClear();
      fireEvent.press(view.getByText('Next Hole'));
      expect(mockStore.setCurrentHole).not.toHaveBeenCalled();
    });
  }

  if (kind === 'singles') {
    it('starts a back nine at its physical first hole without an explicit route selection', () => {
      mockHoles = create18Holes().slice(9);
      mockStore.holes = mockHoles;
      mockStore.nineType = 'back9';
      const view = render(screen(kind));
      expect(mockSwipe.currentHole).toBe(10);
      expect(view.getByText('Hole 10')).toBeTruthy();
      fireEvent.press(view.getByText('Next Hole'));
      expect(view.getByText('Hole 11')).toBeTruthy();
    });

    it('keeps an explicit physical route hole within a combo planned range', () => {
      mockHoles = create18Holes().map((hole) => ({ ...hole, number: (hole.number + 9) as typeof hole.number }));
      mockStore.holes = mockHoles;
      const view = render(screen(kind, '', 23));
      expect(mockSwipe.currentHole).toBe(23);
      expect(view.getByText('Hole 23')).toBeTruthy();
    });

    it('preserves a pending combo route hole through loading without overriding later navigation', () => {
      mockLoading = true;
      mockHoles = [];
      mockStore.holes = mockHoles;
      const view = render(screen(kind, '', 23));
      expect(view.getByText('Loading match...')).toBeTruthy();

      // The route is unchanged when real planned metadata replaces fallback 1..18.
      mockLoading = false;
      mockHoles = create18Holes().map((hole) => ({
        ...hole, number: (hole.number + 9) as typeof hole.number,
      }));
      mockStore.holes = mockHoles;
      view.rerender(screen(kind, '', 23));
      expect(mockSwipe.currentHole).toBe(23);
      expect(view.getByText('Hole 23')).toBeTruthy();
      fireEvent.press(view.getByText('Previous'));
      expect(mockSwipe.currentHole).toBe(22);

      // A subsequent metadata refresh must preserve the user's navigation.
      mockLoading = true;
      view.rerender(screen(kind, '', 23));
      mockLoading = false;
      mockHoles = [...mockHoles];
      mockStore.holes = mockHoles;
      view.rerender(screen(kind, '', 23));
      expect(mockSwipe.currentHole).toBe(22);

      mockStore.holesPlayed = 6;
      view.rerender(screen(kind, '', 23));
      expect(mockSwipe.currentHole).toBe(15);
      view.rerender(screen(kind, '', 14));
      expect(mockSwipe.currentHole).toBe(14);
      fireEvent.press(view.getByText('Next Hole'));
      expect(mockSwipe.currentHole).toBe(15);
      view.rerender(screen(kind, '', 23));
      expect(mockSwipe.currentHole).toBe(15);
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('renders physical back-nine holes before effects and after an ended cutoff', () => {
      mockHoles = create18Holes().slice(9);
      mockStore.holes = mockHoles;
      mockStore.nineType = 'back9';
      const view = render(screen(kind, '', 18));
      expect(view.getByText('Hole 18')).toBeTruthy();
      expect(mockRenderedHeaders[0]).toBe(10);
      mockStore.holesPlayed = 6;
      view.rerender(screen(kind, '', 18));
      expect(view.getByText('Hole 15')).toBeTruthy();
      expect(mockSwipe.currentHole).toBe(15);
      expect(mockSwipe.firstHole).toBe(10);
      expect(mockSwipe.totalHoles).toBe(15);
      expect(mockProgress.holeNumbers).toEqual([10, 11, 12, 13, 14, 15]);
      expect(view.getByText('Ended after 6 of 9')).toBeTruthy();
      expect(mockCalculateHandicap.mock.calls.every(([args]: any[]) => args.holes === mockHoles)).toBe(true);
      fireEvent.press(view.getByText('Finish'));
      fireEvent.press(view.getByText('Submit Match'));
      expect(navigation.navigate).toHaveBeenLastCalledWith('MatchPlayScorecard', {
        roundId: 'round', competitionId: '', player1Id: 'sam', player2Id: 'ben',
      });
      expect(mockSubmit).not.toHaveBeenCalled();
      expect(view.queryByText('Are you sure you want to submit the match?')).toBeNull();
      fireEvent.press(view.getByText('Previous'));
      expect(view.getByText('Hole 14')).toBeTruthy();
      fireEvent.press(view.getByLabelText(`Set Ben score to par ${mockHoles[4].par}`));
      expect(mockScoreSelect).toHaveBeenCalledWith('player2', mockHoles[4].par);
      fireEvent.press(view.getByText('Next Hole'));
      expect(view.getByText('Hole 15')).toBeTruthy();
    });

    it('rejects stale navigation after a cutoff and bounds route jumps to retained holes', () => {
      const view = render(screen(kind));
      act(() => mockSwipe.onHoleChange(7));
      const oldSwipe = mockSwipe.onHoleChange;
      const oldJump = mockProgress.onHolePress;
      const oldNext = mockHeader.onNext;
      mockStore.holesPlayed = 6;
      view.rerender(screen(kind));
      expect(mockSwipe.currentHole).toBe(6);
      act(() => { oldSwipe(9); oldJump(8); oldNext(); });
      expect(mockSwipe.currentHole).toBe(6);
      act(() => mockProgress.onHolePress(3));
      expect(mockSwipe.currentHole).toBe(3);
      view.rerender(screen(kind, '', 16));
      expect(mockSwipe.currentHole).toBeLessThanOrEqual(6);
      expect(view.getByText('Finish')).toBeTruthy();
    });
  }

  it('uses loaded social/pairs metadata for the action, connects the sheet and ends on existing review', () => {
    const view = render(screen(kind, 'route-competition'));
    fireEvent.press(view.getByLabelText('End round early'));
    expect(view.getByText('End round after hole 1?')).toBeTruthy();
    expect(view.getByText('Sam leads')).toBeTruthy();
    fireEvent.press(view.getByTestId('end-round-early-cancel'));
    expect(mockCancel).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByLabelText('End round early'));
    fireEvent.press(view.getByTestId('end-round-early-confirm'));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
    act(() => mockEndArgs.onEnded(1));
    expect(navigation.navigate).toHaveBeenCalledWith(
      kind === 'general' ? 'ReviewScorecard' : 'MatchPlayScorecard',
      kind === 'general'
        ? { roundId: 'round', competitionId: 'route-competition', holes: mockHoles }
        : {
            roundId: 'round',
            competitionId: 'route-competition',
            player1Id: 'sam',
            player2Id: 'ben',
          }
    );
    if (kind === 'singles') {
      expect(mockEndArgs.getMatchContext?.()).toEqual({
        kind: 'singles',
        names: ['Sam', 'Ben'],
        holeResults: mockHoleResults,
      });
    }
    mockRound = { competition_id: null, scoring_pairs_required: true };
    view.rerender(screen(kind, 'route-competition'));
    expect(mockEndArgs.scoringPairsEnabled).toBe(true);
    expect(view.queryByLabelText('End round early')).toBeNull();
    mockRound = { competition_id: 'loaded-competition', scoring_pairs_required: false };
    view.rerender(screen(kind, 'standalone'));
    expect(mockEndArgs.isStandalone).toBe(false);
    expect(view.queryByLabelText('End round early')).toBeNull();
  });

  it('uses an explicit loaded pairs false ahead of the general offline fallback', () => {
    mockPairsFallback = true;
    const view = render(screen(kind, 'standalone'));
    expect(view.getByLabelText('End round early')).toBeTruthy();
    expect(mockEndArgs.scoringPairsEnabled).toBe(false);
    mockRound = { competition_id: null };
    view.rerender(screen(kind, 'standalone'));
    expect(mockEndArgs.scoringPairsEnabled).toBe(kind === 'general');
    expect(Boolean(view.queryByLabelText('End round early'))).toBe(kind === 'singles');
  });

  it.each(['standalone', '', 'route-competition'])(
    'uses the existing route fallback only without round metadata (%s)',
    (competitionId) => {
      mockRound = undefined;
      const view = render(screen(kind, competitionId));
      expect(mockEndArgs.isStandalone).toBe(
        competitionId === 'standalone' || (kind === 'singles' && competitionId === '')
      );
      expect(Boolean(view.queryByLabelText('End round early'))).toBe(
        competitionId === 'standalone' || (kind === 'singles' && competitionId === '')
      );
    }
  );
});
