/**
 * ErrorState Component Tests
 *
 * Tests for the error state display component including:
 * - Rendering with different props
 * - Error object and string handling
 * - Retry button functionality
 * - Compact mode
 * - Custom titles and labels
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorState, ErrorStateProps } from './ErrorState';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  white: '#FFFFFF',
  gray600: '#6B7280',
  gray900: '#111827',
  error: '#EF4444',
  errorLight: '#FEE2E2',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    Text: ({ children, style, variant, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Button: ({
      children,
      onPress,
      mode,
      style,
      contentStyle,
      labelStyle,
      icon,
      ...props
    }: any) => (
      <TouchableOpacity
        onPress={onPress}
        style={style}
        testID={props.testID || 'retry-button'}
        accessibilityLabel={props.accessibilityLabel}
        accessibilityHint={props.accessibilityHint}
      >
        {icon && <View testID={`button-icon-${icon}`} />}
        <Text style={labelStyle}>{children}</Text>
      </TouchableOpacity>
    ),
    Icon: ({ source, size, color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }}>
        <Text>{source}</Text>
      </View>
    ),
  };
});

describe('ErrorState', () => {
  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ErrorState error="Test error" />);
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('renders with string error', () => {
      render(<ErrorState error="Failed to load data" />);
      expect(screen.getByText('Failed to load data')).toBeTruthy();
    });

    it('renders with Error object', () => {
      const error = new Error('Network request failed');
      render(<ErrorState error={error} />);
      expect(screen.getByText('Network request failed')).toBeTruthy();
    });

    it('renders with null error', () => {
      render(<ErrorState error={null} />);
      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('renders default title', () => {
      render(<ErrorState error="Error" />);
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('renders error icon', () => {
      render(<ErrorState error="Error" />);
      expect(screen.getByTestId('icon-alert-circle-outline')).toBeTruthy();
    });

    it('renders with long error message', () => {
      const longError =
        'This is a very long error message that provides detailed information about what went wrong during the operation and how the user might resolve it.';
      render(<ErrorState error={longError} />);
      expect(screen.getByText(longError)).toBeTruthy();
    });
  });

  // =========================================================================
  // ERROR PROP HANDLING
  // =========================================================================

  describe('Error Prop Handling', () => {
    it('extracts message from Error object', () => {
      const error = new Error('Custom error message');
      render(<ErrorState error={error} />);
      expect(screen.getByText('Custom error message')).toBeTruthy();
    });

    it('uses string error directly', () => {
      render(<ErrorState error="Direct string error" />);
      expect(screen.getByText('Direct string error')).toBeTruthy();
    });

    it('handles Error object with empty message', () => {
      const error = new Error('');
      render(<ErrorState error={error} />);
      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('handles null error with fallback message', () => {
      render(<ErrorState error={null} />);
      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('handles Error object without message property', () => {
      const error = {} as Error;
      render(<ErrorState error={error} />);
      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });
  });

  // =========================================================================
  // CUSTOM TITLE
  // =========================================================================

  describe('Custom Title', () => {
    it('renders default title when not specified', () => {
      render(<ErrorState error="Error" />);
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('renders custom title', () => {
      render(<ErrorState error="Error" title="Couldn't load leaderboard" />);
      expect(screen.getByText("Couldn't load leaderboard")).toBeTruthy();
    });

    it('renders with various custom titles', () => {
      const titles = [
        'Failed to load competition',
        'Network error',
        'Score submission failed',
        'Unable to connect',
      ];

      titles.forEach((title) => {
        const { unmount } = render(<ErrorState error="Error" title={title} />);
        expect(screen.getByText(title)).toBeTruthy();
        unmount();
      });
    });

    it('renders empty title', () => {
      render(<ErrorState error="Error" title="" />);
      // Empty title should render but be empty
      expect(screen.getByText('Error')).toBeTruthy();
    });
  });

  // =========================================================================
  // RETRY BUTTON
  // =========================================================================

  describe('Retry Button', () => {
    it('does not render retry button when onRetry is not provided', () => {
      render(<ErrorState error="Error" />);
      expect(screen.queryByTestId('retry-button')).toBeNull();
    });

    it('renders retry button when onRetry is provided', () => {
      const onRetry = jest.fn();
      render(<ErrorState error="Error" onRetry={onRetry} />);
      expect(screen.getByText('Try Again')).toBeTruthy();
    });

    it('calls onRetry when button is pressed', () => {
      const onRetry = jest.fn();
      render(<ErrorState error="Error" onRetry={onRetry} />);
      fireEvent.press(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry multiple times on multiple presses', () => {
      const onRetry = jest.fn();
      render(<ErrorState error="Error" onRetry={onRetry} />);
      const button = screen.getByText('Try Again');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);
      expect(onRetry).toHaveBeenCalledTimes(3);
    });

    it('renders refresh icon in button', () => {
      const onRetry = jest.fn();
      render(<ErrorState error="Error" onRetry={onRetry} />);
      expect(screen.getByTestId('button-icon-refresh')).toBeTruthy();
    });
  });

  // =========================================================================
  // CUSTOM RETRY LABEL
  // =========================================================================

  describe('Custom Retry Label', () => {
    it('renders default retry label when not specified', () => {
      const onRetry = jest.fn();
      render(<ErrorState error="Error" onRetry={onRetry} />);
      expect(screen.getByText('Try Again')).toBeTruthy();
    });

    it('renders custom retry label', () => {
      const onRetry = jest.fn();
      render(
        <ErrorState error="Error" onRetry={onRetry} retryLabel="Retry Now" />
      );
      expect(screen.getByText('Retry Now')).toBeTruthy();
    });

    it('renders with various custom retry labels', () => {
      const labels = [
        'Reload',
        'Refresh',
        'Try Again',
        'Retry',
        'Reconnect',
      ];

      labels.forEach((label) => {
        const { unmount } = render(
          <ErrorState error="Error" onRetry={jest.fn()} retryLabel={label} />
        );
        expect(screen.getByText(label)).toBeTruthy();
        unmount();
      });
    });
  });

  // =========================================================================
  // COMPACT MODE
  // =========================================================================

  describe('Compact Mode', () => {
    it('renders in normal mode by default', () => {
      render(<ErrorState error="Error" />);
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('renders in compact mode when compact=true', () => {
      render(<ErrorState error="Error" compact />);
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('renders in normal mode when compact=false', () => {
      render(<ErrorState error="Error" compact={false} />);
      expect(screen.getByText('Something went wrong')).toBeTruthy();
    });

    it('renders retry button in compact mode', () => {
      const onRetry = jest.fn();
      render(<ErrorState error="Error" compact onRetry={onRetry} />);
      expect(screen.getByText('Try Again')).toBeTruthy();
    });

    it('button works in compact mode', () => {
      const onRetry = jest.fn();
      render(<ErrorState error="Error" compact onRetry={onRetry} />);
      fireEvent.press(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalled();
    });

    it('renders error icon in compact mode', () => {
      render(<ErrorState error="Error" compact />);
      expect(screen.getByTestId('icon-alert-circle-outline')).toBeTruthy();
    });

    it('renders with custom title in compact mode', () => {
      render(<ErrorState error="Error" compact title="Load Failed" />);
      expect(screen.getByText('Load Failed')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has alert role on container', () => {
      render(<ErrorState error="Test error" />);
      // RNTL doesn't fully support getByRole('alert'), so we check via accessibilityLabel
      // The component has accessibilityRole="alert" set on the container
      const container = screen.getByLabelText('Something went wrong. Test error');
      expect(container).toBeTruthy();
      expect(container.props.accessibilityRole).toBe('alert');
    });

    it('has combined accessibility label for container', () => {
      render(<ErrorState error="Network failed" title="Connection Error" />);
      const container = screen.getByLabelText(
        'Connection Error. Network failed'
      );
      expect(container).toBeTruthy();
    });

    it('title has header accessibility role', () => {
      render(<ErrorState error="Error" />);
      const title = screen.getByRole('header');
      expect(title).toBeTruthy();
    });

    it('retry button has correct accessibility label', () => {
      const onRetry = jest.fn();
      render(<ErrorState error="Error" onRetry={onRetry} />);
      const button = screen.getByLabelText('Try Again');
      expect(button).toBeTruthy();
    });

    it('retry button has custom accessibility label with custom retryLabel', () => {
      const onRetry = jest.fn();
      render(
        <ErrorState error="Error" onRetry={onRetry} retryLabel="Reload Data" />
      );
      const button = screen.getByLabelText('Reload Data');
      expect(button).toBeTruthy();
    });

    it('retry button has accessibility hint', () => {
      const onRetry = jest.fn();
      render(<ErrorState error="Error" onRetry={onRetry} />);
      const button = screen.getByHintText('Tap to retry the failed operation');
      expect(button).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with all props combined', () => {
      const onRetry = jest.fn();
      render(
        <ErrorState
          error="Failed to load scores"
          title="Score Load Error"
          retryLabel="Reload Scores"
          onRetry={onRetry}
          compact={false}
        />
      );
      expect(screen.getByText('Score Load Error')).toBeTruthy();
      expect(screen.getByText('Failed to load scores')).toBeTruthy();
      expect(screen.getByText('Reload Scores')).toBeTruthy();
    });

    it('renders compact with all other props', () => {
      const onRetry = jest.fn();
      render(
        <ErrorState
          error={new Error('Connection timeout')}
          title="Network Error"
          retryLabel="Reconnect"
          onRetry={onRetry}
          compact
        />
      );
      expect(screen.getByText('Network Error')).toBeTruthy();
      expect(screen.getByText('Connection timeout')).toBeTruthy();
      expect(screen.getByText('Reconnect')).toBeTruthy();
    });

    it('renders with Error object and no retry', () => {
      const error = new Error('Server unavailable');
      render(<ErrorState error={error} title="Server Error" />);
      expect(screen.getByText('Server Error')).toBeTruthy();
      expect(screen.getByText('Server unavailable')).toBeTruthy();
      expect(screen.queryByTestId('retry-button')).toBeNull();
    });

    it('renders with null error and retry', () => {
      const onRetry = jest.fn();
      render(<ErrorState error={null} onRetry={onRetry} />);
      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
      expect(screen.getByText('Try Again')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders API error state', () => {
      const onRetry = jest.fn();
      render(
        <ErrorState
          error="Failed to load competition data"
          title="Load Error"
          onRetry={onRetry}
        />
      );
      expect(screen.getByText('Load Error')).toBeTruthy();
      expect(screen.getByText('Failed to load competition data')).toBeTruthy();
    });

    it('renders network error state', () => {
      const onRetry = jest.fn();
      render(
        <ErrorState
          error="Network request failed. Please check your connection."
          title="Connection Error"
          onRetry={onRetry}
          retryLabel="Retry Connection"
        />
      );
      expect(screen.getByText('Connection Error')).toBeTruthy();
      expect(screen.getByText('Retry Connection')).toBeTruthy();
    });

    it('renders score submission error', () => {
      const onRetry = jest.fn();
      render(
        <ErrorState
          error="Score submission failed"
          title="Submission Error"
          onRetry={onRetry}
          compact
        />
      );
      expect(screen.getByText('Submission Error')).toBeTruthy();
      expect(screen.getByText('Score submission failed')).toBeTruthy();
    });

    it('renders leaderboard load error', () => {
      const onRetry = jest.fn();
      render(
        <ErrorState
          error={new Error('Unable to fetch leaderboard')}
          title="Couldn't load leaderboard"
          onRetry={onRetry}
        />
      );
      expect(screen.getByText("Couldn't load leaderboard")).toBeTruthy();
    });

    it('renders sync error state', () => {
      const onRetry = jest.fn();
      render(
        <ErrorState
          error="Sync failed. Your changes are saved locally."
          title="Sync Error"
          onRetry={onRetry}
          retryLabel="Retry Sync"
          compact
        />
      );
      expect(screen.getByText('Sync Error')).toBeTruthy();
      expect(screen.getByText('Retry Sync')).toBeTruthy();
    });

    it('renders authentication error', () => {
      render(
        <ErrorState
          error="Session expired. Please log in again."
          title="Authentication Error"
        />
      );
      expect(screen.getByText('Authentication Error')).toBeTruthy();
      expect(
        screen.getByText('Session expired. Please log in again.')
      ).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles empty error string', () => {
      render(<ErrorState error="" />);
      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
    });

    it('handles whitespace-only error string', () => {
      render(<ErrorState error="   " />);
      expect(screen.getByText('   ')).toBeTruthy();
    });

    it('handles special characters in error', () => {
      render(
        <ErrorState error='Error: "Player not found" (code: 404)' />
      );
      expect(
        screen.getByText('Error: "Player not found" (code: 404)')
      ).toBeTruthy();
    });

    it('handles error with line breaks', () => {
      const errorWithBreaks = 'Line 1\nLine 2\nLine 3';
      render(<ErrorState error={errorWithBreaks} />);
      expect(screen.getByText(errorWithBreaks)).toBeTruthy();
    });

    it('handles very short error', () => {
      render(<ErrorState error="X" />);
      expect(screen.getByText('X')).toBeTruthy();
    });

    it('handles numeric content in error', () => {
      render(<ErrorState error="Error code: 500" />);
      expect(screen.getByText('Error code: 500')).toBeTruthy();
    });

    it('handles Error with stack trace (only message is shown)', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Test.js:1:1';
      render(<ErrorState error={error} />);
      expect(screen.getByText('Test error')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(ErrorState).toBeDefined();
      expect(typeof ErrorState).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const props: ErrorStateProps = {
        error: 'Test error',
        title: 'Test Title',
      };

      const { rerender } = render(<ErrorState {...props} />);
      expect(screen.getByText('Test Title')).toBeTruthy();

      rerender(<ErrorState {...props} />);
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('updates when props change', () => {
      const { rerender } = render(<ErrorState error="Original" />);
      expect(screen.getByText('Original')).toBeTruthy();

      rerender(<ErrorState error="Updated" />);
      expect(screen.getByText('Updated')).toBeTruthy();
      expect(screen.queryByText('Original')).toBeNull();
    });

    it('updates when error changes from string to Error object', () => {
      const { rerender } = render(<ErrorState error="String error" />);
      expect(screen.getByText('String error')).toBeTruthy();

      rerender(<ErrorState error={new Error('Error object')} />);
      expect(screen.getByText('Error object')).toBeTruthy();
    });
  });

  // =========================================================================
  // CALLBACK BEHAVIOR
  // =========================================================================

  describe('Callback Behavior', () => {
    it('preserves callback reference on rerender', () => {
      const onRetry = jest.fn();
      const { rerender } = render(
        <ErrorState error="Error" onRetry={onRetry} />
      );

      fireEvent.press(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(1);

      rerender(<ErrorState error="Error" onRetry={onRetry} />);

      fireEvent.press(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('uses new callback after prop change', () => {
      const onRetry1 = jest.fn();
      const onRetry2 = jest.fn();

      const { rerender } = render(
        <ErrorState error="Error" onRetry={onRetry1} />
      );

      fireEvent.press(screen.getByText('Try Again'));
      expect(onRetry1).toHaveBeenCalledTimes(1);
      expect(onRetry2).not.toHaveBeenCalled();

      rerender(<ErrorState error="Error" onRetry={onRetry2} />);

      fireEvent.press(screen.getByText('Try Again'));
      expect(onRetry1).toHaveBeenCalledTimes(1);
      expect(onRetry2).toHaveBeenCalledTimes(1);
    });

    it('handles callback being removed', () => {
      const onRetry = jest.fn();
      const { rerender } = render(
        <ErrorState error="Error" onRetry={onRetry} />
      );

      expect(screen.getByText('Try Again')).toBeTruthy();

      rerender(<ErrorState error="Error" />);

      expect(screen.queryByText('Try Again')).toBeNull();
    });

    it('handles callback being added', () => {
      const onRetry = jest.fn();
      const { rerender } = render(<ErrorState error="Error" />);

      expect(screen.queryByTestId('retry-button')).toBeNull();

      rerender(<ErrorState error="Error" onRetry={onRetry} />);

      expect(screen.getByText('Try Again')).toBeTruthy();
      fireEvent.press(screen.getByText('Try Again'));
      expect(onRetry).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // ERROR MESSAGE COMPUTATION
  // =========================================================================

  describe('Error Message Computation', () => {
    it('memoizes error message extraction', () => {
      const error = new Error('Memoized error');
      const { rerender } = render(<ErrorState error={error} />);
      expect(screen.getByText('Memoized error')).toBeTruthy();

      // Rerender with same error reference
      rerender(<ErrorState error={error} />);
      expect(screen.getByText('Memoized error')).toBeTruthy();
    });

    it('recomputes when error changes', () => {
      const { rerender } = render(<ErrorState error="First error" />);
      expect(screen.getByText('First error')).toBeTruthy();

      rerender(<ErrorState error="Second error" />);
      expect(screen.getByText('Second error')).toBeTruthy();
      expect(screen.queryByText('First error')).toBeNull();
    });

    it('handles transition between error types', () => {
      const { rerender } = render(<ErrorState error="String error" />);
      expect(screen.getByText('String error')).toBeTruthy();

      rerender(<ErrorState error={new Error('Error object')} />);
      expect(screen.getByText('Error object')).toBeTruthy();

      rerender(<ErrorState error={null} />);
      expect(screen.getByText('An unexpected error occurred')).toBeTruthy();

      rerender(<ErrorState error="Back to string" />);
      expect(screen.getByText('Back to string')).toBeTruthy();
    });
  });
});
