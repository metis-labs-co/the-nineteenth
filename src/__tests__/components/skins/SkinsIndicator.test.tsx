/**
 * SkinsIndicator Component Tests
 *
 * Tests for the skins indicator including:
 * - Show/hide based on active skins game
 * - Badge showing carryover holes
 * - Popover with skins summary
 * - Loading state
 * - Custom onPress handler
 * - Size variants
 *
 * @see src/components/skins/SkinsIndicator.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { SkinsIndicator } from '@/components/skins/SkinsIndicator';
import * as skinsHooks from '@/hooks/useSkins';
import type { SkinsGame, SkinsGameSummary, SkinsResultWithWinner } from '@/types';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock skins hooks
jest.mock('@/hooks/useSkins', () => ({
  useActiveSkinsGameForRound: jest.fn(),
  useSkinsSummary: jest.fn(),
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockSkinsGame: SkinsGame = {
  id: 'game-1',
  round_id: 'round-1',
  pairing_id: null,
  participant_ids: ['player-1', 'player-2', 'player-3', 'player-4'],
  pot_type: 'per_hole',
  pot_value: 5,
  currency: 'AUD',
  scoring_type: 'gross',
  pool_source: 'direct',
  status: 'active',
  disclaimer_accepted_at: new Date().toISOString(),
  disclaimer_accepted_by: 'player-1',
  created_by: 'player-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: null,
};

const createMockResult = (
  holeNumber: number,
  isCarryover: boolean,
  winnerId: string | null = null,
  winnerName: string | null = null,
  payoutAmount: number = 0
): SkinsResultWithWinner => ({
  id: `result-${holeNumber}`,
  skins_game_id: 'game-1',
  hole_number: holeNumber,
  winner_id: winnerId,
  is_carryover: isCarryover,
  hole_scores: {},
  hole_pot_value: 5,
  carryover_to_next: isCarryover ? 5 : 0,
  payout_amount: payoutAmount,
  calculated_at: new Date().toISOString(),
  winner: winnerId && winnerName ? { id: winnerId, name: winnerName, handicap: 10 } : null,
});

const mockSummary: SkinsGameSummary = {
  game: mockSkinsGame,
  results: [
    createMockResult(1, false, 'player-1', 'John', 5),
    createMockResult(2, true), // Carryover
    createMockResult(3, true), // Carryover
    createMockResult(4, false, 'player-2', 'Sarah', 15),
    createMockResult(5, true), // Carryover (most recent)
  ],
  payouts: [],
  current_carryover: 5,
  holes_completed: 5,
  total_pot: 90,
  per_hole_value: 5,
};

// ============================================================================
// TEST HELPERS
// ============================================================================

function mockHooks(options: {
  hasGame?: boolean;
  isGameLoading?: boolean;
  hasSummary?: boolean;
  isSummaryLoading?: boolean;
  carryoverHoles?: number;
} = {}) {
  const {
    hasGame = true,
    isGameLoading = false,
    hasSummary = true,
    isSummaryLoading = false,
    carryoverHoles = 1,
  } = options;

  // Modify summary to have specified carryover holes at the end
  const modifiedSummary = { ...mockSummary };
  if (hasSummary) {
    const results: SkinsResultWithWinner[] = [];
    // Add non-carryover results first
    for (let i = 1; i <= 5 - carryoverHoles; i++) {
      results.push(createMockResult(i, false, 'player-1', 'John', 5));
    }
    // Add carryover results at the end
    for (let i = 5 - carryoverHoles + 1; i <= 5; i++) {
      results.push(createMockResult(i, true));
    }
    modifiedSummary.results = results;
    modifiedSummary.current_carryover = carryoverHoles * 5;
    modifiedSummary.holes_completed = 5;
  }

  (skinsHooks.useActiveSkinsGameForRound as jest.Mock).mockReturnValue({
    data: hasGame ? mockSkinsGame : null,
    isLoading: isGameLoading,
  });

  (skinsHooks.useSkinsSummary as jest.Mock).mockReturnValue({
    data: hasSummary ? modifiedSummary : null,
    isLoading: isSummaryLoading,
  });
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SkinsIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHooks();
  });

  describe('Visibility', () => {
    it('renders when skins game is active', () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      expect(screen.getByTestId('skins-indicator')).toBeTruthy();
    });

    it('does not render when no active skins game', () => {
      mockHooks({ hasGame: false });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      expect(screen.queryByTestId('skins-indicator')).toBeNull();
    });

    it('shows loading state while checking for skins game', () => {
      mockHooks({ hasGame: false, isGameLoading: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      // Should render container but show loading indicator
      expect(screen.getByTestId('skins-indicator')).toBeTruthy();
    });
  });

  describe('Carryover Badge', () => {
    it('shows badge with carryover count when carryover exists', () => {
      mockHooks({ hasGame: true, carryoverHoles: 2 });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      expect(screen.getByText('2')).toBeTruthy();
    });

    it('does not show badge when no carryover', () => {
      mockHooks({ hasGame: true, carryoverHoles: 0 });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      // Should not find any badge numbers (carryover count)
      expect(screen.queryByText('1')).toBeNull();
      expect(screen.queryByText('2')).toBeNull();
      expect(screen.queryByText('3')).toBeNull();
    });

    it('shows correct badge count for multiple carryover holes', () => {
      mockHooks({ hasGame: true, carryoverHoles: 3 });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  describe('Popover', () => {
    it('opens popover on press when no custom onPress', async () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      fireEvent.press(screen.getByTestId('skins-indicator'));

      await waitFor(() => {
        expect(screen.getByText('Skins Game')).toBeTruthy();
      });
    });

    it('shows pot value in popover', async () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      fireEvent.press(screen.getByTestId('skins-indicator'));

      await waitFor(() => {
        expect(screen.getByText('$5.00/hole')).toBeTruthy();
      });
    });

    it('shows scoring type in popover', async () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      fireEvent.press(screen.getByTestId('skins-indicator'));

      await waitFor(() => {
        expect(screen.getByText('Gross')).toBeTruthy();
      });
    });

    it('shows progress in popover', async () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      fireEvent.press(screen.getByTestId('skins-indicator'));

      await waitFor(() => {
        expect(screen.getByText('5/18 holes')).toBeTruthy();
      });
    });

    it('shows carryover info in popover when carryover exists', async () => {
      mockHooks({ hasGame: true, carryoverHoles: 2 });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      fireEvent.press(screen.getByTestId('skins-indicator'));

      await waitFor(() => {
        expect(screen.getByText(/\$10\.00 carryover/)).toBeTruthy();
      });
    });

    it('closes popover on Close button press', async () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      // Open popover
      fireEvent.press(screen.getByTestId('skins-indicator'));

      await waitFor(() => {
        expect(screen.getByText('Skins Game')).toBeTruthy();
      });

      // Close popover
      fireEvent.press(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByText('Skins Game')).toBeNull();
      });
    });

    it('shows no data message when summary not available', async () => {
      mockHooks({ hasGame: true, hasSummary: false });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      fireEvent.press(screen.getByTestId('skins-indicator'));

      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeTruthy();
      });
    });
  });

  describe('Custom onPress Handler', () => {
    it('calls custom onPress instead of opening popover', () => {
      mockHooks({ hasGame: true });
      const mockOnPress = jest.fn();

      render(
        <SkinsIndicator
          roundId="round-1"
          onPress={mockOnPress}
          testID="skins-indicator"
        />
      );

      fireEvent.press(screen.getByTestId('skins-indicator'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not open popover when custom onPress provided', async () => {
      mockHooks({ hasGame: true });
      const mockOnPress = jest.fn();

      render(
        <SkinsIndicator
          roundId="round-1"
          onPress={mockOnPress}
          testID="skins-indicator"
        />
      );

      fireEvent.press(screen.getByTestId('skins-indicator'));

      // Popover should not open
      await waitFor(() => {
        expect(screen.queryByText('Skins Game')).toBeNull();
      });
    });
  });

  describe('Size Variants', () => {
    it('renders with default md size', () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      const indicator = screen.getByTestId('skins-indicator');
      // Default md size is 40x40
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 40,
            height: 40,
          }),
        ])
      );
    });

    it('renders with sm size', () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          size="sm"
          testID="skins-indicator"
        />
      );

      const indicator = screen.getByTestId('skins-indicator');
      // sm size is 32x32
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            width: 32,
            height: 32,
          }),
        ])
      );
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      const indicator = screen.getByTestId('skins-indicator');
      expect(indicator.props.accessibilityRole).toBe('button');
    });

    it('has accessibility label without carryover', () => {
      mockHooks({ hasGame: true, carryoverHoles: 0 });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      const indicator = screen.getByTestId('skins-indicator');
      expect(indicator.props.accessibilityLabel).toBe('Skins game active');
    });

    it('has accessibility label with carryover', () => {
      mockHooks({ hasGame: true, carryoverHoles: 2 });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      const indicator = screen.getByTestId('skins-indicator');
      expect(indicator.props.accessibilityLabel).toContain('2 holes carried over');
    });

    it('has accessibility hint', () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      const indicator = screen.getByTestId('skins-indicator');
      expect(indicator.props.accessibilityHint).toBe('Tap to view skins game summary');
    });
  });

  describe('Last Winner Display', () => {
    it('shows last winner in popover when results have winner', async () => {
      // Setup mock with a result that has a winner as the most recent non-carryover
      const summaryWithWinner: SkinsGameSummary = {
        ...mockSummary,
        results: [
          createMockResult(1, false, 'player-1', 'John', 5),
          createMockResult(2, false, 'player-2', 'Sarah', 10),
          createMockResult(3, true), // Last result is carryover
        ],
        current_carryover: 5,
        holes_completed: 3,
      };

      (skinsHooks.useActiveSkinsGameForRound as jest.Mock).mockReturnValue({
        data: mockSkinsGame,
        isLoading: false,
      });

      (skinsHooks.useSkinsSummary as jest.Mock).mockReturnValue({
        data: summaryWithWinner,
        isLoading: false,
      });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      fireEvent.press(screen.getByTestId('skins-indicator'));

      await waitFor(() => {
        // Sarah was the last winner (hole 2)
        expect(screen.getByText(/Sarah won \$10\.00 \(Hole 2\)/)).toBeTruthy();
      });
    });
  });

  describe('Hook Calls', () => {
    it('calls useActiveSkinsGameForRound with correct roundId', () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="test-round-123"
          testID="skins-indicator"
        />
      );

      expect(skinsHooks.useActiveSkinsGameForRound).toHaveBeenCalledWith('test-round-123');
    });

    it('calls useSkinsSummary with game id when game exists', () => {
      mockHooks({ hasGame: true });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      expect(skinsHooks.useSkinsSummary).toHaveBeenCalledWith('game-1');
    });

    it('calls useSkinsSummary with undefined when no game', () => {
      mockHooks({ hasGame: false });

      render(
        <SkinsIndicator
          roundId="round-1"
          testID="skins-indicator"
        />
      );

      expect(skinsHooks.useSkinsSummary).toHaveBeenCalledWith(undefined);
    });
  });
});
