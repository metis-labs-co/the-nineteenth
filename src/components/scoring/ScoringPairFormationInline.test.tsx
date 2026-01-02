/**
 * ScoringPairFormationInline Component Tests
 *
 * Tests for the compact inline scoring pair formation component including:
 * - Empty states (not enough players)
 * - Auto-generation of pairs on mount
 * - Display of reciprocal vs circular pairing
 * - Regenerate/shuffle functionality
 * - Player information display
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { ScoringPairFormationInline, InlinePlayer } from './ScoringPairFormationInline';
import type { ScoringPairCreateInput, AutoPairResult } from '@/types';

// =====================================================
// MOCKS
// =====================================================

// Mock icons
jest.mock('@tabler/icons-react-native', () => {
  const { View, Text } = require('react-native');
  return {
    IconRefresh: (props: { size?: number; color?: string }) => (
      <View testID="icon-refresh" {...props}>
        <Text>RefreshIcon</Text>
      </View>
    ),
    IconArrowRight: (props: { size?: number; color?: string }) => (
      <View testID="icon-arrow-right" {...props}>
        <Text>ArrowIcon</Text>
      </View>
    ),
    IconRotateClockwise: (props: { size?: number; color?: string }) => (
      <View testID="icon-rotate-clockwise" {...props}>
        <Text>CircularIcon</Text>
      </View>
    ),
    IconArrowsExchange: (props: { size?: number; color?: string }) => (
      <View testID="icon-arrows-exchange" {...props}>
        <Text>ExchangeIcon</Text>
      </View>
    ),
  };
});

// Mock react-native-paper Avatar
jest.mock('react-native-paper', () => {
  const RNPaper = jest.requireActual('react-native-paper');
  const { View, Text, Image } = require('react-native');
  return {
    ...RNPaper,
    Avatar: {
      Image: ({ source, size, testID }: { source: { uri: string }; size: number; testID?: string }) => (
        <View testID={testID || 'avatar-image'} style={{ width: size, height: size }}>
          <Image source={source} />
        </View>
      ),
      Text: ({ label, size, style, labelStyle, testID }: { label: string; size: number; style?: object; labelStyle?: object; testID?: string }) => (
        <View testID={testID || 'avatar-text'} style={[{ width: size, height: size }, style]}>
          <Text style={labelStyle}>{label}</Text>
        </View>
      ),
    },
  };
});

// Mock scoring pairs utility
const mockAutoGenerateScoringPairs = jest.fn();
jest.mock('@/utils/scoringPairs', () => ({
  autoGenerateScoringPairs: (players: { id: string }[]) => mockAutoGenerateScoringPairs(players),
}));

// =====================================================
// TEST FIXTURES
// =====================================================

function createInlinePlayer(
  id: string,
  name: string,
  handicap: number = 15,
  photoUrl: string | null = null
): InlinePlayer {
  return {
    id,
    name,
    handicap,
    photo_url: photoUrl,
  };
}

const twoPlayers: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15),
  createInlinePlayer('player-2', 'Jane Doe', 20),
];

const threePlayers: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15),
  createInlinePlayer('player-2', 'Jane Doe', 20),
  createInlinePlayer('player-3', 'Bob Wilson', 10),
];

const fourPlayers: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15),
  createInlinePlayer('player-2', 'Jane Doe', 20),
  createInlinePlayer('player-3', 'Bob Wilson', 10),
  createInlinePlayer('player-4', 'Alice Brown', 25),
];

const _playersWithPhotos: InlinePlayer[] = [
  createInlinePlayer('player-1', 'John Smith', 15, 'https://example.com/john.jpg'),
  createInlinePlayer('player-2', 'Jane Doe', 20, 'https://example.com/jane.jpg'),
];

// Create mock pairs for testing
function createMockPairs(players: InlinePlayer[], type: 'reciprocal' | 'circular'): ScoringPairCreateInput[] {
  const pairs: ScoringPairCreateInput[] = [];

  if (type === 'reciprocal') {
    // Reciprocal: A↔B, C↔D
    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 < players.length) {
        pairs.push({ scorerId: players[i].id, playerId: players[i + 1].id });
        pairs.push({ scorerId: players[i + 1].id, playerId: players[i].id });
      }
    }
  } else {
    // Circular: A→B→C→A
    for (let i = 0; i < players.length; i++) {
      const nextIndex = (i + 1) % players.length;
      pairs.push({ scorerId: players[i].id, playerId: players[nextIndex].id });
    }
  }

  return pairs;
}

// =====================================================
// TESTS
// =====================================================

describe('ScoringPairFormationInline', () => {
  const defaultProps = {
    players: fourPlayers,
    pairs: [],
    onPairsChange: jest.fn(),
    testID: 'scoring-pair-inline',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockAutoGenerateScoringPairs.mockImplementation((players: { id: string }[]) => {
      const pairs: ScoringPairCreateInput[] = [];
      const type = players.length % 2 === 0 ? 'reciprocal' : 'circular';

      if (type === 'reciprocal') {
        for (let i = 0; i < players.length; i += 2) {
          if (i + 1 < players.length) {
            pairs.push({ scorerId: players[i].id, playerId: players[i + 1].id });
            pairs.push({ scorerId: players[i + 1].id, playerId: players[i].id });
          }
        }
      } else {
        for (let i = 0; i < players.length; i++) {
          const nextIndex = (i + 1) % players.length;
          pairs.push({ scorerId: players[i].id, playerId: players[nextIndex].id });
        }
      }

      return { pairs, type } as AutoPairResult;
    });
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);
      expect(screen.getByTestId('scoring-pair-inline')).toBeTruthy();
    });

    it('renders with required props only', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(
        <ScoringPairFormationInline
          players={twoPlayers}
          pairs={pairs}
          onPairsChange={jest.fn()}
        />
      );
      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });

    it('renders container with correct testID', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);
      expect(screen.getByTestId('scoring-pair-inline')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty States', () => {
    it('shows empty state message when less than 2 players', () => {
      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={[createInlinePlayer('1', 'Solo Player')]}
          pairs={[]}
        />
      );

      expect(
        screen.getByText('Add at least one playing partner to configure scoring pairs')
      ).toBeTruthy();
    });

    it('shows empty state for empty players array', () => {
      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={[]}
          pairs={[]}
        />
      );

      expect(
        screen.getByText('Add at least one playing partner to configure scoring pairs')
      ).toBeTruthy();
    });

    it('does not show header or pairs list in empty state', () => {
      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={[]}
          pairs={[]}
        />
      );

      expect(screen.queryByText('Shuffle')).toBeNull();
      expect(screen.queryByText('Reciprocal Pairs')).toBeNull();
      expect(screen.queryByText('Circular Chain')).toBeNull();
    });
  });

  // ===========================================================================
  // AUTO-GENERATION TESTS
  // ===========================================================================

  describe('Auto-Generation', () => {
    it('calls onPairsChange on mount when pairs are empty and enough players', async () => {
      const onPairsChange = jest.fn();

      render(
        <ScoringPairFormationInline
          players={fourPlayers}
          pairs={[]}
          onPairsChange={onPairsChange}
        />
      );

      await waitFor(() => {
        expect(onPairsChange).toHaveBeenCalled();
      });
    });

    it('generates reciprocal pairs for even number of players', async () => {
      const onPairsChange = jest.fn();

      render(
        <ScoringPairFormationInline
          players={fourPlayers}
          pairs={[]}
          onPairsChange={onPairsChange}
        />
      );

      await waitFor(() => {
        expect(onPairsChange).toHaveBeenCalledWith(
          expect.any(Array),
          'reciprocal'
        );
      });
    });

    it('generates circular pairs for odd number of players', async () => {
      const onPairsChange = jest.fn();

      render(
        <ScoringPairFormationInline
          players={threePlayers}
          pairs={[]}
          onPairsChange={onPairsChange}
        />
      );

      await waitFor(() => {
        expect(onPairsChange).toHaveBeenCalledWith(
          expect.any(Array),
          'circular'
        );
      });
    });

    it('does not auto-generate when pairs already exist', async () => {
      const onPairsChange = jest.fn();
      const existingPairs = createMockPairs(fourPlayers, 'reciprocal');

      render(
        <ScoringPairFormationInline
          players={fourPlayers}
          pairs={existingPairs}
          onPairsChange={onPairsChange}
        />
      );

      // Wait a bit to ensure no auto-generation happens
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onPairsChange).not.toHaveBeenCalled();
    });

    it('does not auto-generate when player count is less than 2', () => {
      const onPairsChange = jest.fn();

      render(
        <ScoringPairFormationInline
          players={[createInlinePlayer('1', 'Solo')]}
          pairs={[]}
          onPairsChange={onPairsChange}
        />
      );

      expect(onPairsChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // HEADER TESTS
  // ===========================================================================

  describe('Header', () => {
    it('shows "Reciprocal Pairs" title for even number of players', () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });

    it('shows "Circular Chain" title for odd number of players', () => {
      const pairs = createMockPairs(threePlayers, 'circular');
      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={threePlayers}
          pairs={pairs}
        />
      );

      expect(screen.getByText('Circular Chain')).toBeTruthy();
    });

    it('shows exchange icon for reciprocal pairs', () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      // First exchange icon should be in the header
      expect(screen.getAllByTestId('icon-arrows-exchange')[0]).toBeTruthy();
    });

    it('shows rotate icon for circular pairs', () => {
      const pairs = createMockPairs(threePlayers, 'circular');
      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={threePlayers}
          pairs={pairs}
        />
      );

      expect(screen.getByTestId('icon-rotate-clockwise')).toBeTruthy();
    });

    it('shows Shuffle button', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);

      expect(screen.getByText('Shuffle')).toBeTruthy();
    });

    it('shows refresh icon on Shuffle button', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);

      expect(screen.getByTestId('icon-refresh')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SHUFFLE/REGENERATE TESTS
  // ===========================================================================

  describe('Shuffle/Regenerate', () => {
    it('has accessible Shuffle button', () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      const shuffleButton = screen.getByLabelText('Regenerate scoring pairs');
      expect(shuffleButton).toBeTruthy();
    });

    it('calls onPairsChange when Shuffle is pressed', async () => {
      const onPairsChange = jest.fn();
      const pairs = createMockPairs(fourPlayers, 'reciprocal');

      render(
        <ScoringPairFormationInline
          {...defaultProps}
          pairs={pairs}
          onPairsChange={onPairsChange}
        />
      );

      fireEvent.press(screen.getByText('Shuffle'));

      await waitFor(() => {
        expect(onPairsChange).toHaveBeenCalled();
      });
    });

    it('calls autoGenerateScoringPairs utility when Shuffle pressed', async () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');

      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      fireEvent.press(screen.getByText('Shuffle'));

      await waitFor(() => {
        expect(mockAutoGenerateScoringPairs).toHaveBeenCalled();
      });
    });

    it('passes correct player ids to autoGenerateScoringPairs', async () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');

      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      fireEvent.press(screen.getByText('Shuffle'));

      await waitFor(() => {
        expect(mockAutoGenerateScoringPairs).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'player-1' }),
            expect.objectContaining({ id: 'player-2' }),
            expect.objectContaining({ id: 'player-3' }),
            expect.objectContaining({ id: 'player-4' }),
          ])
        );
      });
    });

    it('handles errors from autoGenerateScoringPairs gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAutoGenerateScoringPairs.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      fireEvent.press(screen.getByText('Shuffle'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to generate scoring pairs:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // PAIRS DISPLAY TESTS
  // ===========================================================================

  describe('Pairs Display', () => {
    it('displays all pair rows', () => {
      // For 4 players with reciprocal pairs, we should see 2 grouped rows
      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      // Should show first names of all 4 players
      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
    });

    it('displays circular pairs with arrow icon', () => {
      const pairs = createMockPairs(threePlayers, 'circular');
      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={threePlayers}
          pairs={pairs}
        />
      );

      // Should have arrow icons for circular pairs
      expect(screen.getAllByTestId('icon-arrow-right').length).toBeGreaterThan(0);
    });

    it('displays reciprocal pairs with exchange icon', () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      // Should have exchange icons for reciprocal pairs
      expect(screen.getAllByTestId('icon-arrows-exchange').length).toBeGreaterThan(0);
    });

    it('groups reciprocal pairs correctly', () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      // 4 players = 4 pairs, but grouped = 2 visible rows for reciprocal
      // Each row shows two player names
      // We check that all player first names appear
      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
    });

    it('does not group circular pairs', () => {
      const pairs = createMockPairs(threePlayers, 'circular');
      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={threePlayers}
          pairs={pairs}
        />
      );

      // 3 players = 3 pairs, all shown (not grouped)
      // Each player appears twice in circular (once as scorer, once as scored)
      expect(screen.getAllByText('John').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Jane').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
      // For circular with 3 players, each name appears exactly twice
      expect(screen.getAllByText('John').length).toBe(2);
    });
  });

  // ===========================================================================
  // PLAYER INFORMATION TESTS
  // ===========================================================================

  describe('Player Information', () => {
    it('displays player first name', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);

      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
    });

    it('shows player avatars when no photo_url', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);

      // Players should be displayed by first name
      // Initials are handled internally by PlayerAvatar/GolferIcon
      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
    });

    it('handles unknown player names gracefully', () => {
      // Create pairs with player IDs that don't exist in players array
      const orphanPairs: ScoringPairCreateInput[] = [
        { scorerId: 'unknown-1', playerId: 'unknown-2' },
      ];

      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={twoPlayers}
          pairs={orphanPairs}
        />
      );

      // Should show "Unknown" for missing players
      expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    });

    it('displays Unknown label for unknown player', () => {
      const orphanPairs: ScoringPairCreateInput[] = [
        { scorerId: 'unknown-1', playerId: 'unknown-2' },
      ];

      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={twoPlayers}
          pairs={orphanPairs}
        />
      );

      // Should show "Unknown" for missing players
      // Note: Initials/fallback icons are handled internally by PlayerAvatar
      expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0);
    });

    it('handles single-word names correctly', () => {
      const singleNamePlayers: InlinePlayer[] = [
        createInlinePlayer('p1', 'Madonna'),
        createInlinePlayer('p2', 'Cher'),
      ];
      const pairs = createMockPairs(singleNamePlayers, 'reciprocal');

      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={singleNamePlayers}
          pairs={pairs}
        />
      );

      // Single-word names should display as-is
      // Initials are handled internally by PlayerAvatar/GolferIcon
      expect(screen.getByText('Madonna')).toBeTruthy();
      expect(screen.getByText('Cher')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HELP TEXT TESTS
  // ===========================================================================

  describe('Help Text', () => {
    it('shows reciprocal help text for even player count', () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);

      expect(screen.getByText("Partners score each other's cards")).toBeTruthy();
    });

    it('shows circular help text for odd player count', () => {
      const pairs = createMockPairs(threePlayers, 'circular');
      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={threePlayers}
          pairs={pairs}
        />
      );

      expect(
        screen.getByText('Each player scores one person and is scored by another')
      ).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible Shuffle button with proper label', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);

      const button = screen.getByLabelText('Regenerate scoring pairs');
      expect(button).toBeTruthy();
    });

    it('has button role on Shuffle button', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);

      const button = screen.getByRole('button', { name: 'Regenerate scoring pairs' });
      expect(button).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles exactly 2 players (minimum for pairs)', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);

      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
    });

    it('handles large number of players', () => {
      const manyPlayers = Array.from({ length: 10 }, (_, i) =>
        createInlinePlayer(`player-${i + 1}`, `Player ${i + 1}`, 15 + i)
      );
      const pairs = createMockPairs(manyPlayers, 'reciprocal');

      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={manyPlayers}
          pairs={pairs}
        />
      );

      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });

    it('handles empty pairs array with enough players (triggers auto-gen)', async () => {
      const onPairsChange = jest.fn();

      render(
        <ScoringPairFormationInline
          players={fourPlayers}
          pairs={[]}
          onPairsChange={onPairsChange}
        />
      );

      await waitFor(() => {
        expect(onPairsChange).toHaveBeenCalled();
      });
    });

    it('handles players with very long names', () => {
      const longNamePlayers: InlinePlayer[] = [
        createInlinePlayer('p1', 'Bartholomew Christopher Wellington III'),
        createInlinePlayer('p2', 'Alexandra Elizabeth Montgomery-Worthington'),
      ];
      const pairs = createMockPairs(longNamePlayers, 'reciprocal');

      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={longNamePlayers}
          pairs={pairs}
        />
      );

      // First name only (component uses PlayerAvatar for display)
      expect(screen.getByText('Bartholomew')).toBeTruthy();
      expect(screen.getByText('Alexandra')).toBeTruthy();
      // Note: Initials are now handled internally by PlayerAvatar component
      // which uses GolferIcon for avatar display
    });

    it('handles players with null handicap', () => {
      const noHandicapPlayers: InlinePlayer[] = [
        { id: 'p1', name: 'John Smith', handicap: undefined },
        { id: 'p2', name: 'Jane Doe', handicap: undefined },
      ];
      const pairs = createMockPairs(noHandicapPlayers, 'reciprocal');

      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={noHandicapPlayers}
          pairs={pairs}
        />
      );

      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
    });

    it('handles players with empty string name', () => {
      const emptyNamePlayers: InlinePlayer[] = [
        { id: 'p1', name: '', handicap: 15 },
        { id: 'p2', name: 'Jane Doe', handicap: 20 },
      ];
      const pairs = createMockPairs(emptyNamePlayers, 'reciprocal');

      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={emptyNamePlayers}
          pairs={pairs}
        />
      );

      // Should handle empty name gracefully
      expect(screen.getByText('Jane')).toBeTruthy();
    });

    it('handles duplicate player IDs in pairs gracefully', () => {
      const duplicatePairs: ScoringPairCreateInput[] = [
        { scorerId: 'player-1', playerId: 'player-2' },
        { scorerId: 'player-1', playerId: 'player-2' }, // Duplicate
      ];

      render(
        <ScoringPairFormationInline
          {...defaultProps}
          players={twoPlayers}
          pairs={duplicatePairs}
        />
      );

      // Should still render without crashing
      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });
  });

  // ===========================================================================
  // THEME/STYLE TESTS
  // ===========================================================================

  describe('Theme Support', () => {
    it('renders in light mode by default', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);

      expect(screen.getByTestId('scoring-pair-inline')).toBeTruthy();
    });

    it('renders in dark mode', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(
        <ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('scoring-pair-inline')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PAIRING TYPE DETERMINATION TESTS
  // ===========================================================================

  describe('Pairing Type Determination', () => {
    it('determines reciprocal for 2 players', () => {
      const pairs = createMockPairs(twoPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} players={twoPlayers} pairs={pairs} />);
      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });

    it('determines circular for 3 players', () => {
      const pairs = createMockPairs(threePlayers, 'circular');
      render(
        <ScoringPairFormationInline {...defaultProps} players={threePlayers} pairs={pairs} />
      );
      expect(screen.getByText('Circular Chain')).toBeTruthy();
    });

    it('determines reciprocal for 4 players', () => {
      const pairs = createMockPairs(fourPlayers, 'reciprocal');
      render(<ScoringPairFormationInline {...defaultProps} pairs={pairs} />);
      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });

    it('determines circular for 5 players', () => {
      const fivePlayers = [...fourPlayers, createInlinePlayer('player-5', 'Eve', 18)];
      const pairs = createMockPairs(fivePlayers, 'circular');
      render(
        <ScoringPairFormationInline {...defaultProps} players={fivePlayers} pairs={pairs} />
      );
      expect(screen.getByText('Circular Chain')).toBeTruthy();
    });

    it('determines reciprocal for 6 players', () => {
      const sixPlayers = [
        ...fourPlayers,
        createInlinePlayer('player-5', 'Eve', 18),
        createInlinePlayer('player-6', 'Frank', 22),
      ];
      const pairs = createMockPairs(sixPlayers, 'reciprocal');
      render(
        <ScoringPairFormationInline {...defaultProps} players={sixPlayers} pairs={pairs} />
      );
      expect(screen.getByText('Reciprocal Pairs')).toBeTruthy();
    });
  });

  // ===========================================================================
  // REGENERATION ON PLAYER CHANGE TESTS
  // ===========================================================================

  describe('Player Changes', () => {
    it('regenerates pairs when player count changes', async () => {
      const onPairsChange = jest.fn();

      const { rerender } = render(
        <ScoringPairFormationInline
          players={twoPlayers}
          pairs={[]}
          onPairsChange={onPairsChange}
        />
      );

      await waitFor(() => {
        expect(onPairsChange).toHaveBeenCalled();
      });

      onPairsChange.mockClear();

      // Add more players
      rerender(
        <ScoringPairFormationInline
          players={fourPlayers}
          pairs={[]}
          onPairsChange={onPairsChange}
        />
      );

      await waitFor(() => {
        expect(onPairsChange).toHaveBeenCalled();
      });
    });
  });
});
