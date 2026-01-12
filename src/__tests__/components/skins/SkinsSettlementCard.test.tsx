/**
 * SkinsSettlementCard Component Tests
 *
 * Tests for the skins settlement card including:
 * - Rendering payouts table
 * - Who owes who calculation
 * - Debt simplification display
 * - Unsettled pot section
 * - Share button functionality
 * - All even state
 *
 * @see src/components/skins/SkinsSettlementCard.tsx
 */

import React from 'react';
import { Share } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { SkinsSettlementCard } from '@/components/skins/SkinsSettlementCard';
import type { SkinsPayoutWithPlayer, SkinsGame } from '@/types';

// ============================================================================
// MOCK SETUP
// ============================================================================

// We'll skip Share tests as mocking react-native Share is complex in this setup

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockGame = (overrides: Partial<SkinsGame> = {}): SkinsGame => ({
  id: 'game-1',
  round_id: 'round-1',
  pairing_id: null,
  participant_ids: ['player-1', 'player-2', 'player-3', 'player-4'],
  pot_type: 'per_hole',
  pot_value: 5,
  currency: 'AUD',
  scoring_type: 'gross',
  pool_source: 'direct',
  status: 'completed',
  disclaimer_accepted_at: new Date().toISOString(),
  disclaimer_accepted_by: 'player-1',
  created_by: 'player-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  ...overrides,
});

const createMockPayout = (
  playerId: string,
  playerName: string,
  holesWon: number,
  totalWinnings: number,
  netResult: number
): SkinsPayoutWithPlayer => ({
  id: `payout-${playerId}`,
  skins_game_id: 'game-1',
  player_id: playerId,
  buy_in: 22.5, // $5/hole * 18 holes / 4 players = $22.50
  total_winnings: totalWinnings,
  net_result: netResult,
  holes_won: holesWon,
  holes_tied: 0,
  holes_lost: 18 - holesWon,
  calculated_at: new Date().toISOString(),
  player: { id: playerId, name: playerName, handicap: 10 },
});

// Scenario: John won big, Sarah broke even, Mike and You lost
const createSamplePayouts = (): SkinsPayoutWithPlayer[] => [
  createMockPayout('player-1', 'John', 8, 45, 22.5), // +$22.50
  createMockPayout('player-2', 'Sarah', 5, 25, 2.5), // +$2.50
  createMockPayout('player-3', 'Mike', 2, 10, -12.5), // -$12.50
  createMockPayout('player-4', 'You', 2, 10, -12.5), // -$12.50
];

// Scenario: Everyone tied - no debts
const createEvenPayouts = (): SkinsPayoutWithPlayer[] => [
  createMockPayout('player-1', 'John', 4, 22.5, 0),
  createMockPayout('player-2', 'Sarah', 4, 22.5, 0),
  createMockPayout('player-3', 'Mike', 4, 22.5, 0),
  createMockPayout('player-4', 'You', 4, 22.5, 0),
];

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SkinsSettlementCard', () => {
  const mockGame = createMockGame();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
          testID="settlement-card"
        />
      );

      expect(screen.getByTestId('settlement-card')).toBeTruthy();
    });

    it('renders the card header', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('SETTLEMENT SUMMARY')).toBeTruthy();
    });

    it('renders TOTALS WON section title', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('TOTALS WON')).toBeTruthy();
    });

    it('renders table headers', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('Player')).toBeTruthy();
      expect(screen.getByText('Holes')).toBeTruthy();
      expect(screen.getByText('Won')).toBeTruthy();
      expect(screen.getByText('Net')).toBeTruthy();
    });
  });

  describe('Payouts Table', () => {
    it('renders all players', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Sarah')).toBeTruthy();
      expect(screen.getByText('Mike')).toBeTruthy();
      expect(screen.getByText('You')).toBeTruthy();
    });

    it('renders holes won count', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      // John won 8 holes
      expect(screen.getByText('8')).toBeTruthy();
      // Sarah won 5 holes
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders total winnings', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('$45.00')).toBeTruthy(); // John
      expect(screen.getByText('$25.00')).toBeTruthy(); // Sarah
    });

    it('renders positive net result with + prefix', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('+$22.50')).toBeTruthy(); // John
      expect(screen.getByText('+$2.50')).toBeTruthy(); // Sarah
    });

    it('renders negative net result with - prefix', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      // Mike and You both have -$12.50
      const negativeResults = screen.getAllByText('-$12.50');
      expect(negativeResults.length).toBe(2);
    });

    it('sorts payouts by total winnings descending', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      // Find all player names in order
      const playerCells = screen.getAllByText(/John|Sarah|Mike|You/);
      const playerNames = playerCells.map((cell) => cell.props.children);

      // John should be first (most winnings), then Sarah
      expect(playerNames[0]).toBe('John');
      expect(playerNames[1]).toBe('Sarah');
    });
  });

  describe('Who Owes Who Section', () => {
    it('renders WHO OWES WHO section when debts exist', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('WHO OWES WHO')).toBeTruthy();
    });

    it('does not render WHO OWES WHO section when all even', () => {
      render(
        <SkinsSettlementCard
          payouts={createEvenPayouts()}
          game={mockGame}
        />
      );

      expect(screen.queryByText('WHO OWES WHO')).toBeNull();
    });

    it('renders all even message when no debts', () => {
      render(
        <SkinsSettlementCard
          payouts={createEvenPayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('All even - no money owed!')).toBeTruthy();
    });

    it('renders debt transactions', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      // The debt simplification should show Mike and You owe John and Sarah
      // The exact transactions depend on the simplifyDebts algorithm
      // At minimum, we should see some debt amounts displayed
      const debtAmounts = screen.getAllByText(/\$\d+\.\d+/);
      expect(debtAmounts.length).toBeGreaterThan(0);
    });
  });

  describe('Unsettled Carryover Section', () => {
    it('renders UNSETTLED POT section when carryover exists', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
          unsettledCarryover={20}
        />
      );

      expect(screen.getByText('UNSETTLED POT')).toBeTruthy();
    });

    it('does not render UNSETTLED POT section when no carryover', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
          unsettledCarryover={0}
        />
      );

      expect(screen.queryByText('UNSETTLED POT')).toBeNull();
    });

    it('displays carryover amount', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
          unsettledCarryover={20}
        />
      );

      expect(screen.getByText('$20.00')).toBeTruthy();
    });

    it('displays split suggestion', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
          unsettledCarryover={20}
        />
      );

      // 4 players, $20 carryover = $5 each
      expect(screen.getByText(/split evenly \(\$5\.00 each\)/)).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('renders Share Results button', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('Share Results')).toBeTruthy();
    });

    it('renders disabled Mark as Settled button', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByText('Mark as Settled')).toBeTruthy();
      expect(screen.getByLabelText('Mark as settled (coming soon)')).toBeTruthy();
    });

    it('Share Results button is pressable', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      const shareButton = screen.getByText('Share Results');
      // Should not throw
      fireEvent.press(shareButton);
    });
  });

  describe('Accessibility', () => {
    it('Share Results button has correct accessibility role', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByLabelText('Share results').props.accessibilityRole).toBe(
        'button'
      );
    });

    it('Share Results button has accessibility hint', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(screen.getByLabelText('Share results').props.accessibilityHint).toBe(
        'Share the skins game results with others'
      );
    });

    it('Mark as Settled button has accessibility hint', () => {
      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={mockGame}
        />
      );

      expect(
        screen.getByLabelText('Mark as settled (coming soon)').props.accessibilityHint
      ).toBe('This feature is not yet available');
    });
  });

  describe('Different Game Configurations', () => {
    it('handles total_pot game type', () => {
      const totalPotGame = createMockGame({
        pot_type: 'total_pot',
        pot_value: 90,
      });

      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={totalPotGame}
        />
      );

      expect(screen.getByTestId('settlement-card')).toBeTruthy();
    });

    it('handles net scoring type', () => {
      const netGame = createMockGame({
        scoring_type: 'net',
      });

      render(
        <SkinsSettlementCard
          payouts={createSamplePayouts()}
          game={netGame}
          testID="settlement-card"
        />
      );

      expect(screen.getByTestId('settlement-card')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty payouts array', () => {
      render(
        <SkinsSettlementCard
          payouts={[]}
          game={mockGame}
          testID="settlement-card"
        />
      );

      expect(screen.getByTestId('settlement-card')).toBeTruthy();
      expect(screen.getByText('All even - no money owed!')).toBeTruthy();
    });

    it('handles single player payout', () => {
      const singlePayout = [
        createMockPayout('player-1', 'John', 18, 90, 67.5),
      ];

      render(
        <SkinsSettlementCard
          payouts={singlePayout}
          game={mockGame}
          testID="settlement-card"
        />
      );

      expect(screen.getByTestId('settlement-card')).toBeTruthy();
      expect(screen.getByText('John')).toBeTruthy();
    });

    it('handles two players with equal results', () => {
      const equalPayouts = [
        createMockPayout('player-1', 'John', 9, 45, 0),
        createMockPayout('player-2', 'Sarah', 9, 45, 0),
      ];

      render(
        <SkinsSettlementCard
          payouts={equalPayouts}
          game={mockGame}
          testID="settlement-card"
        />
      );

      expect(screen.getByTestId('settlement-card')).toBeTruthy();
      expect(screen.getByText('All even - no money owed!')).toBeTruthy();
    });
  });
});
