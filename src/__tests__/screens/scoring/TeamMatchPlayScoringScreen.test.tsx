/** Screen boundary coverage: round-shape recovery and fallback store init. */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import TeamMatchPlayScoringScreen from '@/screens/scoring/TeamMatchPlayScoringScreen';
import type { UseEndRoundEarlyArgs } from '@/hooks/scorecard/useEndRoundEarly';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { RootStackScreenProps } from '@/navigation/types';

const mockStore = {
  currentRoundId: 'round-team' as string | null,
  currentPlayers: [{ id: 'player-1' }],
  isInitialized: true,
  holesPlayed: null as number | null,
  nineType: 'back9',
  holes: create18Holes().slice(9),
  groupScorecards: new Map(),
  handicapSource: 'profile',
  initializeRound: jest.fn(() => Promise.resolve()),
  loadFromOffline: jest.fn(() => Promise.resolve(true)),
  resetRound: jest.fn(),
};
let mockRoundLoading = false;
let mockHasRound = true;
let mockEndArgs: UseEndRoundEarlyArgs;
let mockTeamScore = 4;
let mockDistinctScores = false;
let mockSwipe: any;
let mockProgress: any;
let mockHeader: any;
let mockStateArgs: any;
let mockMatchComplete = false;
const mockSubmit = jest.fn();
const mockSetScore = jest.fn();
const mockPickUp = jest.fn();
const mockConfirm = jest.fn();
const mockRound = {
  competition_id: null as string | null,
  scoring_pairs_required: false as boolean | undefined,
  nine_type: 'back9',
  holes_played: null as number | null,
  team_format: 'best-ball',
};
const mockTeams = [
  { id: 'team-1', name: 'Team A', members: [{ player_id: 'player-1', player: { name: 'Sam' } }] },
  { id: 'team-2', name: 'Team B', members: [{ player_id: 'player-2', player: { name: 'Ben' } }] },
];

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: Object.assign(jest.fn((selector: any) => selector ? selector(mockStore) : mockStore), { getState: () => mockStore }),
}));
jest.mock('@/hooks/useRoundDetails', () => ({
  useRoundDetails: () => ({
    data: mockHasRound ? mockRound : undefined,
    isLoading: mockRoundLoading,
    error: null,
  }),
}));
jest.mock('@/hooks/scorecard/useRoundTeams', () => ({
  useRoundTeams: () => ({ teams: mockTeams, isLoading: false, error: null }),
}));
jest.mock('@/hooks/rounds', () => ({
  useSubMatches: () => ({ data: [] }),
  useUpdateSubMatchResult: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock('@/hooks/competitions', () => ({ useCompetitionInfo: () => ({ data: null }) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null, player: null }) }));
jest.mock('@/hooks/usePlayingHandicap', () => ({
  calculatePlayingHandicap: () => ({ playingHandicap: 0 }),
}));
jest.mock('@/hooks', () => ({
  useProcessSkinsIfNeeded: () => ({ processSkinsHole: () => Promise.resolve({ processed: false }) }),
  useOnlineStatus: () => true,
}));
jest.mock('@/hooks/scorecard', () => ({
  useLiveScorecardMerge: jest.fn(),
  useSubmittedElsewhereRedirect: jest.fn(),
  pullOnOpenIfSocial: jest.fn(async () => false),
  usePlayedHoleRange: jest.requireActual('@/hooks/scorecard/usePlayedHoleRange').usePlayedHoleRange,
  useOfflineSync: () => ({ triggerSync: jest.fn() }),
  useEndRoundEarly: (args: UseEndRoundEarlyArgs) => {
    mockEndArgs = args;
    const [visible, setVisible] = require('react').useState(false);
    return {
      canEndRoundEarly: args.isStandalone && !args.scoringPairsEnabled,
      open: () => setVisible(true),
      sheetProps: {
        visible,
        plan: { holesPlayed: 1, plannedHoles: 9, nineType: 'back9', lastHoleNumber: 10, removedScores: [] },
        resultPreview: 'Team A leads',
        onConfirm: mockConfirm,
        onCancel: () => setVisible(false),
      },
    };
  },
}));
jest.mock('@/store/subscriptionStore', () => ({ useIsSuperAdmin: () => false }));
jest.mock('@/context/ThemeContext', () => ({ useThemeColors: () => ({}), useIsDark: () => false }));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showErrorToast: jest.fn() }) }));
jest.mock('@/components/skins', () => ({ SkinsIndicator: () => null }));
jest.mock('@/components/wolf', () => ({ WolfIndicator: () => null }));
jest.mock('@/components/scorecard/HoleHeader/DistanceToPin', () => ({ DistanceToPin: () => null }));
jest.mock('@/components/scorecard', () => ({
  HoleHeader: (props: any) => {
    mockHeader = props;
    const { Pressable, Text } = require('react-native');
    return <><Text>Hole {props.hole.number}</Text><Pressable accessibilityLabel="Next retained hole" disabled={!props.canGoNext} onPress={props.onNext}><Text>Header next</Text></Pressable></>;
  },
  EndedEarlyBanner: jest.requireActual('@/components/scorecard/EndedEarlyBanner').EndedEarlyBanner,
  RoundHeader: jest.requireActual('@/components/scorecard/RoundHeader').RoundHeader,
  EndRoundEarlySheet: jest.requireActual('@/components/scorecard/EndRoundEarlySheet').EndRoundEarlySheet,
  SwipeableHoleNavigator: (props: any) => { mockSwipe = props; return props.renderHole(props.currentHole); },
  ChangeTeesSheet: () => null,
}));
jest.mock('@/screens/scoring/TeamMatchPlayScoringScreen/components', () => ({
  TeamMatchPlayFooter: jest.requireActual('@/screens/scoring/TeamMatchPlayScoringScreen/components/TeamMatchPlayFooter').TeamMatchPlayFooter,
  TeamScorePanel: jest.requireActual('@/screens/scoring/TeamMatchPlayScoringScreen/components/TeamScorePanel').TeamScorePanel,
  TeamMatchProgress: (props: any) => { mockProgress = props; return null; },
}));
jest.mock('@/screens/scoring/TeamMatchPlayScoringScreen/hooks', () => ({
  useTeamMatchPlayScores: () => ({
    setPlayerScore: mockSetScore,
    pickUpPlayer: mockPickUp,
    getPlayerScoreValue: () => 4,
    getPlayerScoreForHole: () => 4,
    getPlayerStrokesReceivedForHole: () => 0,
    isPlayerPickedUpOnHole: () => false,
    getBestContributorForHole: () => null,
    getHoleResultDisplay: () => null,
    getTeamBestScoreForHole: (team: { id: string }, hole: number) => mockDistinctScores
      ? (team.id === 'team-1' ? (hole === 10 ? 4 : hole === 18 ? 3 : 5) : (hole === 10 ? 5 : hole === 18 ? 4 : 3))
      : mockTeamScore,
    getHoleWinnerForHole: (hole: number) => mockDistinctScores ? (hole === 10 || hole === 18 ? 'team1' : 'team2') : 'team1',
  }),
  useTeamMatchPlayState: (args: any) => {
    mockStateArgs = args;
    return { isMatchComplete: mockMatchComplete, handleSubmitMatch: mockSubmit };
  },
  useTeamMatchPlayNavigation: jest.requireActual('@/screens/scoring/TeamMatchPlayScoringScreen/hooks/useTeamMatchPlayNavigation').useTeamMatchPlayNavigation,
}));
jest.mock('@/hooks/rounds/mutations', () => ({ useDeleteRound: () => ({}) }));

const props = {
  navigation: { goBack: jest.fn(), navigate: jest.fn() },
  route: { params: { roundId: 'round-team' } },
} as unknown as RootStackScreenProps<'MatchPlayScoring'>;

describe('TeamMatchPlayScoringScreen round-shape boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.currentRoundId = 'round-team';
    mockStore.isInitialized = true;
    mockStore.holesPlayed = null;
    mockStore.handicapSource = 'profile';
    mockStore.loadFromOffline.mockResolvedValue(true);
    mockRound.holes_played = null;
    mockRoundLoading = false;
    mockHasRound = true;
    mockTeamScore = 4;
    mockDistinctScores = false;
    mockMatchComplete = false;
    mockRound.competition_id = null;
    mockRound.scoring_pairs_required = false;
  });

  it('characterization: preserves loading followed by ordinary team review navigation', () => {
    mockRoundLoading = true;
    const view = render(<TeamMatchPlayScoringScreen {...props} />);
    expect(view.getByText('Loading match...')).toBeTruthy();
    expect(view.queryByLabelText('View full scorecard')).toBeNull();
    mockRoundLoading = false;
    view.rerender(<TeamMatchPlayScoringScreen {...props} />);
    fireEvent.press(view.getByLabelText('View full scorecard'));
    expect(props.navigation.navigate).toHaveBeenCalledWith('ReviewScorecard', {
      roundId: 'round-team',
      competitionId: undefined,
      holes: expect.arrayContaining([expect.objectContaining({ number: 10 }), expect.objectContaining({ number: 18 })]),
    });
    expect(mockStore.resetRound).not.toHaveBeenCalled();
  });

  it('characterization: keeps an already initialized round', () => {
    render(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockStore.resetRound).not.toHaveBeenCalled();
    expect(mockStore.loadFromOffline).not.toHaveBeenCalled();
  });

  it('characterization: keeps ordinary team navigation and locks naturally completed controls', () => {
    const view = render(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockSwipe.currentHole).toBe(10);
    expect(mockSwipe.totalHoles).toBe(18);
    fireEvent.press(view.getByText('Next Hole'));
    expect(mockSwipe.currentHole).toBe(11);
    fireEvent.press(view.getByText('Previous'));
    expect(mockSwipe.currentHole).toBe(10);
    act(() => mockSwipe.onHoleChange(14));
    expect(mockSwipe.currentHole).toBe(14);
    act(() => mockProgress.onHolePress(12));
    expect(mockSwipe.currentHole).toBe(12);
    mockMatchComplete = true;
    view.rerender(<TeamMatchPlayScoringScreen {...props} />);
    fireEvent.press(view.getAllByText('+')[0]);
    expect(mockSetScore).not.toHaveBeenCalled();
    fireEvent.press(view.getByText('Submit Match'));
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it('closes back-nine navigation on cutoff changes, including captured callbacks', () => {
    const view = render(<TeamMatchPlayScoringScreen {...props} />);
    act(() => mockSwipe.onHoleChange(16));
    const oldSwipe = mockSwipe.onHoleChange;
    const oldJump = mockProgress.onHolePress;
    const oldNext = mockHeader.onNext;
    mockStore.holesPlayed = 6;
    view.rerender(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockSwipe.currentHole).toBe(15);
    expect(mockSwipe.firstHole).toBe(10);
    expect(mockSwipe.totalHoles).toBe(15);
    expect(mockProgress.holeNumbers).toEqual([10, 11, 12, 13, 14, 15]);
    act(() => { oldSwipe(18); oldJump(17); oldNext(); });
    expect(mockSwipe.currentHole).toBe(15);
    fireEvent.press(view.getByText('Previous'));
    expect(mockSwipe.currentHole).toBe(14);
    act(() => mockSwipe.onHoleChange(15));
    expect(mockSwipe.currentHole).toBe(15);
    fireEvent.press(view.getByText('Finish'));
    fireEvent.press(view.getByText('Submit Match'));
    expect(props.navigation.navigate).toHaveBeenLastCalledWith('ReviewScorecard', {
      roundId: 'round-team', competitionId: undefined,
      holes: expect.arrayContaining([expect.objectContaining({ number: 18 })]),
    });
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockStateArgs.totalHoles).toBe(9);
    expect(mockStateArgs.plannedHoles).toBe(mockStore.holes);
  });

  it('keeps actual retained-hole controls and edits enabled when an ended match is complete', async () => {
    mockStore.holesPlayed = 6;
    mockMatchComplete = true;
    const view = render(<TeamMatchPlayScoringScreen {...props} />);
    act(() => mockProgress.onHolePress(14));
    expect(mockSwipe.currentHole).toBe(14);
    expect(mockSwipe.enabled).toBe(true);
    await act(async () => { fireEvent.press(view.getAllByText('+')[0]); });
    expect(mockSetScore).toHaveBeenCalledWith('player-1', 14, 5);
    expect(view.getByText('Ended after 6 of 9')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Pick up Sam'));
    await act(async () => {});
    expect(mockPickUp).toHaveBeenCalledWith('player-1');
    fireEvent.press(view.getByText('Previous'));
    expect(mockSwipe.currentHole).toBe(13);
    // Next from the header/navigation callback remains available for retained edits.
    fireEvent.press(view.getByLabelText('Next retained hole'));
    expect(mockSwipe.currentHole).toBe(14);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('opens the real end sheet and completes on team Review with live planned match context', () => {
    mockDistinctScores = true;
    const view = render(<TeamMatchPlayScoringScreen {...props} />);
    fireEvent.press(view.getByLabelText('End round early'));
    expect(view.getByText('End round after hole 10?')).toBeTruthy();
    expect(view.getByText('Team A leads')).toBeTruthy();
    fireEvent.press(view.getByTestId('end-round-early-confirm'));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(props.navigation.navigate).not.toHaveBeenCalled();
    const context = mockEndArgs.getMatchContext?.();
    expect(context?.kind).toBe('team');
    expect(context?.names).toEqual(['Team A', 'Team B']);
    expect(Object.keys(context?.holeResults ?? {})).toEqual(['10', '11', '12', '13', '14', '15', '16', '17', '18']);
    expect(context?.holeResults[18]).toEqual({
      team1Score: 3,
      team2Score: 4,
      team1PlayerScores: {},
      team2PlayerScores: {},
      winner: 'team1',
    });
    expect(context?.holeResults[10]).toEqual(expect.objectContaining({ team1Score: 4, team2Score: 5, winner: 'team1' }));
    expect(context?.holeResults[11]).toEqual(expect.objectContaining({ team1Score: 5, team2Score: 3, winner: 'team2' }));
    mockDistinctScores = false;
    mockTeamScore = 5;
    expect(mockEndArgs.getMatchContext?.()?.holeResults[18]).toEqual(expect.objectContaining({ team1Score: 5 }));
    act(() => mockEndArgs.onEnded(1));
    expect(props.navigation.navigate).toHaveBeenCalledWith('ReviewScorecard', {
      roundId: 'round-team',
      competitionId: undefined,
      holes: expect.arrayContaining([expect.objectContaining({ number: 10 }), expect.objectContaining({ number: 18 })]),
    });
    mockRound.scoring_pairs_required = true;
    view.rerender(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockEndArgs.scoringPairsEnabled).toBe(true);
    expect(view.queryByLabelText('End round early')).toBeNull();
    mockRound.scoring_pairs_required = false;
    mockRound.competition_id = 'competition';
    view.rerender(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockEndArgs.isStandalone).toBe(false);
    expect(view.queryByLabelText('End round early')).toBeNull();
  });

  it('waits for round metadata and preserves the absent-field pairs fallback', () => {
    mockHasRound = false;
    const view = render(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockEndArgs.isStandalone).toBe(false);
    expect(view.queryByLabelText('End round early')).toBeNull();
    mockHasRound = true;
    mockRound.scoring_pairs_required = undefined;
    view.rerender(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockEndArgs.scoringPairsEnabled).toBe(false);
    expect(view.getByLabelText('End round early')).toBeTruthy();
    expect(mockEndArgs.teamFormat).toBe('best-ball');
  });

  it('resets and reloads once per server marker, even if recovery leaves stale state', async () => {
    const screen = render(<TeamMatchPlayScoringScreen {...props} />);
    mockRound.holes_played = 6;
    screen.rerender(<TeamMatchPlayScoringScreen {...props} />);
    await waitFor(() => expect(mockStore.loadFromOffline).toHaveBeenCalledWith('round-team'));
    expect(mockStore.resetRound).toHaveBeenCalledTimes(1);

    // Changing a dependency reruns the effect while the mocked store stays stale.
    mockStore.handicapSource = 'none';
    screen.rerender(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockStore.resetRound).toHaveBeenCalledTimes(1);
    expect(mockStore.loadFromOffline).toHaveBeenCalledTimes(1);

    mockRound.holes_played = 4;
    screen.rerender(<TeamMatchPlayScoringScreen {...props} />);
    await waitFor(() => expect(mockStore.resetRound).toHaveBeenCalledTimes(2));
    expect(mockStore.loadFromOffline).toHaveBeenCalledTimes(2);
  });

  it('preserves a pending local end while the server marker is NULL', () => {
    mockStore.holesPlayed = 6;
    render(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockStore.resetRound).not.toHaveBeenCalled();
    expect(mockStore.loadFromOffline).not.toHaveBeenCalled();
  });

  it('passes the server marker and planned back nine into fallback init', async () => {
    mockStore.currentRoundId = null;
    mockStore.isInitialized = false;
    mockStore.loadFromOffline.mockResolvedValue(false);
    mockRound.holes_played = 6;
    render(<TeamMatchPlayScoringScreen {...props} />);
    await waitFor(() => expect(mockStore.initializeRound).toHaveBeenCalledTimes(1));
    const args = mockStore.initializeRound.mock.calls[0] as unknown[];
    expect((args[2] as { number: number }[]).map((hole) => hole.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(args[9]).toBe('back9');
    expect(args[10]).toBeUndefined();
    expect(args[11]).toBe(6);
  });
});
