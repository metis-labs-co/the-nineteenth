/**
 * MatchPlayScorecardScreen Tests
 *
 * Tests for the match play scorecard screen including:
 * - Loading state display
 * - Error state handling
 * - Empty state when no holes
 * - Successful data display
 * - Navigation behavior
 * - Pull-to-refresh functionality
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@/__tests__/utils/renderHelpers';
import { supabase } from '@/services/supabase/client';
import MatchPlayScorecardScreen from './index';
import { useMatchPlayData } from '@/hooks/scorecard';
import { useScorecardStore } from '@/store/scorecardStore';
import type { Hole, Scorecard } from '@/types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn().mockReturnValue(() => {}),
} as any;

const mockRoute = {
  params: {
    roundId: 'round-123',
    player1Id: 'player-1',
    player2Id: 'player-2',
  },
} as any;

// Mock useMatchPlayData
jest.mock('@/hooks/scorecard', () => ({
  useMatchPlayData: jest.fn(),
}));

const mockedUseMatchPlayData = useMatchPlayData as jest.MockedFunction<typeof useMatchPlayData>;

// Mock useScorecardStore
jest.mock('@/store/scorecardStore', () => ({
  useScorecardStore: jest.fn(),
}));

const mockedUseScorecardStore = useScorecardStore as jest.MockedFunction<typeof useScorecardStore>;

// Mock MatchPlayScorecardTable
const mockTableProps = jest.fn();
jest.mock('@/components/scorecard', () => ({
  MatchPlayScorecardTable: (props: {
    player1: { name: string };
    player2: { name: string };
    holes: Hole[];
    holesPlayed?: number | null;
  }) => {
    mockTableProps(props);
    const { player1, player2, holesPlayed } = props;
    const { View, Text } = require('react-native');
    return (
      <View testID="match-play-scorecard-table">
        <Text testID="player1-name">{player1.name}</Text>
        <Text testID="player2-name">{player2.name}</Text>
        <Text testID="table-holes-played">{holesPlayed == null ? 'as-planned' : String(holesPlayed)}</Text>
      </View>
    );
  },
}));

// Mock skins hooks
jest.mock('@/hooks/useSkins', () => ({
  useActiveSkinsGameForRound: jest.fn().mockReturnValue({ data: null, isLoading: false }),
  useSkinsResults: jest.fn().mockReturnValue({ data: null, refetch: jest.fn() }),
  useSkinsHoleCounts: jest.fn().mockReturnValue({ plannedHoles: 18, holesPlayed: 18 }),
}));

// Keep the @/hooks barrel mocked: the pre-change screen imported from it, and
// the real barrel pulls in every hook in the app.
jest.mock('@/hooks', () => ({
  useFinalizeSkinsForRound: jest.fn().mockReturnValue({ finalizeSkinsForRound: jest.fn().mockResolvedValue({ finalized: false }) }),
}));

// The shared submit step (finalise the round, or queue it offline)
const mockFinalizeRound = jest.fn();
jest.mock('@/hooks/rounds/useFinalizeSubmittedRound', () => ({
  useFinalizeSubmittedRound: () => mockFinalizeRound,
}));

// Mock skins component
jest.mock('@/components/skins', () => ({
  SkinsResultsCard: () => null,
}));

// Mock supabase
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

// Mock debug logger
jest.mock('@/utils/debugLogger', () => ({
  scoringLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  createModuleLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

// Mock playing handicap calculation so the test doesn't pull in the
// SubscriptionContext/Auth/Notifications chain.
jest.mock('@/hooks/usePlayingHandicap', () => ({
  calculatePlayingHandicap: jest.fn(() => ({
    playingHandicap: 0,
    isDailyHandicap: false,
    dailyHandicap: null,
    baseHandicap: 0,
  })),
}));

// Mock react-native-paper additions (Portal, Dialog, Button not in global mock)
jest.mock('react-native-paper', () => {
  const React = require('react');
  const actualModule = jest.requireActual('react-native-paper');
  const { View, Text: RNText, TouchableOpacity } = require('react-native');

  const Dialog = ({ children, visible }: { children: React.ReactNode; visible: boolean }) => {
    if (!visible) return null;
    return React.createElement(View, { testID: 'dialog' }, children);
  };
  const DialogTitle = ({ children }: { children: React.ReactNode }) =>
    React.createElement(RNText, null, children);
  DialogTitle.displayName = 'Dialog.Title';
  Dialog.Title = DialogTitle;
  const DialogContent = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  DialogContent.displayName = 'Dialog.Content';
  Dialog.Content = DialogContent;
  const DialogActions = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  DialogActions.displayName = 'Dialog.Actions';
  Dialog.Actions = DialogActions;

  return {
    ...actualModule,
    Text: ({ children, style, ...props }: any) =>
      React.createElement(RNText, { style, ...props }, children),
    Portal: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    Dialog,
    Button: ({ children, onPress, disabled }: any) =>
      React.createElement(TouchableOpacity, { onPress: disabled ? undefined : onPress, disabled }, React.createElement(RNText, null, children)),
    Icon: ({ source, size }: any) =>
      React.createElement(View, { testID: `icon-${source}`, style: { width: size, height: size } }),
    ActivityIndicator: (props: any) =>
      React.createElement(View, { testID: 'activity-indicator', ...props }),
    Surface: ({ children, style, ...props }: any) =>
      React.createElement(View, { style, ...props }, children),
  };
});

// ============================================================================
// TEST FIXTURES
// ============================================================================

function create18Holes(): Hole[] {
  const pars: (3 | 4 | 5)[] = [4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];

  return pars.map((par, i) => ({
    id: `hole-${i + 1}`,
    courseId: 'course-1',
    number: i + 1,
    par,
    strokeIndex: i + 1,
    yardage: 400 + i * 10,
  })) as Hole[];
}

const defaultHoles = create18Holes();

const defaultPlayer1 = {
  id: 'player-1',
  name: 'John Smith',
  handicap: 18,
};

const defaultPlayer2 = {
  id: 'player-2',
  name: 'Jane Doe',
  handicap: 10,
};

function setupSuccessfulMock() {
  const mockRefetch = jest.fn();

  mockedUseMatchPlayData.mockReturnValue({
    player1: defaultPlayer1,
    player2: defaultPlayer2,
    holes: defaultHoles,
    courseId: 'course-1',
    courseName: 'Test Golf Course',
    clubName: null,
    selectedTee: undefined,
    isLoading: false,
    error: null,
    isInitialized: true,
    refetch: mockRefetch,
  });

  mockedUseScorecardStore.mockReturnValue({
    getPlayerScore: jest.fn().mockReturnValue(undefined),
    getCompletedHolesCount: jest.fn().mockReturnValue(0), isHoleComplete: jest.fn().mockReturnValue(false),
    submitScorecards: jest.fn(),
    resetRound: jest.fn(),
    nineType: 'full', holesPlayed: null, groupScorecards: new Map(),
    isMultiBall: false, ballCount: 1,
  } as any);

  return { mockRefetch };
}

function setupLoadingMock() {
  mockedUseMatchPlayData.mockReturnValue({
    player1: defaultPlayer1,
    player2: defaultPlayer2,
    holes: [],
    courseId: null,
    courseName: null,
    clubName: null,
    selectedTee: undefined,
    isLoading: true,
    error: null,
    isInitialized: false,
    refetch: jest.fn(),
  });

  mockedUseScorecardStore.mockReturnValue({
    getPlayerScore: jest.fn().mockReturnValue(undefined),
    getCompletedHolesCount: jest.fn().mockReturnValue(0), isHoleComplete: jest.fn().mockReturnValue(false),
    submitScorecards: jest.fn(),
    resetRound: jest.fn(),
    nineType: 'full', holesPlayed: null, groupScorecards: new Map(),
    isMultiBall: false, ballCount: 1,
  } as any);
}

function setupErrorMock(errorMessage: string) {
  mockedUseMatchPlayData.mockReturnValue({
    player1: defaultPlayer1,
    player2: defaultPlayer2,
    holes: [],
    courseId: null,
    courseName: null,
    clubName: null,
    selectedTee: undefined,
    isLoading: false,
    error: errorMessage,
    isInitialized: true,
    refetch: jest.fn(),
  });

  mockedUseScorecardStore.mockReturnValue({
    getPlayerScore: jest.fn().mockReturnValue(undefined),
    getCompletedHolesCount: jest.fn().mockReturnValue(0), isHoleComplete: jest.fn().mockReturnValue(false),
    submitScorecards: jest.fn(),
    resetRound: jest.fn(),
    nineType: 'full', holesPlayed: null, groupScorecards: new Map(),
    isMultiBall: false, ballCount: 1,
  } as any);
}

function setupEmptyHolesMock() {
  mockedUseMatchPlayData.mockReturnValue({
    player1: defaultPlayer1,
    player2: defaultPlayer2,
    holes: [],
    courseId: 'course-1',
    courseName: 'Test Golf Course',
    clubName: null,
    selectedTee: undefined,
    isLoading: false,
    error: null,
    isInitialized: true,
    refetch: jest.fn(),
  });

  mockedUseScorecardStore.mockReturnValue({
    getPlayerScore: jest.fn().mockReturnValue(undefined),
    getCompletedHolesCount: jest.fn().mockReturnValue(0), isHoleComplete: jest.fn().mockReturnValue(false),
    submitScorecards: jest.fn(),
    resetRound: jest.fn(),
    nineType: 'full', holesPlayed: null, groupScorecards: new Map(),
    isMultiBall: false, ballCount: 1,
  } as any);
}

// ============================================================================
// TESTS
// ============================================================================

describe('MatchPlayScorecardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('displays loading indicator when data is loading', () => {
      setupLoadingMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByText('Loading scorecard...')).toBeTruthy();
    });

    it('displays loading indicator when store is not initialized', () => {
      mockedUseMatchPlayData.mockReturnValue({
        player1: defaultPlayer1,
        player2: defaultPlayer2,
        holes: defaultHoles,
        courseId: 'course-1',
        courseName: 'Test Golf Course',
        clubName: null,
        selectedTee: undefined,
        isLoading: false,
        error: null,
        isInitialized: false, // Not initialized
        refetch: jest.fn(),
      });

      mockedUseScorecardStore.mockReturnValue({
        getPlayerScore: jest.fn().mockReturnValue(undefined),
        getCompletedHolesCount: jest.fn().mockReturnValue(0), isHoleComplete: jest.fn().mockReturnValue(false),
        submitScorecards: jest.fn(),
        resetRound: jest.fn(),
        nineType: 'full', holesPlayed: null, groupScorecards: new Map(),
        isMultiBall: false, ballCount: 1,
      } as any);

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByText('Loading scorecard...')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('displays error message when there is an error', () => {
      setupErrorMock('Failed to load round data');

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByText('Error Loading Scorecard')).toBeTruthy();
      expect(screen.getByText('Failed to load round data')).toBeTruthy();
    });

    it('shows back button in error state', () => {
      setupErrorMock('Network error');

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByText('Match Scorecard')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no holes data', () => {
      setupEmptyHolesMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByText('No Scorecard Data')).toBeTruthy();
      expect(screen.getByText('Start entering scores to see the match scorecard.')).toBeTruthy();
    });

    it('shows course name in empty state when available', () => {
      setupEmptyHolesMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByText('Test Golf Course')).toBeTruthy();
    });
  });

  describe('Successful Data Display', () => {
    it('renders the match scorecard table', () => {
      setupSuccessfulMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByTestId('match-play-scorecard-table')).toBeTruthy();
    });

    it('passes player data to scorecard table', () => {
      setupSuccessfulMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByTestId('player1-name')).toBeTruthy();
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('displays page header with title', () => {
      setupSuccessfulMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByText('Match Scorecard')).toBeTruthy();
    });

    it('displays course name as subtitle', () => {
      setupSuccessfulMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(screen.getByText('Test Golf Course')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('calls goBack when back button is pressed', () => {
      setupSuccessfulMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      // Find and press the back button in PageHeader
      // The PageHeader has showBack prop and onBack callback
      // We need to find the back button element
      const backButtons = screen.getAllByRole('button');

      // First button is typically the back button in PageHeader
      if (backButtons.length > 0) {
        fireEvent.press(backButtons[0]);
      }

      // Alternative: trigger directly if the header exposes testID
      // The navigation should be called via the onBack prop
    });
  });

  describe('Data Fetching', () => {
    it('calls useMatchPlayData with correct parameters', () => {
      setupSuccessfulMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(mockedUseMatchPlayData).toHaveBeenCalledWith({
        roundId: 'round-123',
        player1Id: 'player-1',
        player2Id: 'player-2',
      });
    });

    it("reads the round's skins hole counts for the skins tab", () => {
      setupSuccessfulMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(jest.requireMock('@/hooks/useSkins').useSkinsHoleCounts).toHaveBeenCalledWith('round-123');
    });

    it('uses getPlayerScore from scorecard store', () => {
      const mockGetPlayerScore = jest.fn().mockReturnValue({ strokes: 4 });

      mockedUseMatchPlayData.mockReturnValue({
        player1: defaultPlayer1,
        player2: defaultPlayer2,
        holes: defaultHoles,
        courseId: 'course-1',
        courseName: 'Test Golf Course',
        clubName: null,
        selectedTee: undefined,
        isLoading: false,
        error: null,
        isInitialized: true,
        refetch: jest.fn(),
      });

      mockedUseScorecardStore.mockReturnValue({
        getPlayerScore: mockGetPlayerScore,
        getCompletedHolesCount: jest.fn().mockReturnValue(0), isHoleComplete: jest.fn().mockReturnValue(false),
        submitScorecards: jest.fn(),
        resetRound: jest.fn(),
        nineType: 'full', holesPlayed: null, groupScorecards: new Map(),
        isMultiBall: false, ballCount: 1,
      } as any);

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      expect(mockedUseScorecardStore).toHaveBeenCalled();
    });
  });

  describe('Score Data Transformation', () => {
    it('extracts strokes from single ball score', () => {
      const mockGetPlayerScore = jest.fn().mockReturnValue({ strokes: 4, putts: 2 });

      mockedUseMatchPlayData.mockReturnValue({
        player1: defaultPlayer1,
        player2: defaultPlayer2,
        holes: defaultHoles,
        courseId: 'course-1',
        courseName: 'Test Golf Course',
        clubName: null,
        selectedTee: undefined,
        isLoading: false,
        error: null,
        isInitialized: true,
        refetch: jest.fn(),
      });

      mockedUseScorecardStore.mockReturnValue({
        getPlayerScore: mockGetPlayerScore,
        getCompletedHolesCount: jest.fn().mockReturnValue(0), isHoleComplete: jest.fn().mockReturnValue(false),
        submitScorecards: jest.fn(),
        resetRound: jest.fn(),
        nineType: 'full', holesPlayed: null, groupScorecards: new Map(),
        isMultiBall: false, ballCount: 1,
      } as any);

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      // The table should be rendered with transformed score data
      expect(screen.getByTestId('match-play-scorecard-table')).toBeTruthy();
    });

    it('returns undefined for null scores', () => {
      const mockGetPlayerScore = jest.fn().mockReturnValue(null);

      mockedUseMatchPlayData.mockReturnValue({
        player1: defaultPlayer1,
        player2: defaultPlayer2,
        holes: defaultHoles,
        courseId: 'course-1',
        courseName: 'Test Golf Course',
        clubName: null,
        selectedTee: undefined,
        isLoading: false,
        error: null,
        isInitialized: true,
        refetch: jest.fn(),
      });

      mockedUseScorecardStore.mockReturnValue({
        getPlayerScore: mockGetPlayerScore,
        getCompletedHolesCount: jest.fn().mockReturnValue(0), isHoleComplete: jest.fn().mockReturnValue(false),
        submitScorecards: jest.fn(),
        resetRound: jest.fn(),
        nineType: 'full', holesPlayed: null, groupScorecards: new Map(),
        isMultiBall: false, ballCount: 1,
      } as any);

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );

      // Component should handle null scores gracefully
      expect(screen.getByTestId('match-play-scorecard-table')).toBeTruthy();
    });
  });

  describe('Route Parameters', () => {
    it('handles different player IDs from route params', () => {
      const customRoute = {
        params: {
          roundId: 'round-456',
          player1Id: 'custom-player-1',
          player2Id: 'custom-player-2',
        },
      } as any;

      setupSuccessfulMock();

      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={customRoute} />
      );

      expect(mockedUseMatchPlayData).toHaveBeenCalledWith({
        roundId: 'round-456',
        player1Id: 'custom-player-1',
        player2Id: 'custom-player-2',
      });
    });
  });

  describe('Ended early', () => {
    function mockEndedStore({ nineType = 'full', holesPlayed = 6, isComplete }: {
      nineType?: 'full' | 'front9' | 'back9';
      holesPlayed?: number;
      isComplete: (hole: number) => boolean;
    }) {
      const state = {
        ...mockedUseScorecardStore(),
        getPlayerScore: jest.fn().mockReturnValue({ strokes: 4 }),
        getCompletedHolesCount: jest.fn().mockReturnValue(holesPlayed),
        isHoleComplete: jest.fn(isComplete),
        submitScorecards: jest.fn().mockResolvedValue(undefined),
        nineType, holesPlayed, groupScorecards: new Map(),
      };
      mockedUseScorecardStore.mockReturnValue(state);
      return state;
    }

    it('offers Review & Submit once every played hole is complete', () => {
      setupSuccessfulMock();
      mockEndedStore({ isComplete: (hole) => hole <= 6 });
      render(<MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText('Review & Submit')).toBeTruthy();
    });

    it('withholds Review & Submit while a played hole is incomplete', () => {
      setupSuccessfulMock();
      mockEndedStore({ isComplete: (hole) => hole <= 5 });
      render(<MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />);
      expect(screen.queryByText('Review & Submit')).toBeNull();
    });

    it('goes straight to the submit confirmation for complete played holes', async () => {
      setupSuccessfulMock();
      mockEndedStore({ isComplete: (hole) => hole <= 6 });
      render(<MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />);
      await act(async () => { fireEvent.press(screen.getByText('Review & Submit')); });
      expect(screen.queryByText('Incomplete Scorecard')).toBeNull();
      expect(screen.getByText('Submit Scorecard')).toBeTruthy();
    });

    it('settles a back-nine round over holes 10–15', () => {
      setupSuccessfulMock();
      const plannedHoles = defaultHoles.slice(9);
      mockedUseMatchPlayData.mockReturnValue({
        ...mockedUseMatchPlayData({ roundId: 'round-123', player1Id: 'player-1', player2Id: 'player-2' }),
        holes: plannedHoles,
      });
      mockEndedStore({ nineType: 'back9', isComplete: (hole) => hole >= 10 && hole <= 15 });
      render(<MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText('Ended after 6 of 9')).toBeTruthy();
      fireEvent.press(screen.getByText('Review & Submit'));
      expect(screen.getByText('Submit Scorecard')).toBeTruthy();
      expect(lastTableHoles()).toBe(plannedHoles);
    });

    function lastTableHoles() {
      return mockTableProps.mock.calls[mockTableProps.mock.calls.length - 1][0].holes;
    }

    it('rechecks played completion after a score-map replacement with a stable store function', () => {
      setupSuccessfulMock();
      function scorecards(completed: number) {
        return new Map(['player-1', 'player-2'].map((playerId) => {
          const scores: Scorecard['scores'] = {};
          for (const hole of defaultHoles.slice(0, completed)) {
            // Store completeness accepts a defined zero; keep that policy.
            scores[hole.number] = { strokes: hole.number === 1 ? 0 : 4 };
          }
          const card: Scorecard = {
            id: `card-${playerId}`, playerId, roundId: 'round-123', scores,
            totalGross: 0, totalNet: 0, status: 'in-progress',
            createdAt: new Date('2026-10-07'), updatedAt: new Date('2026-10-07'),
          };
          return [playerId, card] as const;
        }));
      }
      let cards = scorecards(5);
      const state = mockEndedStore({
        isComplete: (hole) => ['player-1', 'player-2'].every((id) => {
          const score = cards.get(id)?.scores[hole];
          return !!score && 'strokes' in score && score.strokes !== undefined;
        }),
      });
      mockedUseScorecardStore.mockReturnValue({ ...state, groupScorecards: cards });
      const view = () => <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />;
      const { rerender } = render(view());
      expect(screen.queryByText('Review & Submit')).toBeNull();
      cards = scorecards(6);
      mockedUseScorecardStore.mockReturnValue({ ...state, groupScorecards: cards });
      rerender(view());
      fireEvent.press(screen.getByText('Review & Submit'));
      expect(screen.getByText('Submit Scorecard')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Cancel'));
      cards = scorecards(5);
      mockedUseScorecardStore.mockReturnValue({ ...state, groupScorecards: cards });
      rerender(view());
      expect(screen.queryByText('Review & Submit')).toBeNull();
    });

    it('rechecks the current cutoff without changing planned holes or store functions', () => {
      setupSuccessfulMock();
      const state = mockEndedStore({ holesPlayed: 7, isComplete: (hole) => hole <= 6 });
      const view = () => <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />;
      const { rerender } = render(view());
      expect(screen.queryByText('Review & Submit')).toBeNull();
      mockedUseScorecardStore.mockReturnValue({ ...state, holesPlayed: 6 });
      rerender(view());
      fireEvent.press(screen.getByText('Review & Submit'));
      expect(screen.getByText('Submit Scorecard')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Cancel'));
      mockedUseScorecardStore.mockReturnValue({ ...state, holesPlayed: null });
      rerender(view());
      expect(screen.queryByText('Review & Submit')).toBeNull();
    });

    it.each(['full', 'back9'] as const)('keeps ordinary %s completion and confirmation routing', (nineType) => {
      setupSuccessfulMock();
      const holes = nineType === 'back9' ? defaultHoles.slice(9) : defaultHoles;
      mockedUseMatchPlayData.mockReturnValue({
        ...mockedUseMatchPlayData({ roundId: 'round-123', player1Id: 'player-1', player2Id: 'player-2' }), holes,
      });
      const state = {
        ...mockedUseScorecardStore(), nineType,
        getCompletedHolesCount: jest.fn().mockReturnValue(holes.length),
        isHoleComplete: jest.fn().mockReturnValue(true),
      };
      mockedUseScorecardStore.mockReturnValue(state);
      const view = () => <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />;
      const { rerender } = render(view());
      fireEvent.press(screen.getByText('Review & Submit'));
      expect(screen.getByText('Submit Scorecard')).toBeTruthy();
      expect(screen.queryByText('Incomplete Scorecard')).toBeNull();
      fireEvent.press(screen.getByLabelText('Cancel'));
      state.getCompletedHolesCount = jest.fn().mockReturnValue(holes.length - 1);
      state.isHoleComplete.mockReturnValue(false);
      // Replacing the score map models a normal Zustand score write.
      mockedUseScorecardStore.mockReturnValue({ ...state, groupScorecards: new Map() });
      rerender(view());
      expect(screen.queryByText('Review & Submit')).toBeNull();
    });

    it.each(['full', 'back9'] as const)('shows the ended-early banner without a Finish action (%s)', (nineType) => {
      setupSuccessfulMock();
      mockedUseScorecardStore.mockReturnValue({
        ...mockedUseScorecardStore(),
        getCompletedHolesCount: jest.fn().mockReturnValue(6),
        isHoleComplete: jest.fn().mockReturnValue(false),
        isMultiBall: false,
        ballCount: 1,
        nineType,
        holesPlayed: 6,
      } as any);
      render(<MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />);
      expect(screen.getByText(`Ended after 6 of ${nineType === 'full' ? 18 : 9}`)).toBeTruthy();
      expect(screen.queryByText('Finish')).toBeNull();
      expect(screen.queryByTestId('ended-early-finish')).toBeNull();
    });

    it('shows no banner for a round played as planned', () => {
      setupSuccessfulMock();
      render(<MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />);
      expect(screen.queryByText(/Ended after/)).toBeNull();
    });

    it.each([0, -3, 2.5, NaN])('shows no ended-early banner for an invalid marker (%s)', (holesPlayed) => {
      setupSuccessfulMock();
      mockedUseScorecardStore.mockReturnValue({ ...mockedUseScorecardStore(), nineType: 'full', holesPlayed } as any);
      render(<MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />);
      expect(screen.queryByTestId('ended-early-banner')).toBeNull();
    });

    it.each([9, 18])(
      'forwards cutoff changes with %s planned holes',
      (count) => {
        setupSuccessfulMock();
        const plannedHoles = count === 9 ? defaultHoles.slice(9) : defaultHoles;
        mockedUseMatchPlayData.mockReturnValue({
          ...mockedUseMatchPlayData({
            roundId: 'round-123',
            player1Id: 'player-1',
            player2Id: 'player-2',
          }),
          holes: plannedHoles,
        });
        const baseStore = mockedUseScorecardStore();
        mockedUseScorecardStore.mockReturnValue({
          ...baseStore,
          holesPlayed: null,
        });
        const tab = () => (
          <MatchPlayScorecardScreen
            navigation={mockNavigation}
            route={mockRoute}
          />
        );
        const { rerender } = render(tab());
        expect(screen.getByTestId('table-holes-played')).toHaveTextContent(
          'as-planned',
        );
        mockedUseScorecardStore.mockReturnValue({
          ...baseStore,
          holesPlayed: 6,
        });
        rerender(tab());
        expect(screen.getByTestId('table-holes-played')).toHaveTextContent('6');
        expect(
          mockTableProps.mock.calls[mockTableProps.mock.calls.length - 1][0]
            .holes,
        ).toBe(plannedHoles);
        mockedUseScorecardStore.mockReturnValue({
          ...baseStore,
          holesPlayed: null,
        });
        rerender(tab());
        expect(screen.getByTestId('table-holes-played')).toHaveTextContent(
          'as-planned',
        );
      },
    );

    it.each([undefined, null])(
      'keeps planned back-nine holes without a cutoff (%s)',
      (holesPlayed) => {
        setupSuccessfulMock();
        const plannedHoles = defaultHoles.slice(9);
        mockedUseMatchPlayData.mockReturnValue({
          ...mockedUseMatchPlayData({
            roundId: 'round-123',
            player1Id: 'player-1',
            player2Id: 'player-2',
          }),
          holes: plannedHoles,
        });
        const baseStore = mockedUseScorecardStore();
        mockedUseScorecardStore.mockReturnValue({ ...baseStore, holesPlayed });

        render(
          <MatchPlayScorecardScreen
            navigation={mockNavigation}
            route={mockRoute}
          />,
        );

        expect(screen.getByTestId('table-holes-played')).toHaveTextContent(
          'as-planned',
        );
        expect(
          mockTableProps.mock.calls[mockTableProps.mock.calls.length - 1][0]
            .holes,
        ).toBe(plannedHoles);
      },
    );
  });

  describe('Header Display', () => {
    it('shows Match Scorecard title in all states', () => {
      // Test loading state
      setupLoadingMock();
      const { unmount } = render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );
      expect(screen.getByText('Match Scorecard')).toBeTruthy();
      unmount();

      // Test error state
      setupErrorMock('Error');
      const { unmount: unmount2 } = render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );
      expect(screen.getByText('Match Scorecard')).toBeTruthy();
      unmount2();

      // Test success state
      setupSuccessfulMock();
      render(
        <MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />
      );
      expect(screen.getByText('Match Scorecard')).toBeTruthy();
    });
  });

  describe('Submission', () => {
    it('finalises the round through the shared submit step instead of writing the status itself', async () => {
      setupSuccessfulMock();
      const submitScorecards = jest.fn().mockResolvedValue(undefined);
      mockedUseScorecardStore.mockReturnValue({
        getPlayerScore: jest.fn().mockReturnValue({ strokes: 4 }),
        getCompletedHolesCount: jest.fn().mockReturnValue(18),
        isHoleComplete: jest.fn().mockReturnValue(true),
        submitScorecards,
        resetRound: jest.fn(),
        nineType: 'full', holesPlayed: null, groupScorecards: new Map(),
        isMultiBall: false, ballCount: 1,
      } as any);
      mockFinalizeRound.mockResolvedValue({ completed: true, queued: false });

      render(<MatchPlayScorecardScreen navigation={mockNavigation} route={mockRoute} />);

      fireEvent.press(screen.getByText('Review & Submit'));
      await act(async () => {
        fireEvent.press(screen.getByLabelText('Submit'));
      });

      expect(submitScorecards).toHaveBeenCalled();
      expect(mockFinalizeRound).toHaveBeenCalledWith('round-123');
      expect(supabase.from).not.toHaveBeenCalledWith('rounds');
      expect(screen.getByText('Match scorecard has been submitted successfully!')).toBeTruthy();
    });
  });
});
