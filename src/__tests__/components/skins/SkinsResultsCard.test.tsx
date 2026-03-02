/**
 * SkinsResultsCard Component Tests
 *
 * Tests for the skins results card including:
 * - Rendering results table with hole-by-hole data
 * - Carryover styling
 * - Winner highlighting
 * - Front 9/Back 9 subtotals
 * - Total row with unsettled carryover
 * - Empty state for unplayed holes
 *
 * @see src/components/skins/SkinsResultsCard.tsx
 */

import React from 'react';
import { View, FlatList } from 'react-native';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { SkinsResultsCard } from '@/components/skins/SkinsResultsCard';
import type { SkinsResultWithWinner } from '@/types';

// Patch FlatList.prototype.render to actually render all items in the test environment.
// By default, FlatList virtualizes content and may not render off-screen items.
const originalRender = FlatList.prototype.render;
beforeAll(() => {
  (FlatList.prototype as any).render = function () {
    const { data, renderItem, keyExtractor, ListHeaderComponent, ListFooterComponent, ListEmptyComponent, contentContainerStyle, scrollEnabled, showsVerticalScrollIndicator, ...rest } = this.props;
    return React.createElement(View, { ...rest, style: contentContainerStyle },
      ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? React.createElement(ListHeaderComponent) : ListHeaderComponent) : null,
      data && data.length > 0
        ? data.map((item: any, index: number) => {
            const key = keyExtractor ? keyExtractor(item, index) : String(index);
            return React.createElement(React.Fragment, { key }, renderItem({ item, index, separators: {} }));
          })
        : ListEmptyComponent ? (typeof ListEmptyComponent === 'function' ? React.createElement(ListEmptyComponent) : ListEmptyComponent) : null,
      ListFooterComponent ? (typeof ListFooterComponent === 'function' ? React.createElement(ListFooterComponent) : ListFooterComponent) : null,
    );
  };
});
afterAll(() => {
  FlatList.prototype.render = originalRender;
});

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createWinnerResult = (
  holeNumber: number,
  winnerId: string,
  winnerName: string,
  payoutAmount: number,
  grossScore: number = 4
): SkinsResultWithWinner => ({
  id: `result-hole-${holeNumber}`,
  skins_game_id: 'game-1',
  hole_number: holeNumber,
  winner_id: winnerId,
  team_winner_id: null,
  is_carryover: false,
  hole_scores: {
    [winnerId]: { gross: grossScore, net: grossScore, strokes_received: 0 },
  },
  hole_pot_value: 5,
  carryover_to_next: 0,
  payout_amount: payoutAmount,
  calculated_at: new Date().toISOString(),
  winner: { id: winnerId, name: winnerName },
});

const createCarryoverResult = (
  holeNumber: number,
  carryoverAmount: number
): SkinsResultWithWinner => ({
  id: `result-hole-${holeNumber}`,
  skins_game_id: 'game-1',
  hole_number: holeNumber,
  winner_id: null,
  team_winner_id: null,
  is_carryover: true,
  hole_scores: {
    'player-1': { gross: 4, net: 4, strokes_received: 0 },
    'player-2': { gross: 4, net: 4, strokes_received: 0 },
  },
  hole_pot_value: 5,
  carryover_to_next: carryoverAmount,
  payout_amount: 0,
  calculated_at: new Date().toISOString(),
  winner: null,
});

// Create a sample set of results for testing
const createSampleResults = (): SkinsResultWithWinner[] => [
  createWinnerResult(1, 'player-1', 'John', 5, 3),
  createCarryoverResult(2, 5),
  createWinnerResult(3, 'player-2', 'Sarah', 10, 4), // Won 2 holes (carryover)
  createCarryoverResult(4, 5),
  createCarryoverResult(5, 10),
  createWinnerResult(6, 'player-1', 'John', 15, 3), // Won 3 holes
];

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SkinsResultsCard', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
          testID="skins-results-card"
        />
      );

      expect(screen.getByTestId('skins-results-card')).toBeTruthy();
    });

    it('renders the card header', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText('SKINS RESULTS')).toBeTruthy();
    });

    it('renders config summary with per-hole pot type', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText('$5.00/hole | Gross | 18 holes')).toBeTruthy();
    });

    it('renders config summary with total pot type', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="total_pot"
          potValue={90}
          scoringType="net"
        />
      );

      expect(screen.getByText('$5.00/hole | Net | 18 holes')).toBeTruthy();
    });

    it('renders table header row', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText('Hole')).toBeTruthy();
      expect(screen.getByText('Winner')).toBeTruthy();
      expect(screen.getByText('Value')).toBeTruthy();
      expect(screen.getByText('Notes')).toBeTruthy();
    });

    it('renders Par column when parValues provided', () => {
      const parValues = { 1: 4, 2: 5, 3: 3 };

      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
          parValues={parValues}
        />
      );

      expect(screen.getByText('Par')).toBeTruthy();
    });

    it('does not render Par column when parValues not provided', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.queryByText('Par')).toBeNull();
    });
  });

  describe('Hole Rows', () => {
    it('renders 18 hole rows', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      // Check for hole numbers 1-18
      for (let i = 1; i <= 18; i++) {
        expect(screen.getAllByText(String(i)).length).toBeGreaterThan(0);
      }
    });

    it('renders winner name for winning holes', () => {
      const results = [createWinnerResult(1, 'player-1', 'John', 5)];

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      // John may appear in both the hole row and the player totals section
      expect(screen.getAllByText('John').length).toBeGreaterThanOrEqual(1);
    });

    it('renders payout amount for winning holes', () => {
      const results = [createWinnerResult(1, 'player-1', 'John', 10)];

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      // $10.00 may appear in both the hole row and the player totals section
      expect(screen.getAllByText('$10.00').length).toBeGreaterThanOrEqual(1);
    });

    it('renders -- for carryover holes with no winner', () => {
      const results = [createCarryoverResult(1, 5)];

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getAllByText('--').length).toBeGreaterThan(0);
    });

    it('renders carryover note for tied holes', () => {
      const results = [createCarryoverResult(1, 5)];

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText(/Tied, \+\$5\.00 carried/)).toBeTruthy();
    });

    it('renders winning score in notes for gross scoring', () => {
      const results = [createWinnerResult(1, 'player-1', 'John', 5, 3)];

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText('Won with 3')).toBeTruthy();
    });
  });

  describe('Subtotal Rows', () => {
    it('renders Front 9 subtotal row', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText('FRONT 9')).toBeTruthy();
    });

    it('renders Back 9 subtotal row', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText('BACK 9')).toBeTruthy();
    });

    it('calculates Front 9 subtotal correctly', () => {
      const results = [
        createWinnerResult(1, 'player-1', 'John', 5),
        createWinnerResult(3, 'player-2', 'Sarah', 10),
        createWinnerResult(9, 'player-1', 'John', 5),
      ];

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      // Front 9 total: 5 + 10 + 5 = 20
      // May also appear in player totals, so use getAllByText
      expect(screen.getAllByText('$20.00').length).toBeGreaterThanOrEqual(1);
    });

    it('calculates Back 9 subtotal correctly', () => {
      const results = [
        createWinnerResult(10, 'player-1', 'John', 5),
        createWinnerResult(15, 'player-2', 'Sarah', 10),
        createWinnerResult(18, 'player-1', 'John', 15),
      ];

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      // Back 9 total: 5 + 10 + 15 = 30
      // May also appear in player totals, so use getAllByText
      expect(screen.getAllByText('$30.00').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Total Row', () => {
    it('renders TOTAL row', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText('TOTAL')).toBeTruthy();
    });

    it('calculates total correctly', () => {
      const results = [
        createWinnerResult(1, 'player-1', 'John', 5),
        createWinnerResult(10, 'player-2', 'Sarah', 10),
      ];

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      // Total: 5 + 10 = 15
      expect(screen.getByText('$15.00')).toBeTruthy();
    });

    it('shows unsettled carryover when hole 18 is tied', () => {
      const results: SkinsResultWithWinner[] = [];
      // Add results for holes 1-17
      for (let i = 1; i <= 17; i++) {
        results.push(createWinnerResult(i, 'player-1', 'John', 5));
      }
      // Add tied result for hole 18
      results.push(createCarryoverResult(18, 5));

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText(/\+ \$5\.00 unsettled/)).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('renders placeholder rows for unplayed holes', () => {
      // No results - all holes are unplayed
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      // Should still render 18 hole rows with default pot value
      // Multiple $5.00 values should appear (for each unplayed hole)
      const potValues = screen.getAllByText('$5.00');
      expect(potValues.length).toBeGreaterThan(0);
    });

    it('shows $0.00 totals when no results', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      // Front 9, Back 9, and Total should all be $0.00
      const zeroValues = screen.getAllByText('$0.00');
      expect(zeroValues.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Par Values', () => {
    it('displays par values when provided', () => {
      const parValues: Record<number, number> = {
        1: 4,
        2: 5,
        3: 3,
        4: 4,
        5: 4,
        6: 3,
        7: 5,
        8: 4,
        9: 4,
        10: 4,
        11: 3,
        12: 5,
        13: 4,
        14: 4,
        15: 3,
        16: 5,
        17: 4,
        18: 4,
      };

      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
          parValues={parValues}
        />
      );

      // Check that par values are displayed
      expect(screen.getByText('Par')).toBeTruthy();
      // Par 3 holes
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      // Par 4 holes
      expect(screen.getAllByText('4').length).toBeGreaterThan(0);
      // Par 5 holes
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    });
  });

  describe('Pot Value Calculations', () => {
    it('calculates per-hole value correctly for per_hole pot type', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={10}
          scoringType="gross"
        />
      );

      // Config summary should show $10.00/hole
      expect(screen.getByText('$10.00/hole | Gross | 18 holes')).toBeTruthy();
    });

    it('calculates per-hole value correctly for total_pot pot type', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="total_pot"
          potValue={180}
          scoringType="gross"
        />
      );

      // Config summary should show $10.00/hole (180/18)
      expect(screen.getByText('$10.00/hole | Gross | 18 holes')).toBeTruthy();
    });
  });

  describe('Scoring Type Display', () => {
    it('displays Gross in config summary', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      expect(screen.getByText(/\| Gross \|/)).toBeTruthy();
    });

    it('displays Net in config summary', () => {
      render(
        <SkinsResultsCard
          results={[]}
          potType="per_hole"
          potValue={5}
          scoringType="net"
        />
      );

      expect(screen.getByText(/\| Net \|/)).toBeTruthy();
    });
  });

  describe('Multiple Results Scenario', () => {
    it('handles a complete game with mixed results', () => {
      const results = createSampleResults();

      render(
        <SkinsResultsCard
          results={results}
          potType="per_hole"
          potValue={5}
          scoringType="gross"
        />
      );

      // John won holes 1 and 6 - may appear in both hole rows and player totals
      expect(screen.getAllByText('John').length).toBeGreaterThanOrEqual(1);
      // Sarah won hole 3 - may appear in both hole rows and player totals
      expect(screen.getAllByText('Sarah').length).toBeGreaterThanOrEqual(1);

      // Winners should have amounts (may appear in multiple places)
      expect(screen.getAllByText('$5.00').length).toBeGreaterThanOrEqual(1); // Hole 1
      expect(screen.getAllByText('$15.00').length).toBeGreaterThanOrEqual(1); // Hole 6 (3 carried holes)

      // Carryover notes
      expect(screen.getAllByText(/Tied, \+\$\d+\.\d+ carried/).length).toBeGreaterThan(0);
    });
  });
});
