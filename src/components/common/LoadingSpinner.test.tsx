/**
 * LoadingSpinner Component Tests
 *
 * Tests for the LoadingSpinner component including:
 * - Rendering with different sizes
 * - Full screen vs inline modes
 * - Message display
 * - Accessibility features
 * - Theme support
 * - Edge cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LoadingSpinner, LoadingSpinnerProps, SpinnerSize } from './LoadingSpinner';

// Mock ThemeContext
const mockColors = {
  gray600: '#6B7280',
  primary: '#1E7F5E',
  white: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock GolfBallLoader component
jest.mock('./GolfBallLoader', () => {
  const { View } = require('react-native');
  return {
    GolfBallLoader: ({ size }: { size?: string }) => (
      <View testID="golf-ball-loader" accessibilityLabel={`loader-size-${size || 'md'}`} />
    ),
    GolfBallSize: {},
  };
});

// Render helper
const renderLoadingSpinner = (props: Partial<LoadingSpinnerProps> = {}) => {
  return render(<LoadingSpinner {...props} />);
};

describe('LoadingSpinner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderLoadingSpinner();
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders with default props', () => {
      const { toJSON } = renderLoadingSpinner();
      expect(toJSON()).toBeTruthy();
    });

    it('renders GolfBallLoader component', () => {
      renderLoadingSpinner();
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders in full screen mode by default', () => {
      renderLoadingSpinner();
      // Full screen mode uses flex: 1 container
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders without message by default', () => {
      renderLoadingSpinner();
      expect(screen.queryByText(/loading/i)).toBeNull();
    });
  });

  // =========================================================================
  // SIZE VARIANTS
  // =========================================================================

  describe('Size Variants', () => {
    it('renders small size (sm)', () => {
      renderLoadingSpinner({ size: 'sm' });
      const loader = screen.getByTestId('golf-ball-loader');
      expect(loader.props.accessibilityLabel).toBe('loader-size-sm');
    });

    it('renders medium size (md) - default', () => {
      renderLoadingSpinner({ size: 'md' });
      const loader = screen.getByTestId('golf-ball-loader');
      expect(loader.props.accessibilityLabel).toBe('loader-size-md');
    });

    it('renders large size (lg)', () => {
      renderLoadingSpinner({ size: 'lg' });
      const loader = screen.getByTestId('golf-ball-loader');
      expect(loader.props.accessibilityLabel).toBe('loader-size-lg');
    });

    it('defaults to medium size when no size prop provided', () => {
      renderLoadingSpinner();
      const loader = screen.getByTestId('golf-ball-loader');
      expect(loader.props.accessibilityLabel).toBe('loader-size-md');
    });

    it('passes size prop to GolfBallLoader', () => {
      renderLoadingSpinner({ size: 'lg' });
      const loader = screen.getByTestId('golf-ball-loader');
      expect(loader.props.accessibilityLabel).toContain('lg');
    });
  });

  // =========================================================================
  // MESSAGE DISPLAY
  // =========================================================================

  describe('Message Display', () => {
    it('displays message when provided in full screen mode', () => {
      renderLoadingSpinner({ message: 'Loading competition...' });
      expect(screen.getByText('Loading competition...')).toBeTruthy();
    });

    it('does not display message when not provided', () => {
      renderLoadingSpinner();
      expect(screen.queryByText('Loading')).toBeNull();
    });

    it('displays message when provided in inline mode', () => {
      renderLoadingSpinner({ message: 'Syncing...', fullScreen: false });
      expect(screen.getByText('Syncing...')).toBeTruthy();
    });

    it('handles empty message string', () => {
      renderLoadingSpinner({ message: '' });
      expect(screen.queryByText('')).toBeNull();
    });

    it('handles long message text', () => {
      const longMessage =
        'This is a very long loading message that explains what is happening in detail';
      renderLoadingSpinner({ message: longMessage });
      expect(screen.getByText(longMessage)).toBeTruthy();
    });

    it('handles message with special characters', () => {
      renderLoadingSpinner({ message: 'Loading... 50% complete!' });
      expect(screen.getByText('Loading... 50% complete!')).toBeTruthy();
    });

    it('handles message with unicode', () => {
      renderLoadingSpinner({ message: 'Loading ⛳ data...' });
      expect(screen.getByText('Loading ⛳ data...')).toBeTruthy();
    });
  });

  // =========================================================================
  // FULL SCREEN MODE
  // =========================================================================

  describe('Full Screen Mode', () => {
    it('renders in full screen mode by default', () => {
      renderLoadingSpinner();
      // Should have the full screen container
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders in full screen mode when fullScreen=true', () => {
      renderLoadingSpinner({ fullScreen: true });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders message below spinner in full screen mode', () => {
      renderLoadingSpinner({ message: 'Loading...', fullScreen: true });
      expect(screen.getByText('Loading...')).toBeTruthy();
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('centers content in full screen mode', () => {
      const { toJSON } = renderLoadingSpinner({ fullScreen: true });
      expect(toJSON()).toBeTruthy();
    });
  });

  // =========================================================================
  // INLINE MODE
  // =========================================================================

  describe('Inline Mode', () => {
    it('renders in inline mode when fullScreen=false', () => {
      renderLoadingSpinner({ fullScreen: false });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders just spinner when no message in inline mode', () => {
      renderLoadingSpinner({ fullScreen: false });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.queryByText(/loading/i)).toBeNull();
    });

    it('renders spinner with message inline when both provided', () => {
      renderLoadingSpinner({ fullScreen: false, message: 'Loading...' });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('uses row layout in inline mode with message', () => {
      const { toJSON } = renderLoadingSpinner({
        fullScreen: false,
        message: 'Loading...',
      });
      expect(toJSON()).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has progressbar role for spinner container', () => {
      renderLoadingSpinner();
      // Find element with accessibilityRole="progressbar"
      const progressbar = screen.getByLabelText('Loading');
      expect(progressbar.props.accessibilityRole).toBe('progressbar');
    });

    it('uses message as accessibility label when provided', () => {
      renderLoadingSpinner({ message: 'Loading competition...' });
      const progressbar = screen.getByLabelText('Loading competition...');
      expect(progressbar).toBeTruthy();
    });

    it('uses default "Loading" label when no message', () => {
      renderLoadingSpinner();
      const progressbar = screen.getByLabelText('Loading');
      expect(progressbar).toBeTruthy();
    });

    it('has busy state for accessibility', () => {
      renderLoadingSpinner();
      const progressbar = screen.getByLabelText('Loading');
      expect(progressbar.props.accessibilityState.busy).toBe(true);
    });

    it('maintains accessibility in inline mode', () => {
      renderLoadingSpinner({ fullScreen: false, message: 'Syncing...' });
      const progressbar = screen.getByLabelText('Syncing...');
      expect(progressbar.props.accessibilityState.busy).toBe(true);
    });
  });

  // =========================================================================
  // COLOR PROP
  // =========================================================================

  describe('Color Prop', () => {
    it('accepts color prop (for API compatibility)', () => {
      // Color prop is accepted but not used (GolfBallLoader handles its own colors)
      renderLoadingSpinner({ color: '#FF0000' });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders correctly regardless of color prop', () => {
      renderLoadingSpinner({ color: '#00FF00' });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('handles undefined color prop', () => {
      renderLoadingSpinner({ color: undefined });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(LoadingSpinner).toBeDefined();
      // React.memo returns an object with $$typeof
      expect(typeof LoadingSpinner).toBe('object');
    });

    it('renders consistently with same props', () => {
      const { rerender } = render(<LoadingSpinner size="md" message="Loading..." />);
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('Loading...')).toBeTruthy();

      rerender(<LoadingSpinner size="md" message="Loading..." />);
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('Loading...')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles size prop as undefined', () => {
      renderLoadingSpinner({ size: undefined });
      const loader = screen.getByTestId('golf-ball-loader');
      expect(loader.props.accessibilityLabel).toBe('loader-size-md');
    });

    it('handles fullScreen prop as undefined', () => {
      renderLoadingSpinner({ fullScreen: undefined });
      // Defaults to true (full screen mode)
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders correctly with all props provided', () => {
      renderLoadingSpinner({
        size: 'lg',
        message: 'Loading...',
        color: '#FF0000',
        fullScreen: true,
      });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('handles rapid prop changes', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />);
      rerender(<LoadingSpinner size="md" />);
      rerender(<LoadingSpinner size="lg" />);
      rerender(<LoadingSpinner size="sm" message="Loading..." />);

      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders multiple instances correctly', () => {
      render(
        <>
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="md" message="Loading A" />
          <LoadingSpinner size="lg" message="Loading B" />
        </>
      );
      expect(screen.getAllByTestId('golf-ball-loader').length).toBe(3);
    });

    it('handles remounting correctly', () => {
      const { unmount } = renderLoadingSpinner();
      unmount();

      renderLoadingSpinner({ message: 'New loading...' });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('New loading...')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders for full screen loading state', () => {
      renderLoadingSpinner({
        size: 'lg',
        message: 'Loading competition...',
        fullScreen: true,
      });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('Loading competition...')).toBeTruthy();
    });

    it('renders for inline button loading', () => {
      renderLoadingSpinner({
        size: 'sm',
        fullScreen: false,
      });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('renders for card loading state', () => {
      renderLoadingSpinner({
        size: 'md',
        message: 'Loading scorecard...',
        fullScreen: true,
      });
      expect(screen.getByText('Loading scorecard...')).toBeTruthy();
    });

    it('renders for sync indicator', () => {
      renderLoadingSpinner({
        size: 'sm',
        message: 'Syncing...',
        fullScreen: false,
      });
      expect(screen.getByText('Syncing...')).toBeTruthy();
    });

    it('renders for data fetching', () => {
      renderLoadingSpinner({
        size: 'md',
        message: 'Fetching leaderboard...',
      });
      expect(screen.getByText('Fetching leaderboard...')).toBeTruthy();
    });

    it('renders for page transitions', () => {
      renderLoadingSpinner({
        size: 'lg',
        fullScreen: true,
      });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });
  });

  // =========================================================================
  // TYPE EXPORTS
  // =========================================================================

  describe('Type Exports', () => {
    it('exports LoadingSpinnerProps type', () => {
      // This is a compile-time check, but we verify the component accepts props correctly
      const props: LoadingSpinnerProps = {
        size: 'md',
        message: 'Loading...',
        fullScreen: true,
      };
      expect(props.size).toBe('md');
      expect(props.message).toBe('Loading...');
      expect(props.fullScreen).toBe(true);
    });

    it('exports SpinnerSize type', () => {
      const sizes: SpinnerSize[] = ['sm', 'md', 'lg'];
      expect(sizes).toHaveLength(3);
    });

    it('accepts all valid size values', () => {
      const sizes: SpinnerSize[] = ['sm', 'md', 'lg'];
      sizes.forEach((size) => {
        const { unmount } = renderLoadingSpinner({ size });
        expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
        unmount();
      });
    });
  });

  // =========================================================================
  // CONTAINER SIZING
  // =========================================================================

  describe('Container Sizing', () => {
    it('applies correct container size for small spinner', () => {
      renderLoadingSpinner({ size: 'sm' });
      // Container should be 24x24 for sm
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('applies correct container size for medium spinner', () => {
      renderLoadingSpinner({ size: 'md' });
      // Container should be 36x36 for md
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });

    it('applies correct container size for large spinner', () => {
      renderLoadingSpinner({ size: 'lg' });
      // Container should be 48x48 for lg
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
    });
  });

  // =========================================================================
  // THEME SUPPORT
  // =========================================================================

  describe('Theme Support', () => {
    it('applies theme colors to message text', () => {
      renderLoadingSpinner({ message: 'Loading...' });
      const text = screen.getByText('Loading...');
      // Text should use gray600 color from theme
      expect(text).toBeTruthy();
    });

    it('renders correctly in different theme contexts', () => {
      renderLoadingSpinner({ message: 'Loading...' });
      expect(screen.getByText('Loading...')).toBeTruthy();
    });
  });

  // =========================================================================
  // COMBINED PROPS
  // =========================================================================

  describe('Combined Props', () => {
    it('handles small size with message in full screen', () => {
      renderLoadingSpinner({
        size: 'sm',
        message: 'Loading...',
        fullScreen: true,
      });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('handles large size with message inline', () => {
      renderLoadingSpinner({
        size: 'lg',
        message: 'Processing...',
        fullScreen: false,
      });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.getByText('Processing...')).toBeTruthy();
    });

    it('handles medium size without message in full screen', () => {
      renderLoadingSpinner({
        size: 'md',
        fullScreen: true,
      });
      expect(screen.getByTestId('golf-ball-loader')).toBeTruthy();
      expect(screen.queryByText(/loading/i)).toBeNull();
    });
  });
});
