/**
 * EditHoleBottomSheet Component Tests
 *
 * Tests for the super admin hole editing modal including:
 * - Rendering with pre-filled hole data
 * - Par selector functionality
 * - Stroke Index +/- buttons
 * - SI duplicate validation
 * - Yardage inputs
 * - Save button states
 * - Callbacks
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { EditHoleBottomSheet } from './index';
import type { Hole, TeeBox } from '@/types/database/base';

// Mock BottomSheet animation hooks
jest.mock('@/components/common/BottomSheet/hooks/useBottomSheetAnimation', () => ({
  useBottomSheetAnimation: () => ({
    translateY: { setValue: jest.fn(), interpolate: jest.fn(() => 0) },
    backdropOpacity: { interpolate: jest.fn(() => 0.5) },
    animateClose: jest.fn(),
    resetAnimation: jest.fn(),
  }),
}));

jest.mock('@/components/common/BottomSheet/hooks/useBottomSheetGestures', () => ({
  useBottomSheetGestures: () => ({
    panHandlers: {},
  }),
}));

// Mock settings store for distance unit preference
jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: jest.fn(() => ({ distanceUnit: 'yards' })),
  useFormattedDistance: () => ({
    formatDistance: (yards: number) => `${yards}y`,
    unit: 'yards',
    unitLabel: 'y',
  }),
  useStatsVisibility: () => ({
    showPutts: true,
    showFairwayHit: true,
    showGreenInRegulation: true,
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

// Create all holes with proper SI assignment
// Note: Hole 5 (our test hole) has SI 7 in this setup
const createAllHoles = (): Hole[] =>
  Array.from({ length: 18 }, (_, i) => {
    const holeNum = i + 1;
    // SI assignment: Hole 5 gets SI 7, others get their number as SI (except 7 gets 5)
    let si = holeNum;
    if (holeNum === 5) si = 7;
    else if (holeNum === 7) si = 5;
    return {
      number: holeNum as Hole['number'],
      par: [3, 4, 5][i % 3] as 3 | 4 | 5,
      strokeIndex: si,
      yardages: { white: 300 + i * 20, blue: 320 + i * 20 },
    };
  });

const createTees = (): TeeBox[] => [
  { name: 'White', color: 'white', totalYardage: 6200, courseRating: 72.0, slopeRating: 125 },
  { name: 'Blue', color: 'blue', totalYardage: 6500, courseRating: 73.5, slopeRating: 130 },
];

describe('EditHoleBottomSheet', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    hole: createHole(),
    allHoles: createAllHoles(),
    courseTees: createTees(),
    selectedTee: 'white',
    onSave: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders when visible is true', () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      expect(screen.getByTestId('edit-hole-bottom-sheet')).toBeTruthy();
    });

    it('does not render when visible is false', () => {
      render(<EditHoleBottomSheet {...defaultProps} visible={false} />);

      expect(screen.queryByTestId('edit-hole-bottom-sheet')).toBeNull();
    });

    it('displays correct hole number in title', () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      expect(screen.getByText('Edit Hole 5')).toBeTruthy();
    });

    it('renders with hole data pre-filled', () => {
      const hole = createHole({ par: 4, strokeIndex: 7 });
      render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      // Par 4 should be selected
      const par4Button = screen.getByLabelText('Par 4');
      expect(par4Button.props.accessibilityState.selected).toBe(true);

      // SI should show 7
      expect(screen.getByText('7')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PAR SELECTOR TESTS
  // ===========================================================================

  describe('Par Selector', () => {
    it('shows all par options (3, 4, 5)', () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      expect(screen.getByLabelText('Par 3')).toBeTruthy();
      expect(screen.getByLabelText('Par 4')).toBeTruthy();
      expect(screen.getByLabelText('Par 5')).toBeTruthy();
    });

    it('highlights the current par value', () => {
      const hole = createHole({ par: 5 });
      render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      const par5Button = screen.getByLabelText('Par 5');
      expect(par5Button.props.accessibilityState.selected).toBe(true);

      const par3Button = screen.getByLabelText('Par 3');
      expect(par3Button.props.accessibilityState.selected).toBe(false);
    });

    it('updates par when a different option is selected', () => {
      const hole = createHole({ par: 4 });
      render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      // Initially par 4 is selected
      expect(screen.getByLabelText('Par 4').props.accessibilityState.selected).toBe(true);

      // Tap par 3
      fireEvent.press(screen.getByLabelText('Par 3'));

      // Now par 3 should be selected
      expect(screen.getByLabelText('Par 3').props.accessibilityState.selected).toBe(true);
      expect(screen.getByLabelText('Par 4').props.accessibilityState.selected).toBe(false);
    });
  });

  // ===========================================================================
  // STROKE INDEX TESTS
  // ===========================================================================

  describe('Stroke Index', () => {
    it('displays current stroke index value', () => {
      const hole = createHole({ strokeIndex: 12 });
      render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      expect(screen.getByText('12')).toBeTruthy();
    });

    it('increments stroke index when + button is pressed', () => {
      const hole = createHole({ strokeIndex: 7 });
      render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      expect(screen.getByText('7')).toBeTruthy();

      fireEvent.press(screen.getByLabelText('Increase stroke index'));

      expect(screen.getByText('8')).toBeTruthy();
    });

    it('decrements stroke index when - button is pressed', () => {
      const hole = createHole({ strokeIndex: 7 });
      render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      expect(screen.getByText('7')).toBeTruthy();

      fireEvent.press(screen.getByLabelText('Decrease stroke index'));

      expect(screen.getByText('6')).toBeTruthy();
    });

    it('does not go below 1', () => {
      const hole = createHole({ strokeIndex: 1 });
      render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      expect(screen.getByText('1')).toBeTruthy();

      // Try to decrease below 1
      fireEvent.press(screen.getByLabelText('Decrease stroke index'));

      // Should still be 1
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('does not go above 18', () => {
      const hole = createHole({ strokeIndex: 18 });
      render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      expect(screen.getByText('18')).toBeTruthy();

      // Try to increase above 18
      fireEvent.press(screen.getByLabelText('Increase stroke index'));

      // Should still be 18
      expect(screen.getByText('18')).toBeTruthy();
    });

    it('shows error when stroke index is duplicate', async () => {
      // Hole 5 has SI 7, but we'll change it to SI 10 which is used by another hole
      const hole = createHole({ number: 5 as Hole['number'], strokeIndex: 7 });
      const allHoles = createAllHoles(); // SI 10 is used by hole 10

      render(<EditHoleBottomSheet {...defaultProps} hole={hole} allHoles={allHoles} />);

      // Increase SI from 7 to 10 (3 increments)
      fireEvent.press(screen.getByLabelText('Increase stroke index'));
      fireEvent.press(screen.getByLabelText('Increase stroke index'));
      fireEvent.press(screen.getByLabelText('Increase stroke index'));

      // Should show duplicate error
      await waitFor(() => {
        expect(screen.getByText(/SI 10.*Hole 10/)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // YARDAGE TESTS
  // ===========================================================================

  describe('Yardage Inputs', () => {
    it('shows yardage inputs for each tee', () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      expect(screen.getByLabelText('White tee distance in yards')).toBeTruthy();
      expect(screen.getByLabelText('Blue tee distance in yards')).toBeTruthy();
    });

    it('pre-fills yardage values from hole data', () => {
      const hole = createHole({ yardages: { white: 400, blue: 425 } });
      render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      const whiteInput = screen.getByLabelText('White tee distance in yards');
      const blueInput = screen.getByLabelText('Blue tee distance in yards');

      expect(whiteInput.props.value).toBe('400');
      expect(blueInput.props.value).toBe('425');
    });

    it('accepts numeric input for yardage', () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      const whiteInput = screen.getByLabelText('White tee distance in yards');
      fireEvent.changeText(whiteInput, '450');

      expect(whiteInput.props.value).toBe('450');
    });

    it('shows message when no tees are configured', () => {
      render(<EditHoleBottomSheet {...defaultProps} courseTees={[]} />);

      expect(screen.getByText(/No tees configured/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // SAVE BUTTON TESTS
  // ===========================================================================

  describe('Save Button', () => {
    it('is disabled when form has not been modified', () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      const saveButton = screen.getByLabelText('Save hole changes');
      expect(saveButton.props.accessibilityState.disabled).toBe(true);
    });

    it('is enabled when form has been modified and is valid', async () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      // Modify par
      fireEvent.press(screen.getByLabelText('Par 3'));

      await waitFor(() => {
        const saveButton = screen.getByLabelText('Save hole changes');
        expect(saveButton.props.accessibilityState.disabled).toBe(false);
      });
    });

    it('is disabled when validation fails (duplicate SI)', async () => {
      const hole = createHole({ number: 5 as Hole['number'], strokeIndex: 7 });
      const allHoles = createAllHoles();

      render(<EditHoleBottomSheet {...defaultProps} hole={hole} allHoles={allHoles} />);

      // Change SI to a duplicate value
      fireEvent.press(screen.getByLabelText('Increase stroke index'));
      fireEvent.press(screen.getByLabelText('Increase stroke index'));
      fireEvent.press(screen.getByLabelText('Increase stroke index')); // Now SI 10

      await waitFor(() => {
        const saveButton = screen.getByLabelText('Save hole changes');
        // Should be disabled due to validation error
        expect(saveButton.props.accessibilityState.disabled).toBe(true);
      });
    });

    it('shows loading indicator when loading is true', () => {
      render(<EditHoleBottomSheet {...defaultProps} loading={true} />);

      // Should not show "Save" text when loading
      expect(screen.queryByText('Save')).toBeNull();
    });

    it('calls onSave with updated hole data when pressed', async () => {
      const onSave = jest.fn();
      const hole = createHole({ par: 4, strokeIndex: 7 });

      render(<EditHoleBottomSheet {...defaultProps} hole={hole} onSave={onSave} />);

      // Modify par to 5
      fireEvent.press(screen.getByLabelText('Par 5'));

      // Press save
      const saveButton = screen.getByLabelText('Save hole changes');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            number: 5,
            par: 5,
            strokeIndex: 7,
          })
        );
      });
    });
  });

  // ===========================================================================
  // CLOSE BEHAVIOR TESTS
  // ===========================================================================

  describe('Close Behavior', () => {
    it('calls onClose when close button is pressed', () => {
      const onClose = jest.fn();
      render(<EditHoleBottomSheet {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText('Close');
      fireEvent.press(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('resets form when reopened', async () => {
      const hole = createHole({ par: 4 });
      const { rerender } = render(<EditHoleBottomSheet {...defaultProps} hole={hole} />);

      // Modify par
      fireEvent.press(screen.getByLabelText('Par 5'));
      expect(screen.getByLabelText('Par 5').props.accessibilityState.selected).toBe(true);

      // Close and reopen
      rerender(<EditHoleBottomSheet {...defaultProps} hole={hole} visible={false} />);
      rerender(<EditHoleBottomSheet {...defaultProps} hole={hole} visible={true} />);

      // Should reset to original par 4
      await waitFor(() => {
        expect(screen.getByLabelText('Par 4').props.accessibilityState.selected).toBe(true);
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible labels for par buttons', () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Par 3' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Par 4' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Par 5' })).toBeTruthy();
    });

    it('has accessible labels for SI buttons', () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Increase stroke index' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Decrease stroke index' })).toBeTruthy();
    });

    it('save button has accessible state', () => {
      render(<EditHoleBottomSheet {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: 'Save hole changes' });
      expect(saveButton).toBeTruthy();
      expect(saveButton.props.accessibilityState.disabled).toBeDefined();
    });
  });
});
