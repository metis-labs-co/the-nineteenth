/**
 * HoleHeader Component Tests
 *
 * Tests for the hole header component including:
 * - Basic rendering
 * - Navigation (previous/next hole)
 * - Super admin edit functionality
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { HoleHeader } from './HoleHeader';
import type { Hole } from '@/types';

// Mock tabler icons
jest.mock('@tabler/icons-react-native', () => ({
  IconChevronLeft: () => 'IconChevronLeft',
  IconChevronRight: () => 'IconChevronRight',
}));

// Mock settingsStore's useFormattedDistance
jest.mock('@/store/settingsStore', () => ({
  useFormattedDistance: () => ({
    formatDistance: (yards: number) => yards.toString(),
    unit: 'yards',
  }),
}));

// Sample test data
const createHole = (overrides: Partial<Hole> = {}): Hole => ({
  number: 5 as Hole['number'],
  par: 4,
  strokeIndex: 7,
  yardages: { white: 400, blue: 425 },
  ...overrides,
});

describe('HoleHeader', () => {
  const defaultProps = {
    hole: createHole(),
    selectedTee: 'white',
    onPrevious: jest.fn(),
    onNext: jest.fn(),
    canGoPrevious: true,
    canGoNext: true,
    onHolePress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // BASIC RENDERING TESTS
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('renders hole number', () => {
      render(<HoleHeader {...defaultProps} />);

      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders HOLE label', () => {
      render(<HoleHeader {...defaultProps} />);

      expect(screen.getByText('HOLE')).toBeTruthy();
    });

    it('displays par value in badge (no label)', () => {
      const hole = createHole({ par: 4 });
      render(<HoleHeader {...defaultProps} hole={hole} />);

      // Par value shown in badge
      expect(screen.getByText('4')).toBeTruthy();
      // No separate PAR label in new design
      expect(screen.queryByText('PAR')).toBeNull();
    });

    it('displays stroke index with inline SI prefix', () => {
      const hole = createHole({ strokeIndex: 7 });
      render(<HoleHeader {...defaultProps} hole={hole} />);

      // New format: "SI " prefix + value inline
      expect(screen.getByText('SI ')).toBeTruthy();
      expect(screen.getByText('7')).toBeTruthy();
    });

    it('displays yardage with inline unit suffix', () => {
      const hole = createHole({ yardages: { white: 400 } });
      render(<HoleHeader {...defaultProps} hole={hole} selectedTee="white" />);

      // New format: distance + unit inline (e.g., "400y")
      expect(screen.getByText('400y')).toBeTruthy();
    });

    it('does not show yardage when not available for selected tee', () => {
      const hole = createHole({ yardages: { blue: 425 } });
      render(<HoleHeader {...defaultProps} hole={hole} selectedTee="white" />);

      // Should not show 425 (that's blue tee)
      expect(screen.queryByText('425')).toBeNull();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('calls onPrevious when previous button is pressed', () => {
      const onPrevious = jest.fn();
      render(<HoleHeader {...defaultProps} onPrevious={onPrevious} />);

      const prevButton = screen.getByLabelText('Previous hole');
      fireEvent.press(prevButton);

      expect(onPrevious).toHaveBeenCalledTimes(1);
    });

    it('calls onNext when next button is pressed', () => {
      const onNext = jest.fn();
      render(<HoleHeader {...defaultProps} onNext={onNext} />);

      const nextButton = screen.getByLabelText('Next hole');
      fireEvent.press(nextButton);

      expect(onNext).toHaveBeenCalledTimes(1);
    });

    it('disables previous button when canGoPrevious is false', () => {
      const onPrevious = jest.fn();
      render(<HoleHeader {...defaultProps} onPrevious={onPrevious} canGoPrevious={false} />);

      const prevButton = screen.getByLabelText('Previous hole');
      expect(prevButton.props.accessibilityState.disabled).toBe(true);

      fireEvent.press(prevButton);
      expect(onPrevious).not.toHaveBeenCalled();
    });

    it('disables next button when canGoNext is false', () => {
      const onNext = jest.fn();
      render(<HoleHeader {...defaultProps} onNext={onNext} canGoNext={false} />);

      const nextButton = screen.getByLabelText('Next hole');
      expect(nextButton.props.accessibilityState.disabled).toBe(true);

      fireEvent.press(nextButton);
      expect(onNext).not.toHaveBeenCalled();
    });

    it('calls onHolePress when hole number section is pressed', () => {
      const onHolePress = jest.fn();
      render(<HoleHeader {...defaultProps} onHolePress={onHolePress} />);

      const holeSection = screen.getByLabelText(/Hole 5.*view full scorecard/);
      fireEvent.press(holeSection);

      expect(onHolePress).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // SUPER ADMIN TESTS
  // ===========================================================================

  describe('Super Admin Edit Functionality', () => {
    it('shows edit indicator (pencil icon) when isSuperAdmin is true', () => {
      const hole = createHole({ yardages: { white: 400 } });
      render(
        <HoleHeader
          {...defaultProps}
          hole={hole}
          isSuperAdmin={true}
          onEditHole={jest.fn()}
        />
      );

      // The edit button should be present with the accessible label
      const editButton = screen.getByLabelText('Edit hole 5 data');
      expect(editButton).toBeTruthy();
    });

    it('does not show edit indicator when isSuperAdmin is false', () => {
      const hole = createHole({ yardages: { white: 400 } });
      render(
        <HoleHeader
          {...defaultProps}
          hole={hole}
          isSuperAdmin={false}
          onEditHole={jest.fn()}
        />
      );

      // Edit button should not be present
      expect(screen.queryByLabelText('Edit hole 5 data')).toBeNull();
    });

    it('does not show edit indicator when onEditHole is not provided', () => {
      render(
        <HoleHeader
          {...defaultProps}
          isSuperAdmin={true}
          // onEditHole not provided
        />
      );

      // Edit button should not be present
      expect(screen.queryByLabelText(/Edit hole.*data/)).toBeNull();
    });

    it('calls onEditHole when super admin taps details section', () => {
      const onEditHole = jest.fn();
      render(
        <HoleHeader
          {...defaultProps}
          isSuperAdmin={true}
          onEditHole={onEditHole}
        />
      );

      const editButton = screen.getByLabelText('Edit hole 5 data');
      fireEvent.press(editButton);

      expect(onEditHole).toHaveBeenCalledTimes(1);
    });

    it('shows add button when super admin and no yardage', () => {
      const hole = createHole({ yardages: undefined });
      render(
        <HoleHeader
          {...defaultProps}
          hole={hole}
          isSuperAdmin={true}
          onEditHole={jest.fn()}
        />
      );

      // Edit button should still be present (tappable details section)
      const editButton = screen.getByLabelText('Edit hole 5 data');
      expect(editButton).toBeTruthy();
      // No yardage text should be shown
      expect(screen.queryByText(/\d+y/)).toBeNull();
    });

    it('does not show add button for non-super-admin when no yardage', () => {
      const hole = createHole({ yardages: undefined });
      render(
        <HoleHeader
          {...defaultProps}
          hole={hole}
          isSuperAdmin={false}
        />
      );

      // Edit button should not exist
      expect(screen.queryByLabelText('Edit hole 5 data')).toBeNull();
    });

    it('details section is not tappable for non-super-admin', () => {
      const onEditHole = jest.fn();
      render(
        <HoleHeader
          {...defaultProps}
          isSuperAdmin={false}
          onEditHole={onEditHole}
        />
      );

      // The edit button should not exist
      expect(screen.queryByLabelText('Edit hole 5 data')).toBeNull();

      // Even if we had an edit callback, it shouldn't be called for non-admin
      expect(onEditHole).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('previous button has accessible role and label', () => {
      render(<HoleHeader {...defaultProps} />);

      const prevButton = screen.getByRole('button', { name: 'Previous hole' });
      expect(prevButton).toBeTruthy();
    });

    it('next button has accessible role and label', () => {
      render(<HoleHeader {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: 'Next hole' });
      expect(nextButton).toBeTruthy();
    });

    it('hole section has accessible label', () => {
      render(<HoleHeader {...defaultProps} />);

      const holeSection = screen.getByLabelText(/Hole 5.*view full scorecard/);
      expect(holeSection).toBeTruthy();
    });

    it('super admin edit button has accessible label and hint', () => {
      render(
        <HoleHeader
          {...defaultProps}
          isSuperAdmin={true}
          onEditHole={jest.fn()}
        />
      );

      const editButton = screen.getByRole('button', { name: 'Edit hole 5 data' });
      expect(editButton).toBeTruthy();
      expect(editButton.props.accessibilityHint).toContain('par');
      expect(editButton.props.accessibilityHint).toContain('stroke index');
      expect(editButton.props.accessibilityHint).toContain('yardage');
    });
  });

  // ===========================================================================
  // DIFFERENT HOLE NUMBERS
  // ===========================================================================

  describe('Different Hole Numbers', () => {
    it('renders hole 1', () => {
      const hole = createHole({ number: 1 as Hole['number'] });
      render(<HoleHeader {...defaultProps} hole={hole} />);

      expect(screen.getByText('1')).toBeTruthy();
    });

    it('renders hole 18', () => {
      const hole = createHole({ number: 18 as Hole['number'] });
      render(<HoleHeader {...defaultProps} hole={hole} />);

      expect(screen.getByText('18')).toBeTruthy();
    });

    it('updates accessibility label for different holes', () => {
      const hole = createHole({ number: 12 as Hole['number'] });
      render(
        <HoleHeader
          {...defaultProps}
          hole={hole}
          isSuperAdmin={true}
          onEditHole={jest.fn()}
        />
      );

      expect(screen.getByLabelText('Edit hole 12 data')).toBeTruthy();
    });
  });
});
