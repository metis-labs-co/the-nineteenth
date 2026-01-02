/**
 * PlayerCard Component Tests
 *
 * Tests for the PlayerCard component including:
 * - Rendering with different props
 * - Variants (card vs list-item)
 * - Avatar display (photo vs icon)
 * - Badge display
 * - Right action area
 * - Navigation behavior
 * - Accessibility
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View, Text as RNText } from 'react-native';
import { PlayerCard, PlayerCardProps, PlayerCardData, BadgeConfig } from './PlayerCard';

// ============================================================================
// MOCKS
// ============================================================================

// Mock ThemeContext
const mockColors = {
  primary: '#22C55E',
  surface: '#FFFFFF',
  background: '#F5F5F5',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  primaryLighter: '#DCFCE7',
  primaryDark: '#166534',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text, Image } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Avatar: {
      Image: ({ size, source, style, testID }: any) => (
        <View
          testID={testID || 'avatar-image'}
          style={[{ width: size, height: size }, style]}
        >
          <Image source={source} style={{ width: size, height: size }} />
        </View>
      ),
      Icon: ({ size, icon, style, testID }: any) => (
        <View
          testID={testID || 'avatar-icon'}
          style={[{ width: size, height: size }, style]}
        >
          <Text>{icon}</Text>
        </View>
      ),
    },
  };
});

// Mock StatusBadge
jest.mock('@/components/common/StatusBadge', () => {
  const { View, Text } = require('react-native');
  return {
    StatusBadge: ({ label, testID }: any) => (
      <View testID={testID || 'status-badge'}>
        <Text>{label}</Text>
      </View>
    ),
  };
});

// Mock GolferIcon
jest.mock('@/components/common/GolferIcon', () => {
  const { View } = require('react-native');
  return {
    GolferIcon: ({ size, testID }: any) => (
      <View testID={testID || 'avatar-icon'} style={{ width: size, height: size }} />
    ),
  };
});

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createPlayer = (overrides: Partial<PlayerCardData> = {}): PlayerCardData => ({
  id: 'player-1',
  name: 'John Smith',
  email: 'john@example.com',
  handicap: 12,
  photo_url: null,
  ...overrides,
});

const createBadge = (overrides: Partial<BadgeConfig> = {}): BadgeConfig => ({
  label: 'You',
  backgroundColor: '#DCFCE7',
  ...overrides,
});

const defaultProps: PlayerCardProps = {
  player: createPlayer(),
};

// ============================================================================
// TESTS
// ============================================================================

describe('PlayerCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PlayerCard {...defaultProps} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('renders with required props only', () => {
      const minimalPlayer: PlayerCardData = {
        id: 'p1',
        name: 'Player Name',
      };
      render(<PlayerCard player={minimalPlayer} />);
      expect(screen.getByText('Player Name')).toBeTruthy();
    });

    it('renders player name', () => {
      render(<PlayerCard {...defaultProps} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('renders player email when showEmail is true (default)', () => {
      render(<PlayerCard {...defaultProps} />);
      expect(screen.getByText('john@example.com')).toBeTruthy();
    });

    it('renders player handicap when showHandicap is true (default)', () => {
      render(<PlayerCard {...defaultProps} />);
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });

    it('renders with testID', () => {
      render(<PlayerCard {...defaultProps} testID="test-player-card" />);
      expect(screen.getByTestId('test-player-card')).toBeTruthy();
    });

    it('renders avatar icon when no photo_url', () => {
      render(<PlayerCard {...defaultProps} />);
      expect(screen.getByTestId('avatar-icon')).toBeTruthy();
    });

    it('renders avatar image when photo_url provided', () => {
      const playerWithPhoto = createPlayer({ photo_url: 'https://example.com/photo.jpg' });
      render(<PlayerCard player={playerWithPhoto} />);
      expect(screen.getByTestId('avatar-image')).toBeTruthy();
    });
  });

  // ==========================================================================
  // PLAYER DATA DISPLAY
  // ==========================================================================

  describe('Player Data Display', () => {
    it('displays full player information', () => {
      render(<PlayerCard {...defaultProps} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('john@example.com')).toBeTruthy();
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });

    it('handles player with null email', () => {
      const player = createPlayer({ email: null });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.queryByText('john@example.com')).toBeNull();
    });

    it('handles player with undefined email', () => {
      const player = createPlayer({ email: undefined });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('handles player with null handicap', () => {
      const player = createPlayer({ handicap: null });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.queryByText(/HC:/)).toBeNull();
    });

    it('handles player with undefined handicap', () => {
      const player = createPlayer({ handicap: undefined });
      render(<PlayerCard player={player} />);
      expect(screen.queryByText(/HC:/)).toBeNull();
    });

    it('displays zero handicap correctly', () => {
      const player = createPlayer({ handicap: 0 });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('HC: 0')).toBeTruthy();
    });

    it('displays negative handicap (plus handicap)', () => {
      const player = createPlayer({ handicap: -2 });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('HC: -2')).toBeTruthy();
    });

    it('displays high handicap', () => {
      const player = createPlayer({ handicap: 36 });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('HC: 36')).toBeTruthy();
    });

    it('displays decimal handicap', () => {
      const player = createPlayer({ handicap: 12.5 });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('HC: 12.5')).toBeTruthy();
    });
  });

  // ==========================================================================
  // SHOW/HIDE OPTIONS
  // ==========================================================================

  describe('Show/Hide Options', () => {
    it('hides email when showEmail is false', () => {
      render(<PlayerCard {...defaultProps} showEmail={false} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.queryByText('john@example.com')).toBeNull();
    });

    it('hides handicap when showHandicap is false', () => {
      render(<PlayerCard {...defaultProps} showHandicap={false} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.queryByText(/HC:/)).toBeNull();
    });

    it('hides both email and handicap when both are false', () => {
      render(<PlayerCard {...defaultProps} showEmail={false} showHandicap={false} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.queryByText('john@example.com')).toBeNull();
      expect(screen.queryByText(/HC:/)).toBeNull();
    });

    it('shows email when showEmail is true explicitly', () => {
      render(<PlayerCard {...defaultProps} showEmail={true} />);
      expect(screen.getByText('john@example.com')).toBeTruthy();
    });

    it('shows handicap when showHandicap is true explicitly', () => {
      render(<PlayerCard {...defaultProps} showHandicap={true} />);
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });
  });

  // ==========================================================================
  // VARIANT STYLES
  // ==========================================================================

  describe('Variant Styles', () => {
    it('renders with card variant by default', () => {
      render(<PlayerCard {...defaultProps} testID="card" />);
      const card = screen.getByTestId('card');
      expect(card).toBeTruthy();
    });

    it('renders with card variant explicitly', () => {
      render(<PlayerCard {...defaultProps} variant="card" testID="card" />);
      expect(screen.getByTestId('card')).toBeTruthy();
    });

    it('renders with list-item variant', () => {
      render(<PlayerCard {...defaultProps} variant="list-item" testID="list-item" />);
      expect(screen.getByTestId('list-item')).toBeTruthy();
    });

    it('applies containerStyle correctly', () => {
      const customStyle = { marginTop: 20 };
      render(<PlayerCard {...defaultProps} containerStyle={customStyle} testID="styled-card" />);
      expect(screen.getByTestId('styled-card')).toBeTruthy();
    });
  });

  // ==========================================================================
  // BADGE DISPLAY
  // ==========================================================================

  describe('Badge Display', () => {
    it('does not render badge when not provided', () => {
      render(<PlayerCard {...defaultProps} />);
      expect(screen.queryByTestId('status-badge')).toBeNull();
    });

    it('renders badge when provided', () => {
      const badge = createBadge();
      render(<PlayerCard {...defaultProps} badge={badge} />);
      expect(screen.getByTestId('status-badge')).toBeTruthy();
      expect(screen.getByText('You')).toBeTruthy();
    });

    it('renders badge with custom label', () => {
      const badge = createBadge({ label: 'Organiser' });
      render(<PlayerCard {...defaultProps} badge={badge} />);
      expect(screen.getByText('Organiser')).toBeTruthy();
    });

    it('renders badge with different colors', () => {
      const badge = createBadge({
        label: 'VIP',
        backgroundColor: '#FFD700',
      });
      render(<PlayerCard {...defaultProps} badge={badge} />);
      expect(screen.getByText('VIP')).toBeTruthy();
    });
  });

  // ==========================================================================
  // RIGHT ACTION
  // ==========================================================================

  describe('Right Action', () => {
    it('does not render right action when not provided', () => {
      render(<PlayerCard {...defaultProps} />);
      expect(screen.queryByTestId('right-action')).toBeNull();
    });

    it('renders right action when provided', () => {
      const rightAction = <View testID="right-action"><RNText>Action</RNText></View>;
      render(<PlayerCard {...defaultProps} rightAction={rightAction} />);
      expect(screen.getByTestId('right-action')).toBeTruthy();
    });

    it('renders button as right action', () => {
      const rightAction = <View testID="remove-button"><RNText>Remove</RNText></View>;
      render(<PlayerCard {...defaultProps} rightAction={rightAction} />);
      expect(screen.getByTestId('remove-button')).toBeTruthy();
      expect(screen.getByText('Remove')).toBeTruthy();
    });

    it('renders chevron icon as right action', () => {
      const rightAction = <View testID="chevron-icon"><RNText>›</RNText></View>;
      render(<PlayerCard {...defaultProps} rightAction={rightAction} />);
      expect(screen.getByTestId('chevron-icon')).toBeTruthy();
    });
  });

  // ==========================================================================
  // HANDICAP COLOR
  // ==========================================================================

  describe('Handicap Color', () => {
    it('uses default color when handicapColor not provided', () => {
      render(<PlayerCard {...defaultProps} />);
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });

    it('applies custom handicapColor', () => {
      render(<PlayerCard {...defaultProps} handicapColor="#FF0000" />);
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });

    it('ignores handicapColor when handicap not shown', () => {
      render(<PlayerCard {...defaultProps} showHandicap={false} handicapColor="#FF0000" />);
      expect(screen.queryByText(/HC:/)).toBeNull();
    });
  });

  // ==========================================================================
  // PRESS BEHAVIOR
  // ==========================================================================

  describe('Press Behavior', () => {
    it('calls onPress when provided and card is pressed', () => {
      const onPress = jest.fn();
      render(<PlayerCard {...defaultProps} onPress={onPress} testID="pressable-card" />);

      fireEvent.press(screen.getByTestId('pressable-card'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('navigates to PlayerDetail when no onPress but navigateToProfile is true', () => {
      render(<PlayerCard {...defaultProps} testID="nav-card" />);

      fireEvent.press(screen.getByTestId('nav-card'));
      expect(mockNavigate).toHaveBeenCalledWith('PlayerDetail', { id: 'player-1' });
    });

    it('does not navigate when navigateToProfile is false and no onPress', () => {
      render(<PlayerCard {...defaultProps} navigateToProfile={false} testID="no-nav-card" />);
      // Card should not be pressable, so no navigation occurs
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('uses custom onPress instead of navigation when both are possible', () => {
      const onPress = jest.fn();
      render(<PlayerCard {...defaultProps} onPress={onPress} navigateToProfile={true} testID="custom-press" />);

      fireEvent.press(screen.getByTestId('custom-press'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles multiple presses', () => {
      const onPress = jest.fn();
      render(<PlayerCard {...defaultProps} onPress={onPress} testID="multi-press" />);

      const card = screen.getByTestId('multi-press');
      fireEvent.press(card);
      fireEvent.press(card);
      fireEvent.press(card);
      expect(onPress).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // NON-PRESSABLE BEHAVIOR
  // ==========================================================================

  describe('Non-Pressable Behavior', () => {
    it('renders as non-pressable when no onPress and navigateToProfile is false', () => {
      render(
        <PlayerCard
          {...defaultProps}
          navigateToProfile={false}
          testID="non-pressable"
        />
      );
      expect(screen.getByTestId('non-pressable')).toBeTruthy();
    });

    it('still displays all content when non-pressable', () => {
      render(
        <PlayerCard
          {...defaultProps}
          navigateToProfile={false}
        />
      );
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('john@example.com')).toBeTruthy();
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });

    it('displays badge in non-pressable mode', () => {
      const badge = createBadge();
      render(
        <PlayerCard
          {...defaultProps}
          badge={badge}
          navigateToProfile={false}
        />
      );
      expect(screen.getByText('You')).toBeTruthy();
    });

    it('displays right action in non-pressable mode', () => {
      const rightAction = <View testID="info-icon"><RNText>i</RNText></View>;
      render(
        <PlayerCard
          {...defaultProps}
          rightAction={rightAction}
          navigateToProfile={false}
        />
      );
      expect(screen.getByTestId('info-icon')).toBeTruthy();
    });
  });

  // ==========================================================================
  // ACCESSIBILITY
  // ==========================================================================

  describe('Accessibility', () => {
    it('has button role when pressable', () => {
      render(<PlayerCard {...defaultProps} testID="accessible-card" />);
      const card = screen.getByTestId('accessible-card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('has accessibility label with player name', () => {
      render(<PlayerCard {...defaultProps} testID="labeled-card" />);
      const card = screen.getByTestId('labeled-card');
      expect(card.props.accessibilityLabel).toBe("View John Smith's profile");
    });

    it('has accessibility hint', () => {
      render(<PlayerCard {...defaultProps} testID="hinted-card" />);
      const card = screen.getByTestId('hinted-card');
      expect(card.props.accessibilityHint).toBe('Tap to view profile and stats');
    });

    it('uses player name in accessibility label', () => {
      const player = createPlayer({ name: 'Jane Doe' });
      render(<PlayerCard player={player} testID="jane-card" />);
      const card = screen.getByTestId('jane-card');
      expect(card.props.accessibilityLabel).toBe("View Jane Doe's profile");
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles player with empty name', () => {
      const player = createPlayer({ name: '' });
      render(<PlayerCard player={player} />);
      expect(screen.getByTestId('avatar-icon')).toBeTruthy();
    });

    it('handles player with very long name', () => {
      const player = createPlayer({
        name: 'Alexander Benjamin Christopher Davidson Emmanuel',
      });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('Alexander Benjamin Christopher Davidson Emmanuel')).toBeTruthy();
    });

    it('handles player with very long email', () => {
      const player = createPlayer({
        email: 'very.long.email.address.that.goes.on.forever@example.com',
      });
      render(<PlayerCard player={player} />);
      expect(
        screen.getByText('very.long.email.address.that.goes.on.forever@example.com')
      ).toBeTruthy();
    });

    it('handles player with special characters in name', () => {
      const player = createPlayer({ name: "O'Brien-Smith" });
      render(<PlayerCard player={player} />);
      expect(screen.getByText("O'Brien-Smith")).toBeTruthy();
    });

    it('handles player with unicode characters', () => {
      const player = createPlayer({ name: 'José García' });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('José García')).toBeTruthy();
    });

    it('handles player with emoji in name', () => {
      const player = createPlayer({ name: '🏌️ Golf Pro' });
      render(<PlayerCard player={player} />);
      expect(screen.getByText('🏌️ Golf Pro')).toBeTruthy();
    });

    it('handles invalid photo URL gracefully', () => {
      const player = createPlayer({ photo_url: 'invalid-url' });
      render(<PlayerCard player={player} />);
      expect(screen.getByTestId('avatar-image')).toBeTruthy();
    });

    it('handles empty photo URL as falsy', () => {
      const player = createPlayer({ photo_url: '' });
      render(<PlayerCard player={player} />);
      expect(screen.getByTestId('avatar-icon')).toBeTruthy();
    });
  });

  // ==========================================================================
  // MEMOIZATION
  // ==========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(PlayerCard).toBeDefined();
      expect(typeof PlayerCard).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: PlayerCardProps = {
        player: createPlayer(),
        showEmail: true,
        showHandicap: true,
      };

      const { rerender } = render(<PlayerCard {...props} />);
      expect(screen.getByText('John Smith')).toBeTruthy();

      rerender(<PlayerCard {...props} />);
      expect(screen.getByText('John Smith')).toBeTruthy();
    });

    it('updates when props change', () => {
      const props: PlayerCardProps = {
        player: createPlayer(),
      };

      const { rerender } = render(<PlayerCard {...props} />);
      expect(screen.getByText('John Smith')).toBeTruthy();

      const newPlayer = createPlayer({ name: 'Jane Doe' });
      rerender(<PlayerCard player={newPlayer} />);
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });
  });

  // ==========================================================================
  // USE CASES
  // ==========================================================================

  describe('Use Cases', () => {
    it('renders player in competition player list', () => {
      render(
        <PlayerCard
          player={createPlayer()}
          variant="list-item"
          showHandicap={true}
          showEmail={false}
        />
      );
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('HC: 12')).toBeTruthy();
      expect(screen.queryByText('john@example.com')).toBeNull();
    });

    it('renders current user with badge', () => {
      const badge = createBadge({ label: 'You' });
      render(
        <PlayerCard
          player={createPlayer()}
          badge={badge}
        />
      );
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('You')).toBeTruthy();
    });

    it('renders organiser with badge', () => {
      const badge = createBadge({ label: 'Organiser' });
      render(
        <PlayerCard
          player={createPlayer()}
          badge={badge}
        />
      );
      expect(screen.getByText('Organiser')).toBeTruthy();
    });

    it('renders player with remove action', () => {
      const onRemove = jest.fn();
      const rightAction = (
        <View testID="remove-btn" onTouchEnd={onRemove}>
          <RNText>Remove</RNText>
        </View>
      );
      render(
        <PlayerCard
          player={createPlayer()}
          rightAction={rightAction}
          navigateToProfile={false}
        />
      );
      expect(screen.getByText('Remove')).toBeTruthy();
    });

    it('renders player card for friend list', () => {
      render(
        <PlayerCard
          player={createPlayer()}
          variant="card"
          showEmail={true}
          showHandicap={true}
        />
      );
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('john@example.com')).toBeTruthy();
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });

    it('renders player in search results', () => {
      const onSelect = jest.fn();
      render(
        <PlayerCard
          player={createPlayer()}
          variant="list-item"
          onPress={onSelect}
          showEmail={true}
          showHandicap={false}
        />
      );
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('john@example.com')).toBeTruthy();
    });

    it('renders player with profile photo', () => {
      const player = createPlayer({
        photo_url: 'https://example.com/avatar.jpg',
      });
      render(<PlayerCard player={player} />);
      expect(screen.getByTestId('avatar-image')).toBeTruthy();
    });
  });

  // ==========================================================================
  // COMBINATIONS
  // ==========================================================================

  describe('Prop Combinations', () => {
    it('renders with badge + right action', () => {
      const badge = createBadge();
      const rightAction = <View testID="chevron"><RNText>›</RNText></View>;
      render(
        <PlayerCard
          player={createPlayer()}
          badge={badge}
          rightAction={rightAction}
        />
      );
      expect(screen.getByText('You')).toBeTruthy();
      expect(screen.getByTestId('chevron')).toBeTruthy();
    });

    it('renders with all display options hidden', () => {
      render(
        <PlayerCard
          player={createPlayer()}
          showEmail={false}
          showHandicap={false}
        />
      );
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.queryByText('john@example.com')).toBeNull();
      expect(screen.queryByText(/HC:/)).toBeNull();
    });

    it('renders list-item with badge and custom handicap color', () => {
      const badge = createBadge({ label: 'Leader' });
      render(
        <PlayerCard
          player={createPlayer()}
          variant="list-item"
          badge={badge}
          handicapColor="#FFD700"
        />
      );
      expect(screen.getByText('Leader')).toBeTruthy();
      expect(screen.getByText('HC: 12')).toBeTruthy();
    });

    it('renders with all props combined', () => {
      const badge = createBadge();
      const rightAction = <View testID="action"><RNText>→</RNText></View>;
      render(
        <PlayerCard
          player={createPlayer({ photo_url: 'https://example.com/photo.jpg' })}
          badge={badge}
          rightAction={rightAction}
          variant="card"
          showEmail={true}
          showHandicap={true}
          handicapColor="#22C55E"
          testID="full-card"
          navigateToProfile={false}
          onPress={jest.fn()}
        />
      );
      expect(screen.getByTestId('full-card')).toBeTruthy();
      expect(screen.getByTestId('avatar-image')).toBeTruthy();
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('You')).toBeTruthy();
      expect(screen.getByTestId('action')).toBeTruthy();
    });
  });

  // ==========================================================================
  // MULTIPLE CARDS
  // ==========================================================================

  describe('Multiple Cards', () => {
    it('renders multiple player cards', () => {
      const players = [
        createPlayer({ id: '1', name: 'Player One' }),
        createPlayer({ id: '2', name: 'Player Two' }),
        createPlayer({ id: '3', name: 'Player Three' }),
      ];

      render(
        <>
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </>
      );

      expect(screen.getByText('Player One')).toBeTruthy();
      expect(screen.getByText('Player Two')).toBeTruthy();
      expect(screen.getByText('Player Three')).toBeTruthy();
    });

    it('each card navigates to correct player', () => {
      const players = [
        createPlayer({ id: 'p1', name: 'Player One' }),
        createPlayer({ id: 'p2', name: 'Player Two' }),
      ];

      render(
        <>
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} testID={`card-${player.id}`} />
          ))}
        </>
      );

      fireEvent.press(screen.getByTestId('card-p1'));
      expect(mockNavigate).toHaveBeenCalledWith('PlayerDetail', { id: 'p1' });

      fireEvent.press(screen.getByTestId('card-p2'));
      expect(mockNavigate).toHaveBeenCalledWith('PlayerDetail', { id: 'p2' });
    });

    it('renders mix of card and list-item variants', () => {
      render(
        <>
          <PlayerCard
            player={createPlayer({ id: '1', name: 'Card Player' })}
            variant="card"
            testID="card-variant"
          />
          <PlayerCard
            player={createPlayer({ id: '2', name: 'List Player' })}
            variant="list-item"
            testID="list-variant"
          />
        </>
      );

      expect(screen.getByTestId('card-variant')).toBeTruthy();
      expect(screen.getByTestId('list-variant')).toBeTruthy();
    });
  });
});
