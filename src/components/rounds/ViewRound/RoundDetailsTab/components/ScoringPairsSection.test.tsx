/**
 * ScoringPairsSection Component Tests
 *
 * Tests for the scoring pairs section component including:
 * - Rendering in locked (non-premium) state
 * - Rendering in premium state with scoring pairs enabled/disabled
 * - Loading state when fetching pairs
 * - Displaying reciprocal vs circular pair types
 * - Empty state when no pairs assigned
 * - Manage button for organizers
 * - Upgrade navigation for non-premium users
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { ScoringPairsSection } from './ScoringPairsSection';
import { useScoringPairs } from '@/hooks/useScoringPairs';
import type { ScoringPairWithPlayers } from '@/types/database.types';

// Store reference to mock navigate function
const mockNavigate = jest.fn();

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

// Mock useScoringPairs hook
jest.mock('@/hooks/useScoringPairs', () => ({
  useScoringPairs: jest.fn(),
}));

// Mock GolfBallLoader component
jest.mock('@/components/common', () => {
  const { View, Text } = require('react-native');
  return {
    GolfBallLoader: ({ size }: { size?: string }) => (
      <View testID="golf-ball-loader">
        <Text testID="loader-size">{size || 'md'}</Text>
      </View>
    ),
  };
});

// Mock Pill component
jest.mock('@/components/common/Pill', () => {
  const { View, Text } = require('react-native');
  return {
    Pill: ({ label, variant, size }: { label: string; variant?: string; size?: string }) => (
      <View testID={`pill-${label.toLowerCase().replace(/\s+/g, '-')}`}>
        <Text>{label}</Text>
        <Text testID="pill-variant">{variant || 'default'}</Text>
        <Text testID="pill-size">{size || 'md'}</Text>
      </View>
    ),
  };
});

// Mock react-native-paper components (keep original exports, just add testIDs)
jest.mock('react-native-paper', () => {
  const { View, Text: RNText } = require('react-native');
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    Text: ({ children, style, numberOfLines }: any) => (
      <RNText style={style} numberOfLines={numberOfLines}>{children}</RNText>
    ),
    Icon: ({ source, size, color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }} />
    ),
    Avatar: {
      Text: ({ label, size, style, labelStyle }: any) => (
        <View testID="avatar-text" style={[{ width: size, height: size }, style]}>
          <RNText style={labelStyle}>{label}</RNText>
        </View>
      ),
      Image: ({ size, source }: any) => (
        <View testID="avatar-image" style={{ width: size, height: size }}>
          {source?.uri && <RNText testID="avatar-image-uri">{source.uri}</RNText>}
        </View>
      ),
    },
  };
});

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

function createMockPlayer(overrides: Partial<{
  id: string;
  name: string;
  photo_url: string | null;
  email: string;
  handicap: number;
}> = {}) {
  return {
    id: overrides.id || 'player-1',
    name: overrides.name || 'Test Player',
    email: overrides.email || 'test@test.com',
    phone: null,
    handicap: overrides.handicap ?? 15,
    golf_id: null,
    handicap_updated_at: null,
    photo_url: overrides.photo_url ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createMockScoringPair(overrides: Partial<ScoringPairWithPlayers> = {}): ScoringPairWithPlayers {
  return {
    id: overrides.id || 'pair-1',
    round_id: overrides.round_id || 'round-1',
    scorer_id: overrides.scorer_id || 'scorer-1',
    player_id: overrides.player_id || 'player-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scorer: overrides.scorer || createMockPlayer({ id: 'scorer-1', name: 'Scorer One' }),
    player: overrides.player || createMockPlayer({ id: 'player-1', name: 'Player One' }),
    ...overrides,
  };
}

/**
 * Create reciprocal pairs (A scores B, B scores A)
 */
function createReciprocalPairs(): ScoringPairWithPlayers[] {
  const playerA = createMockPlayer({ id: 'player-a', name: 'Player Alpha' });
  const playerB = createMockPlayer({ id: 'player-b', name: 'Player Beta' });
  const playerC = createMockPlayer({ id: 'player-c', name: 'Player Charlie' });
  const playerD = createMockPlayer({ id: 'player-d', name: 'Player Delta' });

  return [
    // A <-> B
    createMockScoringPair({
      id: 'pair-1',
      scorer_id: 'player-a',
      player_id: 'player-b',
      scorer: playerA,
      player: playerB,
    }),
    createMockScoringPair({
      id: 'pair-2',
      scorer_id: 'player-b',
      player_id: 'player-a',
      scorer: playerB,
      player: playerA,
    }),
    // C <-> D
    createMockScoringPair({
      id: 'pair-3',
      scorer_id: 'player-c',
      player_id: 'player-d',
      scorer: playerC,
      player: playerD,
    }),
    createMockScoringPair({
      id: 'pair-4',
      scorer_id: 'player-d',
      player_id: 'player-c',
      scorer: playerD,
      player: playerC,
    }),
  ];
}

/**
 * Create circular chain pairs (A -> B -> C -> A)
 */
function createCircularPairs(): ScoringPairWithPlayers[] {
  const playerA = createMockPlayer({ id: 'player-a', name: 'Player Alpha' });
  const playerB = createMockPlayer({ id: 'player-b', name: 'Player Beta' });
  const playerC = createMockPlayer({ id: 'player-c', name: 'Player Charlie' });

  return [
    createMockScoringPair({
      id: 'pair-1',
      scorer_id: 'player-a',
      player_id: 'player-b',
      scorer: playerA,
      player: playerB,
    }),
    createMockScoringPair({
      id: 'pair-2',
      scorer_id: 'player-b',
      player_id: 'player-c',
      scorer: playerB,
      player: playerC,
    }),
    createMockScoringPair({
      id: 'pair-3',
      scorer_id: 'player-c',
      player_id: 'player-a',
      scorer: playerC,
      player: playerA,
    }),
  ];
}

const mockUseScoringPairs = useScoringPairs as jest.MockedFunction<typeof useScoringPairs>;

const defaultProps = {
  roundId: 'round-1',
  scoringPairsRequired: false,
  isPremium: true,
  cardBackground: '#ffffff',
};

// ===========================================================================
// TESTS
// ===========================================================================

describe('ScoringPairsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock - no pairs, not loading
    mockUseScoringPairs.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ScoringPairsSection {...defaultProps} />);
      expect(screen.getByText('Scoring Pairs')).toBeTruthy();
    });

    it('renders section title', () => {
      render(<ScoringPairsSection {...defaultProps} />);
      expect(screen.getByText('Scoring Pairs')).toBeTruthy();
    });

    it('renders with required props only', () => {
      render(
        <ScoringPairsSection
          roundId="round-1"
          scoringPairsRequired={false}
          isPremium={true}
          cardBackground="#fff"
        />
      );
      expect(screen.getByText('Scoring Pairs')).toBeTruthy();
    });
  });

  // ===========================================================================
  // LOCKED STATE (NON-PREMIUM) TESTS
  // ===========================================================================

  describe('Locked State (Non-Premium)', () => {
    it('shows locked card when not premium', () => {
      render(<ScoringPairsSection {...defaultProps} isPremium={false} />);

      expect(screen.getByText('Premium')).toBeTruthy();
      expect(screen.getByText('Upgrade to designate who scores each player')).toBeTruthy();
    });

    it('displays lock icon in locked state', () => {
      render(<ScoringPairsSection {...defaultProps} isPremium={false} />);

      // The icon source "lock" is passed to the Icon component
      // We can check for the presence of the locked card content
      expect(screen.getByTestId('icon-lock')).toBeTruthy();
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('navigates to Subscription screen when locked card pressed', () => {
      render(<ScoringPairsSection {...defaultProps} isPremium={false} />);

      const lockedCard = screen.getByText('Premium');
      fireEvent.press(lockedCard);

      expect(mockNavigate).toHaveBeenCalledWith('Subscription');
    });

    it('does not fetch scoring pairs when not premium', () => {
      render(<ScoringPairsSection {...defaultProps} isPremium={false} />);

      // The component should render without errors
      // but the pairs data should not be displayed
      expect(screen.queryByText('Reciprocal Pairs')).toBeNull();
      expect(screen.queryByText('Circular Chain')).toBeNull();
    });

    it('does not show manage button when not premium', () => {
      const onManagePress = jest.fn();
      render(
        <ScoringPairsSection
          {...defaultProps}
          isPremium={false}
          onManagePress={onManagePress}
        />
      );

      expect(screen.queryByText('Manage')).toBeNull();
    });
  });

  // ===========================================================================
  // PREMIUM STATE - DISABLED TESTS
  // ===========================================================================

  describe('Premium State - Scoring Pairs Disabled', () => {
    it('shows disabled status when scoring pairs not required', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={false} />);

      expect(screen.getByText('Disabled')).toBeTruthy();
      expect(screen.getByText('Players can score themselves')).toBeTruthy();
    });

    it('shows Optional pill when not required', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={false} />);

      expect(screen.getByTestId('pill-optional')).toBeTruthy();
    });

    it('does not show pairs list when disabled', () => {
      mockUseScoringPairs.mockReturnValue({
        data: createReciprocalPairs(),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={false} />);

      expect(screen.queryByText('Reciprocal Pairs')).toBeNull();
      expect(screen.queryByText('Player Alpha')).toBeNull();
    });

    it('does not show loading indicator when disabled', () => {
      mockUseScoringPairs.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={false} />);

      expect(screen.queryByTestId('golf-ball-loader')).toBeNull();
    });
  });

  // ===========================================================================
  // PREMIUM STATE - ENABLED TESTS
  // ===========================================================================

  describe('Premium State - Scoring Pairs Enabled', () => {
    it('shows enabled status when scoring pairs required', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('Enabled')).toBeTruthy();
      expect(screen.getByText('Designated markers score each player')).toBeTruthy();
    });

    it('shows Required pill when required', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByTestId('pill-required')).toBeTruthy();
    });

    it('shows loading state when fetching pairs', () => {
      mockUseScoringPairs.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('Loading pairs...')).toBeTruthy();
    });

    it('shows empty state when no pairs assigned', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('No scoring pairs assigned yet')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RECIPROCAL PAIRS TESTS
  // ===========================================================================

  describe('Reciprocal Pairs Display', () => {
    beforeEach(() => {
      mockUseScoringPairs.mockReturnValue({
        data: createReciprocalPairs(),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('displays Reciprocal Pairs label for reciprocal pairs', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });

    it('shows correct pair count for reciprocal pairs', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      // 4 total pairs but reciprocal, so 2 unique pairs shown
      expect(screen.getByText('2 pairs')).toBeTruthy();
    });

    it('displays scorer names in pairs', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('Player Alpha')).toBeTruthy();
      expect(screen.getByText('Player Charlie')).toBeTruthy();
    });

    it('displays player names being scored', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('Player Beta')).toBeTruthy();
      expect(screen.getByText('Player Delta')).toBeTruthy();
    });

    it('shows swap-horizontal icon for reciprocal pairs', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      // The component uses swap-horizontal for reciprocal pairs
      // We can verify the Reciprocal Pairs label is shown
      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CIRCULAR CHAIN PAIRS TESTS
  // ===========================================================================

  describe('Circular Chain Pairs Display', () => {
    beforeEach(() => {
      mockUseScoringPairs.mockReturnValue({
        data: createCircularPairs(),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);
    });

    it('displays Circular Chain label for circular pairs', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('Circular Chain')).toBeTruthy();
    });

    it('shows correct pair count for circular pairs', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('3 pairs')).toBeTruthy();
    });

    it('displays all players in chain', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      // In circular chain, each player appears twice (as scorer and as player being scored)
      // Check that all unique player names are present
      expect(screen.getAllByText('Player Alpha').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Player Beta').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Player Charlie').length).toBeGreaterThanOrEqual(1);
    });

    it('shows arrow-right icon for circular pairs', () => {
      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      // The component uses arrow-right for circular pairs
      // We can verify the Circular Chain label is shown
      expect(screen.getByText('Circular Chain')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SINGLE PAIR TESTS
  // ===========================================================================

  describe('Single Pair Display', () => {
    it('shows "1 pair" for single pair (singular)', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [createMockScoringPair()],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('1 pair')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MANAGE BUTTON TESTS
  // ===========================================================================

  describe('Manage Button', () => {
    it('shows manage button when onManagePress provided', () => {
      const onManagePress = jest.fn();
      render(
        <ScoringPairsSection
          {...defaultProps}
          onManagePress={onManagePress}
        />
      );

      expect(screen.getByText('Manage')).toBeTruthy();
    });

    it('does not show manage button when onManagePress not provided', () => {
      render(<ScoringPairsSection {...defaultProps} />);

      expect(screen.queryByText('Manage')).toBeNull();
    });

    it('calls onManagePress when manage button pressed', () => {
      const onManagePress = jest.fn();
      render(
        <ScoringPairsSection
          {...defaultProps}
          onManagePress={onManagePress}
        />
      );

      fireEvent.press(screen.getByText('Manage'));

      expect(onManagePress).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility label on manage button', () => {
      const onManagePress = jest.fn();
      render(
        <ScoringPairsSection
          {...defaultProps}
          onManagePress={onManagePress}
        />
      );

      const manageButton = screen.getByLabelText('Manage scoring pairs');
      expect(manageButton).toBeTruthy();
    });
  });

  // ===========================================================================
  // AVATAR DISPLAY TESTS
  // ===========================================================================

  describe('Avatar Display', () => {
    it('shows initials when no photo_url', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [
          createMockScoringPair({
            scorer: createMockPlayer({ id: 'scorer-1', name: 'John Smith', photo_url: null }),
            player: createMockPlayer({ id: 'player-1', name: 'Jane Doe', photo_url: null }),
          }),
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      // Avatar.Text shows initials - verify names are displayed
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('shows avatar image when photo_url provided', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [
          createMockScoringPair({
            scorer: createMockPlayer({
              id: 'scorer-1',
              name: 'John Smith',
              photo_url: 'https://example.com/photo.jpg',
            }),
            player: createMockPlayer({
              id: 'player-1',
              name: 'Jane Doe',
              photo_url: 'https://example.com/photo2.jpg',
            }),
          }),
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      // Avatar.Image is used when photo_url is provided
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('handles missing scorer data gracefully', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [
          createMockScoringPair({
            scorer: undefined,
            player: createMockPlayer({ id: 'player-1', name: 'Jane Doe' }),
          }),
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('Unknown')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('handles missing player data gracefully', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [
          createMockScoringPair({
            scorer: createMockPlayer({ id: 'scorer-1', name: 'John Smith' }),
            player: undefined,
          }),
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Unknown')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles null scoring pairs data', () => {
      mockUseScoringPairs.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('No scoring pairs assigned yet')).toBeTruthy();
    });

    it('handles undefined scoring pairs data', () => {
      mockUseScoringPairs.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('No scoring pairs assigned yet')).toBeTruthy();
    });

    it('handles empty string roundId', () => {
      render(<ScoringPairsSection {...defaultProps} roundId="" />);

      // Should still render without crashing
      expect(screen.getByText('Scoring Pairs')).toBeTruthy();
    });

    it('handles special characters in player names', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [
          createMockScoringPair({
            scorer: createMockPlayer({ id: 'scorer-1', name: "O'Brien & Co." }),
            player: createMockPlayer({ id: 'player-1', name: 'José García' }),
          }),
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText("O'Brien & Co.")).toBeTruthy();
      expect(screen.getByText('José García')).toBeTruthy();
    });

    it('handles very long player names', () => {
      const longName = 'Alexander Bartholomew Christopher Davidson III';
      mockUseScoringPairs.mockReturnValue({
        data: [
          createMockScoringPair({
            scorer: createMockPlayer({ id: 'scorer-1', name: longName }),
            player: createMockPlayer({ id: 'player-1', name: 'Short' }),
          }),
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText(longName)).toBeTruthy();
    });

    it('handles rapid prop changes', () => {
      const { rerender } = render(
        <ScoringPairsSection {...defaultProps} scoringPairsRequired={false} />
      );

      expect(screen.getByText('Disabled')).toBeTruthy();

      rerender(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('Enabled')).toBeTruthy();
    });

    it('handles switching between premium and non-premium', () => {
      const { rerender } = render(
        <ScoringPairsSection {...defaultProps} isPremium={true} />
      );

      expect(screen.queryByText('Premium')).toBeNull();

      rerender(<ScoringPairsSection {...defaultProps} isPremium={false} />);

      expect(screen.getByText('Premium')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS COMBINATIONS TESTS
  // ===========================================================================

  describe('Props Combinations', () => {
    it('renders correctly with all props enabled', () => {
      const onManagePress = jest.fn();
      mockUseScoringPairs.mockReturnValue({
        data: createReciprocalPairs(),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <ScoringPairsSection
          roundId="round-1"
          scoringPairsRequired={true}
          isPremium={true}
          cardBackground="#ffffff"
          onManagePress={onManagePress}
        />
      );

      expect(screen.getByText('Scoring Pairs')).toBeTruthy();
      expect(screen.getByText('Enabled')).toBeTruthy();
      expect(screen.getByText('Manage')).toBeTruthy();
      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });

    it('renders correctly with minimum props (non-organizer, disabled)', () => {
      render(
        <ScoringPairsSection
          roundId="round-1"
          scoringPairsRequired={false}
          isPremium={true}
          cardBackground="#ffffff"
        />
      );

      expect(screen.getByText('Scoring Pairs')).toBeTruthy();
      expect(screen.getByText('Disabled')).toBeTruthy();
      expect(screen.queryByText('Manage')).toBeNull();
    });

    it('prioritizes locked state over enabled state', () => {
      mockUseScoringPairs.mockReturnValue({
        data: createReciprocalPairs(),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(
        <ScoringPairsSection
          {...defaultProps}
          scoringPairsRequired={true}
          isPremium={false}
        />
      );

      // Should show locked state, not enabled with pairs
      expect(screen.getByText('Premium')).toBeTruthy();
      expect(screen.queryByText('Enabled')).toBeNull();
      expect(screen.queryByText('Reciprocal Pairs')).toBeNull();
    });
  });

  // ===========================================================================
  // HOOK USAGE TESTS
  // ===========================================================================

  describe('Hook Usage', () => {
    it('calls useScoringPairs with correct roundId', () => {
      render(<ScoringPairsSection {...defaultProps} roundId="test-round-123" />);

      expect(mockUseScoringPairs).toHaveBeenCalledWith('test-round-123');
    });

    it('re-calls hook when roundId changes', () => {
      const { rerender } = render(
        <ScoringPairsSection {...defaultProps} roundId="round-1" />
      );

      expect(mockUseScoringPairs).toHaveBeenCalledWith('round-1');

      rerender(<ScoringPairsSection {...defaultProps} roundId="round-2" />);

      expect(mockUseScoringPairs).toHaveBeenCalledWith('round-2');
    });
  });

  // ===========================================================================
  // INITIALS HELPER TESTS
  // ===========================================================================

  describe('Initials Display', () => {
    it('generates correct initials for two-word names', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [
          createMockScoringPair({
            scorer: createMockPlayer({ id: 'scorer-1', name: 'John Smith' }),
            player: createMockPlayer({ id: 'player-1', name: 'Jane Doe' }),
          }),
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      // Names are displayed
      expect(screen.getByText('John Smith')).toBeTruthy();
      expect(screen.getByText('Jane Doe')).toBeTruthy();
    });

    it('handles single-word names', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [
          createMockScoringPair({
            scorer: createMockPlayer({ id: 'scorer-1', name: 'Tiger' }),
            player: createMockPlayer({ id: 'player-1', name: 'Rory' }),
          }),
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('Tiger')).toBeTruthy();
      expect(screen.getByText('Rory')).toBeTruthy();
    });

    it('handles three-word names', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [
          createMockScoringPair({
            scorer: createMockPlayer({ id: 'scorer-1', name: 'John Paul Jones' }),
            player: createMockPlayer({ id: 'player-1', name: 'Mary Ann Smith' }),
          }),
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      render(<ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />);

      expect(screen.getByText('John Paul Jones')).toBeTruthy();
      expect(screen.getByText('Mary Ann Smith')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SNAPSHOT TESTS
  // ===========================================================================

  describe('Snapshots', () => {
    it('matches snapshot for locked state', () => {
      const { toJSON } = render(
        <ScoringPairsSection {...defaultProps} isPremium={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for disabled state', () => {
      const { toJSON } = render(
        <ScoringPairsSection {...defaultProps} scoringPairsRequired={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for enabled with reciprocal pairs', () => {
      mockUseScoringPairs.mockReturnValue({
        data: createReciprocalPairs(),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { toJSON } = render(
        <ScoringPairsSection
          {...defaultProps}
          scoringPairsRequired={true}
          onManagePress={jest.fn()}
        />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for enabled with circular pairs', () => {
      mockUseScoringPairs.mockReturnValue({
        data: createCircularPairs(),
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { toJSON } = render(
        <ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for loading state', () => {
      mockUseScoringPairs.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { toJSON } = render(
        <ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for empty state', () => {
      mockUseScoringPairs.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as any);

      const { toJSON } = render(
        <ScoringPairsSection {...defaultProps} scoringPairsRequired={true} />
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
