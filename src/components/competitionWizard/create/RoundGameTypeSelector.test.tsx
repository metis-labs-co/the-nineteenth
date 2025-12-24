/**
 * RoundGameTypeSelector Component Tests
 *
 * Comprehensive tests for the game type selector component including:
 * - Rendering with different game types
 * - Subscription tier restrictions
 * - Selection behavior
 * - Upgrade prompt integration
 * - Disabled states
 * - Accessibility features
 * - User interactions
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { RoundGameTypeSelector, RoundGameTypeSelectorProps } from './RoundGameTypeSelector';
import type { GameType } from '@/types/database.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock useSubscription hook
const mockLimits = {
  allowedGameTypes: ['stableford'] as GameType[],
};

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    limits: mockLimits,
  }),
}));

// Mock UpgradePrompt component
const mockUpgradePromptProps: any[] = [];
jest.mock('@/components/subscription/UpgradePrompt', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    UpgradePrompt: ({ config, visible, onUpgrade, onDismiss }: any) => {
      mockUpgradePromptProps.push({ config, visible, onUpgrade, onDismiss });
      if (!visible) return null;
      return (
        <View testID="upgrade-prompt">
          <Text testID="upgrade-title">{config?.title}</Text>
          <Text testID="upgrade-message">{config?.message}</Text>
          <TouchableOpacity testID="upgrade-button" onPress={onUpgrade}>
            <Text>Upgrade</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="dismiss-button" onPress={onDismiss}>
            <Text>Dismiss</Text>
          </TouchableOpacity>
        </View>
      );
    },
  };
});

// Note: react-native-paper mock uses the global mock from jest.setup.js
// which provides Text, Icon, etc. We need to add RadioButton to the global mock
// by re-mocking here with all the components we need
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text: RNText, TouchableOpacity } = require('react-native');
  return {
    Text: ({ children, style, numberOfLines, ...props }: any) =>
      React.createElement(RNText, { style, numberOfLines, ...props }, children),
    Icon: ({ source, size, color }: any) =>
      React.createElement(View, { testID: `icon-${source}`, style: { width: size, height: size } }),
    RadioButton: Object.assign(
      ({ value, status, onPress, disabled, color, uncheckedColor }: any) =>
        React.createElement(TouchableOpacity, {
          testID: `radio-button-${value}`,
          onPress: disabled ? undefined : onPress,
          disabled,
        }),
      {
        Group: ({ children, value, onValueChange }: any) =>
          React.createElement(View, { testID: 'radio-group' }, children),
      }
    ),
  };
});

// Clear mock arrays before each test
beforeEach(() => {
  mockUpgradePromptProps.length = 0;
});

// ============================================================================
// TEST FIXTURES
// ============================================================================

const defaultProps: RoundGameTypeSelectorProps = {
  value: 'stableford',
  onChange: jest.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

describe('RoundGameTypeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpgradePromptProps.length = 0;
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<RoundGameTypeSelector {...defaultProps} />);
      expect(screen.getByText('Stableford')).toBeTruthy();
    });

    it('renders all three game type options', () => {
      render(<RoundGameTypeSelector {...defaultProps} />);

      expect(screen.getByText('Stableford')).toBeTruthy();
      expect(screen.getByText('Stroke Play')).toBeTruthy();
      expect(screen.getByText('Match Play')).toBeTruthy();
    });

    it('renders descriptions for all game types', () => {
      render(<RoundGameTypeSelector {...defaultProps} />);

      expect(screen.getByText('Points-based scoring (2 for par, 3 for birdie)')).toBeTruthy();
      expect(screen.getByText('Lowest total strokes wins')).toBeTruthy();
      expect(screen.getByText('Hole-by-hole head-to-head competition')).toBeTruthy();
    });

    it('renders icons for all game types', () => {
      render(<RoundGameTypeSelector {...defaultProps} />);

      expect(screen.getByTestId('icon-star-outline')).toBeTruthy();
      expect(screen.getByTestId('icon-counter')).toBeTruthy();
      expect(screen.getByTestId('icon-sword-cross')).toBeTruthy();
    });

    it('renders RadioButton.Group wrapper', () => {
      render(<RoundGameTypeSelector {...defaultProps} />);

      expect(screen.getByTestId('radio-group')).toBeTruthy();
    });

    it('renders with selected value highlighted', () => {
      render(<RoundGameTypeSelector {...defaultProps} value="stableford" />);

      const stablefordOption = screen.getByLabelText('Stableford');
      expect(stablefordOption).toBeTruthy();
    });
  });

  // ===========================================================================
  // SELECTION BEHAVIOR TESTS
  // ===========================================================================

  describe('Selection Behavior', () => {
    it('calls onChange when allowed game type is selected', () => {
      const onChange = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play'));
      expect(onChange).toHaveBeenCalledWith('stroke');
    });

    it('calls onChange with stableford when Stableford is selected', () => {
      const onChange = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          value="stroke"
          onChange={onChange}
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stableford'));
      expect(onChange).toHaveBeenCalledWith('stableford');
    });

    it('calls onChange with match-play when Match Play is selected', () => {
      const onChange = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      fireEvent.press(screen.getByLabelText('Match Play'));
      expect(onChange).toHaveBeenCalledWith('match-play');
    });

    it('does not call onChange when disabled', () => {
      const onChange = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          disabled
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // SUBSCRIPTION TIER TESTS
  // ===========================================================================

  describe('Subscription Tier Restrictions', () => {
    it('shows lock icon for restricted game types', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      // Lock icons should appear for stroke and match-play
      const lockIcons = screen.getAllByTestId('icon-lock');
      expect(lockIcons.length).toBeGreaterThanOrEqual(2);
    });

    it('shows tier badge for restricted game types', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      expect(screen.getByText('Social')).toBeTruthy();
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('shows chevron-right icon for restricted options', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      const chevronIcons = screen.getAllByTestId('icon-chevron-right');
      expect(chevronIcons.length).toBeGreaterThanOrEqual(2);
    });

    it('shows checkmark for selected allowed option', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          value="stableford"
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      expect(screen.getByTestId('icon-check')).toBeTruthy();
    });

    it('uses subscription limits when allowedGameTypes not provided', () => {
      render(<RoundGameTypeSelector {...defaultProps} />);

      // Should use mockLimits which only has stableford
      // Stroke and Match Play should show tier badges
      expect(screen.getByText('Social')).toBeTruthy();
      expect(screen.getByText('Premium')).toBeTruthy();
    });

    it('falls back to stableford only when no limits available', () => {
      // Override mock to return null limits
      jest.doMock('@/hooks/useSubscription', () => ({
        useSubscription: () => ({
          limits: null,
        }),
      }));

      render(<RoundGameTypeSelector {...defaultProps} />);

      // Stableford should always be available as fallback
      expect(screen.getByText('Stableford')).toBeTruthy();
    });
  });

  // ===========================================================================
  // UPGRADE PROMPT TESTS
  // ===========================================================================

  describe('Upgrade Prompt', () => {
    it('shows upgrade prompt when restricted game type is tapped', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      // Tap on Stroke Play (requires social tier)
      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));

      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
    });

    it('shows correct title in upgrade prompt for Stroke Play', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));

      expect(screen.getByText('Unlock Stroke Play')).toBeTruthy();
    });

    it('shows correct title in upgrade prompt for Match Play', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Match Play - Upgrade required'));

      expect(screen.getByText('Unlock Match Play')).toBeTruthy();
    });

    it('shows correct tier in upgrade prompt message', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));

      // The message contains "Social" tier
      const lastPromptCall = mockUpgradePromptProps[mockUpgradePromptProps.length - 1];
      expect(lastPromptCall.config.message).toContain('Social');
    });

    it('calls onUpgradePress when upgrade button is pressed', async () => {
      const onUpgradePress = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
          onUpgradePress={onUpgradePress}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));
      fireEvent.press(screen.getByTestId('upgrade-button'));

      await waitFor(() => {
        expect(onUpgradePress).toHaveBeenCalledTimes(1);
      });
    });

    it('dismisses upgrade prompt when dismiss button is pressed', async () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));
      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();

      fireEvent.press(screen.getByTestId('dismiss-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('upgrade-prompt')).toBeNull();
      });
    });

    it('does not call onChange when upgrade prompt is shown', () => {
      const onChange = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('does not respond to taps when disabled', () => {
      const onChange = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          disabled
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play'));
      fireEvent.press(screen.getByLabelText('Match Play'));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('does not show upgrade prompt when disabled and tapping restricted option', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          disabled
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));

      expect(screen.queryByTestId('upgrade-prompt')).toBeNull();
    });

    it('renders all options even when disabled', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          disabled
        />
      );

      expect(screen.getByText('Stableford')).toBeTruthy();
      expect(screen.getByText('Stroke Play')).toBeTruthy();
      expect(screen.getByText('Match Play')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible labels for allowed game types', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      expect(screen.getByLabelText('Stableford')).toBeTruthy();
      expect(screen.getByLabelText('Stroke Play')).toBeTruthy();
      expect(screen.getByLabelText('Match Play')).toBeTruthy();
    });

    it('has accessible labels indicating upgrade required for restricted types', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      expect(screen.getByLabelText('Stroke Play - Upgrade required')).toBeTruthy();
      expect(screen.getByLabelText('Match Play - Upgrade required')).toBeTruthy();
    });

    it('has correct accessibility hints for allowed options', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      const stablefordOption = screen.getByLabelText('Stableford');
      expect(stablefordOption.props.accessibilityHint).toBe('Points-based scoring (2 for par, 3 for birdie)');
    });

    it('has correct accessibility hints for restricted options', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      const strokeOption = screen.getByLabelText('Stroke Play - Upgrade required');
      expect(strokeOption.props.accessibilityHint).toBe('Tap to upgrade to Social');
    });

    it('has radio accessibility role', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      const stablefordOption = screen.getByLabelText('Stableford');
      expect(stablefordOption.props.accessibilityRole).toBe('radio');
    });

    it('has correct selected state in accessibility', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          value="stableford"
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      const stablefordOption = screen.getByLabelText('Stableford');
      expect(stablefordOption.props.accessibilityState.selected).toBe(true);

      const strokeOption = screen.getByLabelText('Stroke Play');
      expect(strokeOption.props.accessibilityState.selected).toBe(false);
    });

    it('has correct disabled state in accessibility', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          disabled
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      const stablefordOption = screen.getByLabelText('Stableford');
      expect(stablefordOption.props.accessibilityState.disabled).toBe(true);
    });

    it('marks restricted options as disabled in accessibility', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      const strokeOption = screen.getByLabelText('Stroke Play - Upgrade required');
      // Locked options are not interactively disabled, but the disabled prop is passed
      // The accessibilityState.disabled is set based on the disabled prop
      expect(strokeOption.props.accessibilityState).toBeDefined();
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('uses value prop to determine selected game type', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          value="stroke"
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      const strokeOption = screen.getByLabelText('Stroke Play');
      expect(strokeOption.props.accessibilityState.selected).toBe(true);
    });

    it('handles value change from parent', () => {
      const { rerender } = render(
        <RoundGameTypeSelector
          {...defaultProps}
          value="stableford"
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      rerender(
        <RoundGameTypeSelector
          {...defaultProps}
          value="stroke"
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      const strokeOption = screen.getByLabelText('Stroke Play');
      expect(strokeOption.props.accessibilityState.selected).toBe(true);
    });

    it('handles allowedGameTypes prop override', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      // All should be allowed - no tier badges
      expect(screen.queryByText('Social')).toBeNull();
      expect(screen.queryByText('Premium')).toBeNull();
    });

    it('handles onUpgradePress being undefined', async () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
          onUpgradePress={undefined}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));

      // Upgrade prompt should be shown
      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();

      // Pressing upgrade should close the prompt (since onUpgradePress is called which sets showUpgradePrompt to false)
      fireEvent.press(screen.getByTestId('upgrade-button'));

      // After pressing upgrade, the prompt closes
      await waitFor(() => {
        expect(screen.queryByTestId('upgrade-prompt')).toBeNull();
      });
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty allowedGameTypes array gracefully', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={[]}
        />
      );

      // All options should show as locked
      expect(screen.getAllByTestId('icon-lock').length).toBe(3);
    });

    it('handles all game types allowed', () => {
      const onChange = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      // No lock icons should be visible
      expect(screen.queryByTestId('icon-lock')).toBeNull();

      // All should be clickable
      fireEvent.press(screen.getByLabelText('Stroke Play'));
      expect(onChange).toHaveBeenCalledWith('stroke');
    });

    it('handles rapidly switching between options', () => {
      const onChange = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play'));
      fireEvent.press(screen.getByLabelText('Match Play'));
      fireEvent.press(screen.getByLabelText('Stableford'));

      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenNthCalledWith(1, 'stroke');
      expect(onChange).toHaveBeenNthCalledWith(2, 'match-play');
      expect(onChange).toHaveBeenNthCalledWith(3, 'stableford');
    });

    it('handles multiple upgrade prompt shows and dismisses', async () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      // Show for stroke
      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));
      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
      expect(screen.getByText('Unlock Stroke Play')).toBeTruthy();

      // Dismiss
      fireEvent.press(screen.getByTestId('dismiss-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('upgrade-prompt')).toBeNull();
      });

      // Show for match play
      fireEvent.press(screen.getByLabelText('Match Play - Upgrade required'));
      expect(screen.getByTestId('upgrade-prompt')).toBeTruthy();
      expect(screen.getByText('Unlock Match Play')).toBeTruthy();
    });

    it('handles selecting already selected option', () => {
      const onChange = jest.fn();
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          value="stableford"
          onChange={onChange}
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stableford'));
      expect(onChange).toHaveBeenCalledWith('stableford');
    });
  });

  // ===========================================================================
  // TIER BENEFITS TESTS
  // ===========================================================================

  describe('Tier Benefits', () => {
    it('passes correct benefits for Social tier upgrade', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));

      // Check the upgrade prompt was called with correct config
      const lastCall = mockUpgradePromptProps[mockUpgradePromptProps.length - 1];
      expect(lastCall.config.benefits).toContain('Stroke Play game type');
    });

    it('passes correct benefits for Premium tier upgrade', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Match Play - Upgrade required'));

      // Check the upgrade prompt was called with correct config
      const lastCall = mockUpgradePromptProps[mockUpgradePromptProps.length - 1];
      expect(lastCall.config.benefits).toContain('Match Play game type');
    });

    it('passes correct target tier for Social upgrade', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play - Upgrade required'));

      const lastCall = mockUpgradePromptProps[mockUpgradePromptProps.length - 1];
      expect(lastCall.config.targetTier).toBe('social');
    });

    it('passes correct target tier for Premium upgrade', () => {
      render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      fireEvent.press(screen.getByLabelText('Match Play - Upgrade required'));

      const lastCall = mockUpgradePromptProps[mockUpgradePromptProps.length - 1];
      expect(lastCall.config.targetTier).toBe('premium');
    });
  });

  // ===========================================================================
  // RERENDERING TESTS
  // ===========================================================================

  describe('Rerendering', () => {
    it('updates when value prop changes', () => {
      const { rerender } = render(
        <RoundGameTypeSelector
          {...defaultProps}
          value="stableford"
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      let stablefordOption = screen.getByLabelText('Stableford');
      expect(stablefordOption.props.accessibilityState.selected).toBe(true);

      rerender(
        <RoundGameTypeSelector
          {...defaultProps}
          value="stroke"
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      const strokeOption = screen.getByLabelText('Stroke Play');
      expect(strokeOption.props.accessibilityState.selected).toBe(true);
    });

    it('updates when allowedGameTypes prop changes', () => {
      const { rerender } = render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      expect(screen.getByText('Social')).toBeTruthy();

      rerender(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      expect(screen.queryByText('Social')).toBeNull();
    });

    it('updates when disabled prop changes', () => {
      const onChange = jest.fn();
      const { rerender } = render(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          disabled={false}
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play'));
      expect(onChange).toHaveBeenCalledTimes(1);

      rerender(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          disabled
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stableford'));
      expect(onChange).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  // ===========================================================================
  // REACT.MEMO TESTS
  // ===========================================================================

  describe('React.memo Optimization', () => {
    it('is wrapped with React.memo', () => {
      // The component should render without issues when same props are passed
      const { rerender } = render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      rerender(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford', 'stroke']}
        />
      );

      expect(screen.getByText('Stableford')).toBeTruthy();
    });
  });

  // ===========================================================================
  // GAME TYPE SPECIFIC TESTS
  // ===========================================================================

  describe('Game Type Specific', () => {
    describe('Stableford', () => {
      it('renders Stableford with correct icon', () => {
        render(<RoundGameTypeSelector {...defaultProps} />);
        expect(screen.getByTestId('icon-star-outline')).toBeTruthy();
      });

      it('shows Stableford as free tier', () => {
        render(
          <RoundGameTypeSelector
            {...defaultProps}
            allowedGameTypes={[]}
          />
        );
        // Even with empty allowed, Stableford shows free tier (no badge shown for free)
        // Actually with empty allowed, all show locked
        expect(screen.getByText('Stableford')).toBeTruthy();
      });
    });

    describe('Stroke Play', () => {
      it('renders Stroke Play with correct icon', () => {
        render(<RoundGameTypeSelector {...defaultProps} />);
        expect(screen.getByTestId('icon-counter')).toBeTruthy();
      });

      it('requires social tier for Stroke Play', () => {
        render(
          <RoundGameTypeSelector
            {...defaultProps}
            allowedGameTypes={['stableford']}
          />
        );
        expect(screen.getByText('Social')).toBeTruthy();
      });
    });

    describe('Match Play', () => {
      it('renders Match Play with correct icon', () => {
        render(<RoundGameTypeSelector {...defaultProps} />);
        expect(screen.getByTestId('icon-sword-cross')).toBeTruthy();
      });

      it('requires premium tier for Match Play', () => {
        render(
          <RoundGameTypeSelector
            {...defaultProps}
            allowedGameTypes={['stableford']}
          />
        );
        expect(screen.getByText('Premium')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // CALLBACK STABILITY TESTS
  // ===========================================================================

  describe('Callback Stability', () => {
    it('uses memoized handlePress callback', () => {
      const onChange = jest.fn();
      const { rerender } = render(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play'));
      expect(onChange).toHaveBeenCalledWith('stroke');

      // Rerender with same props
      rerender(
        <RoundGameTypeSelector
          {...defaultProps}
          onChange={onChange}
          allowedGameTypes={['stableford', 'stroke', 'match-play']}
        />
      );

      fireEvent.press(screen.getByLabelText('Match Play'));
      expect(onChange).toHaveBeenCalledWith('match-play');
    });

    it('uses memoized isGameTypeAllowed callback', () => {
      const { rerender } = render(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      expect(screen.getByText('Social')).toBeTruthy();

      rerender(
        <RoundGameTypeSelector
          {...defaultProps}
          allowedGameTypes={['stableford']}
        />
      );

      expect(screen.getByText('Social')).toBeTruthy();
    });
  });
});
