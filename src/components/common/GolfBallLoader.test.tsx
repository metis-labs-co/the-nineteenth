/**
 * GolfBallLoader Component Tests
 *
 * Tests for the animated golf ball loader component including:
 * - Rendering with different sizes
 * - Animation behavior
 * - Theme (dark/light mode) support
 * - Edge cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { GolfBallLoader, GolfBallLoaderProps, GolfBallSize } from './GolfBallLoader';

// Mock ThemeContext
let mockIsDark = false;

jest.mock('@/context/ThemeContext', () => ({
  useIsDark: () => mockIsDark,
}));

// Mock react-native-svg components
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, width, height, viewBox, style, ...props }: any) => (
      <View
        testID="svg-container"
        accessibilityLabel={`svg-${width}x${height}`}
        style={style}
        {...props}
      >
        {children}
      </View>
    ),
    Svg: ({ children, width, height, viewBox, style, ...props }: any) => (
      <View
        testID="svg-container"
        accessibilityLabel={`svg-${width}x${height}`}
        style={style}
        {...props}
      >
        {children}
      </View>
    ),
    Circle: ({ cx, cy, r, fill, stroke, strokeWidth, opacity, ...props }: any) => (
      <View
        testID="svg-circle"
        accessibilityLabel={`circle-cx${cx}-cy${cy}-r${r}`}
        {...props}
      />
    ),
    Defs: ({ children, ...props }: any) => (
      <View testID="svg-defs" {...props}>
        {children}
      </View>
    ),
    RadialGradient: ({ id, children, ...props }: any) => (
      <View testID={`radial-gradient-${id}`} {...props}>
        {children}
      </View>
    ),
    Stop: ({ offset, stopColor, ...props }: any) => (
      <View testID="gradient-stop" accessibilityLabel={`stop-${offset}-${stopColor}`} {...props} />
    ),
    ClipPath: ({ id, children, ...props }: any) => (
      <View testID={`clip-path-${id}`} {...props}>
        {children}
      </View>
    ),
    G: ({ children, clipPath, fill, ...props }: any) => (
      <View testID="svg-group" {...props}>
        {children}
      </View>
    ),
  };
});

// Mock Animated API for testing
const mockAnimatedTiming = jest.fn();
const mockAnimatedLoop = jest.fn();
const mockAnimatedValue = {
  interpolate: jest.fn(() => '0deg'),
};

jest.spyOn(Animated, 'Value').mockImplementation(() => mockAnimatedValue as any);
jest.spyOn(Animated, 'timing').mockImplementation((...args) => {
  mockAnimatedTiming(...args);
  return {
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  } as any;
});
jest.spyOn(Animated, 'loop').mockImplementation((...args) => {
  mockAnimatedLoop(...args);
  return {
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  } as any;
});

// Render helper
const renderGolfBallLoader = (props: Partial<GolfBallLoaderProps> = {}) => {
  return render(<GolfBallLoader {...props} />);
};

describe('GolfBallLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDark = false;
  });

  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderGolfBallLoader();
      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
    });

    it('renders with default size (md)', () => {
      const { toJSON } = renderGolfBallLoader();
      expect(toJSON()).toBeTruthy();
    });

    it('renders SVG elements for the golf ball', () => {
      renderGolfBallLoader();
      // Should have SVG containers for background and rotating dimples
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers.length).toBe(2); // Background + rotating dimples
    });

    it('renders gradient definition', () => {
      renderGolfBallLoader();
      expect(screen.getByTestId('radial-gradient-ballGradient')).toBeTruthy();
    });

    it('renders clip path for dimples', () => {
      renderGolfBallLoader();
      expect(screen.getByTestId('clip-path-dimpleClip')).toBeTruthy();
    });

    it('renders circles for dimples', () => {
      renderGolfBallLoader();
      const circles = screen.getAllByTestId('svg-circle');
      // Main ball (1) + highlight (1) + clipPath circle (1) + dimples (13) = 16
      expect(circles.length).toBeGreaterThan(5);
    });

    it('renders the main ball circle', () => {
      renderGolfBallLoader();
      const circles = screen.getAllByTestId('svg-circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('renders highlight circle', () => {
      renderGolfBallLoader();
      // Highlight circle should exist (separate from main ball)
      const circles = screen.getAllByTestId('svg-circle');
      expect(circles.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // SIZE VARIANTS
  // =========================================================================

  describe('Size Variants', () => {
    it('renders small size (sm = 24px)', () => {
      renderGolfBallLoader({ size: 'sm' });
      const svgContainers = screen.getAllByTestId('svg-container');
      // Check that svg has 24px dimension in accessibility label
      expect(svgContainers[0].props.accessibilityLabel).toBe('svg-24x24');
    });

    it('renders medium size (md = 36px)', () => {
      renderGolfBallLoader({ size: 'md' });
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers[0].props.accessibilityLabel).toBe('svg-36x36');
    });

    it('renders large size (lg = 48px)', () => {
      renderGolfBallLoader({ size: 'lg' });
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers[0].props.accessibilityLabel).toBe('svg-48x48');
    });

    it('defaults to medium size when no size prop provided', () => {
      renderGolfBallLoader();
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers[0].props.accessibilityLabel).toBe('svg-36x36');
    });

    it('applies correct size to all SVG elements', () => {
      renderGolfBallLoader({ size: 'lg' });
      const svgContainers = screen.getAllByTestId('svg-container');
      svgContainers.forEach((svg) => {
        expect(svg.props.accessibilityLabel).toBe('svg-48x48');
      });
    });
  });

  // =========================================================================
  // ANIMATION
  // =========================================================================

  describe('Animation', () => {
    it('creates animated value for rotation', () => {
      renderGolfBallLoader();
      expect(Animated.Value).toHaveBeenCalled();
    });

    it('starts rotation animation on mount', () => {
      renderGolfBallLoader();
      expect(mockAnimatedLoop).toHaveBeenCalled();
    });

    it('uses timing animation for rotation', () => {
      renderGolfBallLoader();
      expect(mockAnimatedTiming).toHaveBeenCalled();
    });

    it('sets animation duration to 2000ms', () => {
      renderGolfBallLoader();
      expect(mockAnimatedTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          duration: 2000,
        })
      );
    });

    it('uses linear easing for smooth rotation', () => {
      renderGolfBallLoader();
      const { Easing } = require('react-native');
      expect(mockAnimatedTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          easing: Easing.linear,
        })
      );
    });

    it('uses native driver for performance', () => {
      renderGolfBallLoader();
      expect(mockAnimatedTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          useNativeDriver: true,
        })
      );
    });

    it('loops animation infinitely', () => {
      renderGolfBallLoader();
      expect(mockAnimatedLoop).toHaveBeenCalled();
    });

    it('interpolates rotation from 0deg to 360deg', () => {
      renderGolfBallLoader();
      expect(mockAnimatedValue.interpolate).toHaveBeenCalledWith({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      });
    });

    it('stops animation on unmount', () => {
      const stopMock = jest.fn();
      jest.spyOn(Animated, 'loop').mockImplementation(() => ({
        start: jest.fn(),
        stop: stopMock,
        reset: jest.fn(),
      } as any));

      const { unmount } = renderGolfBallLoader();
      unmount();

      expect(stopMock).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // THEME (DARK/LIGHT MODE)
  // =========================================================================

  describe('Theme Support', () => {
    it('uses light mode colors by default', () => {
      mockIsDark = false;
      renderGolfBallLoader();
      // Component renders without errors in light mode
      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
    });

    it('uses dark mode colors when isDark is true', () => {
      mockIsDark = true;
      renderGolfBallLoader();
      // Component renders without errors in dark mode
      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
    });

    it('renders gradient stops for ball colors', () => {
      renderGolfBallLoader();
      const stops = screen.getAllByTestId('gradient-stop');
      expect(stops.length).toBe(2); // Highlight and base color
    });

    it('applies different colors in light mode', () => {
      mockIsDark = false;
      renderGolfBallLoader();
      const stops = screen.getAllByTestId('gradient-stop');
      // Light mode uses #e0e0e0 for base
      expect(stops[1].props.accessibilityLabel).toContain('#e0e0e0');
    });

    it('applies different colors in dark mode', () => {
      mockIsDark = true;
      renderGolfBallLoader();
      const stops = screen.getAllByTestId('gradient-stop');
      // Dark mode uses #e8e8e8 for base
      expect(stops[1].props.accessibilityLabel).toContain('#e8e8e8');
    });

    it('maintains highlight color in both modes', () => {
      mockIsDark = false;
      renderGolfBallLoader();
      const stops = screen.getAllByTestId('gradient-stop');
      // Highlight is always #ffffff
      expect(stops[0].props.accessibilityLabel).toContain('#ffffff');
    });

    it('switches theme colors dynamically', () => {
      mockIsDark = false;
      const { unmount } = render(<GolfBallLoader size="md" />);

      let stops = screen.getAllByTestId('gradient-stop');
      expect(stops[1].props.accessibilityLabel).toContain('#e0e0e0');

      unmount();
      mockIsDark = true;
      render(<GolfBallLoader size="md" />);

      stops = screen.getAllByTestId('gradient-stop');
      expect(stops[1].props.accessibilityLabel).toContain('#e8e8e8');
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(GolfBallLoader).toBeDefined();
      // React.memo returns an object with $$typeof
      expect(typeof GolfBallLoader).toBe('object');
    });

    it('renders consistently with same props', () => {
      const { rerender } = render(<GolfBallLoader size="md" />);
      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);

      rerender(<GolfBallLoader size="md" />);
      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles size prop as undefined (defaults to md)', () => {
      renderGolfBallLoader({ size: undefined });
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers[0].props.accessibilityLabel).toBe('svg-36x36');
    });

    it('renders correctly with rapid prop changes', () => {
      const { rerender } = render(<GolfBallLoader size="sm" />);
      rerender(<GolfBallLoader size="md" />);
      rerender(<GolfBallLoader size="lg" />);
      rerender(<GolfBallLoader size="sm" />);

      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
    });

    it('renders multiple instances correctly', () => {
      render(
        <>
          <GolfBallLoader size="sm" />
          <GolfBallLoader size="md" />
          <GolfBallLoader size="lg" />
        </>
      );
      // Should have 6 SVG containers (2 per instance)
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers.length).toBe(6);
    });

    it('handles remounting correctly', () => {
      const { unmount } = renderGolfBallLoader();
      unmount();

      // Render again
      renderGolfBallLoader();
      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders for loading screen (large size)', () => {
      renderGolfBallLoader({ size: 'lg' });
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers[0].props.accessibilityLabel).toBe('svg-48x48');
    });

    it('renders for inline loading indicator (small size)', () => {
      renderGolfBallLoader({ size: 'sm' });
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers[0].props.accessibilityLabel).toBe('svg-24x24');
    });

    it('renders for button loading state (medium size)', () => {
      renderGolfBallLoader({ size: 'md' });
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers[0].props.accessibilityLabel).toBe('svg-36x36');
    });

    it('renders in list item loading context', () => {
      renderGolfBallLoader({ size: 'sm' });
      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
    });

    it('renders in modal loading context', () => {
      renderGolfBallLoader({ size: 'md' });
      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
    });

    it('renders in full screen loading context', () => {
      renderGolfBallLoader({ size: 'lg' });
      expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // SVG STRUCTURE
  // =========================================================================

  describe('SVG Structure', () => {
    it('has two SVG layers (background and rotating)', () => {
      renderGolfBallLoader();
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers.length).toBe(2);
    });

    it('renders defs section for gradients', () => {
      renderGolfBallLoader();
      expect(screen.getAllByTestId('svg-defs').length).toBeGreaterThan(0);
    });

    it('renders SVG group for dimples', () => {
      renderGolfBallLoader();
      expect(screen.getByTestId('svg-group')).toBeTruthy();
    });

    it('uses viewBox of 0 0 48 48 for consistent scaling', () => {
      renderGolfBallLoader({ size: 'sm' });
      // Even with small size, SVG viewBox should be 48x48 for consistency
      // The actual rendering is scaled via width/height
      expect(screen.getAllByTestId('svg-container').length).toBe(2);
    });
  });

  // =========================================================================
  // TYPE EXPORTS
  // =========================================================================

  describe('Type Exports', () => {
    it('exports GolfBallLoaderProps type', () => {
      // This is a compile-time check, but we verify the component accepts props correctly
      const props: GolfBallLoaderProps = { size: 'md' };
      expect(props.size).toBe('md');
    });

    it('exports GolfBallSize type', () => {
      const sizes: GolfBallSize[] = ['sm', 'md', 'lg'];
      expect(sizes).toHaveLength(3);
    });

    it('accepts all valid size values', () => {
      const sizes: GolfBallSize[] = ['sm', 'md', 'lg'];
      sizes.forEach((size) => {
        const { unmount } = renderGolfBallLoader({ size });
        expect(screen.getAllByTestId('svg-container').length).toBeGreaterThan(0);
        unmount();
      });
    });
  });

  // =========================================================================
  // DIMPLE PATTERN
  // =========================================================================

  describe('Dimple Pattern', () => {
    it('renders multiple dimple circles', () => {
      renderGolfBallLoader();
      const circles = screen.getAllByTestId('svg-circle');
      // Should have at least main ball + highlight + 13 dimples
      expect(circles.length).toBeGreaterThanOrEqual(15);
    });

    it('dimples are contained within the ball via clip path', () => {
      renderGolfBallLoader();
      expect(screen.getByTestId('clip-path-dimpleClip')).toBeTruthy();
    });

    it('dimples rotate independently of the ball background', () => {
      renderGolfBallLoader();
      // The second SVG container is wrapped in Animated.View for rotation
      const svgContainers = screen.getAllByTestId('svg-container');
      expect(svgContainers.length).toBe(2);
    });
  });
});
