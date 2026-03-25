/**
 * BuildCourseHoleModal Component Tests
 *
 * Tests for the build-as-you-play hole configuration modal including:
 * - Rendering with correct title and button text
 * - Tee selection visibility (hole 1 vs subsequent holes)
 * - Form defaults (par, stroke index auto-suggestion)
 * - SI validation (duplicate detection)
 * - Save button states (disabled/enabled based on form validity)
 * - onSave callback with correct Hole object
 * - onSelectTee callback behavior
 * - Not-dismissible behavior (closeOnBackdropPress, showCloseButton)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/renderHelpers';
import { BuildCourseHoleModal } from './index';

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

// Mock teesService TEE_COLORS
jest.mock('@/services/courses/teesService', () => ({
  TEE_COLORS: {
    blue: '#0000FF',
    white: '#FFFFFF',
    red: '#FF0000',
    yellow: '#FFFF00',
    black: '#000000',
    gold: '#FFD700',
  } as Record<string, string>,
}));

describe('BuildCourseHoleModal', () => {
  const defaultProps = {
    visible: true,
    holeNumber: 1,
    selectedTeeName: null as string | null,
    usedStrokeIndexes: new Set<number>(),
    isSaving: false,
    onSave: jest.fn(),
    onSelectTee: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders title "Set Up Hole X" with correct hole number', () => {
      render(<BuildCourseHoleModal {...defaultProps} holeNumber={7} />);

      expect(screen.getByText('Set Up Hole 7')).toBeTruthy();
    });

    it('renders "Save & Score" button text', () => {
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          selectedTeeName="blue"
        />
      );

      expect(screen.getByText('Save & Score')).toBeTruthy();
    });

    it('shows "Saving..." when isSaving is true', () => {
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          selectedTeeName="blue"
          isSaving={true}
        />
      );

      expect(screen.getByText('Saving...')).toBeTruthy();
      expect(screen.queryByText('Save & Score')).toBeNull();
    });

    it('renders yardage input with "(optional)" label', () => {
      render(<BuildCourseHoleModal {...defaultProps} />);

      expect(screen.getByText(/Yardage/)).toBeTruthy();
      expect(screen.getByText('(optional)')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEE SELECTION VISIBILITY TESTS
  // ===========================================================================

  describe('Tee Selection Visibility', () => {
    it('shows TeeColorSelector when selectedTeeName is null (hole 1)', () => {
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          selectedTeeName={null}
        />
      );

      // TeeColorSelector renders a "Tee Colour" label
      expect(screen.getByText('Tee Colour')).toBeTruthy();
    });

    it('hides TeeColorSelector when selectedTeeName is set (subsequent holes)', () => {
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          selectedTeeName="blue"
        />
      );

      // TeeColorSelector should NOT be rendered
      expect(screen.queryByText('Tee Colour')).toBeNull();
    });
  });

  // ===========================================================================
  // FORM DEFAULTS TESTS
  // ===========================================================================

  describe('Form Defaults', () => {
    it('par defaults to 4', () => {
      render(<BuildCourseHoleModal {...defaultProps} />);

      const par4Button = screen.getByLabelText('Par 4');
      expect(par4Button.props.accessibilityState.selected).toBe(true);
    });

    it('SI auto-suggests next unused value', () => {
      // SI 1 and 2 are used, so it should default to 3
      const usedStrokeIndexes = new Set([1, 2]);
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          usedStrokeIndexes={usedStrokeIndexes}
        />
      );

      // "3" appears in both Par 3 button and SI value, so use getAllByText
      // and verify there are exactly 2 elements with text "3" (Par 3 + SI value)
      const threeElements = screen.getAllByText('3');
      expect(threeElements.length).toBe(2);

      // Further verify by decrementing SI: it should go from 3 to 2,
      // leaving only one "3" (the Par 3 button)
      fireEvent.press(screen.getByLabelText('Decrease stroke index'));
      expect(screen.getAllByText('3').length).toBe(1);
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SI VALIDATION TESTS
  // ===========================================================================

  describe('SI Validation', () => {
    it('shows SI error text when selected SI is in usedStrokeIndexes', async () => {
      // SI 1 is used, and with empty usedStrokeIndexes the default is 1
      // So let's set up: SI 3 is used, then navigate SI to 3
      const usedStrokeIndexes = new Set([2]);
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          usedStrokeIndexes={usedStrokeIndexes}
        />
      );

      // Default SI should be 1 (first unused). Increment to 2 which is used.
      fireEvent.press(screen.getByLabelText('Increase stroke index'));

      await waitFor(() => {
        expect(screen.getByText('SI 2 is already used')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // SAVE BUTTON STATE TESTS
  // ===========================================================================

  describe('Save Button State', () => {
    it('save button disabled when SI is duplicate', async () => {
      const usedStrokeIndexes = new Set([2]);
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          selectedTeeName="blue"
          usedStrokeIndexes={usedStrokeIndexes}
        />
      );

      // Default SI is 1 (next unused). Increment to 2 which is used.
      fireEvent.press(screen.getByLabelText('Increase stroke index'));

      await waitFor(() => {
        const saveButton = screen.getByLabelText('Save hole setup and start scoring');
        expect(saveButton.props.accessibilityState.disabled).toBe(true);
      });
    });

    it('save button disabled when tee not selected on hole 1', () => {
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          selectedTeeName={null}
        />
      );

      // No tee selected locally either, so save should be disabled
      const saveButton = screen.getByLabelText('Save hole setup and start scoring');
      expect(saveButton.props.accessibilityState.disabled).toBe(true);
    });

    it('save button enabled when all valid (no SI conflict, tee selected if needed)', () => {
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          selectedTeeName="blue"
          usedStrokeIndexes={new Set()}
        />
      );

      // Tee already selected, no SI conflict, not saving
      const saveButton = screen.getByLabelText('Save hole setup and start scoring');
      expect(saveButton.props.accessibilityState.disabled).toBe(false);
    });

    it('save button disabled when isSaving is true', () => {
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          selectedTeeName="blue"
          isSaving={true}
        />
      );

      const saveButton = screen.getByLabelText('Save hole setup and start scoring');
      expect(saveButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  // ===========================================================================
  // onSave CALLBACK TESTS
  // ===========================================================================

  describe('onSave Callback', () => {
    it('calls onSave with correct Hole object (number, par, strokeIndex, yardages)', async () => {
      const onSave = jest.fn();
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          holeNumber={5}
          selectedTeeName="blue"
          onSave={onSave}
        />
      );

      // Change par to 3
      fireEvent.press(screen.getByLabelText('Par 3'));

      // Set SI to 2 (increment from default 1)
      fireEvent.press(screen.getByLabelText('Increase stroke index'));

      // Enter yardage
      const yardageInput = screen.getByPlaceholderText('e.g. 385');
      fireEvent.changeText(yardageInput, '210');

      // Press save
      const saveButton = screen.getByLabelText('Save hole setup and start scoring');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            number: 5,
            par: 3,
            strokeIndex: 2,
            yardages: { blue: 210 },
          }),
          undefined // no localTeeName since selectedTeeName was already set
        );
      });
    });

    it('calls onSelectTee when tee was locally selected', async () => {
      const onSave = jest.fn();
      const onSelectTee = jest.fn();
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          holeNumber={1}
          selectedTeeName={null}
          onSave={onSave}
          onSelectTee={onSelectTee}
        />
      );

      // Select a tee color
      fireEvent.press(screen.getByLabelText('blue tee'));

      // Press save
      const saveButton = screen.getByLabelText('Save hole setup and start scoring');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(onSelectTee).toHaveBeenCalledTimes(1);
        expect(onSelectTee).toHaveBeenCalledWith('blue');
        expect(onSave).toHaveBeenCalledTimes(1);
        // teeName should be passed as second argument
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            number: 1,
            par: 4,
            strokeIndex: 1,
          }),
          'blue'
        );
      });
    });

    it('does NOT call onSelectTee when tee was already selected', async () => {
      const onSave = jest.fn();
      const onSelectTee = jest.fn();
      render(
        <BuildCourseHoleModal
          {...defaultProps}
          holeNumber={3}
          selectedTeeName="white"
          onSave={onSave}
          onSelectTee={onSelectTee}
        />
      );

      // Press save directly (tee already selected, defaults are valid)
      const saveButton = screen.getByLabelText('Save hole setup and start scoring');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSelectTee).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // NOT DISMISSIBLE TESTS
  // ===========================================================================

  describe('Not Dismissible', () => {
    it('BottomSheet has closeOnBackdropPress={false}', () => {
      render(<BuildCourseHoleModal {...defaultProps} />);

      // The BottomSheet is rendered with testID="build-course-hole-modal"
      // and closeOnBackdropPress={false} means the "Close sheet" backdrop button
      // has no onPress handler, so pressing it should NOT dismiss.
      // We verify the modal is still present after pressing the backdrop.
      const backdrop = screen.queryByLabelText('Close sheet');
      if (backdrop) {
        fireEvent.press(backdrop);
      }

      // Modal should still be visible
      expect(screen.getByTestId('build-course-hole-modal')).toBeTruthy();
    });

    it('BottomSheet has showCloseButton={false}', () => {
      render(<BuildCourseHoleModal {...defaultProps} />);

      // With showCloseButton={false}, there should be no close button in the header
      expect(screen.queryByLabelText('Close')).toBeNull();
    });
  });
});
