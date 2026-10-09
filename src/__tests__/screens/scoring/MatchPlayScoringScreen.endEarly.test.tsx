/** Caller integration only: real header/sheet and existing review handlers; end persistence is mocked. */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import ScorecardEntryScreen from '@/screens/scoring/ScorecardEntryScreen';
import MatchPlayScoringScreen from '@/screens/scoring/MatchPlayScoringScreen';
import type { UseEndRoundEarlyArgs } from '@/hooks/scorecard/useEndRoundEarly';
import { create18Holes } from '@/__tests__/utils/testFixtures';

const mockHoles = create18Holes();
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
  currentPlayers: mockPlayers,
  holes: mockHoles,
  isInitialized: true,
  isLoading: false,
  handicapSource: 'none',
  playerTeeMap: new Map(),
  allowedPlayerIds: ['sam', 'ben'],
  groupScorecards: new Map(),
  setCurrentHole: jest.fn(),
  getHoleInfo: () => mockHoles[0],
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
  calculatePlayingHandicap: () => ({ playingHandicap: 0 }),
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
  useProcessSkinsIfNeeded: () => ({}),
  useUpdateCourseHoles: () => ({}),
  useConfirmationDialog: () => ({}),
}));
jest.mock('@/hooks/scorecard', () => ({
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
  useMatchPlayScoring: () => ({ holeResults: mockHoleResults }),
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
  SwipeableHoleNavigator: () => null,
  ChangeTeesSheet: () => null,
}));
jest.mock('@/components/skins', () => ({ SkinsIndicator: () => null }));
jest.mock('@/components/wolf', () => ({ WolfIndicator: () => null }));
jest.mock('@/components/scorecard/HoleHeader/DistanceToPin', () => ({ DistanceToPin: () => null }));
jest.mock('@/components/courses', () => ({}));
jest.mock('@/components/scorecard/ShotLogging', () => ({}));
jest.mock('@/components/scorecard/DetailedStatsSheet', () => ({}));
jest.mock('@/screens/scoring/ScorecardEntryScreen/hooks', () => ({
  useScoreHandlers: jest.requireActual(
    '@/screens/scoring/ScorecardEntryScreen/hooks/useScoreHandlers'
  ).useScoreHandlers,
  useScorecardDialogs: () => ({}),
  useScorecardNavigation: () => ({}),
  useScorecardSubmission: () => ({}),
  useWolfIntegration: () => ({}),
}));
jest.mock('@/screens/scoring/ScorecardEntryScreen/components', () => ({
  ScorecardDialogs: () => null,
  ScorecardFooter: ({ onViewScorecard }: { onViewScorecard: () => void }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onViewScorecard}>
        <Text>View scorecard</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/screens/scoring/MatchPlayScoringScreen/components', () => ({
  MatchPlayFooter: ({ onViewScorecard }: { onViewScorecard: () => void }) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onViewScorecard}>
        <Text>View scorecard</Text>
      </Pressable>
    );
  },
}));

const navigation = { navigate: jest.fn(), goBack: jest.fn() };
function screen(kind: 'general' | 'singles', competitionId = '') {
  return kind === 'general' ? (
    <ScorecardEntryScreen
      {...({
        navigation,
        route: { params: { roundId: 'round', competitionId } },
      } as unknown as React.ComponentProps<typeof ScorecardEntryScreen>)}
    />
  ) : (
    <MatchPlayScoringScreen
      {...({
        navigation,
        route: { params: { roundId: 'round', competitionId } },
      } as unknown as React.ComponentProps<typeof MatchPlayScoringScreen>)}
    />
  );
}

describe.each(['general', 'singles'] as const)('%s end-early caller', (kind) => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoading = false;
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
    expect(view.queryByText('View scorecard')).toBeNull();
    mockLoading = false;
    mockStore.isInitialized = true;
    view.rerender(screen(kind));
    fireEvent.press(view.getByText('View scorecard'));
    expect(navigation.navigate).toHaveBeenCalledWith(
      kind === 'general' ? 'ReviewScorecard' : 'MatchPlayScorecard',
      kind === 'general'
        ? { roundId: 'round', competitionId: '', holes: mockHoles }
        : { roundId: 'round', competitionId: '', player1Id: 'sam', player2Id: 'ben' }
    );
  });
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
