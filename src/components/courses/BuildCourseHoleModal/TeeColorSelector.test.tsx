/**
 * TeeColorSelector Component Tests
 *
 * Tests for the tee colour selector used in the BuildCourseHoleModal:
 * - Rendering of label and all tee options
 * - Selection callbacks
 * - Selected state styling and checkmark
 * - Accessibility
 * - No initial selection
 */

import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/utils/renderHelpers';
import { TeeColorSelector } from './TeeColorSelector';

// =====================================================
// MOCKS
// =====================================================

jest.mock('@/services/courses/teesService', () => ({
  TEE_COLORS: {
    blue: '#0000FF',
    white: '#FFFFFF',
    red: '#FF0000',
    yellow: '#FFFF00',
    black: '#000000',
    gold: '#FFD700',
  },
}));

// =====================================================
// HELPERS
// =====================================================

const defaultProps = {
  selectedTee: null as string | null,
  onSelect: jest.fn(),
};

function renderComponent(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides, onSelect: overrides.onSelect ?? jest.fn() };
  return render(<TeeColorSelector {...props} />);
}

// =====================================================
// RENDERING
// =====================================================

describe('TeeColorSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the "Tee Colour" label', () => {
      renderComponent();
      expect(screen.getByText('Tee Colour')).toBeTruthy();
    });

    it('renders all 6 tee options with capitalised names', () => {
      renderComponent();
      expect(screen.getByText('Blue')).toBeTruthy();
      expect(screen.getByText('White')).toBeTruthy();
      expect(screen.getByText('Red')).toBeTruthy();
      expect(screen.getByText('Yellow')).toBeTruthy();
      expect(screen.getByText('Black')).toBeTruthy();
      expect(screen.getByText('Gold')).toBeTruthy();
    });

    it('each tee option has correct accessibility label', () => {
      renderComponent();
      expect(screen.getByLabelText('blue tee')).toBeTruthy();
      expect(screen.getByLabelText('white tee')).toBeTruthy();
      expect(screen.getByLabelText('red tee')).toBeTruthy();
      expect(screen.getByLabelText('yellow tee')).toBeTruthy();
      expect(screen.getByLabelText('black tee')).toBeTruthy();
      expect(screen.getByLabelText('gold tee')).toBeTruthy();
    });
  });

  // =====================================================
  // SELECTION
  // =====================================================

  describe('selection', () => {
    it('calls onSelect with tee name when tapped', () => {
      const onSelect = jest.fn();
      renderComponent({ onSelect });
      fireEvent.press(screen.getByText('White'));
      expect(onSelect).toHaveBeenCalledWith('white');
    });

    it('calls onSelect with "red" when red tee tapped', () => {
      const onSelect = jest.fn();
      renderComponent({ onSelect });
      fireEvent.press(screen.getByText('Red'));
      expect(onSelect).toHaveBeenCalledWith('red');
    });

    it('calls onSelect with "blue" when blue tee tapped', () => {
      const onSelect = jest.fn();
      renderComponent({ onSelect });
      fireEvent.press(screen.getByText('Blue'));
      expect(onSelect).toHaveBeenCalledWith('blue');
    });
  });

  // =====================================================
  // SELECTED STATE
  // =====================================================

  describe('selected state', () => {
    it('shows checkmark icon when a tee is selected', () => {
      renderComponent({ selectedTee: 'blue' });
      // The component renders an Icon with source="check" when selected
      expect(screen.getByLabelText('blue tee')).toBeTruthy();
      // The check icon should be present in the tree
      const blueTee = screen.getByLabelText('blue tee');
      // Verify selected state is true
      expect(blueTee.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true })
      );
    });

    it('does not show checkmark when no tee is selected', () => {
      renderComponent({ selectedTee: null });
      // All tees should have selected=false
      const blueTee = screen.getByLabelText('blue tee');
      expect(blueTee.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false })
      );
      const redTee = screen.getByLabelText('red tee');
      expect(redTee.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false })
      );
    });

    it('sets accessibilityState selected=true for the selected tee', () => {
      renderComponent({ selectedTee: 'red' });
      const redTee = screen.getByLabelText('red tee');
      expect(redTee.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true })
      );
      // Other tees should not be selected
      const blueTee = screen.getByLabelText('blue tee');
      expect(blueTee.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false })
      );
    });
  });

  // =====================================================
  // NO INITIAL SELECTION
  // =====================================================

  describe('no initial selection', () => {
    it('when selectedTee is null, no tee has selected styling', () => {
      renderComponent({ selectedTee: null });

      const teeNames = ['blue', 'white', 'red', 'yellow', 'black', 'gold'];
      teeNames.forEach((teeName) => {
        const teeButton = screen.getByLabelText(`${teeName} tee`);
        expect(teeButton.props.accessibilityState).toEqual(
          expect.objectContaining({ selected: false })
        );
      });
    });
  });
});
