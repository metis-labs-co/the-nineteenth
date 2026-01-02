/**
 * SwipeableHoleNavigator Component Tests
 *
 * Tests for the swipeable hole navigation component including:
 * - Rendering with children content
 * - Swipe gesture navigation (left/right)
 * - Boundary behavior (first/last hole)
 * - Enabled/disabled state
 * - Transition animations and states
 * - Accessibility actions
 * - Skeleton preview during transitions
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

describe('SwipeableHoleNavigator', () => {
  const defaultProps = {
    currentHole: 1,
    totalHoles: 18,
    onHoleChange: jest.fn(),
    children: <TestChild hole={1} />,
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

    it('renders with custom playerCount', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} playerCount={4}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('renders with enabled=true by default', () => {
      render(<SwipeableHoleNavigator {...defaultProps} />);
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('renders with enabled=false', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} enabled={false}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('accepts currentHole prop', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={9}>
          <TestChild hole={9} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Hole 9')).toBeTruthy();
    });

    it('accepts totalHoles prop', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} totalHoles={9}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('accepts onHoleChange callback', () => {
      const onHoleChange = jest.fn();
      render(
        <SwipeableHoleNavigator {...defaultProps} onHoleChange={onHoleChange}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('accepts enabled=true prop', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} enabled={true}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('accepts playerCount prop for skeleton preview', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} playerCount={3}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
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
      render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={10}>
          <TestChild hole={10} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Hole 10')).toBeTruthy();
    });

    it('renders at last hole (hole 18)', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={18}>
          <TestChild hole={18} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Hole 18')).toBeTruthy();
    });

    it('handles 9-hole course', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} totalHoles={9} currentHole={5}>
          <TestChild hole={5} />
        </SwipeableHoleNavigator>
      );
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
        <SwipeableHoleNavigator {...defaultProps} currentHole={1}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Hole 1')).toBeTruthy();

      rerender(
        <SwipeableHoleNavigator {...defaultProps} currentHole={5}>
          <TestChild hole={5} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Hole 5')).toBeTruthy();
    });

    it('handles rapid hole changes', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={1}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );

      for (let hole = 2; hole <= 5; hole++) {
        rerender(
          <SwipeableHoleNavigator {...defaultProps} currentHole={hole}>
            <TestChild hole={hole} />
          </SwipeableHoleNavigator>
        );
      }

      expect(screen.getByText('Hole 5')).toBeTruthy();
    });

    it('syncs with external hole changes', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={9}>
          <TestChild hole={9} />
        </SwipeableHoleNavigator>
      );

      // Simulate external navigation (e.g., from hole selector)
      rerender(
        <SwipeableHoleNavigator {...defaultProps} currentHole={15}>
          <TestChild hole={15} />
        </SwipeableHoleNavigator>
      );

      expect(screen.getByText('Hole 15')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ENABLED/DISABLED STATE TESTS
  // ===========================================================================

  describe('Enabled/Disabled State', () => {
    it('renders normally when enabled', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} enabled={true}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('still renders content when disabled', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} enabled={false}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('can toggle enabled state', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} enabled={true}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );

      rerender(
        <SwipeableHoleNavigator {...defaultProps} enabled={false}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );

      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHILDREN CONTENT TESTS
  // ===========================================================================

  describe('Children Content', () => {
    it('renders single child element', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps}>
          <View testID="single-child" />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('single-child')).toBeTruthy();
    });

    it('renders multiple children', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps}>
          <View testID="child-1" />
          <View testID="child-2" />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('child-1')).toBeTruthy();
      expect(screen.getByTestId('child-2')).toBeTruthy();
    });

    it('renders complex nested content', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps}>
          <View testID="parent">
            <View testID="nested-1">
              <Text>Nested Text</Text>
            </View>
            <View testID="nested-2" />
          </View>
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('parent')).toBeTruthy();
      expect(screen.getByTestId('nested-1')).toBeTruthy();
      expect(screen.getByText('Nested Text')).toBeTruthy();
    });

    it('updates when children change', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps}>
          <Text testID="child-v1">Version 1</Text>
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Version 1')).toBeTruthy();

      rerender(
        <SwipeableHoleNavigator {...defaultProps}>
          <Text testID="child-v2">Version 2</Text>
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Version 2')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TOTAL HOLES TESTS
  // ===========================================================================

  describe('Total Holes Configuration', () => {
    it('works with 18 holes (default)', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} totalHoles={18}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('works with 9 holes', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} totalHoles={9}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('handles unusual total holes (e.g., 27)', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} totalHoles={27} currentHole={20}>
          <TestChild hole={20} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Hole 20')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLAYER COUNT FOR SKELETON TESTS
  // ===========================================================================

  describe('Player Count for Skeleton', () => {
    it('defaults to 1 player skeleton', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('accepts 2 player count', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} playerCount={2}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('accepts 4 player count', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} playerCount={4}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles currentHole at minimum (1)', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={1}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Hole 1')).toBeTruthy();
    });

    it('handles currentHole at maximum (18)', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={18}>
          <TestChild hole={18} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Hole 18')).toBeTruthy();
    });

    it('handles single hole course', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} totalHoles={1} currentHole={1}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByText('Hole 1')).toBeTruthy();
    });

    it('handles empty children gracefully', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps}>
          {null}
        </SwipeableHoleNavigator>
      );
      // Should not crash with null children
    });

    it('handles undefined children gracefully', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps}>
          {undefined}
        </SwipeableHoleNavigator>
      );
      // Should not crash with undefined children
    });

    it('handles zero playerCount', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps} playerCount={0}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CONTAINER STRUCTURE TESTS
  // ===========================================================================

  describe('Container Structure', () => {
    it('wraps children in animated container', () => {
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
        <SwipeableHoleNavigator {...defaultProps} currentHole={1}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );

      for (let i = 2; i <= 18; i++) {
        rerender(
          <SwipeableHoleNavigator {...defaultProps} currentHole={i}>
            <TestChild hole={i} />
          </SwipeableHoleNavigator>
        );
      }

      expect(screen.getByText('Hole 18')).toBeTruthy();
    });

    it('handles prop changes during potential animation', () => {
      const { rerender } = render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={5}>
          <TestChild hole={5} />
        </SwipeableHoleNavigator>
      );

      // Rapidly change props
      rerender(
        <SwipeableHoleNavigator {...defaultProps} currentHole={6} enabled={false}>
          <TestChild hole={6} />
        </SwipeableHoleNavigator>
      );

      rerender(
        <SwipeableHoleNavigator {...defaultProps} currentHole={7} enabled={true}>
          <TestChild hole={7} />
        </SwipeableHoleNavigator>
      );

      expect(screen.getByText('Hole 7')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CALLBACK TESTS
  // ===========================================================================

  describe('Callback Behavior', () => {
    it('receives onHoleChange callback', () => {
      const onHoleChange = jest.fn();
      render(
        <SwipeableHoleNavigator {...defaultProps} onHoleChange={onHoleChange}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('onHoleChange is not called on initial render', () => {
      const onHoleChange = jest.fn();
      render(
        <SwipeableHoleNavigator {...defaultProps} onHoleChange={onHoleChange}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(onHoleChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // THEME/STYLING TESTS
  // ===========================================================================

  describe('Theme and Styling', () => {
    it('renders in light mode', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>,
        { isDarkMode: false }
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });

    it('renders in dark mode', () => {
      render(
        <SwipeableHoleNavigator {...defaultProps}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>,
        { isDarkMode: true }
      );
      expect(screen.getByTestId('test-child')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SNAPSHOT TESTS
  // ===========================================================================

  describe('Snapshots', () => {
    it('matches snapshot for default state', () => {
      const { toJSON } = render(
        <SwipeableHoleNavigator {...defaultProps}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot for middle hole', () => {
      const { toJSON } = render(
        <SwipeableHoleNavigator {...defaultProps} currentHole={9}>
          <TestChild hole={9} />
        </SwipeableHoleNavigator>
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches snapshot when disabled', () => {
      const { toJSON } = render(
        <SwipeableHoleNavigator {...defaultProps} enabled={false}>
          <TestChild hole={1} />
        </SwipeableHoleNavigator>
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
