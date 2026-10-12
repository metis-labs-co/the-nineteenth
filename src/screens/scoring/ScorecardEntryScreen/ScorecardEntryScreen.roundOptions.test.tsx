/** Round options ⋮ wiring on social-round score entry. Data hooks and persistence are mocked. */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ScorecardEntryScreen from '@/screens/scoring/ScorecardEntryScreen';
import { create18Holes } from '@/__tests__/utils/testFixtures';

const OWNER_ID = 'owner';
const OTHER_ID = 'other';

const mockHoles = create18Holes();
const mockPlayers = [
  { id: OWNER_ID, name: 'Sam' },
  { id: OTHER_ID, name: 'Ben' },
];
let mockRound: { user_id: string; competition_id: string | null; scoring_pairs_required?: boolean } | undefined;
let mockUserId: string | undefined;
const mockStore = {
  currentRoundId: 'round',
  currentHole: 1,
  nineType: 'full',
  holesPlayed: null as number | null,
  currentPlayers: mockPlayers,
  holes: mockHoles,
  isInitialized: true,
  isLoading: false,
  isMultiBall: false,
  handicapSource: 'none',
  playerTeeMap: new Map(),
  allowedPlayerIds: [OWNER_ID, OTHER_ID],
  groupScorecards: new Map(),
  setCurrentHole: jest.fn(),
  getHoleInfo: (hole: number) => mockHoles.find((h) => h.number === hole),
  getCompletedHolesCount: () => 1,
  setAllowedPlayers: jest.fn(),
};

jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: Object.assign(() => mockStore, { getState: () => mockStore }),
}));
jest.mock('@/store/subscriptionStore', () => ({ useIsSuperAdmin: () => false }));
jest.mock('@/context/ThemeContext', () => ({ useThemeColors: () => ({}), useIsDark: () => false }));
jest.mock('@/components/common/SystemModalTheme', () => ({
  SystemModalTheme: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/common/BottomSheet', () => ({
  BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('@/services/diagnostics', () => ({ pushDiagnostic: jest.fn() }));
jest.mock('@/services/activeRoundSession', () => ({ activeRoundSession: { set: jest.fn() } }));
jest.mock('@/services/rounds/roundRosterChannel', () => ({ sendRoundEvent: jest.fn() }));
jest.mock('@/hooks/useStatsVisibilityWithTier', () => ({ useStatsVisibilityWithTier: () => ({}) }));
jest.mock('@/hooks/useApplyAutoTeeOverrides', () => ({ useApplyAutoTeeOverrides: jest.fn() }));
jest.mock('@/hooks/activity', () => ({ useAddRoundPhotos: () => ({}) }));
jest.mock('@/hooks/usePlayingHandicap', () => ({
  calculatePlayingHandicap: () => ({ playingHandicap: 11 }),
}));
jest.mock('@/hooks/skins/queries', () => ({ useSkinsGamesByRound: () => ({ data: [] }) }));
jest.mock('@/hooks/wolf/queries', () => ({ useWolfGameByRound: () => ({ data: null }) }));
jest.mock('@/hooks/competitions', () => ({ useCompetitionInfo: () => ({}) }));
jest.mock('@/hooks/rounds', () => ({
  useRoundDetails: () => ({ data: mockRound }),
  useTeams: () => ({}),
  usePairings: () => ({}),
}));
jest.mock('@/hooks', () => ({
  useAuth: () => ({ user: mockUserId ? { id: mockUserId } : null }),
}));
jest.mock('@/hooks/scorecard', () => ({
  useLiveScorecardMerge: jest.fn(),
  useSubmittedElsewhereRedirect: jest.fn(),
  usePlayedHoleRange: jest.requireActual('@/hooks/scorecard/usePlayedHoleRange').usePlayedHoleRange,
  useOfflineSync: () => ({}),
  useActiveSubMatch: () => ({}),
  useBuildAsYouPlay: () => ({ enabled: false }),
  useTeamScoring: () => ({}),
  useGroupFilter: () => ({ groupPlayers: mockPlayers }),
  useRoundRosterSync: () => ({ refresh: jest.fn(), markLocalEdit: jest.fn() }),
  useRoundData: () => ({
    courseTees: [],
    teams: [],
    gameType: 'stableford',
    teamFormat: null,
    scoringPairsEnabled: false,
    playersToScore: mockPlayers,
    isLoading: false,
    courseHoleCount: 18,
    refetchMetadata: jest.fn(async () => undefined),
    refetchPlayers: jest.fn(async () => undefined),
  }),
  useEndRoundEarly: () => ({
    canEndRoundEarly: true,
    isEnded: false,
    open: jest.fn(),
    sheetProps: { visible: false, onCancel: jest.fn() },
  }),
}));
jest.mock('@/components/scorecard', () => ({
  RoundHeader: jest.requireActual('@/components/scorecard/RoundHeader').RoundHeader,
  EndRoundEarlySheet: () => null,
  EndedEarlyBanner: () => null,
  HoleHeader: () => null,
  QuickScorecardView: () => null,
  SwipeableHoleNavigator: () => null,
  ChangeTeesSheet: () => null,
}));
jest.mock('@/components/scorecard/RoundPlayersSheet', () => ({ RoundPlayersSheet: () => null }));
jest.mock('@/components/rounds/ViewRound/RoundDetailsTab/sheets', () => ({
  EditNineTypeSheet: () => null,
}));
jest.mock('@/components/skins', () => ({ SkinsIndicator: () => null }));
jest.mock('@/components/wolf', () => ({ WolfIndicator: () => null, WolfDecisionModal: () => null }));
jest.mock('@/components/scorecard/HoleHeader/DistanceToPin', () => ({ DistanceToPin: () => null }));
jest.mock('@/components/courses', () => ({}));
jest.mock('@/components/scorecard/ShotLogging', () => ({ InlineShotToast: () => null }));
jest.mock('@/components/scorecard/DetailedStatsSheet', () => ({}));
jest.mock('@/screens/scoring/ScorecardEntryScreen/hooks', () => ({
  useScoreHandlers: () => ({}),
  useScorecardDialogs: () => ({}),
  useScorecardNavigation: () => ({}),
  useScorecardSubmission: () => ({ handleDeleteRound: jest.fn() }),
  useWolfIntegration: () => ({}),
}));
jest.mock('@/screens/scoring/ScorecardEntryScreen/components', () => ({
  ScorecardDialogs: () => null,
  ScorecardScoreContent: () => null,
  ScorecardFooter: () => null,
}));

const navigation = { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn() };

function mockRoundDetails(round: { user_id: string; competition_id: string | null }) {
  mockRound = { ...round, scoring_pairs_required: false };
}

function renderScreen({ userId, competitionId }: { userId: string; competitionId: string }) {
  mockUserId = userId;
  return render(
    <ScorecardEntryScreen
      {...({
        navigation,
        route: { params: { roundId: 'round', competitionId } },
      } as unknown as React.ComponentProps<typeof ScorecardEntryScreen>)}
    />
  );
}

describe('ScorecardEntryScreen round options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRound = undefined;
    mockUserId = undefined;
  });

  it('owner of a social round sees ⋮ Round options', async () => {
    mockRoundDetails({ user_id: OWNER_ID, competition_id: null });
    renderScreen({ userId: OWNER_ID, competitionId: 'standalone' });
    fireEvent.press(await screen.findByLabelText('Round options'));
    expect(screen.getByText('Holes')).toBeTruthy();
    expect(screen.getByText('Players')).toBeTruthy();
    expect(screen.getByText('Delete round')).toBeTruthy();
  });

  it('non-owner keeps the direct End round early ⋮', async () => {
    mockRoundDetails({ user_id: OWNER_ID, competition_id: null });
    renderScreen({ userId: OTHER_ID, competitionId: 'standalone' });
    expect(screen.queryByLabelText('Round options')).toBeNull();
  });

  it('competition rounds never get the menu', async () => {
    mockRoundDetails({ user_id: OWNER_ID, competition_id: 'c1' });
    renderScreen({ userId: OWNER_ID, competitionId: 'c1' });
    expect(screen.queryByLabelText('Round options')).toBeNull();
  });
});
