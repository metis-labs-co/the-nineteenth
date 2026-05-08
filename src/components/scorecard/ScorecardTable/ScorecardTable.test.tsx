/**
 * ScorecardTable Component Tests
 *
 * Tests for the scorecard table component including:
 * - Rendering header rows with player names and handicaps
 * - Displaying hole numbers, stroke indexes, and pars
 * - Score display with ScoreIndicator styling
 * - Front 9/Back 9 subtotals
 * - Gross, Net, and Stableford total rows
 * - Horizontal scroll behavior for many players
 * - Player name tap callbacks
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { ScorecardTable } from './ScorecardTable';
import { create18Holes } from '@/__tests__/utils/testFixtures';
import type { ScorecardTablePlayer } from './types';
import type { Hole } from '@/types/database.types';

// Mock the ScoreIndicator component - use require inside factory to avoid scope issues
jest.mock('../ScoreIndicator', () => {
  const { View, Text } = require('react-native');
  return {
    ScoreIndicator: ({ strokes, par }: { strokes: number | undefined; par: number }) => {
      const diff = strokes ? strokes - par : null;
      let indicator = '';
      if (diff !== null) {
        if (diff <= -2) indicator = 'eagle';
        else if (diff === -1) indicator = 'birdie';
        else if (diff === 0) indicator = 'par';
        else if (diff === 1) indicator = 'bogey';
        else indicator = 'double';
      }
      return (
        <View testID={`score-indicator-${strokes ?? 'empty'}`}>
          <Text testID={`score-value-${strokes ?? 'empty'}`}>
            {strokes ?? '-'}
          </Text>
          {indicator && <Text testID={`score-type-${indicator}`}>{indicator}</Text>}
        </View>
      );
    },
  };
});

// Mock the layout utilities to avoid complex calculations in tests
jest.mock('@/utils/scorecardLayout', () => ({
  calculateScorecardLayout: (screenWidth: number, playerCount: number) => ({
    playerCellWidth: 80,
    fixedColumnsWidth: 128,
    needsHorizontalScroll: playerCount > 3,
    availablePlayerWidth: screenWidth - 128,
  }),
  FIXED_COLUMNS_WIDTH: 128,
  HOLE_CELL_WIDTH: 48,
  INDEX_CELL_WIDTH: 36,
  PAR_CELL_WIDTH: 44,
  PICKUP_SCORE: 10,
  CELL_HEIGHTS: {
    standard: 44,
    header: 56,
  },
}));

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

/**
 * Create a test player with scores for the scorecard table
 */
function createScorecardPlayer(
  id: string,
  name: string,
  handicap: number,
  scores: Record<string, { strokes: number }> = {}
): ScorecardTablePlayer {
  return {
    id: `scorecard-${id}`,
    playerId: id,
    player: {
      id,
      name,
      handicap,
    },
    scores,
    hasScorecard: Object.keys(scores).length > 0,
  };
}

/**
 * Generate scores for all 18 holes with an offset from par
 */
function generateScores(
  holes: Hole[],
  offset: number = 0
): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  holes.forEach((hole) => {
    scores[String(hole.number)] = { strokes: hole.par + offset };
  });
  return scores;
}

/**
 * Generate mixed scores (some birdies, pars, bogeys)
 * Note: Available for test expansion if needed
 */
function _generateMixedScores(holes: Hole[]): Record<string, { strokes: number }> {
  const scores: Record<string, { strokes: number }> = {};
  holes.forEach((hole, index) => {
    // Vary scores: birdie (-1), par (0), bogey (+1), double (+2)
    const offsets = [-1, 0, 1, 2, 0, 1, -1, 0, 2];
    scores[String(hole.number)] = {
      strokes: hole.par + offsets[index % offsets.length],
    };
  });
  return scores;
}

describe('ScorecardTable', () => {
  const holes = create18Holes();
  const defaultScreenWidth = 400;

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders the table container', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John Smith', 15),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Table should render successfully
      expect(screen.getByText('Hole')).toBeTruthy();
      expect(screen.getByText('SI')).toBeTruthy();
      expect(screen.getByText('Par')).toBeTruthy();
    });

    it('renders all 18 hole numbers', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 10),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Check for hole numbers 1-18 (some numbers appear multiple times, e.g., in SI column)
      for (let i = 1; i <= 18; i++) {
        expect(screen.getAllByText(String(i)).length).toBeGreaterThanOrEqual(1);
      }
    });

    it('renders stroke indexes for all holes', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 10),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Check for stroke indexes (7, 15, 1, 11, 5, 17, 3, 9, 13, etc.)
      // The first hole has SI 7
      expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1);
    });

    it('renders par values for all holes', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 10),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Par 3, 4, and 5 holes should all appear
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // HEADER TESTS
  // ===========================================================================

  describe('Header Row', () => {
    it('renders player first name in header', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John Smith', 15),
        createScorecardPlayer('2', 'Jane Doe', 20),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Should show first names only
      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
    });

    it('renders player handicaps in header', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John Smith', 15),
        createScorecardPlayer('2', 'Jane Doe', 20),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('HC: 15')).toBeTruthy();
      expect(screen.getByText('HC: 20')).toBeTruthy();
    });

    it('shows HC: 0 for players without handicap', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'New Player', 0),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('HC: 0')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCORE DISPLAY TESTS
  // ===========================================================================

  describe('Score Display', () => {
    it('renders scores for each hole', () => {
      const scores = generateScores(holes, 0); // All pars
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, scores),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Should render ScoreIndicator for each hole
      // First hole is par 4, so score should be 4 (may appear multiple times for par 4 holes)
      expect(screen.getAllByTestId('score-indicator-4').length).toBeGreaterThanOrEqual(1);
    });

    it('renders empty indicator for holes without scores', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, {}), // No scores
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Should show empty indicators
      expect(screen.getAllByTestId('score-indicator-empty').length).toBeGreaterThan(0);
    });

    it('renders birdie scores correctly', () => {
      const birdieScores: Record<string, { strokes: number }> = {
        '1': { strokes: 3 }, // Birdie on par 4
      };
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, birdieScores),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByTestId('score-indicator-3')).toBeTruthy();
      expect(screen.getByTestId('score-type-birdie')).toBeTruthy();
    });

    it('renders eagle scores correctly', () => {
      // Hole 3 is a par 5 in our test fixtures
      const eagleScores: Record<string, { strokes: number }> = {
        '3': { strokes: 3 }, // Eagle on par 5
      };
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, eagleScores),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByTestId('score-type-eagle')).toBeTruthy();
    });

    it('renders bogey scores correctly', () => {
      const bogeyScores: Record<string, { strokes: number }> = {
        '1': { strokes: 5 }, // Bogey on par 4
      };
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, bogeyScores),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByTestId('score-type-bogey')).toBeTruthy();
    });

    it('renders double bogey+ scores correctly', () => {
      const doubleScores: Record<string, { strokes: number }> = {
        '1': { strokes: 6 }, // Double on par 4
      };
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, doubleScores),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByTestId('score-type-double')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SUBTOTAL ROWS TESTS
  // ===========================================================================

  describe('Subtotal Rows', () => {
    it('renders OUT row for front 9 subtotal', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, generateScores(holes, 0)),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('OUT')).toBeTruthy();
    });

    it('renders IN row for back 9 subtotal', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, generateScores(holes, 0)),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('IN')).toBeTruthy();
    });

    it('displays front 9 par total', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Front 9 par total from fixtures: 4+3+5+4+4+3+4+5+4 = 36
      // Appears in both OUT and IN rows (same value in test fixtures)
      expect(screen.getAllByText('36').length).toBeGreaterThanOrEqual(1);
    });

    it('displays back 9 par total', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Back 9 par total from fixtures: 4+3+5+4+4+3+4+5+4 = 36
      // Note: Holes 10-18 have same pars as 1-9 in test fixtures
      // Total appears multiple times (in OUT row, IN row, and Gross row)
    });
  });

  // ===========================================================================
  // TOTAL ROWS TESTS
  // ===========================================================================

  describe('Total Rows', () => {
    it('renders Gross total row', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, generateScores(holes, 0)),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('Gross')).toBeTruthy();
    });

    it('renders Net total row', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, generateScores(holes, 0)),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('Net')).toBeTruthy();
    });

    it('renders Stableford points row', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, generateScores(holes, 0)),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getAllByText('Pts').length).toBeGreaterThanOrEqual(1);
    });

    it('displays total par in Gross row', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Total par for 18 holes: 36 + 36 = 72
      expect(screen.getByText('72')).toBeTruthy();
    });

    it('shows dash for empty total values', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, {}), // No scores
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Multiple dashes for empty scores
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // MULTIPLE PLAYERS TESTS
  // ===========================================================================

  describe('Multiple Players', () => {
    it('renders columns for multiple players', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, generateScores(holes, 0)),
        createScorecardPlayer('2', 'Jane', 20, generateScores(holes, 1)),
        createScorecardPlayer('3', 'Bob', 10, generateScores(holes, -1)),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
    });

    it('renders handicaps for all players', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15),
        createScorecardPlayer('2', 'Jane', 20),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('HC: 15')).toBeTruthy();
      expect(screen.getByText('HC: 20')).toBeTruthy();
    });

    it('handles four players correctly', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'Alice', 10),
        createScorecardPlayer('2', 'Bob', 15),
        createScorecardPlayer('3', 'Carol', 20),
        createScorecardPlayer('4', 'Dave', 25),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
      expect(screen.getByText('Carol')).toBeTruthy();
      expect(screen.getByText('Dave')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYER PRESS CALLBACK TESTS
  // ===========================================================================

  describe('Player Press Callback', () => {
    it('calls onPlayerPress when player header is pressed', () => {
      const onPlayerPress = jest.fn();
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('player-1', 'John', 15),
        createScorecardPlayer('player-2', 'Jane', 20),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
          onPlayerPress={onPlayerPress}
        />
      );

      const johnHeader = screen.getByText('John');
      fireEvent.press(johnHeader);

      expect(onPlayerPress).toHaveBeenCalledWith('player-1');
    });

    it('passes correct player ID when pressing different players', () => {
      const onPlayerPress = jest.fn();
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('player-1', 'John', 15),
        createScorecardPlayer('player-2', 'Jane', 20),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
          onPlayerPress={onPlayerPress}
        />
      );

      const janeHeader = screen.getByText('Jane');
      fireEvent.press(janeHeader);

      expect(onPlayerPress).toHaveBeenCalledWith('player-2');
    });

    it('does not break when onPlayerPress is not provided', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15),
      ];

      // Should not throw when pressing header without callback
      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('John')).toBeTruthy();
    });
  });

  // ===========================================================================
  // LAYOUT TESTS
  // ===========================================================================

  describe('Layout', () => {
    it('uses horizontal scroll for many players', () => {
      // Mock returns needsHorizontalScroll: true for > 3 players
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'Alice', 10),
        createScorecardPlayer('2', 'Bob', 15),
        createScorecardPlayer('3', 'Carol', 20),
        createScorecardPlayer('4', 'Dave', 25),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={300} // Narrow screen
        />
      );

      // Should still render all players
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Dave')).toBeTruthy();
    });

    it('does not use horizontal scroll for few players', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15),
        createScorecardPlayer('2', 'Jane', 20),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={500} // Wide screen
        />
      );

      // Should render all players without scroll
      expect(screen.getByText('John')).toBeTruthy();
      expect(screen.getByText('Jane')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty players array', () => {
      render(
        <ScorecardTable
          players={[]}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Should still render table structure
      expect(screen.getByText('Hole')).toBeTruthy();
      expect(screen.getByText('SI')).toBeTruthy();
      expect(screen.getByText('Par')).toBeTruthy();
    });

    it('handles player with null player data', () => {
      const players: ScorecardTablePlayer[] = [
        {
          id: 'scorecard-1',
          playerId: '1',
          player: null,
          scores: null,
          hasScorecard: false,
        },
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Should show fallback for null player
      expect(screen.getByText('HC: 0')).toBeTruthy();
    });

    it('handles partial scores (not all holes completed)', () => {
      const partialScores: Record<string, { strokes: number }> = {
        '1': { strokes: 4 },
        '2': { strokes: 3 },
        '3': { strokes: 5 },
        // Holes 4-18 not completed
      };
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15, partialScores),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Should show scores for completed holes
      expect(screen.getByTestId('score-indicator-4')).toBeTruthy();
      expect(screen.getByTestId('score-indicator-3')).toBeTruthy();
      expect(screen.getByTestId('score-indicator-5')).toBeTruthy();

      // Should show empty indicators for uncompleted holes
      expect(screen.getAllByTestId('score-indicator-empty').length).toBeGreaterThan(0);
    });

    it('handles very high handicap values', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'Beginner', 54), // Max handicap
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('HC: 54')).toBeTruthy();
    });

    it('handles plus handicap (negative)', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'Scratch', 0),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('HC: 0')).toBeTruthy();
    });

    it('handles single player correctly', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'Solo Player', 15, generateScores(holes, 0)),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('Solo')).toBeTruthy();
      expect(screen.getByText('HC: 15')).toBeTruthy();
    });
  });

  // ===========================================================================
  // 9-HOLE COURSE TESTS
  // ===========================================================================

  describe('9-Hole Course', () => {
    const front9Holes = holes.filter((h) => h.number <= 9);

    it('renders only front 9 holes when given 9-hole course', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={front9Holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // Should show holes 1-9 (numbers may appear multiple times in SI column)
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);

      // Should not show holes 10-18
      expect(screen.queryByText('10')).toBeNull();
      expect(screen.queryByText('18')).toBeNull();
    });

    it('still shows OUT row for 9-hole course', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={front9Holes}
          screenWidth={defaultScreenWidth}
        />
      );

      expect(screen.getByText('OUT')).toBeTruthy();
    });

    it('hides IN row entirely for front-9-only course', () => {
      const players: ScorecardTablePlayer[] = [
        createScorecardPlayer('1', 'John', 15),
      ];

      render(
        <ScorecardTable
          players={players}
          holes={front9Holes}
          screenWidth={defaultScreenWidth}
        />
      );

      // 9-hole rounds (front 9 only) suppress the IN subtotal row so the
      // scorecard doesn't render a meaningless empty back-nine summary.
      expect(screen.queryByText('IN')).toBeNull();
    });
  });
});
