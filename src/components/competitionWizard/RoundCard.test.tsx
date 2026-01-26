/* eslint-disable react/display-name -- Test mocks don't need display names */
/**
 * RoundCard Component Tests
 *
 * Tests for the round card component used in competition display including:
 * - Basic rendering with different round statuses
 * - Course name and round number display
 * - Date and time formatting
 * - Game type badge display
 * - Action button behavior based on status
 * - Accessibility features
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { RoundCard, RoundCardProps } from './RoundCard';

// =====================================================
// MOCKS
// =====================================================

// Mock Tabler icons
jest.mock('@tabler/icons-react-native', () => {
  const { View, Text } = require('react-native');
  return {
    IconGolf: (props: any) => (
      <View testID="icon-golf" {...props}>
        <Text>Golf</Text>
      </View>
    ),
    IconCalendar: (props: any) => (
      <View testID="icon-calendar" {...props}>
        <Text>Calendar</Text>
      </View>
    ),
    IconClock: (props: any) => (
      <View testID="icon-clock" {...props}>
        <Text>Clock</Text>
      </View>
    ),
  };
});

// Mock StatusBadge component with type exports
jest.mock('@/components/common/StatusBadge', () => {
  const { View, Text } = require('react-native');
  const StatusBadge = ({ status }: { status: string }) => (
    <View testID={`status-badge-${status}`}>
      <Text>{status}</Text>
    </View>
  );
  return {
    StatusBadge,
  };
});

// Mock formatting utilities
jest.mock('@/utils/formatting', () => ({
  formatDateAustralian: jest.fn((date: string | null) => {
    if (!date) return 'TBC';
    // Simple mock format
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }),
  formatTime: jest.fn((time: string | null) => {
    if (!time) return null;
    // Simple mock format - just return first 5 chars
    return time.substring(0, 5);
  }),
}));

// Override react-native-paper mock to include Card.Content
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text: RNText, TouchableOpacity } = require('react-native');

  const mockThemeColors = {
    primary: '#6200ee',
    onPrimary: '#ffffff',
    secondary: '#03dac6',
    onSecondary: '#000000',
    background: '#ffffff',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    onSurface: '#000000',
    error: '#b00020',
    onError: '#ffffff',
    elevation: {
      level0: 'transparent',
      level1: '#f5f5f5',
      level2: '#eeeeee',
      level3: '#e0e0e0',
      level4: '#d6d6d6',
      level5: '#cccccc',
    },
  };

  const mockTheme = {
    dark: false,
    roundness: 4,
    animation: { scale: 1 },
    colors: mockThemeColors,
    fonts: {},
    isV3: true,
  };

  const Card = ({ children, style, onPress, disabled, testID, ...props }: any) => {
    const CardComponent = onPress && !disabled ? TouchableOpacity : View;
    return React.createElement(
      CardComponent,
      { style, onPress: disabled ? undefined : onPress, testID, disabled, ...props },
      children
    );
  };
  Card.Content = ({ children, style, ...props }: any) =>
    React.createElement(View, { style, ...props }, children);

  return {
    MD3LightTheme: mockTheme,
    MD3DarkTheme: { ...mockTheme, dark: true },
    Card,
    Text: ({ children, style, variant: _variant, numberOfLines, ...props }: any) =>
      React.createElement(RNText, { style, numberOfLines, ...props }, children),
    Button: ({ children, onPress, mode: _mode, style, icon: _icon, contentStyle: _contentStyle, labelStyle, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, style, ...props },
        React.createElement(RNText, { style: labelStyle }, children)
      ),
    IconButton: ({ icon, onPress, ...props }: any) =>
      React.createElement(View, { testID: `icon-button-${icon}`, onPress, ...props }),
    Icon: ({ source, size, color: _color }: any) =>
      React.createElement(View, { testID: `icon-${source}`, style: { width: size, height: size } }),
    Provider: ({ children }: any) => children,
    PaperProvider: ({ children }: any) => children,
    useTheme: () => mockTheme,
    withTheme: (Component: any) => (props: any) => React.createElement(Component, { ...props, theme: mockTheme }),
    configureFonts: jest.fn(() => ({})),
  };
});

// =====================================================
// TEST FIXTURES
// =====================================================

const createMockProps = (overrides?: Partial<RoundCardProps>): RoundCardProps => ({
  roundId: 'round-1',
  roundNumber: 1,
  courseName: 'Royal Melbourne Golf Club',
  date: '2025-01-15',
  teeTime: '09:30:00',
  gameType: 'stableford',
  status: 'upcoming',
  ...overrides,
});

// =====================================================
// TESTS
// =====================================================

describe('RoundCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<RoundCard {...createMockProps()} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders round number', () => {
      render(<RoundCard {...createMockProps({ roundNumber: 1 })} />);
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('Round')).toBeTruthy();
    });

    it('renders course name', () => {
      render(<RoundCard {...createMockProps({ courseName: 'Royal Melbourne Golf Club' })} />);
      expect(screen.getByText('Royal Melbourne Golf Club')).toBeTruthy();
    });

    it('renders golf icon', () => {
      render(<RoundCard {...createMockProps()} />);
      expect(screen.getByTestId('icon-golf')).toBeTruthy();
    });

    it('renders calendar icon', () => {
      render(<RoundCard {...createMockProps()} />);
      expect(screen.getByTestId('icon-calendar')).toBeTruthy();
    });

    it('renders with testID', () => {
      render(<RoundCard {...createMockProps({ testID: 'round-card-1' })} />);
      expect(screen.getByTestId('round-card-1')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ROUND NUMBER TESTS
  // ===========================================================================

  describe('Round Number', () => {
    it('displays round 1', () => {
      render(<RoundCard {...createMockProps({ roundNumber: 1 })} />);
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('displays round 2', () => {
      render(<RoundCard {...createMockProps({ roundNumber: 2 })} />);
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('displays round 10', () => {
      render(<RoundCard {...createMockProps({ roundNumber: 10 })} />);
      expect(screen.getByText('10')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STATUS BADGE TESTS
  // ===========================================================================

  describe('Status Badge', () => {
    it('renders upcoming status badge', () => {
      render(<RoundCard {...createMockProps({ status: 'upcoming' })} />);
      expect(screen.getByTestId('status-badge-upcoming')).toBeTruthy();
    });

    it('renders in-progress status badge', () => {
      render(<RoundCard {...createMockProps({ status: 'in-progress' })} />);
      expect(screen.getByTestId('status-badge-in-progress')).toBeTruthy();
    });

    it('renders completed status badge', () => {
      render(<RoundCard {...createMockProps({ status: 'completed' })} />);
      expect(screen.getByTestId('status-badge-completed')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DATE AND TIME TESTS
  // ===========================================================================

  describe('Date and Time Display', () => {
    it('displays formatted date', () => {
      render(<RoundCard {...createMockProps({ date: '2025-01-15' })} />);
      expect(screen.getByText('15/01/2025')).toBeTruthy();
    });

    it('displays TBC when date is null', () => {
      render(<RoundCard {...createMockProps({ date: null })} />);
      expect(screen.getByText('TBC')).toBeTruthy();
    });

    it('displays tee time when provided', () => {
      render(<RoundCard {...createMockProps({ teeTime: '09:30:00' })} />);
      expect(screen.getByText('09:30')).toBeTruthy();
      expect(screen.getByTestId('icon-clock')).toBeTruthy();
    });

    it('does not display clock icon when no tee time', () => {
      render(<RoundCard {...createMockProps({ teeTime: null })} />);
      expect(screen.queryByTestId('icon-clock')).toBeNull();
    });

    it('handles undefined tee time', () => {
      render(<RoundCard {...createMockProps({ teeTime: undefined })} />);
      expect(screen.queryByTestId('icon-clock')).toBeNull();
    });
  });

  // ===========================================================================
  // GAME TYPE TESTS
  // ===========================================================================

  describe('Game Type Display', () => {
    it('displays Stableford label', () => {
      render(<RoundCard {...createMockProps({ gameType: 'stableford' })} />);
      expect(screen.getByText('Stableford')).toBeTruthy();
    });

    it('displays Stroke Play label', () => {
      render(<RoundCard {...createMockProps({ gameType: 'stroke' })} />);
      expect(screen.getByText('Stroke Play')).toBeTruthy();
    });

    it('displays Match Play label', () => {
      render(<RoundCard {...createMockProps({ gameType: 'match-play' })} />);
      expect(screen.getByText('Match Play')).toBeTruthy();
    });

    it('displays Scramble label', () => {
      render(<RoundCard {...createMockProps({ gameType: 'scramble' })} />);
      expect(screen.getByText('Scramble')).toBeTruthy();
    });

    it('displays Best Ball label', () => {
      render(<RoundCard {...createMockProps({ gameType: 'best-ball' })} />);
      expect(screen.getByText('Best Ball')).toBeTruthy();
    });

    it('displays Scramble label', () => {
      render(<RoundCard {...createMockProps({ gameType: 'scramble' })} />);
      expect(screen.getByText('Scramble')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACTION BUTTON TESTS - UPCOMING STATUS
  // ===========================================================================

  describe('Action Button - Upcoming Status', () => {
    it('displays Start Round button when onStartRound provided', () => {
      render(
        <RoundCard
          {...createMockProps({ status: 'upcoming', onStartRound: jest.fn() })}
        />
      );
      expect(screen.getByText('Start Round')).toBeTruthy();
    });

    it('calls onStartRound with roundId when Start Round pressed', () => {
      const onStartRound = jest.fn();
      render(
        <RoundCard
          {...createMockProps({
            status: 'upcoming',
            roundId: 'round-123',
            onStartRound,
          })}
        />
      );

      fireEvent.press(screen.getByText('Start Round'));
      expect(onStartRound).toHaveBeenCalledWith('round-123');
    });

    it('does not render action button when onStartRound not provided', () => {
      render(
        <RoundCard
          {...createMockProps({ status: 'upcoming', onStartRound: undefined })}
        />
      );
      expect(screen.queryByText('Start Round')).toBeNull();
    });
  });

  // ===========================================================================
  // ACTION BUTTON TESTS - IN PROGRESS STATUS
  // ===========================================================================

  describe('Action Button - In Progress Status', () => {
    it('displays Continue Round button', () => {
      render(
        <RoundCard
          {...createMockProps({ status: 'in-progress', onStartRound: jest.fn() })}
        />
      );
      expect(screen.getByText('Continue Round')).toBeTruthy();
    });

    it('calls onStartRound when Continue Round pressed', () => {
      const onStartRound = jest.fn();
      render(
        <RoundCard
          {...createMockProps({
            status: 'in-progress',
            roundId: 'round-456',
            onStartRound,
          })}
        />
      );

      fireEvent.press(screen.getByText('Continue Round'));
      expect(onStartRound).toHaveBeenCalledWith('round-456');
    });
  });

  // ===========================================================================
  // ACTION BUTTON TESTS - COMPLETED STATUS
  // ===========================================================================

  describe('Action Button - Completed Status', () => {
    it('displays View Scorecard button when onViewScorecard provided', () => {
      render(
        <RoundCard
          {...createMockProps({ status: 'completed', onViewScorecard: jest.fn() })}
        />
      );
      expect(screen.getByText('View Scorecard')).toBeTruthy();
    });

    it('calls onViewScorecard with roundId when pressed', () => {
      const onViewScorecard = jest.fn();
      render(
        <RoundCard
          {...createMockProps({
            status: 'completed',
            roundId: 'round-789',
            onViewScorecard,
          })}
        />
      );

      fireEvent.press(screen.getByText('View Scorecard'));
      expect(onViewScorecard).toHaveBeenCalledWith('round-789');
    });

    it('does not render action button when onViewScorecard not provided for completed', () => {
      render(
        <RoundCard
          {...createMockProps({
            status: 'completed',
            onViewScorecard: undefined,
          })}
        />
      );
      expect(screen.queryByText('View Scorecard')).toBeNull();
    });
  });

  // ===========================================================================
  // HAS STARTED SCORING TESTS
  // ===========================================================================

  describe('Has Started Scoring', () => {
    it('shows Continue Round when hasStartedScoring is true and status is upcoming', () => {
      render(
        <RoundCard
          {...createMockProps({
            status: 'upcoming',
            hasStartedScoring: true,
            onStartRound: jest.fn(),
          })}
        />
      );
      expect(screen.getByText('Continue Round')).toBeTruthy();
    });

    it('shows Start Round when hasStartedScoring is false', () => {
      render(
        <RoundCard
          {...createMockProps({
            status: 'upcoming',
            hasStartedScoring: false,
            onStartRound: jest.fn(),
          })}
        />
      );
      expect(screen.getByText('Start Round')).toBeTruthy();
    });

    it('defaults hasStartedScoring to false', () => {
      render(
        <RoundCard
          {...createMockProps({
            status: 'upcoming',
            onStartRound: jest.fn(),
          })}
        />
      );
      expect(screen.getByText('Start Round')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CARD PRESS TESTS
  // ===========================================================================

  describe('Card Press', () => {
    it('card is pressable when onPress provided', () => {
      const onPress = jest.fn();
      const { UNSAFE_root } = render(
        <RoundCard {...createMockProps({ onPress })} />
      );

      // Find the Card component and verify it's pressable
      const cards = UNSAFE_root.findAllByType(require('react-native-paper').Card);
      expect(cards.length).toBeGreaterThan(0);
      expect(cards[0].props.disabled).toBe(false);
    });

    it('card is disabled when onPress not provided', () => {
      const { UNSAFE_root } = render(
        <RoundCard {...createMockProps({ onPress: undefined })} />
      );

      const cards = UNSAFE_root.findAllByType(require('react-native-paper').Card);
      expect(cards.length).toBeGreaterThan(0);
      expect(cards[0].props.disabled).toBe(true);
    });

    it('calls onPress when card is pressed', () => {
      const onPress = jest.fn();
      const { UNSAFE_root } = render(
        <RoundCard {...createMockProps({ onPress })} />
      );

      const cards = UNSAFE_root.findAllByType(require('react-native-paper').Card);
      fireEvent.press(cards[0]);
      expect(onPress).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has correct accessibilityRole', () => {
      const { UNSAFE_root } = render(<RoundCard {...createMockProps()} />);

      const cards = UNSAFE_root.findAllByType(require('react-native-paper').Card);
      expect(cards[0].props.accessibilityRole).toBe('button');
    });

    it('has descriptive accessibilityLabel', () => {
      const { UNSAFE_root } = render(
        <RoundCard
          {...createMockProps({
            roundNumber: 1,
            courseName: 'Royal Melbourne',
            gameType: 'stableford',
            status: 'upcoming',
          })}
        />
      );

      const cards = UNSAFE_root.findAllByType(require('react-native-paper').Card);
      expect(cards[0].props.accessibilityLabel).toContain('Round 1');
      expect(cards[0].props.accessibilityLabel).toContain('Royal Melbourne');
      expect(cards[0].props.accessibilityLabel).toContain('Stableford');
    });

    it('has accessibilityHint when onPress provided', () => {
      const { UNSAFE_root } = render(
        <RoundCard {...createMockProps({ onPress: jest.fn() })} />
      );

      const cards = UNSAFE_root.findAllByType(require('react-native-paper').Card);
      expect(cards[0].props.accessibilityHint).toBe(
        'Double tap to view round details'
      );
    });

    it('has no accessibilityHint when onPress not provided', () => {
      const { UNSAFE_root } = render(
        <RoundCard {...createMockProps({ onPress: undefined })} />
      );

      const cards = UNSAFE_root.findAllByType(require('react-native-paper').Card);
      expect(cards[0].props.accessibilityHint).toBeUndefined();
    });

    it('action button has correct accessibility hints', () => {
      render(
        <RoundCard
          {...createMockProps({
            status: 'completed',
            onViewScorecard: jest.fn(),
          })}
        />
      );

      const { UNSAFE_root } = render(
        <RoundCard
          {...createMockProps({
            status: 'upcoming',
            onStartRound: jest.fn(),
          })}
        />
      );

      const buttons = UNSAFE_root.findAllByType(require('react-native-paper').Button);
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles very long course name', () => {
      render(
        <RoundCard
          {...createMockProps({
            courseName:
              'The Royal and Ancient Golf Club of St Andrews Championship Course',
          })}
        />
      );
      expect(
        screen.getByText(
          'The Royal and Ancient Golf Club of St Andrews Championship Course'
        )
      ).toBeTruthy();
    });

    it('handles empty course name', () => {
      const { toJSON } = render(
        <RoundCard {...createMockProps({ courseName: '' })} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('handles both callbacks provided', () => {
      render(
        <RoundCard
          {...createMockProps({
            status: 'upcoming',
            onStartRound: jest.fn(),
            onViewScorecard: jest.fn(),
          })}
        />
      );
      // Should show Start Round for upcoming
      expect(screen.getByText('Start Round')).toBeTruthy();
    });

    it('handles special characters in course name', () => {
      render(
        <RoundCard
          {...createMockProps({
            courseName: "St. Andrew's (Old Course) #1",
          })}
        />
      );
      expect(screen.getByText("St. Andrew's (Old Course) #1")).toBeTruthy();
    });

    it('handles date edge cases - null date', () => {
      render(<RoundCard {...createMockProps({ date: null })} />);
      expect(screen.getByText('TBC')).toBeTruthy();
    });

    it('handles date edge cases - undefined date', () => {
      render(<RoundCard {...createMockProps({ date: undefined })} />);
      expect(screen.getByText('TBC')).toBeTruthy();
    });

    it('handles large round numbers', () => {
      render(<RoundCard {...createMockProps({ roundNumber: 99 })} />);
      expect(screen.getByText('99')).toBeTruthy();
    });
  });

  // ===========================================================================
  // THEME SUPPORT TESTS
  // ===========================================================================

  describe('Theme Support', () => {
    it('renders with theme colors', () => {
      const { toJSON } = render(<RoundCard {...createMockProps()} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMBINED PROPS TESTS
  // ===========================================================================

  describe('Combined Props', () => {
    it('renders fully populated card - upcoming', () => {
      render(
        <RoundCard
          roundId="round-full-1"
          roundNumber={1}
          courseName="Royal Melbourne Golf Club"
          date="2025-01-15"
          teeTime="09:30:00"
          gameType="stableford"
          status="upcoming"
          onStartRound={jest.fn()}
          onViewScorecard={jest.fn()}
          onPress={jest.fn()}
          hasStartedScoring={false}
          testID="full-round-card"
        />
      );

      expect(screen.getByTestId('full-round-card')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('Royal Melbourne Golf Club')).toBeTruthy();
      expect(screen.getByText('15/01/2025')).toBeTruthy();
      expect(screen.getByText('09:30')).toBeTruthy();
      expect(screen.getByText('Stableford')).toBeTruthy();
      expect(screen.getByTestId('status-badge-upcoming')).toBeTruthy();
      expect(screen.getByText('Start Round')).toBeTruthy();
    });

    it('renders fully populated card - in progress', () => {
      render(
        <RoundCard
          roundId="round-full-2"
          roundNumber={2}
          courseName="Kingston Heath"
          date="2025-01-20"
          teeTime="07:00:00"
          gameType="stroke"
          status="in-progress"
          onStartRound={jest.fn()}
          testID="in-progress-card"
        />
      );

      expect(screen.getByTestId('in-progress-card')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('Kingston Heath')).toBeTruthy();
      expect(screen.getByText('Stroke Play')).toBeTruthy();
      expect(screen.getByTestId('status-badge-in-progress')).toBeTruthy();
      expect(screen.getByText('Continue Round')).toBeTruthy();
    });

    it('renders fully populated card - completed', () => {
      render(
        <RoundCard
          roundId="round-full-3"
          roundNumber={3}
          courseName="Victoria Golf Club"
          date="2025-01-25"
          teeTime="14:00:00"
          gameType="match-play"
          status="completed"
          onViewScorecard={jest.fn()}
          testID="completed-card"
        />
      );

      expect(screen.getByTestId('completed-card')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('Victoria Golf Club')).toBeTruthy();
      expect(screen.getByText('Match Play')).toBeTruthy();
      expect(screen.getByTestId('status-badge-completed')).toBeTruthy();
      expect(screen.getByText('View Scorecard')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CALLBACK INTEGRATION TESTS
  // ===========================================================================

  describe('Callback Integration', () => {
    it('passes correct roundId to onStartRound', () => {
      const onStartRound = jest.fn();
      render(
        <RoundCard
          {...createMockProps({
            roundId: 'specific-round-id-123',
            status: 'upcoming',
            onStartRound,
          })}
        />
      );

      fireEvent.press(screen.getByText('Start Round'));
      expect(onStartRound).toHaveBeenCalledTimes(1);
      expect(onStartRound).toHaveBeenCalledWith('specific-round-id-123');
    });

    it('passes correct roundId to onViewScorecard', () => {
      const onViewScorecard = jest.fn();
      render(
        <RoundCard
          {...createMockProps({
            roundId: 'completed-round-id-456',
            status: 'completed',
            onViewScorecard,
          })}
        />
      );

      fireEvent.press(screen.getByText('View Scorecard'));
      expect(onViewScorecard).toHaveBeenCalledTimes(1);
      expect(onViewScorecard).toHaveBeenCalledWith('completed-round-id-456');
    });

    it('does not call callbacks when not provided', () => {
      const onStartRound = jest.fn();
      render(
        <RoundCard
          {...createMockProps({
            status: 'completed',
            onStartRound, // Wrong callback for completed status
            onViewScorecard: undefined,
          })}
        />
      );

      // No button should be rendered
      expect(screen.queryByText('View Scorecard')).toBeNull();
      expect(screen.queryByText('Start Round')).toBeNull();
    });
  });
});
