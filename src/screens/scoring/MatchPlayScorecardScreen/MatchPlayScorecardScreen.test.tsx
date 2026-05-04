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
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import MatchPlayScorecardScreen from './index';
import { useMatchPlayData } from '@/hooks/scorecard';
import { useScorecardStore } from '@/store/scorecardStore';
import type { Hole } from '@/types';

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
jest.mock('@/components/scorecard', () => ({
  MatchPlayScorecardTable: ({ player1, player2 }: { player1: { name: string }; player2: { name: string } }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="match-play-scorecard-table">
        <Text testID="player1-name">{player1.name}</Text>
        <Text testID="player2-name">{player2.name}</Text>
      </View>
    );
  },
}));

// Mock skins hooks
jest.mock('@/hooks/useSkins', () => ({
  useActiveSkinsGameForRound: jest.fn().mockReturnValue({ data: null, isLoading: false }),
  useSkinsResults: jest.fn().mockReturnValue({ data: null, refetch: jest.fn() }),
}));

// Mock useFinalizeSkinsForRound
jest.mock('@/hooks', () => ({
  useFinalizeSkinsForRound: jest.fn().mockReturnValue({ finalizeSkinsForRound: jest.fn().mockResolvedValue({ finalized: false }) }),
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

// Mock subscription context.
jest.mock('@/context/SubscriptionContext', () => ({
  useIsSocial: jest.fn(() => false),
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
    getCompletedHolesCount: jest.fn().mockReturnValue(0),
    submitScorecards: jest.fn(),
    resetRound: jest.fn(),
  } as any);

  return { mockRefetch };
}

function setupLoadingMock() {
  mockedUseMatchPlayData.mockReturnValue({
    player1: defaultPlayer1,
    player2: defaultPlayer2,
    holes: [],
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
    getCompletedHolesCount: jest.fn().mockReturnValue(0),
    submitScorecards: jest.fn(),
    resetRound: jest.fn(),
  } as any);
}

function setupErrorMock(errorMessage: string) {
  mockedUseMatchPlayData.mockReturnValue({
    player1: defaultPlayer1,
    player2: defaultPlayer2,
    holes: [],
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
    getCompletedHolesCount: jest.fn().mockReturnValue(0),
    submitScorecards: jest.fn(),
    resetRound: jest.fn(),
  } as any);
}

function setupEmptyHolesMock() {
  mockedUseMatchPlayData.mockReturnValue({
    player1: defaultPlayer1,
    player2: defaultPlayer2,
    holes: [],
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
    getCompletedHolesCount: jest.fn().mockReturnValue(0),
    submitScorecards: jest.fn(),
    resetRound: jest.fn(),
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
        getCompletedHolesCount: jest.fn().mockReturnValue(0),
        submitScorecards: jest.fn(),
        resetRound: jest.fn(),
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

    it('uses getPlayerScore from scorecard store', () => {
      const mockGetPlayerScore = jest.fn().mockReturnValue({ strokes: 4 });

      mockedUseMatchPlayData.mockReturnValue({
        player1: defaultPlayer1,
        player2: defaultPlayer2,
        holes: defaultHoles,
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
        getCompletedHolesCount: jest.fn().mockReturnValue(0),
        submitScorecards: jest.fn(),
        resetRound: jest.fn(),
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
        getCompletedHolesCount: jest.fn().mockReturnValue(0),
        submitScorecards: jest.fn(),
        resetRound: jest.fn(),
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
        getCompletedHolesCount: jest.fn().mockReturnValue(0),
        submitScorecards: jest.fn(),
        resetRound: jest.fn(),
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
});
