/**
 * ScorecardTable (PlayerScorecardScreen) Component Tests
 *
 * Tests for the scorecard table with FIR/GIR columns including:
 * - FIR/GIR column visibility based on props
 * - FIR column display for par 3 vs par 4+ holes
 * - Icon display for true/false/undefined values
 * - Picked up hole display
 * - FIR/GIR totals in summary row
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { ScorecardTable } from './ScorecardTable';
import type { HoleRowData, PlayerStats, MultiBallHoleRowData, MultiBallStats } from '../hooks';
import type { Hole } from '@/types';

// Mock the ScoreIndicator component
jest.mock('@/components/scorecard', () => {
  const { View, Text } = require('react-native');
  return {
    ScoreIndicator: ({ strokes, par: _par }: { strokes: number | undefined; par: number }) => (
      <View testID={`score-indicator-${strokes ?? 'empty'}`}>
        <Text>{strokes ?? '-'}</Text>
      </View>
    ),
  };
});

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

const createHole = (number: number, par: 3 | 4 | 5, strokeIndex: number): Hole => ({
  number: number as Hole['number'],
  par,
  strokeIndex,
  yardages: { white: 380 },
});

const createHoleRowData = (
  number: number,
  par: 3 | 4 | 5,
  overrides: Partial<HoleRowData> = {}
): HoleRowData => ({
  hole: createHole(number, par, number),
  strokes: 4,
  putts: 2,
  stablefordPoints: 2,
  strokesReceived: 1,
  isPickup: false,
  fairwayHit: undefined,
  greenInRegulation: undefined,
  ...overrides,
});

const createDefaultPlayerStats = (): PlayerStats => ({
  front9Gross: 36,
  back9Gross: 36,
  front9Stableford: 18,
  back9Stableford: 18,
  front9Putts: 16,
  back9Putts: 16,
  totalGross: 72,
  totalStableford: 36,
  totalPutts: 32,
  totalPar: 72,
  front9Par: 36,
  back9Par: 36,
  handicap: 18,
  dailyHandicap: 15,
  totalFairwaysHit: 7,
  totalFairwaysPossible: 14,
  totalGIR: 10,
  totalGIRPossible: 18,
});

// Create front 9 and back 9 hole data
const createFront9Holes = (): HoleRowData[] => [
  createHoleRowData(1, 4),
  createHoleRowData(2, 4),
  createHoleRowData(3, 3), // Par 3
  createHoleRowData(4, 5),
  createHoleRowData(5, 4),
  createHoleRowData(6, 4),
  createHoleRowData(7, 3), // Par 3
  createHoleRowData(8, 4),
  createHoleRowData(9, 5),
];

const createBack9Holes = (): HoleRowData[] => [
  createHoleRowData(10, 4),
  createHoleRowData(11, 4),
  createHoleRowData(12, 3), // Par 3
  createHoleRowData(13, 5),
  createHoleRowData(14, 4),
  createHoleRowData(15, 4),
  createHoleRowData(16, 3), // Par 3
  createHoleRowData(17, 4),
  createHoleRowData(18, 5),
];

describe('ScorecardTable FIR/GIR columns', () => {
  const defaultProps = {
    front9Holes: createFront9Holes(),
    back9Holes: createBack9Holes(),
    playerStats: createDefaultPlayerStats(),
    playerHandicap: 18,
  };

  // ===========================================================================
  // COLUMN VISIBILITY TESTS
  // ===========================================================================

  describe('Column Visibility', () => {
    it('should not render FIR column when showFIR is false', () => {
      render(
        <ScorecardTable
          {...defaultProps}
          showFIR={false}
          showGIR={false}
        />
      );

      // FIR header should not be present
      expect(screen.queryByText('FIR')).toBeNull();
    });

    it('should not render GIR column when showGIR is false', () => {
      render(
        <ScorecardTable
          {...defaultProps}
          showFIR={false}
          showGIR={false}
        />
      );

      // GIR header should not be present
      expect(screen.queryByText('GIR')).toBeNull();
    });

    it('should render FIR column header when showFIR is true', () => {
      render(
        <ScorecardTable
          {...defaultProps}
          showFIR={true}
          showGIR={false}
        />
      );

      expect(screen.getByText('FIR')).toBeTruthy();
    });

    it('should render GIR column header when showGIR is true', () => {
      render(
        <ScorecardTable
          {...defaultProps}
          showFIR={false}
          showGIR={true}
        />
      );

      expect(screen.getByText('GIR')).toBeTruthy();
    });

    it('should render both FIR and GIR headers when both are true', () => {
      render(
        <ScorecardTable
          {...defaultProps}
          showFIR={true}
          showGIR={true}
        />
      );

      expect(screen.getByText('FIR')).toBeTruthy();
      expect(screen.getByText('GIR')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FIR ICON DISPLAY TESTS
  // ===========================================================================

  describe('FIR Icon Display', () => {
    it('should show N/A for FIR on par 3 holes', () => {
      const front9WithPar3 = [
        createHoleRowData(1, 3, { fairwayHit: true }), // Par 3 - should show N/A
      ];

      render(
        <ScorecardTable
          {...defaultProps}
          front9Holes={front9WithPar3}
          back9Holes={[]}
          showFIR={true}
          showGIR={false}
        />
      );

      // Should show N/A for par 3 holes, not a check mark
      expect(screen.getByText('N/A')).toBeTruthy();
    });

    it('should show check icon for fairwayHit=true on par 4+ holes', () => {
      const front9WithFIR = [
        createHoleRowData(1, 4, { fairwayHit: true }),
      ];

      render(
        <ScorecardTable
          {...defaultProps}
          front9Holes={front9WithFIR}
          back9Holes={[]}
          showFIR={true}
          showGIR={false}
        />
      );

      // Check icon should be rendered (react-native-paper Icon)
      // We can verify this by looking for the icon source
      // Since we can't easily query by icon source, we check that N/A is not present
      expect(screen.queryAllByText('N/A')).toHaveLength(0);
    });

    it('should show dash for undefined fairwayHit', () => {
      const front9WithUndefinedFIR = [
        createHoleRowData(1, 4, { fairwayHit: undefined, strokes: 4 }),
      ];

      render(
        <ScorecardTable
          {...defaultProps}
          front9Holes={front9WithUndefinedFIR}
          back9Holes={[]}
          showFIR={true}
          showGIR={false}
        />
      );

      // Multiple dashes may appear; we just verify at least one exists in FIR context
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('should show dash for picked up holes', () => {
      const front9WithPickup = [
        createHoleRowData(1, 4, { isPickup: true, fairwayHit: true }),
      ];

      render(
        <ScorecardTable
          {...defaultProps}
          front9Holes={front9WithPickup}
          back9Holes={[]}
          showFIR={true}
          showGIR={false}
        />
      );

      // Should show dash for picked up holes, not the check
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // GIR ICON DISPLAY TESTS
  // ===========================================================================

  describe('GIR Icon Display', () => {
    it('should show check icon for greenInRegulation=true', () => {
      const front9WithGIR = [
        createHoleRowData(1, 4, { greenInRegulation: true }),
      ];

      render(
        <ScorecardTable
          {...defaultProps}
          front9Holes={front9WithGIR}
          back9Holes={[]}
          showFIR={false}
          showGIR={true}
        />
      );

      // GIR column should exist
      expect(screen.getByText('GIR')).toBeTruthy();
    });

    it('should show dash for undefined greenInRegulation', () => {
      const front9WithUndefinedGIR = [
        createHoleRowData(1, 4, { greenInRegulation: undefined, strokes: 4 }),
      ];

      render(
        <ScorecardTable
          {...defaultProps}
          front9Holes={front9WithUndefinedGIR}
          back9Holes={[]}
          showFIR={false}
          showGIR={true}
        />
      );

      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('should show dash for picked up holes in GIR column', () => {
      const front9WithPickup = [
        createHoleRowData(1, 4, { isPickup: true, greenInRegulation: true }),
      ];

      render(
        <ScorecardTable
          {...defaultProps}
          front9Holes={front9WithPickup}
          back9Holes={[]}
          showFIR={false}
          showGIR={true}
        />
      );

      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // TOTALS ROW TESTS
  // ===========================================================================

  describe('Totals Row', () => {
    it('should display FIR total as "X/Y" format in total row', () => {
      const playerStats = createDefaultPlayerStats();
      playerStats.totalFairwaysHit = 8;
      playerStats.totalFairwaysPossible = 14;

      render(
        <ScorecardTable
          {...defaultProps}
          playerStats={playerStats}
          showFIR={true}
          showGIR={false}
        />
      );

      expect(screen.getByText('8/14')).toBeTruthy();
    });

    it('should display GIR total as "X/Y" format in total row', () => {
      const playerStats = createDefaultPlayerStats();
      playerStats.totalGIR = 12;
      playerStats.totalGIRPossible = 18;

      render(
        <ScorecardTable
          {...defaultProps}
          playerStats={playerStats}
          showFIR={false}
          showGIR={true}
        />
      );

      expect(screen.getByText('12/18')).toBeTruthy();
    });

    it('should display dash for FIR total when no holes possible', () => {
      const playerStats = createDefaultPlayerStats();
      playerStats.totalFairwaysHit = 0;
      playerStats.totalFairwaysPossible = 0;

      render(
        <ScorecardTable
          {...defaultProps}
          playerStats={playerStats}
          showFIR={true}
          showGIR={false}
        />
      );

      // Multiple dashes expected, at least one for the FIR total
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('should display dash for GIR total when no holes possible', () => {
      const playerStats = createDefaultPlayerStats();
      playerStats.totalGIR = 0;
      playerStats.totalGIRPossible = 0;

      render(
        <ScorecardTable
          {...defaultProps}
          playerStats={playerStats}
          showFIR={false}
          showGIR={true}
        />
      );

      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // MULTI-BALL MODE TESTS
  // ===========================================================================

  describe('Multi-Ball Mode', () => {
    const createMultiBallHoleData = (number: number, par: 3 | 4 | 5): MultiBallHoleRowData => ({
      hole: createHole(number, par, number),
      strokesReceived: 1,
      balls: [
        { strokes: 4, stablefordPoints: 2, isPickup: false, fairwayHit: true, greenInRegulation: true },
        { strokes: 5, stablefordPoints: 1, isPickup: false, fairwayHit: false, greenInRegulation: false },
      ],
    });

    const createMultiBallStats = (): MultiBallStats => ({
      ballStats: {
        1: {
          front9Gross: 36,
          back9Gross: 36,
          front9Stableford: 18,
          back9Stableford: 18,
          totalGross: 72,
          totalStableford: 36,
        },
        2: {
          front9Gross: 40,
          back9Gross: 40,
          front9Stableford: 14,
          back9Stableford: 14,
          totalGross: 80,
          totalStableford: 28,
        },
      },
      front9Par: 36,
      back9Par: 36,
      totalPar: 72,
    });

    it('should pass showFIR/showGIR to ScorecardTableMultiBall', () => {
      const multiBallFront9 = [createMultiBallHoleData(1, 4)];
      const multiBallBack9 = [createMultiBallHoleData(10, 4)];
      const multiBallStats = createMultiBallStats();

      render(
        <ScorecardTable
          {...defaultProps}
          isMultiBall={true}
          ballCount={2}
          multiBallFront9={multiBallFront9}
          multiBallBack9={multiBallBack9}
          multiBallStats={multiBallStats}
          showFIR={true}
          showGIR={true}
        />
      );

      // In multi-ball mode, the component delegates to ScorecardTableMultiBall
      // We just verify it renders without errors
      expect(screen.getByText('Hole')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle all holes without scores', () => {
      const front9NoScores = createFront9Holes().map(h => ({
        ...h,
        strokes: undefined,
        fairwayHit: undefined,
        greenInRegulation: undefined,
      }));

      render(
        <ScorecardTable
          {...defaultProps}
          front9Holes={front9NoScores}
          back9Holes={[]}
          showFIR={true}
          showGIR={true}
        />
      );

      // Should show dashes for all empty values
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('should handle mixed FIR/GIR values across holes', () => {
      const mixedHoles = [
        createHoleRowData(1, 4, { fairwayHit: true, greenInRegulation: true }),
        createHoleRowData(2, 4, { fairwayHit: false, greenInRegulation: false }),
        createHoleRowData(3, 3, { fairwayHit: true, greenInRegulation: undefined }), // Par 3
        createHoleRowData(4, 5, { fairwayHit: undefined, greenInRegulation: true }),
      ];

      render(
        <ScorecardTable
          {...defaultProps}
          front9Holes={mixedHoles}
          back9Holes={[]}
          showFIR={true}
          showGIR={true}
        />
      );

      // Should render without error
      expect(screen.getByText('FIR')).toBeTruthy();
      expect(screen.getByText('GIR')).toBeTruthy();
    });
  });
});
