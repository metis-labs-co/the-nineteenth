/**
 * RoundListCard Component Tests
 *
 * Tests for the round list card component including:
 * - Basic rendering with different round statuses
 * - Title block (course, club, result/type subtitle)
 * - Prominent user score display for completed rounds
 * - Footer chips: game format, tee swatch, skins/wolf, companion avatars
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
    IconDice: (props: any) => (
      <View testID="icon-dice" {...props}>
        <Text>Dice</Text>
      </View>
    ),
    IconDog: (props: any) => (
      <View testID="icon-dog" {...props}>
        <Text>Dog</Text>
      </View>
    ),
    IconTrophy: (props: any) => (
      <View testID="icon-trophy" {...props}>
        <Text>Trophy</Text>
      </View>
    ),
  };
});

// Mock common components
jest.mock('@/components/common', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    CardContainer: ({ children, onPress, style, testID, accessibilityLabel, swipeable, onDelete, swipeSecondaryAction, ...props }: any) => (
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
        {swipeable && swipeSecondaryAction && (
          <TouchableOpacity testID="tag-league-button" onPress={swipeSecondaryAction.onPress}>
            <Text>{swipeSecondaryAction.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    Pill: ({ label, size: _size }: { label: string; size?: string }) => (
      <View testID="pill">
        <Text>{label}</Text>
      </View>
    ),
    PlayerAvatar: ({ name }: { name: string; photoUrl?: string | null; size?: number }) => (
      <View testID={`player-avatar-${name}`}>
        <Text>{name}</Text>
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

    it('renders the course as the card title with the club beneath', () => {
      const round = createRoundData();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Royal Melbourne')).toBeTruthy();
      expect(screen.getByText('Royal Melbourne Golf Club')).toBeTruthy();
    });

    it('does not repeat the club line when it matches the course name', () => {
      const round = createRoundData({
        course: { id: 'course-1', name: 'Royal Melbourne', venueName: 'Royal Melbourne' },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getAllByText('Royal Melbourne')).toHaveLength(1);
    });

    it('shows "Ready to score" for rounds that have not started', () => {
      const round = createRoundData({ status: 'scheduled' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Ready to score')).toBeTruthy();
    });

    it('renders with in-progress status', () => {
      const round = createInProgressRound();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Ready to score')).toBeTruthy();
      expect(screen.getByText('Stableford')).toBeTruthy();
    });

    it('renders with completed status', () => {
      const round = createCompletedRound();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Stableford')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SUBTITLE / RESULT LINE TESTS
  // ===========================================================================

  describe('Subtitle Display', () => {
    it('shows the competition name for competition rounds', () => {
      const round = createCompletedRound({
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Summer Series')).toBeTruthy();
    });

    it('falls back to "Competition" when no competition name', () => {
      const round = createCompletedRound({
        competition: null,
        isStandalone: false,
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Competition')).toBeTruthy();
    });

    it('shows "Practice Round" for solo standalone rounds', () => {
      const round = createStandaloneRound({
        status: 'completed',
        players: [{ id: 'player-1', name: 'John Smith' }],
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Practice Round')).toBeTruthy();
    });

    it('shows "Handicap Round" for solo standalone rounds with a handicap source', () => {
      const round = createStandaloneRound({
        status: 'completed',
        players: [{ id: 'player-1', name: 'John Smith' }],
        handicapSource: 'profile',
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Handicap Round')).toBeTruthy();
    });

    it('shows "Match" for multiplayer standalone rounds without a winner', () => {
      const round = createStandaloneRound({
        status: 'completed',
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Match')).toBeTruthy();
    });

    it('shows the winner line for completed group rounds', () => {
      const round = createStandaloneRound({
        status: 'completed',
        winner: { name: 'Jane Doe', points: 38, isTeam: false },
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Winner: Jane Doe · 38 pts')).toBeTruthy();
    });

    it('shows the match play winner with margin', () => {
      const round = createStandaloneRound({
        status: 'completed',
        gameType: 'match-play',
        winner: { name: 'Jane Doe', points: 0, isTeam: false, margin: '3&2' },
        userScore: { hasScorecard: true, matchResult: { won: false, margin: '3&2' } },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Winner: Jane Doe · 3&2')).toBeTruthy();
    });

    it('shows "Round not submitted" when no scorecard exists and no holes scored', () => {
      const round = createCompletedRound({
        holesCompleted: 0,
        userScore: { hasScorecard: false },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Round not submitted')).toBeTruthy();
      expect(screen.queryByTestId('round-card-score')).toBeNull();
    });

    it('shows holes completed for unsubmitted rounds with scored holes', () => {
      const round = createCompletedRound({
        holesCompleted: 13,
        totalHoles: 18,
        userScore: { hasScorecard: false },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Not submitted · 13/18 holes')).toBeTruthy();
      expect(screen.queryByTestId('round-card-score')).toBeNull();
    });
  });

  // ===========================================================================
  // USER SCORE DISPLAY TESTS
  // ===========================================================================

  describe('User Score Display', () => {
    it('shows stableford points prominently for completed rounds', () => {
      const round = createCompletedRound({
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByTestId('round-card-score')).toBeTruthy();
      expect(screen.getByText('34')).toBeTruthy();
      expect(screen.getByText('pts')).toBeTruthy();
    });

    it('shows net score for completed stroke rounds', () => {
      const round = createCompletedRound({
        gameType: 'stroke',
        userScore: { hasScorecard: true, totalGross: 84, totalNet: 71 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('71')).toBeTruthy();
      expect(screen.getByText('net')).toBeTruthy();
    });

    it('shows match result for completed match-play rounds', () => {
      const round = createCompletedRound({
        gameType: 'match-play',
        userScore: { hasScorecard: true, matchResult: { won: true, margin: '3&2' } },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('3&2')).toBeTruthy();
      expect(screen.getByText('Won')).toBeTruthy();
    });

    it('does not show a score for in-progress rounds', () => {
      const round = createInProgressRound({
        userScore: { hasScorecard: true, totalPoints: 20 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('round-card-score')).toBeNull();
    });

    it('shows the round handicap and differential beneath the score', () => {
      const round = createCompletedRound({
        userScore: {
          hasScorecard: true,
          totalPoints: 34,
          dailyHandicap: 14,
          differential: 12.3,
        },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('HC 14')).toBeTruthy();
      expect(screen.getByText('Diff 12.3')).toBeTruthy();
    });

    it('omits handicap and differential when not recorded', () => {
      const round = createCompletedRound({
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('round-card-handicap')).toBeNull();
      expect(screen.queryByTestId('round-card-differential')).toBeNull();
    });
  });

  // ===========================================================================
  // FOOTER CHIP TESTS
  // ===========================================================================

  describe('Footer Chips', () => {
    it('shows the game format chip', () => {
      const round = createStandaloneRound({ gameType: 'stroke' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Stroke Play')).toBeTruthy();
    });

    it('shows a tee colour swatch for standalone rounds with a selected tee', () => {
      const round = createStandaloneRound({ selectedTeeName: 'White' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByTestId('round-card-tee-swatch')).toBeTruthy();
      expect(screen.queryByText('White Tees')).toBeNull();
    });

    it('does not show a tee swatch when no tee is selected', () => {
      const round = createStandaloneRound({ selectedTeeName: null });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('round-card-tee-swatch')).toBeNull();
    });

    it('shows a nine-hole chip for front 9 rounds', () => {
      const round = createStandaloneRound({ nineType: 'front9' });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Front 9')).toBeTruthy();
    });

    it('shows skins and wolf chips when those games are active', () => {
      const round = createStandaloneRound({ hasSkins: true, hasWolf: true });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Skins')).toBeTruthy();
      expect(screen.getByText('Wolf')).toBeTruthy();
      expect(screen.getByTestId('icon-dice')).toBeTruthy();
      expect(screen.getByTestId('icon-dog')).toBeTruthy();
    });

    it('does not show skins or wolf chips by default', () => {
      const round = createStandaloneRound();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByText('Skins')).toBeNull();
      expect(screen.queryByText('Wolf')).toBeNull();
    });
  });

  // ===========================================================================
  // COMPANION AVATAR TESTS
  // ===========================================================================

  describe('Companion Avatars', () => {
    it('shows companion avatars excluding the current user', () => {
      const round = createStandaloneRound();
      render(
        <RoundListCard round={round} onPress={defaultOnPress} currentUserId="player-1" />
      );

      expect(screen.getByText('with 1')).toBeTruthy();
      expect(screen.getByTestId('player-avatar-Jane Doe')).toBeTruthy();
      expect(screen.queryByTestId('player-avatar-John Smith')).toBeNull();
    });

    it('shows all players when current user is not in the round', () => {
      const round = createStandaloneRound();
      render(
        <RoundListCard round={round} onPress={defaultOnPress} currentUserId="someone-else" />
      );

      expect(screen.getByText('with 2')).toBeTruthy();
    });

    it('caps the avatar stack at three companions', () => {
      const round = createStandaloneRound({
        players: [
          { id: 'p1', name: 'One' },
          { id: 'p2', name: 'Two' },
          { id: 'p3', name: 'Three' },
          { id: 'p4', name: 'Four' },
        ],
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('with 4')).toBeTruthy();
      expect(screen.getByTestId('player-avatar-One')).toBeTruthy();
      expect(screen.getByTestId('player-avatar-Three')).toBeTruthy();
      expect(screen.queryByTestId('player-avatar-Four')).toBeNull();
    });

    it('does not show avatars when the only player is the current user', () => {
      const round = createStandaloneRound({
        players: [{ id: 'player-1', name: 'John Smith' }],
      });
      render(
        <RoundListCard round={round} onPress={defaultOnPress} currentUserId="player-1" />
      );

      expect(screen.queryByText(/^with /)).toBeNull();
    });

    it('does not show avatars when players is undefined', () => {
      const round = createStandaloneRound({ players: undefined });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByText(/^with /)).toBeNull();
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

    it('calls onDelete with round data when delete is pressed', () => {
      const round = createRoundData();
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
        />
      );

      fireEvent.press(screen.getByTestId('delete-button'));

      expect(defaultOnDelete).toHaveBeenCalledWith(round);
    });

    it('swipeEnabled defaults to false', () => {
      const round = createRoundData();
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.queryByTestId('icon-trash')).toBeNull();
    });

    it('shows a tag-to-league action when onTagToLeague is provided', () => {
      const onTagToLeague = jest.fn();
      const round = createCompletedRound({
        userScore: { hasScorecard: true, totalPoints: 34, scorecardId: 'sc-1' },
      });
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          onTagToLeague={onTagToLeague}
          swipeEnabled={true}
        />
      );

      fireEvent.press(screen.getByTestId('tag-league-button'));

      expect(screen.getByText('Tag League')).toBeTruthy();
      expect(onTagToLeague).toHaveBeenCalledWith(round);
    });

    it('does not show a tag-to-league action when onTagToLeague is omitted', () => {
      const round = createCompletedRound({
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
        />
      );

      expect(screen.queryByTestId('tag-league-button')).toBeNull();
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
      const round = createRoundData();
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="round-card" />);

      const card = screen.getByTestId('round-card');
      expect(card.props.accessibilityLabel).toContain('View round at');
      expect(card.props.accessibilityLabel).toContain('Royal Melbourne Golf Club');
    });

    it('has appropriate accessibility label for in-progress round', () => {
      const round = createInProgressRound();
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="round-card" />);

      const card = screen.getByTestId('round-card');
      expect(card.props.accessibilityLabel).toContain('Score round at');
    });

    it('includes the result in the accessibility label for completed rounds', () => {
      const round = createCompletedRound({
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="round-card" />);

      const card = screen.getByTestId('round-card');
      expect(card.props.accessibilityLabel).toContain('34 pts');
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
          actionLabel="Resume"
          testID="round-card"
        />
      );

      const card = screen.getByTestId('round-card');
      expect(card.props.accessibilityLabel).toContain('Resume round at');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty course name', () => {
      const round = createRoundData({
        course: { id: 'course-1', name: '' },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="round-card" />);

      expect(screen.getByTestId('round-card')).toBeTruthy();
    });

    it('handles empty competition name', () => {
      const round = createCompletedRound({
        competition: { id: 'comp-1', name: '' },
        isStandalone: false,
        userScore: { hasScorecard: true, totalPoints: 30 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText('Competition')).toBeTruthy();
    });

    it('handles very long course name', () => {
      const longName = 'The Royal and Ancient Golf Club of St Andrews Championship Links Course';
      const round = createRoundData({
        course: { id: 'course-1', name: longName },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} />);

      expect(screen.getByText(longName)).toBeTruthy();
    });
  });

  // ===========================================================================
  // TESTID PROP
  // ===========================================================================

  describe('testID Prop', () => {
    it('applies testID to the card', () => {
      const round = createRoundData();
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="custom-round-card" />);

      expect(screen.getByTestId('custom-round-card')).toBeTruthy();
    });

    it('applies testID in swipe mode', () => {
      const round = createRoundData();
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="swipe-round-card"
        />
      );

      expect(screen.getByTestId('swipe-round-card')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DARK MODE
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode', () => {
      const round = createCompletedRound({
        userScore: { hasScorecard: true, totalPoints: 34 },
      });
      render(<RoundListCard round={round} onPress={defaultOnPress} testID="round-card" />, {
        isDarkMode: true,
      });

      expect(screen.getByTestId('round-card')).toBeTruthy();
      expect(screen.getByText('34')).toBeTruthy();
    });

    it('renders swipe mode correctly in dark mode', () => {
      const round = createRoundData();
      render(
        <RoundListCard
          round={round}
          onPress={defaultOnPress}
          onDelete={defaultOnDelete}
          swipeEnabled={true}
          testID="round-card"
        />,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('round-card')).toBeTruthy();
    });
  });
});
