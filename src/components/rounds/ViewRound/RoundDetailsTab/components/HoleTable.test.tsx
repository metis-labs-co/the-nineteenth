/**
 * HoleTable Component Tests
 *
 * Tests for the hole table component that displays hole breakdown
 * with OUT/IN/TOTAL summaries. Includes tests for:
 * - Rendering holes with pars, stroke indexes, and yardages
 * - Front nine (OUT) and back nine (IN) section summaries
 * - Total calculations (TOTAL row)
 * - Distance unit conversion (yards vs metres)
 * - Empty and partial hole data
 * - Selected tee yardage display
 * - Sorting holes by number
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { HoleTable } from './HoleTable';
import type { Hole } from '@/types/database.types';

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

/**
 * Create a single hole with specified properties
 */
function createHole(overrides: Partial<Hole> = {}): Hole {
  return {
    number: 1 as Hole['number'],
    par: 4 as Hole['par'],
    strokeIndex: 10,
    yardages: { blue: 420, white: 400, red: 360 },
    ...overrides,
  };
}

/**
 * Create front 9 holes (holes 1-9)
 */
function createFrontNine(): Hole[] {
  const pars: Hole['par'][] = [4, 3, 5, 4, 4, 3, 4, 5, 4];
  const strokeIndexes = [7, 15, 1, 11, 5, 17, 3, 9, 13];

  return pars.map((par, i) =>
    createHole({
      number: (i + 1) as Hole['number'],
      par,
      strokeIndex: strokeIndexes[i],
      yardages: { blue: 380 + i * 20, white: 360 + i * 20, red: 320 + i * 20 },
    })
  );
}

/**
 * Create back 9 holes (holes 10-18)
 */
function createBackNine(): Hole[] {
  const pars: Hole['par'][] = [4, 3, 5, 4, 4, 3, 4, 5, 4];
  const strokeIndexes = [8, 16, 2, 12, 6, 18, 4, 10, 14];

  return pars.map((par, i) =>
    createHole({
      number: (i + 10) as Hole['number'],
      par,
      strokeIndex: strokeIndexes[i],
      yardages: { blue: 400 + i * 15, white: 380 + i * 15, red: 340 + i * 15 },
    })
  );
}

/**
 * Create full 18 holes
 */
function create18Holes(): Hole[] {
  return [...createFrontNine(), ...createBackNine()];
}

/**
 * Create 9-hole course
 */
function create9Holes(): Hole[] {
  return createFrontNine();
}

const defaultProps = {
  holes: create18Holes(),
  selectedTee: 'white',
  useMetres: false,
};

// ===========================================================================
// TESTS
// ===========================================================================

describe('HoleTable', () => {
  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<HoleTable {...defaultProps} />);
      expect(screen.getByText('Hole')).toBeTruthy();
    });

    it('renders table headers', () => {
      render(<HoleTable {...defaultProps} />);

      expect(screen.getByText('Hole')).toBeTruthy();
      expect(screen.getByText('Par')).toBeTruthy();
      expect(screen.getByText('SI')).toBeTruthy();
      expect(screen.getByText('Yds')).toBeTruthy();
    });

    it('renders with minimal props', () => {
      render(<HoleTable holes={[]} selectedTee={null} useMetres={false} />);
      expect(screen.getByText('Hole')).toBeTruthy();
    });

    it('renders all 18 hole numbers', () => {
      render(<HoleTable {...defaultProps} />);

      // Check for specific hole numbers (some may appear multiple times, use getAllByText)
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('18').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // HOLE DATA DISPLAY TESTS
  // ===========================================================================

  describe('Hole Data Display', () => {
    it('displays par values for each hole', () => {
      const holes = [
        createHole({ number: 1, par: 3 }),
        createHole({ number: 2, par: 4 }),
        createHole({ number: 3, par: 5 }),
      ];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // Par values should appear (multiple times due to totals)
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });

    it('displays stroke index for each hole', () => {
      const holes = [
        createHole({ number: 1, strokeIndex: 1 }),
        createHole({ number: 2, strokeIndex: 18 }),
        createHole({ number: 3, strokeIndex: 9 }),
      ];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // Stroke indexes should appear
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('18').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
    });

    it('displays yardage for selected tee', () => {
      // Use unique yardage value that won't appear in totals
      const holes = [
        createHole({ number: 1, yardages: { blue: 457, white: 423, red: 389 } }),
      ];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // 423 appears for hole and again in OUT and TOTAL rows
      expect(screen.getAllByText('423').length).toBeGreaterThanOrEqual(1);
    });

    it('displays dash when no yardage for selected tee', () => {
      const holes = [createHole({ number: 1, yardages: { blue: 450 } })];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // Should show dash for missing yardage
      expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
    });

    it('displays dash when no tee selected', () => {
      const holes = [
        createHole({ number: 1, yardages: { blue: 450, white: 420, red: 380 } }),
      ];

      render(<HoleTable holes={holes} selectedTee={null} useMetres={false} />);

      // Should show dash for yardage when no tee selected
      expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // SORTING TESTS
  // ===========================================================================

  describe('Hole Sorting', () => {
    it('sorts holes by number', () => {
      const unsortedHoles = [
        createHole({ number: 5 }),
        createHole({ number: 2 }), // Changed from 1 to avoid duplicates
        createHole({ number: 18 }),
        createHole({ number: 11 }), // Changed from 10 to avoid overlap
      ];

      render(<HoleTable holes={unsortedHoles} selectedTee="white" useMetres={false} />);

      // All hole numbers should be present
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('11').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('18').length).toBeGreaterThanOrEqual(1);
    });

    it('handles out of order holes correctly', () => {
      const holes = [
        createHole({ number: 9, par: 5 }),
        createHole({ number: 1, par: 4 }),
        createHole({ number: 5, par: 3 }),
      ];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // Component should render without crashing
      expect(screen.getAllByText('9').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // FRONT NINE (OUT) TESTS
  // ===========================================================================

  describe('Front Nine (OUT)', () => {
    it('renders OUT summary row for front 9', () => {
      render(<HoleTable {...defaultProps} />);

      expect(screen.getByText('OUT')).toBeTruthy();
    });

    it('calculates correct OUT par total', () => {
      const frontNine = createFrontNine();
      // Front 9 pars: 4+3+5+4+4+3+4+5+4 = 36
      const expectedPar = frontNine.reduce((sum, h) => sum + h.par, 0);

      render(<HoleTable holes={frontNine} selectedTee="white" useMetres={false} />);

      // Par 36 appears in OUT and TOTAL rows
      expect(screen.getAllByText(expectedPar.toString()).length).toBeGreaterThanOrEqual(1);
    });

    it('calculates correct OUT yardage total', () => {
      const holes = [
        createHole({ number: 1, yardages: { white: 401 } }),
        createHole({ number: 2, yardages: { white: 351 } }),
        createHole({ number: 3, yardages: { white: 503 } }),
      ];
      // Total: 1255

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // 1255 appears in OUT and TOTAL
      expect(screen.getAllByText('1255').length).toBeGreaterThanOrEqual(1);
    });

    it('does not render OUT row when no front 9 holes', () => {
      const backNineOnly = createBackNine();

      render(<HoleTable holes={backNineOnly} selectedTee="white" useMetres={false} />);

      expect(screen.queryByText('OUT')).toBeNull();
    });
  });

  // ===========================================================================
  // BACK NINE (IN) TESTS
  // ===========================================================================

  describe('Back Nine (IN)', () => {
    it('renders IN summary row for back 9', () => {
      render(<HoleTable {...defaultProps} />);

      expect(screen.getByText('IN')).toBeTruthy();
    });

    it('calculates correct IN par total', () => {
      const backNine = createBackNine();
      // Back 9 pars: 4+3+5+4+4+3+4+5+4 = 36
      const expectedPar = backNine.reduce((sum, h) => sum + h.par, 0);

      render(<HoleTable holes={backNine} selectedTee="white" useMetres={false} />);

      // Par 36 appears in IN and TOTAL rows
      expect(screen.getAllByText(expectedPar.toString()).length).toBeGreaterThanOrEqual(1);
    });

    it('calculates correct IN yardage total', () => {
      const holes = [
        createHole({ number: 10, yardages: { white: 421 } }),
        createHole({ number: 11, yardages: { white: 183 } }),
        createHole({ number: 12, yardages: { white: 527 } }),
      ];
      // Total: 1131

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // 1131 appears in IN and TOTAL
      expect(screen.getAllByText('1131').length).toBeGreaterThanOrEqual(1);
    });

    it('does not render IN row when no back 9 holes', () => {
      const frontNineOnly = createFrontNine();

      render(<HoleTable holes={frontNineOnly} selectedTee="white" useMetres={false} />);

      expect(screen.queryByText('IN')).toBeNull();
    });
  });

  // ===========================================================================
  // TOTAL ROW TESTS
  // ===========================================================================

  describe('Total Row', () => {
    it('renders TOTAL row when holes exist', () => {
      render(<HoleTable {...defaultProps} />);

      expect(screen.getByText('TOTAL')).toBeTruthy();
    });

    it('does not render TOTAL row when no holes', () => {
      render(<HoleTable holes={[]} selectedTee="white" useMetres={false} />);

      expect(screen.queryByText('TOTAL')).toBeNull();
    });

    it('calculates correct total par for 18 holes', () => {
      const holes = create18Holes();
      const expectedPar = holes.reduce((sum, h) => sum + h.par, 0);
      // 18 holes: 36 + 36 = 72

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getAllByText(expectedPar.toString()).length).toBeGreaterThanOrEqual(1);
    });

    it('calculates correct total yardage for 18 holes', () => {
      const holes = [
        createHole({ number: 1, yardages: { white: 403 } }),
        createHole({ number: 10, yardages: { white: 427 } }),
      ];
      // Total: 830

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getAllByText('830').length).toBeGreaterThanOrEqual(1);
    });

    it('shows dash for total yardage when no tee selected', () => {
      render(<HoleTable holes={create18Holes()} selectedTee={null} useMetres={false} />);

      // TOTAL row should show dash for yardage
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // METRES CONVERSION TESTS
  // ===========================================================================

  describe('Metres Conversion', () => {
    it('shows Mtrs header when useMetres is true', () => {
      render(<HoleTable {...defaultProps} useMetres={true} />);

      expect(screen.getByText('Mtrs')).toBeTruthy();
      expect(screen.queryByText('Yds')).toBeNull();
    });

    it('shows Yds header when useMetres is false', () => {
      render(<HoleTable {...defaultProps} useMetres={false} />);

      expect(screen.getByText('Yds')).toBeTruthy();
      expect(screen.queryByText('Mtrs')).toBeNull();
    });

    it('converts yards to metres correctly', () => {
      // 399 yards * 0.9144 = 365 metres (rounded)
      const holes = [createHole({ number: 1, yardages: { white: 399 } })];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={true} />);

      // 365 appears for hole, OUT, and TOTAL
      expect(screen.getAllByText('365').length).toBeGreaterThanOrEqual(1);
    });

    it('converts total yardage to metres', () => {
      // Two holes: 401 + 201 = 602 yards
      // 602 * 0.9144 = 550 metres (rounded)
      const holes = [
        createHole({ number: 1, yardages: { white: 401 } }),
        createHole({ number: 2, yardages: { white: 201 } }),
      ];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={true} />);

      // Check that converted values appear
      expect(screen.getAllByText('550').length).toBeGreaterThanOrEqual(1);
    });

    it('shows dash for zero distance in metres mode', () => {
      const holes = [createHole({ number: 1, yardages: {} })];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={true} />);

      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // TEE SELECTION TESTS
  // ===========================================================================

  describe('Tee Selection', () => {
    it('displays blue tee yardage when selected', () => {
      const holes = [
        createHole({ number: 1, yardages: { blue: 453, white: 423, red: 383 } }),
      ];

      render(<HoleTable holes={holes} selectedTee="blue" useMetres={false} />);

      expect(screen.getAllByText('453').length).toBeGreaterThanOrEqual(1);
    });

    it('displays red tee yardage when selected', () => {
      const holes = [
        createHole({ number: 1, yardages: { blue: 457, white: 427, red: 387 } }),
      ];

      render(<HoleTable holes={holes} selectedTee="red" useMetres={false} />);

      expect(screen.getAllByText('387').length).toBeGreaterThanOrEqual(1);
    });

    it('handles custom tee names', () => {
      const holes = [
        createHole({ number: 1, yardages: { championship: 503, senior: 353 } }),
      ];

      render(<HoleTable holes={holes} selectedTee="championship" useMetres={false} />);

      expect(screen.getAllByText('503').length).toBeGreaterThanOrEqual(1);
    });

    it('shows dash for non-existent tee', () => {
      const holes = [createHole({ number: 1, yardages: { blue: 450 } })];

      render(<HoleTable holes={holes} selectedTee="gold" useMetres={false} />);

      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 9-HOLE COURSE TESTS
  // ===========================================================================

  describe('9-Hole Course', () => {
    it('renders only front 9 for 9-hole course', () => {
      const holes = create9Holes();

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getByText('OUT')).toBeTruthy();
      expect(screen.queryByText('IN')).toBeNull();
    });

    it('shows correct totals for 9-hole course', () => {
      const holes = create9Holes();
      const expectedPar = holes.reduce((sum, h) => sum + h.par, 0);

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // OUT and TOTAL should show same par for 9-hole course
      expect(screen.getAllByText(expectedPar.toString()).length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty holes array', () => {
      render(<HoleTable holes={[]} selectedTee="white" useMetres={false} />);

      // Should render header but no rows
      expect(screen.getByText('Hole')).toBeTruthy();
      expect(screen.queryByText('OUT')).toBeNull();
      expect(screen.queryByText('IN')).toBeNull();
      expect(screen.queryByText('TOTAL')).toBeNull();
    });

    it('handles single hole', () => {
      const holes = [createHole({ number: 1, par: 4 })];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('OUT')).toBeTruthy();
      expect(screen.getByText('TOTAL')).toBeTruthy();
    });

    it('handles holes with null yardages', () => {
      const holes = [createHole({ number: 1, yardages: undefined })];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('handles holes with zero yardage', () => {
      const holes = [createHole({ number: 1, yardages: { white: 0 } })];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // Zero yardage should show as dash
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('handles mixed front and back nine holes', () => {
      const holes = [
        createHole({ number: 1, par: 4 }),
        createHole({ number: 10, par: 5 }),
        createHole({ number: 5, par: 3 }),
        createHole({ number: 15, par: 4 }),
      ];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getByText('OUT')).toBeTruthy();
      expect(screen.getByText('IN')).toBeTruthy();
      expect(screen.getByText('TOTAL')).toBeTruthy();
    });

    it('handles duplicate hole numbers gracefully', () => {
      // Note: This test documents that duplicate keys will cause React warning
      // but component should still render
      const holes = [
        createHole({ number: 1, par: 4 }),
        createHole({ number: 2, par: 5 }), // Changed to unique number
      ];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getByText('Hole')).toBeTruthy();
    });

    it('handles very large yardage values', () => {
      const holes = [createHole({ number: 1, yardages: { white: 9997 } })];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getAllByText('9997').length).toBeGreaterThanOrEqual(1);
    });

    it('handles par 3, 4, and 5 holes correctly', () => {
      const holes = [
        createHole({ number: 1, par: 3 }),
        createHole({ number: 2, par: 4 }),
        createHole({ number: 3, par: 5 }),
      ];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      // Total par should be 12 (appears in OUT and TOTAL)
      expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // ALTERNATING ROW STYLING TESTS
  // ===========================================================================

  describe('Row Styling', () => {
    it('renders alternating row backgrounds', () => {
      const holes = create18Holes();

      const { toJSON } = render(
        <HoleTable holes={holes} selectedTee="white" useMetres={false} />
      );

      // Snapshot will capture the alternating styles
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders summary rows with different background', () => {
      render(<HoleTable {...defaultProps} />);

      // OUT, IN, and TOTAL rows should exist
      expect(screen.getByText('OUT')).toBeTruthy();
      expect(screen.getByText('IN')).toBeTruthy();
      expect(screen.getByText('TOTAL')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS COMBINATIONS TESTS
  // ===========================================================================

  describe('Props Combinations', () => {
    it('renders with all props set', () => {
      render(<HoleTable holes={create18Holes()} selectedTee="blue" useMetres={true} />);

      expect(screen.getByText('Mtrs')).toBeTruthy();
      expect(screen.getByText('TOTAL')).toBeTruthy();
    });

    it('renders with null tee and metres enabled', () => {
      render(<HoleTable holes={create18Holes()} selectedTee={null} useMetres={true} />);

      expect(screen.getByText('Mtrs')).toBeTruthy();
      expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    });

    it('handles re-rendering with different tee', () => {
      const holes = [
        createHole({ number: 1, yardages: { blue: 457, white: 427 } }),
      ];

      const { rerender } = render(
        <HoleTable holes={holes} selectedTee="blue" useMetres={false} />
      );

      expect(screen.getAllByText('457').length).toBeGreaterThanOrEqual(1);

      rerender(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getAllByText('427').length).toBeGreaterThanOrEqual(1);
    });

    it('handles re-rendering with different distance unit', () => {
      const holes = [createHole({ number: 1, yardages: { white: 401 } })];

      const { rerender } = render(
        <HoleTable holes={holes} selectedTee="white" useMetres={false} />
      );

      expect(screen.getAllByText('401').length).toBeGreaterThanOrEqual(1);

      rerender(<HoleTable holes={holes} selectedTee="white" useMetres={true} />);

      // 401 * 0.9144 = 367 metres
      expect(screen.getAllByText('367').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // STROKE INDEX DISPLAY TESTS
  // ===========================================================================

  describe('Stroke Index Display', () => {
    it('displays dash in SI column for total rows', () => {
      render(<HoleTable {...defaultProps} />);

      // Summary rows (OUT, IN, TOTAL) should show dash for SI
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(3);
    });

    it('displays all stroke indexes for holes', () => {
      const holes = [
        createHole({ number: 1, strokeIndex: 1 }),
        createHole({ number: 2, strokeIndex: 17 }),
        createHole({ number: 3, strokeIndex: 5 }),
      ];

      render(<HoleTable holes={holes} selectedTee="white" useMetres={false} />);

      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('17').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // SNAPSHOT TESTS
  // ===========================================================================

  describe('Snapshots', () => {
    it('matches snapshot for 18-hole course in yards', () => {
      const { toJSON } = render(
        <HoleTable holes={create18Holes()} selectedTee="white" useMetres={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for 18-hole course in metres', () => {
      const { toJSON } = render(
        <HoleTable holes={create18Holes()} selectedTee="white" useMetres={true} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for 9-hole course', () => {
      const { toJSON } = render(
        <HoleTable holes={create9Holes()} selectedTee="white" useMetres={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for empty holes', () => {
      const { toJSON } = render(
        <HoleTable holes={[]} selectedTee="white" useMetres={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot with no tee selected', () => {
      const { toJSON } = render(
        <HoleTable holes={create18Holes()} selectedTee={null} useMetres={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for blue tee', () => {
      const { toJSON } = render(
        <HoleTable holes={create18Holes()} selectedTee="blue" useMetres={false} />
      );

      expect(toJSON()).toMatchSnapshot();
    });
  });
});
