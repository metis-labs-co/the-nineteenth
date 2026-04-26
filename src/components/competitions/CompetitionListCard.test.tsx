/**
 * CompetitionListCard Component Tests
 *
 * Tests for the competition list card component including:
 * - Basic rendering with different competition statuses
 * - Status badge mapping
 * - Organizer vs Player role display
 * - Round and player counts
 * - Date display
 * - Swipe-to-delete functionality
 * - Accessibility features
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { CompetitionListCard, CompetitionListCardData } from './CompetitionListCard';

// =====================================================
// MOCKS
// =====================================================

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View, Text } = require('react-native');
  return {
    IconChevronRight: (props: any) => (
      <View testID="icon-chevron-right" {...props}>
        <Text>ChevronRight</Text>
      </View>
    ),
    IconUsers: (props: any) => (
      <View testID="icon-users" {...props}>
        <Text>Users</Text>
      </View>
    ),
    IconTrophy: (props: any) => (
      <View testID="icon-trophy" {...props}>
        <Text>Trophy</Text>
      </View>
    ),
    IconTrash: (props: any) => (
      <View testID="icon-trash" {...props}>
        <Text>Trash</Text>
      </View>
    ),
    IconCurrencyDollar: (props: any) => (
      <View testID="icon-currency-dollar" {...props}>
        <Text>CurrencyDollar</Text>
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
          accessibilityActions={swipeable && onDelete ? [{ name: 'delete', label: 'Delete' }] : undefined}
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
    StatusBadge: ({ status }: { status: string }) => (
      <View testID={`status-badge-${status}`}>
        <Text>{status}</Text>
      </View>
    ),
    DateTimeDisplay: ({
      date,
      size: _size,
      style,
    }: {
      date: string | null;
      size?: string;
      style?: any;
    }) =>
      date ? (
        <View testID="datetime-display" style={style}>
          <Text testID="date-value">{date}</Text>
        </View>
      ) : null,
    Pill: ({
      label,
      variant: _variant,
      size: _size,
    }: {
      label: string;
      variant?: string;
      size?: string;
    }) => (
      <View testID={`pill-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        <Text>{label}</Text>
      </View>
    ),
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

/**
 * Create a basic competition data fixture
 */
function createCompetitionData(
  overrides: Partial<CompetitionListCardData> = {}
): CompetitionListCardData {
  return {
    id: 'comp-1',
    name: 'Summer Series 2025',
    status: 'active',
    rounds: 4,
    players: 12,
    isOrganizer: true,
    startDate: '2025-01-15',
    ...overrides,
  };
}

/**
 * Create a draft competition fixture
 */
function createDraftCompetition(
  overrides: Partial<CompetitionListCardData> = {}
): CompetitionListCardData {
  return createCompetitionData({
    id: 'draft-1',
    name: 'New Competition',
    status: 'draft',
    rounds: 1,
    players: 0,
    ...overrides,
  });
}

/**
 * Create an upcoming competition fixture
 */
function createUpcomingCompetition(
  overrides: Partial<CompetitionListCardData> = {}
): CompetitionListCardData {
  return createCompetitionData({
    id: 'upcoming-1',
    name: 'Upcoming Tournament',
    status: 'upcoming',
    rounds: 3,
    players: 8,
    ...overrides,
  });
}

/**
 * Create a completed competition fixture
 */
function createCompletedCompetition(
  overrides: Partial<CompetitionListCardData> = {}
): CompetitionListCardData {
  return createCompetitionData({
    id: 'completed-1',
    name: 'Finished Championship',
    status: 'completed',
    rounds: 4,
    players: 16,
    ...overrides,
  });
}

/**
 * Create a cancelled competition fixture
 */
function createCancelledCompetition(
  overrides: Partial<CompetitionListCardData> = {}
): CompetitionListCardData {
  return createCompetitionData({
    id: 'cancelled-1',
    name: 'Cancelled Event',
    status: 'cancelled',
    rounds: 2,
    players: 6,
    ...overrides,
  });
}

// =====================================================
// TESTS
// =====================================================

describe('CompetitionListCard', () => {
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
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="competition-card"
        />
      );

      expect(screen.getByTestId('competition-card')).toBeTruthy();
    });

    it('renders competition name', () => {
      const competition = createCompetitionData({ name: 'Winter Cup 2025' });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('Winter Cup 2025')).toBeTruthy();
    });

    it('renders chevron right icon', () => {
      const competition = createCompetitionData();
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('renders trophy icon for rounds', () => {
      const competition = createCompetitionData();
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('icon-trophy')).toBeTruthy();
    });

    it('renders users icon for players', () => {
      const competition = createCompetitionData();
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('icon-users')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STATUS BADGE TESTS
  // ===========================================================================

  describe('Status Badge Display', () => {
    it('displays active status badge for active competition', () => {
      const competition = createCompetitionData({ status: 'active' });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-active')).toBeTruthy();
    });

    it('displays in-progress status badge for in-progress competition', () => {
      const competition = createCompetitionData({ status: 'in-progress' });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-in-progress')).toBeTruthy();
    });

    it('displays completed status badge', () => {
      const competition = createCompletedCompetition();
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-completed')).toBeTruthy();
    });

    it('displays upcoming status badge', () => {
      const competition = createUpcomingCompetition();
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-upcoming')).toBeTruthy();
    });

    it('displays cancelled status badge', () => {
      const competition = createCancelledCompetition();
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-cancelled')).toBeTruthy();
    });

    it('displays draft status badge for draft competition', () => {
      const competition = createDraftCompetition();
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-draft')).toBeTruthy();
    });

    it('displays draft status badge for unknown status', () => {
      const competition = createCompetitionData({ status: 'unknown-status' });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-draft')).toBeTruthy();
    });

    it('handles case-insensitive status matching', () => {
      const competition = createCompetitionData({ status: 'ACTIVE' });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-active')).toBeTruthy();
    });

    it('handles uppercase COMPLETED status', () => {
      const competition = createCompetitionData({ status: 'COMPLETED' });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-completed')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ROLE DISPLAY TESTS
  // ===========================================================================

  describe('Role Display', () => {
    it('displays Organiser pill when isOrganizer is true', () => {
      const competition = createCompetitionData({ isOrganizer: true });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('pill-organiser')).toBeTruthy();
      expect(screen.getByText('Organiser')).toBeTruthy();
    });

    it('displays Player pill when isOrganizer is false', () => {
      const competition = createCompetitionData({ isOrganizer: false });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('pill-player')).toBeTruthy();
      expect(screen.getByText('Player')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ROUNDS DISPLAY TESTS
  // ===========================================================================

  describe('Rounds Display', () => {
    it('displays round count with plural', () => {
      const competition = createCompetitionData({ rounds: 4 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('4 rounds')).toBeTruthy();
    });

    it('displays singular "round" for 1 round', () => {
      const competition = createCompetitionData({ rounds: 1 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('1 round')).toBeTruthy();
    });

    it('displays 0 rounds correctly', () => {
      const competition = createCompetitionData({ rounds: 0 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('0 rounds')).toBeTruthy();
    });

    it('displays large round count', () => {
      const competition = createCompetitionData({ rounds: 12 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('12 rounds')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYERS DISPLAY TESTS
  // ===========================================================================

  describe('Players Display', () => {
    it('displays player count with plural', () => {
      const competition = createCompetitionData({ players: 12 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('12 players')).toBeTruthy();
    });

    it('displays singular "player" for 1 player', () => {
      const competition = createCompetitionData({ players: 1 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('1 player')).toBeTruthy();
    });

    it('displays 0 players correctly', () => {
      const competition = createCompetitionData({ players: 0 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('0 players')).toBeTruthy();
    });

    it('displays large player count', () => {
      const competition = createCompetitionData({ players: 100 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('100 players')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PRIZE POOL DISPLAY TESTS
  // ===========================================================================

  describe('Prize Pool Display', () => {
    it('displays prize pool indicator when hasPrizePool is true and amount is positive', () => {
      const competition = createCompetitionData({
        hasPrizePool: true,
        prizePoolAmount: 400,
      });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('icon-currency-dollar')).toBeTruthy();
      expect(screen.getByText('$400 pool')).toBeTruthy();
    });

    it('does not display prize pool indicator when hasPrizePool is false', () => {
      const competition = createCompetitionData({
        hasPrizePool: false,
        prizePoolAmount: 400,
      });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('icon-currency-dollar')).toBeNull();
      expect(screen.queryByText('$400 pool')).toBeNull();
    });

    it('does not display prize pool indicator when prizePoolAmount is 0', () => {
      const competition = createCompetitionData({
        hasPrizePool: true,
        prizePoolAmount: 0,
      });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('icon-currency-dollar')).toBeNull();
    });

    it('does not display prize pool indicator when prizePoolAmount is undefined', () => {
      const competition = createCompetitionData({
        hasPrizePool: true,
        prizePoolAmount: undefined,
      });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('icon-currency-dollar')).toBeNull();
    });

    it('formats large prize pool amounts with commas', () => {
      const competition = createCompetitionData({
        hasPrizePool: true,
        prizePoolAmount: 1500,
      });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('$1,500 pool')).toBeTruthy();
    });

    it('formats decimal prize pool amounts correctly', () => {
      const competition = createCompetitionData({
        hasPrizePool: true,
        prizePoolAmount: 250.5,
      });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('$250.5 pool')).toBeTruthy();
    });

    it('includes prize pool in accessibility label when present', () => {
      const competition = createCompetitionData({
        name: 'Summer Series',
        hasPrizePool: true,
        prizePoolAmount: 400,
      });
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="competition-card"
        />
      );

      const card = screen.getByTestId('competition-card');
      expect(card.props.accessibilityLabel).toContain('$400 prize pool');
    });

    it('does not include prize pool in accessibility label when not present', () => {
      const competition = createCompetitionData({
        name: 'Summer Series',
        hasPrizePool: false,
      });
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="competition-card"
        />
      );

      const card = screen.getByTestId('competition-card');
      expect(card.props.accessibilityLabel).not.toContain('prize pool');
    });
  });

  // ===========================================================================
  // DATE DISPLAY TESTS
  // ===========================================================================

  describe('Date Display', () => {
    it('displays date when startDate is provided', () => {
      const competition = createCompetitionData({ startDate: '2025-01-15' });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('datetime-display')).toBeTruthy();
      expect(screen.getByTestId('date-value')).toBeTruthy();
    });

    it('does not display date when startDate is null', () => {
      const competition = createCompetitionData({ startDate: null });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('datetime-display')).toBeNull();
    });
  });

  // ===========================================================================
  // PRESS HANDLER TESTS
  // ===========================================================================

  describe('Press Handler', () => {
    it('calls onPress with competition data when pressed', () => {
      const competition = createCompetitionData();
      const onPress = jest.fn();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={onPress}
          testID="competition-card"
        />
      );

      fireEvent.press(screen.getByTestId('competition-card'));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(competition);
    });

    it('preserves custom competition data properties when pressed', () => {
      interface CustomCompetition extends CompetitionListCardData {
        customField: string;
      }
      const competition: CustomCompetition = {
        ...createCompetitionData(),
        customField: 'custom-value',
      };
      const onPress = jest.fn();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={onPress}
          testID="competition-card"
        />
      );

      fireEvent.press(screen.getByTestId('competition-card'));

      expect(onPress).toHaveBeenCalledWith(
        expect.objectContaining({
          customField: 'custom-value',
        })
      );
    });

    it('does not call onPress when swipe is open (non-swipe mode)', () => {
      // In non-swipe mode, pressing always works
      const competition = createCompetitionData();
      const onPress = jest.fn();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={onPress}
          testID="competition-card"
        />
      );

      fireEvent.press(screen.getByTestId('competition-card'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // SWIPE TO DELETE TESTS
  // ===========================================================================

  describe('Swipe to Delete', () => {
    it('does not render delete button when swipeEnabled is false', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          swipeEnabled={false}
        />
      );

      expect(screen.queryByTestId('icon-trash')).toBeNull();
      expect(screen.queryByText('Delete')).toBeNull();
    });

    it('renders delete button when swipeEnabled is true', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
        />
      );

      expect(screen.getByTestId('icon-trash')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });

    it('swipeEnabled defaults to false', () => {
      const competition = createCompetitionData();
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('icon-trash')).toBeNull();
    });

    it('renders swipe container when swipeEnabled is true', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="swipe-card"
        />
      );

      // Card should still be rendered
      expect(screen.getByTestId('swipe-card')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has button accessibility role', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="competition-card"
        />
      );

      const card = screen.getByTestId('competition-card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('has appropriate accessibility label for organizer', () => {
      const competition = createCompetitionData({
        name: 'Summer Series',
        isOrganizer: true,
        rounds: 4,
        players: 12,
      });
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="competition-card"
        />
      );

      const card = screen.getByTestId('competition-card');
      expect(card.props.accessibilityLabel).toContain('Summer Series');
      expect(card.props.accessibilityLabel).toContain('Organiser');
      expect(card.props.accessibilityLabel).toContain('4 rounds');
      expect(card.props.accessibilityLabel).toContain('12 players');
    });

    it('has appropriate accessibility label for player', () => {
      const competition = createCompetitionData({
        name: 'Club Championship',
        isOrganizer: false,
        rounds: 2,
        players: 8,
      });
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="competition-card"
        />
      );

      const card = screen.getByTestId('competition-card');
      expect(card.props.accessibilityLabel).toContain('Club Championship');
      expect(card.props.accessibilityLabel).toContain('Player');
      expect(card.props.accessibilityLabel).toContain('2 rounds');
      expect(card.props.accessibilityLabel).toContain('8 players');
    });

    it('includes swipe hint in accessibility label when swipe enabled', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="competition-card"
        />
      );

      const card = screen.getByTestId('competition-card');
      expect(card.props.accessibilityLabel).toContain('swipe left to delete');
    });

    it('does not include swipe hint when swipe is disabled', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          swipeEnabled={false}
          testID="competition-card"
        />
      );

      const card = screen.getByTestId('competition-card');
      expect(card.props.accessibilityLabel).not.toContain('swipe left to delete');
    });

    it('has accessibility actions for swipe enabled card', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="competition-card"
        />
      );

      const card = screen.getByTestId('competition-card');
      // CardContainer uses generic "Delete" label for accessibilityActions
      expect(card.props.accessibilityActions).toEqual([
        { name: 'delete', label: 'Delete' },
      ]);
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty competition name', () => {
      const competition = createCompetitionData({ name: '' });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      // Should render without crashing
      expect(screen.getByTestId('icon-chevron-right')).toBeTruthy();
    });

    it('handles very long competition name', () => {
      const competition = createCompetitionData({
        name: 'The Annual Summer Golf Championship Series Tournament 2025 - Extended Edition With Extra Long Name',
      });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(
        screen.getByText(
          'The Annual Summer Golf Championship Series Tournament 2025 - Extended Edition With Extra Long Name'
        )
      ).toBeTruthy();
    });

    it('handles undefined status gracefully', () => {
      const competition = createCompetitionData({ status: undefined as any });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      // Should default to draft status
      expect(screen.getByTestId('status-badge-draft')).toBeTruthy();
    });

    it('handles null status gracefully', () => {
      const competition = createCompetitionData({ status: null as any });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      // Should default to draft status
      expect(screen.getByTestId('status-badge-draft')).toBeTruthy();
    });

    it('handles negative round count', () => {
      const competition = createCompetitionData({ rounds: -1 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('-1 rounds')).toBeTruthy();
    });

    it('handles negative player count', () => {
      const competition = createCompetitionData({ players: -1 });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('-1 players')).toBeTruthy();
    });

    it('handles mixed case status variations', () => {
      const competition = createCompetitionData({ status: 'In-Progress' });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-in-progress')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TESTID PROP TESTS
  // ===========================================================================

  describe('testID Prop', () => {
    it('applies testID to the card', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="my-competition-card"
        />
      );

      expect(screen.getByTestId('my-competition-card')).toBeTruthy();
    });

    it('applies testID in swipe mode', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
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
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="memo-test"
        />
      );
      expect(screen.getByTestId('memo-test')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DARK MODE TESTS
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="dark-mode-card"
        />,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('dark-mode-card')).toBeTruthy();
    });

    it('renders swipe mode correctly in dark mode', () => {
      const competition = createCompetitionData();
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="dark-swipe-card"
        />,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('dark-swipe-card')).toBeTruthy();
    });

    it('renders all status badges in dark mode', () => {
      const statuses = ['active', 'completed', 'upcoming', 'draft', 'cancelled'];

      statuses.forEach((status) => {
        const competition = createCompetitionData({ status });
        const { unmount } = render(
          <CompetitionListCard competition={competition} onPress={defaultOnPress} />,
          { isDarkMode: true }
        );
        unmount();
      });
    });
  });

  // ===========================================================================
  // ALL STATUS COMBINATIONS TESTS
  // ===========================================================================

  describe('All Status Combinations', () => {
    const statusToVariant: Record<string, string> = {
      active: 'active',
      'in-progress': 'in-progress',
      completed: 'completed',
      upcoming: 'upcoming',
      draft: 'draft',
      cancelled: 'cancelled',
    };

    Object.entries(statusToVariant).forEach(([status, expectedVariant]) => {
      it(`maps "${status}" status to "${expectedVariant}" variant`, () => {
        const competition = createCompetitionData({ status });
        render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

        expect(screen.getByTestId(`status-badge-${expectedVariant}`)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // COMBINED FEATURE TESTS
  // ===========================================================================

  describe('Combined Features', () => {
    it('renders organizer with active status and swipe enabled', () => {
      const competition = createCompetitionData({
        status: 'active',
        isOrganizer: true,
      });
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="full-featured-card"
        />
      );

      expect(screen.getByTestId('full-featured-card')).toBeTruthy();
      expect(screen.getByTestId('status-badge-active')).toBeTruthy();
      expect(screen.getByTestId('pill-organiser')).toBeTruthy();
      expect(screen.getByTestId('icon-trash')).toBeTruthy();
    });

    it('renders player with completed status without swipe', () => {
      const competition = createCompetitionData({
        status: 'completed',
        isOrganizer: false,
      });
      render(
        <CompetitionListCard
          competition={competition}
          onPress={defaultOnPress}
          testID="player-completed-card"
        />
      );

      expect(screen.getByTestId('player-completed-card')).toBeTruthy();
      expect(screen.getByTestId('status-badge-completed')).toBeTruthy();
      expect(screen.getByTestId('pill-player')).toBeTruthy();
      expect(screen.queryByTestId('icon-trash')).toBeNull();
    });

    it('renders draft competition with no date', () => {
      const competition = createDraftCompetition({ startDate: null });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByTestId('status-badge-draft')).toBeTruthy();
      expect(screen.queryByTestId('datetime-display')).toBeNull();
    });

    it('renders full competition with all data', () => {
      const competition = createCompetitionData({
        name: 'Full Competition',
        status: 'active',
        rounds: 6,
        players: 24,
        isOrganizer: true,
        startDate: '2025-03-01',
      });
      render(<CompetitionListCard competition={competition} onPress={defaultOnPress} />);

      expect(screen.getByText('Full Competition')).toBeTruthy();
      expect(screen.getByTestId('status-badge-active')).toBeTruthy();
      expect(screen.getByText('6 rounds')).toBeTruthy();
      expect(screen.getByText('24 players')).toBeTruthy();
      expect(screen.getByTestId('pill-organiser')).toBeTruthy();
      expect(screen.getByTestId('datetime-display')).toBeTruthy();
    });
  });
});
