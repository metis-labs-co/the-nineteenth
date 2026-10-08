/** Screen boundary coverage: round-shape recovery and fallback store init. */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import TeamMatchPlayScoringScreen from '@/screens/scoring/TeamMatchPlayScoringScreen';
import type { RootStackScreenProps } from '@/navigation/types';

const mockStore = {
  currentRoundId: 'round-team' as string | null,
  currentPlayers: [{ id: 'player-1' }],
  isInitialized: true,
  holesPlayed: null as number | null,
  handicapSource: 'profile',
  initializeRound: jest.fn(() => Promise.resolve()),
  loadFromOffline: jest.fn(() => Promise.resolve(true)),
  resetRound: jest.fn(),
};
const mockRound = {
  nine_type: 'back9',
  holes_played: null as number | null,
  team_format: 'best-ball',
};
const mockTeams = [
  { id: 'team-1', name: 'Team A', members: [{ player_id: 'player-1', player: { name: 'Sam' } }] },
  { id: 'team-2', name: 'Team B', members: [{ player_id: 'player-2', player: { name: 'Ben' } }] },
];

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: Object.assign(jest.fn(() => mockStore), { getState: () => mockStore }),
}));
jest.mock('@/hooks/useRoundDetails', () => ({
  useRoundDetails: () => ({ data: mockRound, isLoading: false, error: null }),
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
  useProcessSkinsIfNeeded: () => ({ processSkinsHole: jest.fn() }),
  useOnlineStatus: () => true,
}));
jest.mock('@/hooks/scorecard', () => ({ useOfflineSync: () => ({ triggerSync: jest.fn() }) }));
jest.mock('@/store/subscriptionStore', () => ({ useIsSuperAdmin: () => false }));
jest.mock('@/context/ThemeContext', () => ({ useThemeColors: () => ({}) }));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showErrorToast: jest.fn() }) }));
jest.mock('@/components/common', () => ({ LoadingSpinner: () => null, ConfirmationDialog: () => null }));
jest.mock('@/components/scorecard', () => ({
  HoleHeader: () => null,
  RoundHeader: () => null,
  SwipeableHoleNavigator: () => null,
  ChangeTeesSheet: () => null,
}));
jest.mock('@/screens/scoring/TeamMatchPlayScoringScreen/components', () => ({
  TeamMatchPlayFooter: () => null,
  TeamScorePanel: () => null,
  TeamMatchProgress: () => null,
}));
jest.mock('@/screens/scoring/TeamMatchPlayScoringScreen/hooks', () => ({
  useTeamMatchPlayScores: () => ({}),
  useTeamMatchPlayState: () => ({}),
  useTeamMatchPlayNavigation: () => ({}),
}));

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
  });

  it('characterization: keeps an already initialized round', () => {
    render(<TeamMatchPlayScoringScreen {...props} />);
    expect(mockStore.resetRound).not.toHaveBeenCalled();
    expect(mockStore.loadFromOffline).not.toHaveBeenCalled();
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
