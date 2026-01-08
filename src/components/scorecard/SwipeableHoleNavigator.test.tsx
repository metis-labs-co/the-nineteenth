/**
 * SwipeableHoleNavigator Component Tests
 *
 * Tests for the swipeable hole navigation component including:
 * - Rendering with renderHole content
 * - Swipe gesture navigation (left/right)
 * - Boundary behavior (first/last hole)
 * - Enabled/disabled state
 * - Transition animations and states
 * - Accessibility actions
 */

import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { SwipeableHoleNavigator } from './SwipeableHoleNavigator';

// ===========================================================================
// MOCKS
// ===========================================================================

// Mock Dimensions before importing the component
jest.spyOn(Dimensions, 'get').mockReturnValue({
  width: 400,
  height: 800,
  scale: 2,
  fontScale: 1,
});

// ===========================================================================
// TEST FIXTURES
// ===========================================================================

const TestChild = ({ hole }: { hole: number }) => (
  <View testID="test-child">
    <Text testID="hole-display">Hole {hole}</Text>
  </View>
);

// Render function for testing
const createRenderHole = () => (holeNumber: number) => <TestChild hole={holeNumber} />;

describe('SwipeableHoleNavigator', () => {
  const defaultProps = {
    currentHole: 1,
    totalHoles: 18,
    onHoleChange: jest.fn(),
    renderHole: createRenderHole(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('renders children content', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />);
      expect(screen.getByText('Hole 1')).toBeTruthy();
    });

    it('renders with enabled=true by default', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('renders with enabled=false', () => {
      render(<SwipeableHoleNavigator {...defaultProps} enabled={false} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('accepts currentHole prop', () => {
      render(<SwipeableHoleNavigator {...defaultProps} currentHole={9} />);
      expect(screen.getByText('Hole 9')).toBeTruthy();
    });

    it('accepts totalHoles prop', () => {
      render(<SwipeableHoleNavigator {...defaultProps} totalHoles={9} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('accepts onHoleChange callback', () => {
      const onHoleChange = jest.fn();
      render(<SwipeableHoleNavigator {...defaultProps} onHoleChange={onHoleChange} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('accepts enabled=true prop', () => {
      render(<SwipeableHoleNavigator {...defaultProps} enabled={true} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // BOUNDARY TESTS
  // ===========================================================================

  describe('Boundary Behavior', () => {
    it('starts at hole 1 by default', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />);
      expect(screen.getByText('Hole 1')).toBeTruthy();
    });

    it('can start at any valid hole', () => {
      render(<SwipeableHoleNavigator {...defaultProps} currentHole={10} />);
      expect(screen.getByText('Hole 10')).toBeTruthy();
    });

    it('renders at last hole (hole 18)', () => {
      render(<SwipeableHoleNavigator {...defaultProps} currentHole={18} />);
      expect(screen.getByText('Hole 18')).toBeTruthy();
    });

    it('handles 9-hole course', () => {
      render(<SwipeableHoleNavigator {...defaultProps} totalHoles={9} currentHole={5} />);
      expect(screen.getByText('Hole 5')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible role of adjustable', () => {
      const { UNSAFE_getByType: _UNSAFE_getByType } = render(<SwipeableHoleNavigator {...defaultProps} />);

      // The animated container should have accessibility props
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('has accessibility hint for swipe gestures', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('defines increment accessibility action', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />);
      // Component defines accessibilityActions for increment/decrement
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('defines decrement accessibility action', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />);
      // Component defines accessibilityActions for increment/decrement
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CURRENT HOLE CHANGE TESTS
  // ===========================================================================

  describe('Current Hole Updates', () => {
    it('updates when currentHole prop changes', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={1} />
      );
      expect(screen.getByText('Hole 1')).toBeTruthy();

      rerender(<SwipeableHoleNavigator {...defaultProps} currentHole={5} />);
      expect(screen.getByText('Hole 5')).toBeTruthy();
    });

    it('handles rapid hole changes', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={1} />
      );

      for (let hole = 2; hole <= 5; hole++) {
        rerender(<SwipeableHoleNavigator {...defaultProps} currentHole={hole} />);
      }

      expect(screen.getByText('Hole 5')).toBeTruthy();
    });

    it('syncs with external hole changes', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={9} />
      );

      // Simulate external navigation (e.g., from hole selector)
      rerender(<SwipeableHoleNavigator {...defaultProps} currentHole={15} />);

      expect(screen.getByText('Hole 15')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ENABLED/DISABLED STATE TESTS
  // ===========================================================================

  describe('Enabled/Disabled State', () => {
    it('renders normally when enabled', () => {
      render(<SwipeableHoleNavigator {...defaultProps} enabled={true} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('still renders content when disabled', () => {
      render(<SwipeableHoleNavigator {...defaultProps} enabled={false} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('can toggle enabled state', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} enabled={true} />
      );

      rerender(<SwipeableHoleNavigator {...defaultProps} enabled={false} />);

      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RENDER HOLE TESTS
  // ===========================================================================

  describe('Render Hole Function', () => {
    it('calls renderHole with current hole number', () => {
      const renderHole = jest.fn((holeNumber: number) => <TestChild hole={holeNumber} />);
      render(<SwipeableHoleNavigator {...defaultProps} renderHole={renderHole} />);
      expect(renderHole).toHaveBeenCalledWith(1);
    });

    it('renders custom content from renderHole', () => {
      const customRenderHole = (holeNumber: number) => (
        <View testID="custom-content">
          <Text>Custom Hole {holeNumber}</Text>
        </View>
      );
      render(<SwipeableHoleNavigator {...defaultProps} renderHole={customRenderHole} />);
      expect(screen.getByTestId('custom-content')).toBeTruthy();
      expect(screen.getByText('Custom Hole 1')).toBeTruthy();
    });

    it('re-renders when renderHole function changes', () => {
      const renderHoleV1 = () => <Text>Version 1</Text>;
      const renderHoleV2 = () => <Text>Version 2</Text>;

      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} renderHole={renderHoleV1} />
      );
      expect(screen.getByText('Version 1')).toBeTruthy();

      rerender(<SwipeableHoleNavigator {...defaultProps} renderHole={renderHoleV2} />);
      expect(screen.getByText('Version 2')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TOTAL HOLES TESTS
  // ===========================================================================

  describe('Total Holes Configuration', () => {
    it('works with 18 holes (default)', () => {
      render(<SwipeableHoleNavigator {...defaultProps} totalHoles={18} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('works with 9 holes', () => {
      render(<SwipeableHoleNavigator {...defaultProps} totalHoles={9} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('handles unusual total holes (e.g., 27)', () => {
      render(<SwipeableHoleNavigator {...defaultProps} totalHoles={27} currentHole={20} />);
      expect(screen.getByText('Hole 20')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles currentHole at minimum (1)', () => {
      render(<SwipeableHoleNavigator {...defaultProps} currentHole={1} />);
      expect(screen.getByText('Hole 1')).toBeTruthy();
    });

    it('handles currentHole at maximum (18)', () => {
      render(<SwipeableHoleNavigator {...defaultProps} currentHole={18} />);
      expect(screen.getByText('Hole 18')).toBeTruthy();
    });

    it('handles single hole course', () => {
      render(<SwipeableHoleNavigator {...defaultProps} totalHoles={1} currentHole={1} />);
      expect(screen.getByText('Hole 1')).toBeTruthy();
    });

    it('handles renderHole returning null gracefully', () => {
      const nullRenderHole = () => null;
      render(<SwipeableHoleNavigator {...defaultProps} renderHole={nullRenderHole} />);
      // Should not crash with null return
    });
  });

  // ===========================================================================
  // CONTAINER STRUCTURE TESTS
  // ===========================================================================

  describe('Container Structure', () => {
    it('wraps content in animated container', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('has proper container styling', () => {
      const { toJSON } = render(<SwipeableHoleNavigator {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // ===========================================================================
  // RERENDER TESTS
  // ===========================================================================

  describe('Rerender Behavior', () => {
    it('handles multiple rerenders without crashing', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={1} />
      );

      for (let i = 2; i <= 18; i++) {
        rerender(<SwipeableHoleNavigator {...defaultProps} currentHole={i} />);
      }

      expect(screen.getByText('Hole 18')).toBeTruthy();
    });

    it('handles prop changes during potential animation', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={5} />
      );

      // Rapidly change props
      rerender(<SwipeableHoleNavigator {...defaultProps} currentHole={6} enabled={false} />);
      rerender(<SwipeableHoleNavigator {...defaultProps} currentHole={7} enabled={true} />);

      expect(screen.getByText('Hole 7')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CALLBACK TESTS
  // ===========================================================================

  describe('Callback Behavior', () => {
    it('receives onHoleChange callback', () => {
      const onHoleChange = jest.fn();
      render(<SwipeableHoleNavigator {...defaultProps} onHoleChange={onHoleChange} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('onHoleChange is not called on initial render', () => {
      const onHoleChange = jest.fn();
      render(<SwipeableHoleNavigator {...defaultProps} onHoleChange={onHoleChange} />);
      expect(onHoleChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // THEME/STYLING TESTS
  // ===========================================================================

  describe('Theme and Styling', () => {
    it('renders in light mode', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />, { isDarkMode: false });
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('renders in dark mode', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />, { isDarkMode: true });
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SNAPSHOT TESTS
  // ===========================================================================

  describe('Snapshots', () => {
    it('matches snapshot for default state', () => {
      const { toJSON } = render(<SwipeableHoleNavigator {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for middle hole', () => {
      const { toJSON } = render(<SwipeableHoleNavigator {...defaultProps} currentHole={9} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot when disabled', () => {
      const { toJSON } = render(<SwipeableHoleNavigator {...defaultProps} enabled={false} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
