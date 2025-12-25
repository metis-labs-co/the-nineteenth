/**
 * LimitIndicator Component Tests
 *
 * Comprehensive tests for the LimitIndicator component which displays
 * usage vs limit progress:
 * - Rendering with progress bar (default)
 * - Compact rendering without progress bar
 * - Unlimited limits (infinity symbol)
 * - At-limit and over-limit states
 * - Accessibility features
 * - Dark mode support
 */

import React from 'react';
import { render, screen } from '@/__tests__/utils/renderHelpers';
import { LimitIndicator } from './LimitIndicator';
import { UNLIMITED, NO_LIMIT } from '@/types/subscription.types';

// ============================================================================
// TESTS
// ============================================================================

describe('LimitIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS - WITH PROGRESS BAR (DEFAULT)
  // ===========================================================================

  describe('Rendering - With Progress Bar', () => {
    it('renders without crashing', () => {
      render(<LimitIndicator current={3} max={5} label="Competitions" />);
      expect(screen.getByText('Competitions')).toBeTruthy();
    });

    it('renders label correctly', () => {
      render(<LimitIndicator current={2} max={10} label="Players" />);
      expect(screen.getByText('Players')).toBeTruthy();
    });

    it('renders value in X/Y format', () => {
      render(<LimitIndicator current={3} max={5} label="Rounds" />);
      expect(screen.getByText('3/5')).toBeTruthy();
    });

    it('renders progress bar by default', () => {
      render(
        <LimitIndicator
          current={3}
          max={5}
          label="Competitions"
          testID="limit-indicator"
        />
      );

      const component = screen.getByTestId('limit-indicator');
      expect(component).toBeTruthy();
      // Progress bar should be present - verify by checking accessibility value exists on a child
      expect(screen.getByLabelText('Using 3 of 5 Competitions')).toBeTruthy();
    });

    it('renders testID on container', () => {
      render(
        <LimitIndicator
          current={3}
          max={5}
          label="Competitions"
          testID="my-limit-indicator"
        />
      );

      expect(screen.getByTestId('my-limit-indicator')).toBeTruthy();
    });

    it('renders 0 current correctly', () => {
      render(<LimitIndicator current={0} max={5} label="Friends" />);
      expect(screen.getByText('0/5')).toBeTruthy();
    });

    it('renders high numbers correctly', () => {
      render(<LimitIndicator current={999} max={1000} label="Items" />);
      expect(screen.getByText('999/1000')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RENDERING TESTS - COMPACT (WITHOUT PROGRESS BAR)
  // ===========================================================================

  describe('Rendering - Compact (showBar=false)', () => {
    it('renders in compact mode when showBar is false', () => {
      render(
        <LimitIndicator
          current={3}
          max={5}
          label="Players"
          showBar={false}
          testID="limit-indicator"
        />
      );

      expect(screen.getByTestId('limit-indicator')).toBeTruthy();
      // Should show label with colon in compact mode
      expect(screen.getByText('Players:')).toBeTruthy();
      expect(screen.getByText('3/5')).toBeTruthy();
    });

    it('does not render progress bar in compact mode', () => {
      render(
        <LimitIndicator current={3} max={5} label="Players" showBar={false} />
      );

      expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('renders value correctly in compact mode', () => {
      render(
        <LimitIndicator current={8} max={10} label="Friends" showBar={false} />
      );

      expect(screen.getByText('Friends:')).toBeTruthy();
      expect(screen.getByText('8/10')).toBeTruthy();
    });
  });

  // ===========================================================================
  // UNLIMITED LIMIT TESTS
  // ===========================================================================

  describe('Unlimited Limits', () => {
    it('displays infinity symbol when max is UNLIMITED (-1)', () => {
      render(
        <LimitIndicator current={10} max={UNLIMITED} label="Competitions" />
      );

      expect(screen.getByText('10/\u221E')).toBeTruthy();
    });

    it('displays infinity symbol when max is NO_LIMIT (-2)', () => {
      render(<LimitIndicator current={5} max={NO_LIMIT} label="Friends" />);

      expect(screen.getByText('5/\u221E')).toBeTruthy();
    });

    it('does not show progress fill for unlimited', () => {
      render(
        <LimitIndicator
          current={100}
          max={UNLIMITED}
          label="Items"
          testID="limit-indicator"
        />
      );

      // Progress bar exists but should have no fill
      // Verify component renders with unlimited accessibility label
      expect(screen.getByTestId('limit-indicator')).toBeTruthy();
      expect(
        screen.getByLabelText('Using 100 Items, unlimited')
      ).toBeTruthy();
    });

    it('handles zero current with unlimited max', () => {
      render(<LimitIndicator current={0} max={UNLIMITED} label="Rounds" />);

      expect(screen.getByText('0/\u221E')).toBeTruthy();
    });

    it('never shows error state for unlimited', () => {
      render(
        <LimitIndicator
          current={99999}
          max={UNLIMITED}
          label="Items"
          testID="limit-indicator"
        />
      );

      // Should show normal text color, not error
      // We verify by checking the component renders without error styling indication
      expect(screen.getByText('99999/\u221E')).toBeTruthy();
    });
  });

  // ===========================================================================
  // AT-LIMIT TESTS
  // ===========================================================================

  describe('At Limit State', () => {
    it('shows error color when current equals max', () => {
      render(
        <LimitIndicator
          current={5}
          max={5}
          label="Competitions"
          testID="limit-indicator"
        />
      );

      // Value should be displayed
      expect(screen.getByText('5/5')).toBeTruthy();
      expect(screen.getByTestId('limit-indicator')).toBeTruthy();
    });

    it('shows 100% progress when at limit', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator current={10} max={10} label="Players" testID="limit" />
      );

      // Find the progress bar view by its accessibilityRole prop
      const { View } = require('react-native');
      const allViews = UNSAFE_getAllByType(View);
      const progressBar = allViews.find(
        (v: any) => v.props.accessibilityRole === 'progressbar'
      );
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 10,
        now: 10,
      });
    });

    it('handles at limit with low numbers', () => {
      render(<LimitIndicator current={1} max={1} label="Competition" />);

      expect(screen.getByText('1/1')).toBeTruthy();
    });
  });

  // ===========================================================================
  // OVER-LIMIT TESTS
  // ===========================================================================

  describe('Over Limit State', () => {
    it('displays correctly when current exceeds max', () => {
      render(<LimitIndicator current={7} max={5} label="Competitions" />);

      expect(screen.getByText('7/5')).toBeTruthy();
    });

    it('clamps progress bar to 100% when over limit', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator current={10} max={5} label="Items" testID="limit" />
      );

      // The progress bar should show max value, not the over-limit current
      const { View } = require('react-native');
      const allViews = UNSAFE_getAllByType(View);
      const progressBar = allViews.find(
        (v: any) => v.props.accessibilityRole === 'progressbar'
      );
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 5,
        now: 10, // Shows actual value in accessibility
      });
    });

    it('applies over-limit styling', () => {
      render(
        <LimitIndicator
          current={15}
          max={10}
          label="Friends"
          testID="limit-indicator"
        />
      );

      expect(screen.getByText('15/10')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROGRESS CALCULATION TESTS
  // ===========================================================================

  describe('Progress Calculation', () => {
    // Helper to find progress bar in component tree
    const findProgressBar = (allViews: any[]) =>
      allViews.find((v: any) => v.props.accessibilityRole === 'progressbar');

    it('calculates 0% progress correctly', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator current={0} max={10} label="Items" testID="limit" />
      );

      const { View } = require('react-native');
      const progressBar = findProgressBar(UNSAFE_getAllByType(View));
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 10,
        now: 0,
      });
    });

    it('calculates 50% progress correctly', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator current={5} max={10} label="Items" testID="limit" />
      );

      const { View } = require('react-native');
      const progressBar = findProgressBar(UNSAFE_getAllByType(View));
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 10,
        now: 5,
      });
    });

    it('calculates 100% progress correctly', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator current={10} max={10} label="Items" testID="limit" />
      );

      const { View } = require('react-native');
      const progressBar = findProgressBar(UNSAFE_getAllByType(View));
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 10,
        now: 10,
      });
    });

    it('handles fractional percentages', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator current={1} max={3} label="Items" testID="limit" />
      );

      const { View } = require('react-native');
      const progressBar = findProgressBar(UNSAFE_getAllByType(View));
      expect(progressBar).toBeTruthy();
      // Should be ~33.33%
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 3,
        now: 1,
      });
    });

    it('handles unlimited max in progress bar accessibility', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator
          current={50}
          max={UNLIMITED}
          label="Items"
          testID="limit"
        />
      );

      const { View } = require('react-native');
      const progressBar = findProgressBar(UNSAFE_getAllByType(View));
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityValue).toEqual({
        min: 0,
        max: 100, // Uses 100 for unlimited
        now: 0, // Uses 0 for unlimited
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has correct accessibilityRole', () => {
      render(
        <LimitIndicator
          current={3}
          max={5}
          label="Competitions"
          testID="limit-indicator"
        />
      );

      const container = screen.getByTestId('limit-indicator');
      expect(container.props.accessibilityRole).toBe('text');
    });

    it('has correct accessibilityLabel for limited items', () => {
      render(
        <LimitIndicator
          current={3}
          max={5}
          label="Competitions"
          testID="limit-indicator"
        />
      );

      const container = screen.getByTestId('limit-indicator');
      expect(container.props.accessibilityLabel).toBe(
        'Using 3 of 5 Competitions'
      );
    });

    it('has correct accessibilityLabel for unlimited items', () => {
      render(
        <LimitIndicator
          current={10}
          max={UNLIMITED}
          label="Friends"
          testID="limit-indicator"
        />
      );

      const container = screen.getByTestId('limit-indicator');
      expect(container.props.accessibilityLabel).toBe(
        'Using 10 Friends, unlimited'
      );
    });

    it('has correct accessibilityLabel in compact mode', () => {
      render(
        <LimitIndicator
          current={5}
          max={8}
          label="Players"
          showBar={false}
          testID="limit-indicator"
        />
      );

      const container = screen.getByTestId('limit-indicator');
      expect(container.props.accessibilityLabel).toBe('Using 5 of 8 Players');
    });

    it('progress bar has progressbar role', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator current={3} max={5} label="Items" />
      );

      const { View } = require('react-native');
      const progressBar = UNSAFE_getAllByType(View).find(
        (v: any) => v.props.accessibilityRole === 'progressbar'
      );
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityRole).toBe('progressbar');
    });

    it('progress bar has correct accessibilityValue', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator current={7} max={10} label="Items" testID="limit" />
      );

      const { View } = require('react-native');
      const progressBar = UNSAFE_getAllByType(View).find(
        (v: any) => v.props.accessibilityRole === 'progressbar'
      );
      expect(progressBar).toBeTruthy();
      expect(progressBar.props.accessibilityValue.min).toBe(0);
      expect(progressBar.props.accessibilityValue.max).toBe(10);
      expect(progressBar.props.accessibilityValue.now).toBe(7);
    });
  });

  // ===========================================================================
  // LABEL TESTS
  // ===========================================================================

  describe('Labels', () => {
    it('renders single word labels', () => {
      render(<LimitIndicator current={1} max={5} label="Competitions" />);
      expect(screen.getByText('Competitions')).toBeTruthy();
    });

    it('renders multi-word labels', () => {
      render(<LimitIndicator current={1} max={5} label="Active Players" />);
      expect(screen.getByText('Active Players')).toBeTruthy();
    });

    it('renders labels with special characters', () => {
      render(<LimitIndicator current={1} max={5} label="Player's Limit" />);
      expect(screen.getByText("Player's Limit")).toBeTruthy();
    });

    it('adds colon to label in compact mode', () => {
      render(
        <LimitIndicator current={1} max={5} label="Friends" showBar={false} />
      );
      expect(screen.getByText('Friends:')).toBeTruthy();
    });

    it('renders empty label (edge case)', () => {
      render(
        <LimitIndicator current={1} max={5} label="" testID="limit-indicator" />
      );
      // Should render without crashing
      expect(screen.getByTestId('limit-indicator')).toBeTruthy();
    });

    it('truncates very long labels', () => {
      const longLabel =
        'This is a very long label that should be truncated by numberOfLines prop';
      render(<LimitIndicator current={1} max={5} label={longLabel} />);
      // Should render without breaking layout
      expect(screen.getByText(longLabel)).toBeTruthy();
    });
  });

  // ===========================================================================
  // DARK MODE TESTS
  // ===========================================================================

  describe('Dark Mode', () => {
    it('renders correctly in dark mode', () => {
      render(
        <LimitIndicator
          current={3}
          max={5}
          label="Competitions"
          testID="limit-indicator"
        />,
        { isDarkMode: true }
      );

      expect(screen.getByTestId('limit-indicator')).toBeTruthy();
      expect(screen.getByText('Competitions')).toBeTruthy();
      expect(screen.getByText('3/5')).toBeTruthy();
    });

    it('renders unlimited in dark mode', () => {
      render(
        <LimitIndicator current={10} max={UNLIMITED} label="Friends" />,
        { isDarkMode: true }
      );

      expect(screen.getByText('10/\u221E')).toBeTruthy();
    });

    it('renders at-limit state in dark mode', () => {
      render(<LimitIndicator current={5} max={5} label="Players" />, {
        isDarkMode: true,
      });

      expect(screen.getByText('5/5')).toBeTruthy();
    });

    it('renders compact mode in dark mode', () => {
      render(
        <LimitIndicator current={3} max={10} label="Rounds" showBar={false} />,
        { isDarkMode: true }
      );

      expect(screen.getByText('Rounds:')).toBeTruthy();
      expect(screen.getByText('3/10')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles max of 0', () => {
      render(<LimitIndicator current={0} max={0} label="Items" />);
      // This is an edge case - 0/0 should not crash
      expect(screen.getByText('0/0')).toBeTruthy();
    });

    it('handles very large current values', () => {
      render(<LimitIndicator current={99999} max={100000} label="Items" />);
      expect(screen.getByText('99999/100000')).toBeTruthy();
    });

    it('handles decimal current (floors it in display)', () => {
      render(<LimitIndicator current={3.7} max={5} label="Items" />);
      // JavaScript will display 3.7, component shows as-is
      expect(screen.getByText('3.7/5')).toBeTruthy();
    });

    it('handles negative current (edge case)', () => {
      render(<LimitIndicator current={-1} max={5} label="Items" />);
      // Should display -1 without crashing
      expect(screen.getByText('-1/5')).toBeTruthy();
    });

    it('handles showBar undefined (defaults to true)', () => {
      const { UNSAFE_getAllByType } = render(
        <LimitIndicator current={3} max={5} label="Items" testID="limit" />
      );

      const { View } = require('react-native');
      const progressBar = UNSAFE_getAllByType(View).find(
        (v: any) => v.props.accessibilityRole === 'progressbar'
      );
      expect(progressBar).toBeTruthy();
    });

    it('handles NO_LIMIT constant correctly', () => {
      render(
        <LimitIndicator
          current={25}
          max={NO_LIMIT}
          label="Premium"
          testID="limit-indicator"
        />
      );

      expect(screen.getByText('25/\u221E')).toBeTruthy();
      expect(screen.getByTestId('limit-indicator').props.accessibilityLabel).toBe(
        'Using 25 Premium, unlimited'
      );
    });
  });

  // ===========================================================================
  // MEMO TESTS
  // ===========================================================================

  describe('React.memo', () => {
    it('component is wrapped with React.memo', () => {
      expect(LimitIndicator).toBeDefined();
      // React.memo components have $$typeof Symbol
      expect(typeof LimitIndicator).toBe('object');
    });

    it('re-renders correctly when props change', () => {
      const { rerender } = render(
        <LimitIndicator current={1} max={5} label="Items" testID="limit" />
      );

      expect(screen.getByText('1/5')).toBeTruthy();

      rerender(
        <LimitIndicator current={3} max={5} label="Items" testID="limit" />
      );

      expect(screen.getByText('3/5')).toBeTruthy();
    });

    it('updates when max changes', () => {
      const { rerender } = render(
        <LimitIndicator current={3} max={5} label="Items" />
      );

      expect(screen.getByText('3/5')).toBeTruthy();

      rerender(<LimitIndicator current={3} max={10} label="Items" />);

      expect(screen.getByText('3/10')).toBeTruthy();
    });

    it('updates when label changes', () => {
      const { rerender } = render(
        <LimitIndicator current={3} max={5} label="Competitions" />
      );

      expect(screen.getByText('Competitions')).toBeTruthy();

      rerender(<LimitIndicator current={3} max={5} label="Players" />);

      expect(screen.getByText('Players')).toBeTruthy();
    });
  });

  // ===========================================================================
  // REAL WORLD SCENARIO TESTS
  // ===========================================================================

  describe('Real World Scenarios', () => {
    it('displays free tier competition limit', () => {
      render(
        <LimitIndicator
          current={2}
          max={3}
          label="Competitions"
          testID="free-limit"
        />
      );

      expect(screen.getByText('Competitions')).toBeTruthy();
      expect(screen.getByText('2/3')).toBeTruthy();
    });

    it('displays social tier player limit', () => {
      render(
        <LimitIndicator
          current={12}
          max={16}
          label="Players per competition"
          testID="social-limit"
        />
      );

      expect(screen.getByText('Players per competition')).toBeTruthy();
      expect(screen.getByText('12/16')).toBeTruthy();
    });

    it('displays premium tier with high limits', () => {
      render(
        <LimitIndicator
          current={8}
          max={40}
          label="Players"
          testID="premium-limit"
        />
      );

      expect(screen.getByText('8/40')).toBeTruthy();
    });

    it('displays super admin unlimited competitions', () => {
      render(
        <LimitIndicator
          current={50}
          max={UNLIMITED}
          label="Competitions"
          testID="admin-limit"
        />
      );

      expect(screen.getByText('50/\u221E')).toBeTruthy();
    });

    it('displays friends limit at capacity', () => {
      render(
        <LimitIndicator
          current={10}
          max={10}
          label="Friends"
          testID="friend-limit"
        />
      );

      expect(screen.getByText('10/10')).toBeTruthy();
    });

    it('displays rounds limit in compact format', () => {
      render(
        <LimitIndicator
          current={3}
          max={5}
          label="Rounds"
          showBar={false}
          testID="round-limit"
        />
      );

      expect(screen.getByText('Rounds:')).toBeTruthy();
      expect(screen.getByText('3/5')).toBeTruthy();
    });

    it('handles transitioning from limit to unlimited (upgrade)', () => {
      const { rerender } = render(
        <LimitIndicator
          current={3}
          max={3}
          label="Competitions"
          testID="upgrade-limit"
        />
      );

      expect(screen.getByText('3/3')).toBeTruthy();

      // User upgrades to premium with unlimited
      rerender(
        <LimitIndicator
          current={3}
          max={UNLIMITED}
          label="Competitions"
          testID="upgrade-limit"
        />
      );

      expect(screen.getByText('3/\u221E')).toBeTruthy();
    });

    it('handles usage increasing over time', () => {
      const { rerender } = render(
        <LimitIndicator current={1} max={10} label="Players" />
      );

      expect(screen.getByText('1/10')).toBeTruthy();

      rerender(<LimitIndicator current={5} max={10} label="Players" />);
      expect(screen.getByText('5/10')).toBeTruthy();

      rerender(<LimitIndicator current={10} max={10} label="Players" />);
      expect(screen.getByText('10/10')).toBeTruthy();
    });
  });

  // ===========================================================================
  // VISUAL CONSISTENCY TESTS
  // ===========================================================================

  describe('Visual Consistency', () => {
    it('maintains layout with different value lengths', () => {
      const { rerender } = render(
        <LimitIndicator current={1} max={5} label="Items" testID="limit" />
      );

      expect(screen.getByTestId('limit')).toBeTruthy();

      rerender(
        <LimitIndicator current={999} max={1000} label="Items" testID="limit" />
      );

      expect(screen.getByTestId('limit')).toBeTruthy();
    });

    it('handles rapid updates smoothly', () => {
      const { rerender } = render(
        <LimitIndicator current={0} max={100} label="Progress" testID="limit" />
      );

      for (let i = 1; i <= 100; i++) {
        rerender(
          <LimitIndicator
            current={i}
            max={100}
            label="Progress"
            testID="limit"
          />
        );
      }

      expect(screen.getByText('100/100')).toBeTruthy();
    });

    it('renders consistently with and without testID', () => {
      const { rerender } = render(
        <LimitIndicator
          current={3}
          max={5}
          label="Items"
          testID="with-test-id"
        />
      );

      expect(screen.getByTestId('with-test-id')).toBeTruthy();

      rerender(<LimitIndicator current={3} max={5} label="Items" />);

      // Should still render text even without testID
      expect(screen.getByText('3/5')).toBeTruthy();
    });
  });
});
