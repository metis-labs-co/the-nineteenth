/**
 * RoundListCard Component Tests
 *
 * Tests for the round list card component including:
 * - Basic rendering with different round statuses
 * - Competition vs standalone practice rounds
 * - Player display for standalone rounds
 * - Course information display
 * - Date and game type display
 * - Progress bar for in-progress rounds
 * - Swipe-to-delete functionality
 * - Accessibility features
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { RoundListCard } from './RoundListCard';
import type { RoundListCardData } from './types';

// =====================================================
// MOCKS
// =====================================================

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View, Text } = require('react-native');
  return {
    IconMapPin: (props: any) => (
      <View testID="icon-map-pin" {...props}>
        <Text>MapPin</Text>
      </View>
    ),
    IconUsers: (props: any) => (
      <View testID="icon-users" {...props}>
        <Text>Users</Text>
      </View>
    ),
    IconTrash: (props: any) => (
      <View testID="icon-trash" {...props}>
        <Text>Trash</Text>
      </View>
    ),
    IconDog: (props: any) => (
      <View testID="icon-dog" {...props}>
        <Text>Dog</Text>
      </View>
    ),
  };
});

// Mock common components
jest.mock('@/components/common', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    CardContainer: ({ children, onPress, style, testID, accessibilityLabel, swipeable, onDelete, ...props }: any) => (
      <View>
        <TouchableOpacity
          testID={testID || 'card-container'}
          onPress={onPress}
          style={style}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          {...props}
        >
          {children}
        </TouchableOpacity>
        {swipeable && onDelete && (
          <TouchableOpacity testID="delete-button" onPress={onDelete}>
            <View testID="icon-trash">
              <Text>Trash</Text>
            </View>
            <Text>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    StatusBadge: ({ status, label, size: _size }: { status: string; label?: string; size?: string }) => (
      <View testID={label ? `game-type-badge-${label}` : `status-badge-${status}`}>
        <Text>{label || status}</Text>
      </View>
    ),
    ProgressBar: ({
      value,
      max,
      label,
    }: {
      value: number;
      max: number;
      label?: string;
    }) => (
      <View testID="progress-bar">
        <Text testID="progress-value">{value}/{max}</Text>
        {label && <Text testID="progress-label">{label}</Text>}
      </View>
    ),
    DateTimeDisplay: ({
      date,
      time,
      size: _size,
    }: {
      date: string | Date;
      time?: string | null;
      size?: string;
    }) => (
      <View testID="datetime-display">
        <Text testID="date-value">{typeof date === 'string' ? date : date.toISOString()}</Text>
        {time && <Text testID="time-value">{time}</Text>}
      </View>
    ),
    Pill: ({ label, size: _size }: { label: string; size?: string }) => (
      <View testID="pill">
        <Text>{label}</Text>
      </View>
    ),
    WinnerRow: ({ winner, pointsLabel, size: _size }: any) => (
      <View testID="winner-row">
        <Text>{winner?.name || 'Unknown'}</Text>
        {pointsLabel && <Text>{pointsLabel}</Text>}
      </View>
    ),
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

/**
 * Create a basic round data fixture
 */
function createRoundData(overrides: Partial<RoundListCardData> = {}): RoundListCardData {
  return {
    id: 'round-1',
    course: {
      id: 'course-1',
      name: 'Royal Melbourne',
      venueName: 'Royal Melbourne Golf Club',
      city: 'Melbourne',
      state: 'VIC',
    },
    competition: {
      id: 'comp-1',
      name: 'Summer Series',
    },
    status: 'scheduled',
    date: '2025-01-15',
    teeTime: '10:30 AM',
    gameType: 'stableford',
    isStandalone: false,
    roundNumber: 1,
    totalRounds: 4,
    holesCompleted: 0,
    totalHoles: 18,
    ...overrides,
  };
}

/**
 * Create a standalone/practice round data fixture
 */
function createStandaloneRound(overrides: Partial<RoundListCardData> = {}): RoundListCardData {
  return createRoundData({
    id: 'practice-1',
    competition: null,
    isStandalone: true,
    roundNumber: 1,
    totalRounds: 1,
    players: [
      { id: 'player-1', name: 'John Smith' },
      { id: 'player-2', name: 'Jane Doe' },
    ],
    ...overrides,
  });
}

/**
 * Create an in-progress round data fixture
 */
function createInProgressRound(overrides: Partial<RoundListCardData> = {}): RoundListCardData {
  return createRoundData({
    id: 'round-in-progress',
    status: 'in-progress',
    holesCompleted: 9,
    totalHoles: 18,
    ...overrides,
  });
}

/**
 * Create a completed round data fixture
 */
function createCompletedRound(overrides: Partial<RoundListCardData> = {}): RoundListCardData {
  return createRoundData({
    id: 'round-completed',
    status: 'completed',
    holesCompleted: 18,
    totalHoles: 18,
    ...overrides,
  });
}

// =====================================================
// TESTS
// =====================================================

describe('RoundListCard', () => {
  const defaultOnPress = jest.fn();
  const defaultOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // BASIC RENDERING TESTS
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const round = createRoundData();
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="round-card" />);

      expect(screen.getByTestId('round-card')).toBeTruthy();
    });

    it('renders with scheduled status', () => {
      const round = createRoundData({ status: 'scheduled' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Status badge is no longer shown for regular statuses;
      // verify the card renders the game type pill and competition name
      expect(screen.getByText('Stableford')).toBeTruthy();
      expect(screen.getByText('Summer Series')).toBeTruthy();
    });

    it('renders with in-progress status', () => {
      const round = createInProgressRound();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // In-progress rounds show a progress bar
      expect(screen.getByTestId('progress-bar')).toBeTruthy();
    });

    it('renders with completed status', () => {
      const round = createCompletedRound();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Completed rounds render without error
      expect(screen.getByText('Stableford')).toBeTruthy();
    });

  });

  // ===========================================================================
  // COMPETITION ROUND TESTS
  // ===========================================================================

  describe('Competition Round Display', () => {
    it('displays competition name', () => {
      const round = createRoundData({
        competition: { id: 'comp-1', name: 'Summer Series' },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Summer Series')).toBeTruthy();
    });

    it('displays round number pill when multiple rounds exist', () => {
      const round = createRoundData({
        roundNumber: 2,
        totalRounds: 4,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Round 2 of 4')).toBeTruthy();
    });

    it('does not display round pill for single round competition', () => {
      const round = createRoundData({
        roundNumber: 1,
        totalRounds: 1,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByText('Round 1 of 1')).toBeNull();
    });

    it('displays fallback "Competition" when no competition name', () => {
      const round = createRoundData({
        competition: { id: 'comp-1', name: '' },
        isStandalone: false,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Should show "Competition" when name is empty
      expect(screen.getByText('Competition')).toBeTruthy();
    });

    it('displays "Competition" when competition is null but not standalone', () => {
      const round = createRoundData({
        competition: null,
        isStandalone: false,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Competition')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STANDALONE/PRACTICE ROUND TESTS
  // ===========================================================================

  describe('Standalone/Practice Round Display', () => {
    it('displays "Practice Round" label for solo standalone round', () => {
      const round = createStandaloneRound({
        players: [{ id: 'player-1', name: 'John Smith' }],
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Practice Round')).toBeTruthy();
    });

    it('displays "Match" label for multiplayer standalone round', () => {
      const round = createStandaloneRound();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Match')).toBeTruthy();
    });

    it('displays playing partners for standalone rounds', () => {
      const round = createStandaloneRound({
        players: [
          { id: 'player-1', name: 'John Smith' },
          { id: 'player-2', name: 'Jane Doe' },
          { id: 'player-3', name: 'Bob Wilson' },
        ],
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByTestId('icon-users')).toBeTruthy();
      expect(screen.getByText('John, Jane, Bob')).toBeTruthy();
    });

    it('displays "You" for current user in players list', () => {
      const round = createStandaloneRound({
        players: [
          { id: 'current-user', name: 'My Name' },
          { id: 'player-2', name: 'Jane Doe' },
        ],
      });
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          currentUserId="current-user"
        />
      );

      expect(screen.getByText('You, Jane')).toBeTruthy();
    });

    it('does not display players for single player standalone round', () => {
      const round = createStandaloneRound({
        players: [{ id: 'player-1', name: 'John Smith' }],
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Should not show players row when only 1 player
      expect(screen.queryByTestId('icon-users')).toBeNull();
    });

    it('does not display players when players array is empty', () => {
      const round = createStandaloneRound({
        players: [],
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('icon-users')).toBeNull();
    });

    it('does not display players when players is undefined', () => {
      const round = createStandaloneRound({
        players: undefined,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('icon-users')).toBeNull();
    });
  });

  // ===========================================================================
  // COURSE INFORMATION TESTS
  // ===========================================================================

  describe('Course Information Display', () => {
    it('displays course name with map pin icon', () => {
      const round = createRoundData({
        course: { id: 'c1', name: 'Royal Melbourne' },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByTestId('icon-map-pin')).toBeTruthy();
      expect(screen.getByText('Royal Melbourne')).toBeTruthy();
    });

    it('displays venue name when same as course name', () => {
      const round = createRoundData({
        course: {
          id: 'c1',
          name: 'Kingston Heath',
          venueName: 'Kingston Heath',
        },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Should just show venue name once
      expect(screen.getByText('Kingston Heath')).toBeTruthy();
    });

    it('displays venue and course name when different', () => {
      const round = createRoundData({
        course: {
          id: 'c1',
          name: 'West Course',
          venueName: 'Sandbelt Golf Club',
        },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Sandbelt Golf Club (West Course)')).toBeTruthy();
    });

    it('displays only course name when no venue', () => {
      const round = createRoundData({
        course: {
          id: 'c1',
          name: 'Public Links',
          venueName: undefined,
        },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Public Links')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DATE AND TIME TESTS
  // ===========================================================================

  describe('Date and Time Display', () => {
    it('displays date and tee time', () => {
      const round = createRoundData({
        date: '2025-01-15',
        teeTime: '10:30 AM',
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByTestId('datetime-display')).toBeTruthy();
      expect(screen.getByTestId('date-value')).toBeTruthy();
      expect(screen.getByTestId('time-value')).toBeTruthy();
    });

    it('handles Date object for date', () => {
      const round = createRoundData({
        date: new Date('2025-01-15T00:00:00Z'),
        teeTime: '10:30 AM',
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByTestId('datetime-display')).toBeTruthy();
    });

    it('handles null tee time', () => {
      const round = createRoundData({
        date: '2025-01-15',
        teeTime: null,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByTestId('datetime-display')).toBeTruthy();
      expect(screen.queryByTestId('time-value')).toBeNull();
    });

    it('does not display date when null', () => {
      const round = createRoundData({
        date: null,
        teeTime: null,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('datetime-display')).toBeNull();
    });
  });

  // ===========================================================================
  // GAME TYPE TESTS
  // ===========================================================================

  describe('Game Type Display', () => {
    it('displays Stableford game type', () => {
      const round = createRoundData({ gameType: 'stableford' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Stableford')).toBeTruthy();
    });

    it('displays Stroke Play game type', () => {
      const round = createRoundData({ gameType: 'stroke' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Stroke Play')).toBeTruthy();
    });

    it('displays Match Play game type', () => {
      const round = createRoundData({ gameType: 'match-play' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Match Play')).toBeTruthy();
    });

    it('displays Scramble game type', () => {
      const round = createRoundData({ gameType: 'scramble' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Scramble')).toBeTruthy();
    });

    it('displays Best Ball game type', () => {
      const round = createRoundData({ gameType: 'best-ball' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Best Ball')).toBeTruthy();
    });

    it('displays unknown game type as-is', () => {
      const round = createRoundData({ gameType: 'custom_format' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Unknown game types are passed through as-is from getGameTypeLabel
      expect(screen.getByText('custom_format')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROGRESS BAR TESTS
  // ===========================================================================

  describe('Progress Bar Display', () => {
    it('displays progress bar for in-progress rounds', () => {
      const round = createInProgressRound({
        holesCompleted: 9,
        totalHoles: 18,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByTestId('progress-bar')).toBeTruthy();
      expect(screen.getByText('9/18 holes')).toBeTruthy();
    });

    it('does not display progress bar for scheduled rounds', () => {
      const round = createRoundData({ status: 'scheduled' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('progress-bar')).toBeNull();
    });

    it('does not display progress bar for completed rounds', () => {
      const round = createCompletedRound();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('progress-bar')).toBeNull();
    });

    it('displays correct progress values', () => {
      const round = createInProgressRound({
        holesCompleted: 12,
        totalHoles: 18,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('12/18')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PRESS HANDLER TESTS
  // ===========================================================================

  describe('Press Handler', () => {
    it('calls onPress with round data when pressed', () => {
      const round = createRoundData();
      const onPress = jest.fn();
      render(<RoundListCard round={round} onPress={onPress} testID="round-card" />);

      fireEvent.press(screen.getByTestId('round-card'));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(round);
    });

    it('preserves custom round data properties when pressed', () => {
      interface CustomRound extends RoundListCardData {
        customField: string;
      }
      const round: CustomRound = {
        ...createRoundData(),
        customField: 'custom-value',
      };
      const onPress = jest.fn();
      render(<RoundListCard round={round} onPress={onPress} testID="round-card" />);

      fireEvent.press(screen.getByTestId('round-card'));

      expect(onPress).toHaveBeenCalledWith(expect.objectContaining({
        customField: 'custom-value',
      }));
    });
  });

  // ===========================================================================
  // SWIPE TO DELETE TESTS
  // ===========================================================================

  describe('Swipe to Delete', () => {
    it('does not render delete button when swipeEnabled is false', () => {
      const round = createRoundData();
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          swipeEnabled={false}
        />
      );

      expect(screen.queryByTestId('icon-trash')).toBeNull();
    });

    it('renders delete button when swipeEnabled is true', () => {
      const round = createRoundData();
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
        />
      );

      expect(screen.getByTestId('icon-trash')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('swipeEnabled defaults to false', () => {
      const round = createRoundData();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('icon-trash')).toBeNull();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has button accessibility role', () => {
      const round = createRoundData();
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="round-card" />);

      const card = screen.getByTestId('round-card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('has appropriate accessibility label for scheduled round', () => {
      const round = createRoundData({
        status: 'scheduled',
        course: { id: 'c1', name: 'Royal Melbourne', venueName: 'Royal Melbourne Golf Club' },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="round-card" />);

      const card = screen.getByTestId('round-card');
      expect(card.props.accessibilityLabel).toContain('Royal Melbourne Golf Club');
    });

    it('has appropriate accessibility label for in-progress round', () => {
      const round = createInProgressRound({
        course: { id: 'c1', name: 'Kingston Heath' },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="round-card" />);

      const card = screen.getByTestId('round-card');
      expect(card.props.accessibilityLabel).toContain('Score');
      expect(card.props.accessibilityLabel).toContain('Kingston Heath');
    });

    it('includes swipe hint in accessibility label when swipe enabled', () => {
      const round = createRoundData();
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="round-card"
        />
      );

      const card = screen.getByTestId('round-card');
      expect(card.props.accessibilityLabel).toContain('swipe left to delete');
    });

    it('uses custom action label in accessibility', () => {
      const round = createRoundData();
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          actionLabel="Continue scoring"
          testID="round-card"
        />
      );

      const card = screen.getByTestId('round-card');
      expect(card.props.accessibilityLabel).toContain('Continue scoring');
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty course name', () => {
      const round = createRoundData({
        course: { id: 'c1', name: '' },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Should render without crashing
      expect(screen.getByTestId('icon-map-pin')).toBeTruthy();
    });

    it('handles zero holes completed', () => {
      const round = createInProgressRound({
        holesCompleted: 0,
        totalHoles: 18,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('0/18 holes')).toBeTruthy();
    });

    it('handles 9-hole round', () => {
      const round = createInProgressRound({
        holesCompleted: 5,
        totalHoles: 9,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('5/9 holes')).toBeTruthy();
    });

    it('handles empty competition name', () => {
      const round = createRoundData({
        competition: { id: 'c1', name: '' },
        isStandalone: false,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Should show fallback "Competition"
      expect(screen.getByText('Competition')).toBeTruthy();
    });

    it('handles round number 0', () => {
      const round = createRoundData({
        roundNumber: 0,
        totalRounds: 4,
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Should still display pill (unusual but valid data)
      expect(screen.getByText('Round 0 of 4')).toBeTruthy();
    });

    it('handles very long competition name', () => {
      const round = createRoundData({
        competition: {
          id: 'c1',
          name: 'The Annual Summer Golf Championship Series Tournament 2025',
        },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('The Annual Summer Golf Championship Series Tournament 2025')).toBeTruthy();
    });

    it('handles very long course name', () => {
      const round = createRoundData({
        course: {
          id: 'c1',
          name: 'The Very Long Named Golf Course at Prestigious Country Club Estate',
        },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('The Very Long Named Golf Course at Prestigious Country Club Estate')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STATUS VARIANT MAPPING TESTS
  // ===========================================================================

  describe('Status Variant Mapping', () => {
    it('does not show status badge for scheduled rounds', () => {
      const round = createRoundData({ status: 'scheduled' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      // Regular statuses no longer show a StatusBadge
      expect(screen.queryByTestId('status-badge-upcoming')).toBeNull();
    });

    it('shows stale badge for in-progress round with past date', () => {
      const round = createInProgressRound({
        date: '2020-01-01', // past date to trigger stale detection
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Not Completed')).toBeTruthy();
    });

    it('does not show stale badge for in-progress round with today or future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const round = createInProgressRound({
        date: futureDate.toISOString().split('T')[0],
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByText('Not Completed')).toBeNull();
    });

    it('does not show status badge for completed rounds', () => {
      const round = createCompletedRound();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('status-badge-completed')).toBeNull();
    });
  });

  // ===========================================================================
  // TESTID PROP TESTS
  // ===========================================================================

  describe('testID Prop', () => {
    it('applies testID to the card', () => {
      const round = createRoundData();
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="my-round-card" />);

      expect(screen.getByTestId('my-round-card')).toBeTruthy();
    });

    it('applies testID in swipe mode', () => {
      const round = createRoundData();
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="swipeable-card"
        />
      );

      expect(screen.getByTestId('swipeable-card')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMOIZATION TESTS
  // ===========================================================================

  describe('Memoization', () => {
    it('component is exported and can be rendered', () => {
      // Verify the component can be imported and rendered (memoization doesn't change this)
      const round = createRoundData();
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="memo-test" />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DARK MODE TESTS
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode', () => {
      const round = createRoundData();
      render(
        <RoundListCard round={round} onPress={defaultOnPress} testID="dark-mode-card" />,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('dark-mode-card')).toBeTruthy();
    });

    it('renders swipe mode correctly in dark mode', () => {
      const round = createRoundData();
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="dark-swipe-card"
        />,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('dark-swipe-card')).toBeTruthy();
    });
  });
});
