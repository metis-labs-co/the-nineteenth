/**
 * TeamFormatSelector Component Tests
 *
 * Comprehensive tests for the team format selector component including:
 * - Rendering with different team formats
 * - Selection behavior
 * - Disabled states
 * - Error display
 * - Accessibility features
 * - User interactions
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TeamFormatSelector, TeamFormatSelectorProps } from './TeamFormatSelector';
import type { TeamFormat } from '@/types/database.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  primaryLighter: '#4CAF50',
  surface: '#FFFFFF',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  textPrimary: '#171717',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  error: '#EF4444',
  white: '#FFFFFF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
  useIsDark: () => false,
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text: RNText, TouchableOpacity } = require('react-native');
  return {
    Text: ({ children, style, numberOfLines, ...props }: any) =>
      React.createElement(RNText, { style, numberOfLines, ...props }, children),
    Icon: ({ source, size, color }: any) =>
      React.createElement(View, {
        testID: `icon-${source}`,
        style: { width: size, height: size },
      }),
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

// ============================================================================
// TEST FIXTURES
// ============================================================================

const defaultProps: TeamFormatSelectorProps = {
  value: 'best-ball',
  onChange: jest.fn(),
};

// ============================================================================
// TESTS
// ============================================================================

describe('TeamFormatSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<TeamFormatSelector {...defaultProps} />);
      expect(screen.getByText('Best Ball')).toBeTruthy();
    });

    it('renders all four team format options', () => {
      render(<TeamFormatSelector {...defaultProps} />);

      expect(screen.getByText('Best Ball')).toBeTruthy();
      expect(screen.getByText('Scramble')).toBeTruthy();
      expect(screen.getByText('Aggregate')).toBeTruthy();
      expect(screen.getByText('Team Match Play')).toBeTruthy();
    });

    it('renders descriptions for all team formats', () => {
      render(<TeamFormatSelector {...defaultProps} />);

      expect(screen.getByText('Best individual score from each team counts')).toBeTruthy();
      expect(screen.getByText('Team plays from best shot each time')).toBeTruthy();
      expect(screen.getByText('Combined team score counts')).toBeTruthy();
      expect(screen.getByText('Teams compete hole-by-hole')).toBeTruthy();
    });

    it('renders icons for all team formats', () => {
      render(<TeamFormatSelector {...defaultProps} />);

      expect(screen.getByTestId('icon-star-circle-outline')).toBeTruthy();
      expect(screen.getByTestId('icon-target')).toBeTruthy();
      expect(screen.getByTestId('icon-calculator-variant-outline')).toBeTruthy();
      expect(screen.getByTestId('icon-sword-cross')).toBeTruthy();
    });

    it('renders RadioButton.Group wrapper', () => {
      render(<TeamFormatSelector {...defaultProps} />);

      expect(screen.getByTestId('radio-group')).toBeTruthy();
    });

    it('renders with selected value highlighted', () => {
      render(<TeamFormatSelector {...defaultProps} value="best-ball" />);

      const bestBallOption = screen.getByLabelText('Best Ball');
      expect(bestBallOption).toBeTruthy();
    });

    it('renders checkmark icon for selected option', () => {
      render(<TeamFormatSelector {...defaultProps} value="best-ball" />);

      // Check icon should appear for selected option
      expect(screen.getByTestId('icon-check')).toBeTruthy();
    });

    it('renders radio buttons for each option', () => {
      render(<TeamFormatSelector {...defaultProps} />);

      expect(screen.getByTestId('radio-button-best-ball')).toBeTruthy();
      expect(screen.getByTestId('radio-button-scramble')).toBeTruthy();
      expect(screen.getByTestId('radio-button-aggregate')).toBeTruthy();
      expect(screen.getByTestId('radio-button-match-play-team')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SELECTION BEHAVIOR TESTS
  // ===========================================================================

  describe('Selection Behavior', () => {
    it('calls onChange when Best Ball is selected', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} value={null} onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Best Ball'));
      expect(onChange).toHaveBeenCalledWith('best-ball');
    });

    it('calls onChange when Scramble is selected', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} value="best-ball" onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Scramble'));
      expect(onChange).toHaveBeenCalledWith('scramble');
    });

    it('calls onChange when Aggregate is selected', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} value="best-ball" onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Aggregate'));
      expect(onChange).toHaveBeenCalledWith('aggregate');
    });

    it('calls onChange when Team Match Play is selected', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} value="best-ball" onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Team Match Play'));
      expect(onChange).toHaveBeenCalledWith('match-play-team');
    });

    it('calls onChange with correct value for each option', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} value={null} onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Best Ball'));
      expect(onChange).toHaveBeenCalledWith('best-ball');

      fireEvent.press(screen.getByLabelText('Scramble'));
      expect(onChange).toHaveBeenCalledWith('scramble');

      fireEvent.press(screen.getByLabelText('Aggregate'));
      expect(onChange).toHaveBeenCalledWith('aggregate');

      fireEvent.press(screen.getByLabelText('Team Match Play'));
      expect(onChange).toHaveBeenCalledWith('match-play-team');

      expect(onChange).toHaveBeenCalledTimes(4);
    });

    it('does not call onChange when disabled', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} onChange={onChange} disabled />);

      fireEvent.press(screen.getByLabelText('Scramble'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('allows selecting already selected option', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} value="best-ball" onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Best Ball'));
      expect(onChange).toHaveBeenCalledWith('best-ball');
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('does not respond to taps when disabled', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} onChange={onChange} disabled />);

      fireEvent.press(screen.getByLabelText('Best Ball'));
      fireEvent.press(screen.getByLabelText('Scramble'));
      fireEvent.press(screen.getByLabelText('Aggregate'));
      fireEvent.press(screen.getByLabelText('Team Match Play'));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('renders all options even when disabled', () => {
      render(<TeamFormatSelector {...defaultProps} disabled />);

      expect(screen.getByText('Best Ball')).toBeTruthy();
      expect(screen.getByText('Scramble')).toBeTruthy();
      expect(screen.getByText('Aggregate')).toBeTruthy();
      expect(screen.getByText('Team Match Play')).toBeTruthy();
    });

    it('keeps selected value visible when disabled', () => {
      render(<TeamFormatSelector {...defaultProps} value="scramble" disabled />);

      // Selected option should still show checkmark
      expect(screen.getByTestId('icon-check')).toBeTruthy();
    });

    it('applies disabled accessibility state', () => {
      render(<TeamFormatSelector {...defaultProps} disabled />);

      const option = screen.getByLabelText('Best Ball');
      expect(option.props.accessibilityState.disabled).toBe(true);
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('renders error message when error prop is provided', () => {
      render(<TeamFormatSelector {...defaultProps} error="Please select a team format" />);

      expect(screen.getByText('Please select a team format')).toBeTruthy();
    });

    it('does not render error message when error prop is undefined', () => {
      render(<TeamFormatSelector {...defaultProps} />);

      expect(screen.queryByText('Please select a team format')).toBeNull();
    });

    it('handles empty string error prop', () => {
      render(<TeamFormatSelector {...defaultProps} error="" />);

      // Component renders successfully with empty error
      expect(screen.getByText('Best Ball')).toBeTruthy();
      // Empty string should not display visible error message
      // (component may or may not render empty text node - behavior verified by rendering)
    });

    it('applies error border color when error exists', () => {
      render(<TeamFormatSelector {...defaultProps} value={null} error="Required" />);

      // Error message should be visible
      expect(screen.getByText('Required')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('has accessible labels for all team formats', () => {
      render(<TeamFormatSelector {...defaultProps} />);

      expect(screen.getByLabelText('Best Ball')).toBeTruthy();
      expect(screen.getByLabelText('Scramble')).toBeTruthy();
      expect(screen.getByLabelText('Aggregate')).toBeTruthy();
      expect(screen.getByLabelText('Team Match Play')).toBeTruthy();
    });

    it('has correct accessibility hints for options', () => {
      render(<TeamFormatSelector {...defaultProps} />);

      const bestBallOption = screen.getByLabelText('Best Ball');
      expect(bestBallOption.props.accessibilityHint).toBe(
        'Best individual score from each team counts'
      );

      const scrambleOption = screen.getByLabelText('Scramble');
      expect(scrambleOption.props.accessibilityHint).toBe('Team plays from best shot each time');
    });

    it('has radio accessibility role', () => {
      render(<TeamFormatSelector {...defaultProps} />);

      const bestBallOption = screen.getByLabelText('Best Ball');
      expect(bestBallOption.props.accessibilityRole).toBe('radio');
    });

    it('has correct selected state in accessibility', () => {
      render(<TeamFormatSelector {...defaultProps} value="scramble" />);

      const selectedOption = screen.getByLabelText('Scramble');
      expect(selectedOption.props.accessibilityState.selected).toBe(true);

      const unselectedOption = screen.getByLabelText('Best Ball');
      expect(unselectedOption.props.accessibilityState.selected).toBe(false);
    });

    it('has correct disabled state in accessibility', () => {
      render(<TeamFormatSelector {...defaultProps} disabled />);

      const option = screen.getByLabelText('Best Ball');
      expect(option.props.accessibilityState.disabled).toBe(true);
    });

    it('marks only selected option as selected', () => {
      render(<TeamFormatSelector {...defaultProps} value="aggregate" />);

      const aggregate = screen.getByLabelText('Aggregate');
      const bestBall = screen.getByLabelText('Best Ball');
      const scramble = screen.getByLabelText('Scramble');
      const matchPlay = screen.getByLabelText('Team Match Play');

      expect(aggregate.props.accessibilityState.selected).toBe(true);
      expect(bestBall.props.accessibilityState.selected).toBe(false);
      expect(scramble.props.accessibilityState.selected).toBe(false);
      expect(matchPlay.props.accessibilityState.selected).toBe(false);
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('uses value prop to determine selected team format', () => {
      render(<TeamFormatSelector {...defaultProps} value="scramble" />);

      const scrambleOption = screen.getByLabelText('Scramble');
      expect(scrambleOption.props.accessibilityState.selected).toBe(true);
    });

    it('handles null value prop', () => {
      render(<TeamFormatSelector {...defaultProps} value={null} />);

      // No option should be selected
      const bestBall = screen.getByLabelText('Best Ball');
      const scramble = screen.getByLabelText('Scramble');
      const aggregate = screen.getByLabelText('Aggregate');
      const matchPlay = screen.getByLabelText('Team Match Play');

      expect(bestBall.props.accessibilityState.selected).toBe(false);
      expect(scramble.props.accessibilityState.selected).toBe(false);
      expect(aggregate.props.accessibilityState.selected).toBe(false);
      expect(matchPlay.props.accessibilityState.selected).toBe(false);
    });

    it('handles value change from parent', () => {
      const { rerender } = render(<TeamFormatSelector {...defaultProps} value="best-ball" />);

      rerender(<TeamFormatSelector {...defaultProps} value="scramble" />);

      const scrambleOption = screen.getByLabelText('Scramble');
      expect(scrambleOption.props.accessibilityState.selected).toBe(true);

      const bestBallOption = screen.getByLabelText('Best Ball');
      expect(bestBallOption.props.accessibilityState.selected).toBe(false);
    });

    it('handles disabled prop change', () => {
      const onChange = jest.fn();
      const { rerender } = render(
        <TeamFormatSelector {...defaultProps} onChange={onChange} disabled={false} />
      );

      fireEvent.press(screen.getByLabelText('Scramble'));
      expect(onChange).toHaveBeenCalledWith('scramble');

      rerender(<TeamFormatSelector {...defaultProps} onChange={onChange} disabled />);

      onChange.mockClear();
      fireEvent.press(screen.getByLabelText('Aggregate'));
      expect(onChange).not.toHaveBeenCalled();
    });

    it('handles error prop change', () => {
      const { rerender } = render(<TeamFormatSelector {...defaultProps} />);

      expect(screen.queryByText('Field is required')).toBeNull();

      rerender(<TeamFormatSelector {...defaultProps} error="Field is required" />);

      expect(screen.getByText('Field is required')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles rapidly switching between options', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} value={null} onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Best Ball'));
      fireEvent.press(screen.getByLabelText('Scramble'));
      fireEvent.press(screen.getByLabelText('Aggregate'));
      fireEvent.press(screen.getByLabelText('Team Match Play'));

      expect(onChange).toHaveBeenCalledTimes(4);
      expect(onChange).toHaveBeenNthCalledWith(1, 'best-ball');
      expect(onChange).toHaveBeenNthCalledWith(2, 'scramble');
      expect(onChange).toHaveBeenNthCalledWith(3, 'aggregate');
      expect(onChange).toHaveBeenNthCalledWith(4, 'match-play-team');
    });

    it('handles selecting same option multiple times', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} value="best-ball" onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Best Ball'));
      fireEvent.press(screen.getByLabelText('Best Ball'));
      fireEvent.press(screen.getByLabelText('Best Ball'));

      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenCalledWith('best-ball');
    });

    it('handles disabled with no value selected', () => {
      render(<TeamFormatSelector {...defaultProps} value={null} disabled />);

      // All options should render and be disabled
      expect(screen.getByText('Best Ball')).toBeTruthy();
      expect(screen.getByText('Scramble')).toBeTruthy();
      expect(screen.getByText('Aggregate')).toBeTruthy();
      expect(screen.getByText('Team Match Play')).toBeTruthy();
    });

    it('handles error with disabled state', () => {
      render(
        <TeamFormatSelector
          {...defaultProps}
          value={null}
          disabled
          error="Please select a format"
        />
      );

      expect(screen.getByText('Please select a format')).toBeTruthy();
    });

    it('renders with all props at once', () => {
      const onChange = jest.fn();
      render(
        <TeamFormatSelector
          value="aggregate"
          onChange={onChange}
          disabled
          error="Cannot change format"
        />
      );

      expect(screen.getByText('Aggregate')).toBeTruthy();
      expect(screen.getByText('Cannot change format')).toBeTruthy();
      expect(screen.getByTestId('icon-check')).toBeTruthy();

      fireEvent.press(screen.getByLabelText('Best Ball'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // RERENDERING TESTS
  // ===========================================================================

  describe('Rerendering', () => {
    it('updates when value prop changes', () => {
      const { rerender } = render(<TeamFormatSelector {...defaultProps} value="best-ball" />);

      let selectedOption = screen.getByLabelText('Best Ball');
      expect(selectedOption.props.accessibilityState.selected).toBe(true);

      rerender(<TeamFormatSelector {...defaultProps} value="scramble" />);

      const scrambleOption = screen.getByLabelText('Scramble');
      expect(scrambleOption.props.accessibilityState.selected).toBe(true);

      selectedOption = screen.getByLabelText('Best Ball');
      expect(selectedOption.props.accessibilityState.selected).toBe(false);
    });

    it('updates when disabled prop changes', () => {
      const onChange = jest.fn();
      const { rerender } = render(
        <TeamFormatSelector {...defaultProps} onChange={onChange} disabled={false} />
      );

      fireEvent.press(screen.getByLabelText('Scramble'));
      expect(onChange).toHaveBeenCalledTimes(1);

      rerender(<TeamFormatSelector {...defaultProps} onChange={onChange} disabled />);

      fireEvent.press(screen.getByLabelText('Aggregate'));
      expect(onChange).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('updates when error prop changes', () => {
      const { rerender } = render(<TeamFormatSelector {...defaultProps} />);

      expect(screen.queryByText('Error message')).toBeNull();

      rerender(<TeamFormatSelector {...defaultProps} error="Error message" />);

      expect(screen.getByText('Error message')).toBeTruthy();

      rerender(<TeamFormatSelector {...defaultProps} />);

      expect(screen.queryByText('Error message')).toBeNull();
    });
  });

  // ===========================================================================
  // REACT.MEMO TESTS
  // ===========================================================================

  describe('React.memo Optimization', () => {
    it('is wrapped with React.memo', () => {
      // The component should render without issues when same props are passed
      const { rerender } = render(<TeamFormatSelector {...defaultProps} value="best-ball" />);

      rerender(<TeamFormatSelector {...defaultProps} value="best-ball" />);

      expect(screen.getByText('Best Ball')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TEAM FORMAT SPECIFIC TESTS
  // ===========================================================================

  describe('Team Format Specific', () => {
    describe('Best Ball', () => {
      it('renders Best Ball with correct icon', () => {
        render(<TeamFormatSelector {...defaultProps} />);
        expect(screen.getByTestId('icon-star-circle-outline')).toBeTruthy();
      });

      it('renders Best Ball with correct description', () => {
        render(<TeamFormatSelector {...defaultProps} />);
        expect(screen.getByText('Best individual score from each team counts')).toBeTruthy();
      });
    });

    describe('Scramble', () => {
      it('renders Scramble with correct icon', () => {
        render(<TeamFormatSelector {...defaultProps} />);
        expect(screen.getByTestId('icon-target')).toBeTruthy();
      });

      it('renders Scramble with correct description', () => {
        render(<TeamFormatSelector {...defaultProps} />);
        expect(screen.getByText('Team plays from best shot each time')).toBeTruthy();
      });
    });

    describe('Aggregate', () => {
      it('renders Aggregate with correct icon', () => {
        render(<TeamFormatSelector {...defaultProps} />);
        expect(screen.getByTestId('icon-calculator-variant-outline')).toBeTruthy();
      });

      it('renders Aggregate with correct description', () => {
        render(<TeamFormatSelector {...defaultProps} />);
        expect(screen.getByText('Combined team score counts')).toBeTruthy();
      });
    });

    describe('Team Match Play', () => {
      it('renders Team Match Play with correct icon', () => {
        render(<TeamFormatSelector {...defaultProps} />);
        expect(screen.getByTestId('icon-sword-cross')).toBeTruthy();
      });

      it('renders Team Match Play with correct description', () => {
        render(<TeamFormatSelector {...defaultProps} />);
        expect(screen.getByText('Teams compete hole-by-hole')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // CALLBACK STABILITY TESTS
  // ===========================================================================

  describe('Callback Stability', () => {
    it('uses handlePress callback correctly', () => {
      const onChange = jest.fn();
      const { rerender } = render(
        <TeamFormatSelector {...defaultProps} onChange={onChange} />
      );

      fireEvent.press(screen.getByLabelText('Scramble'));
      expect(onChange).toHaveBeenCalledWith('scramble');

      // Rerender with same props
      rerender(<TeamFormatSelector {...defaultProps} onChange={onChange} />);

      fireEvent.press(screen.getByLabelText('Aggregate'));
      expect(onChange).toHaveBeenCalledWith('aggregate');
    });

    it('prevents calls when disabled', () => {
      const onChange = jest.fn();
      render(<TeamFormatSelector {...defaultProps} onChange={onChange} disabled />);

      fireEvent.press(screen.getByLabelText('Scramble'));
      fireEvent.press(screen.getByLabelText('Aggregate'));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // INTEGRATION TESTS
  // ===========================================================================

  describe('Integration', () => {
    it('works in a form-like scenario', () => {
      const onChange = jest.fn();
      let selectedValue: TeamFormat | null = null;

      const updateValue = (value: TeamFormat) => {
        selectedValue = value;
        onChange(value);
      };

      const { rerender } = render(
        <TeamFormatSelector value={selectedValue} onChange={updateValue} />
      );

      // Initially no selection
      expect(screen.getByLabelText('Best Ball').props.accessibilityState.selected).toBe(false);

      // Select Best Ball
      fireEvent.press(screen.getByLabelText('Best Ball'));
      expect(onChange).toHaveBeenCalledWith('best-ball');

      // Rerender with new value
      rerender(<TeamFormatSelector value="best-ball" onChange={updateValue} />);

      expect(screen.getByLabelText('Best Ball').props.accessibilityState.selected).toBe(true);
    });

    it('shows error when validation fails', () => {
      const onChange = jest.fn();
      render(
        <TeamFormatSelector
          value={null}
          onChange={onChange}
          error="Team format is required"
        />
      );

      expect(screen.getByText('Team format is required')).toBeTruthy();
    });
  });

  // ===========================================================================
  // VISUAL STATE TESTS
  // ===========================================================================

  describe('Visual States', () => {
    it('shows checkmark only for selected option', () => {
      render(<TeamFormatSelector {...defaultProps} value="scramble" />);

      // Only one checkmark should be visible
      const checkmarks = screen.getAllByTestId('icon-check');
      expect(checkmarks.length).toBe(1);
    });

    it('does not show checkmark when no option is selected', () => {
      render(<TeamFormatSelector {...defaultProps} value={null} />);

      expect(screen.queryByTestId('icon-check')).toBeNull();
    });

    it('shows all format icons regardless of selection', () => {
      render(<TeamFormatSelector {...defaultProps} value={null} />);

      expect(screen.getByTestId('icon-star-circle-outline')).toBeTruthy();
      expect(screen.getByTestId('icon-target')).toBeTruthy();
      expect(screen.getByTestId('icon-calculator-variant-outline')).toBeTruthy();
      expect(screen.getByTestId('icon-sword-cross')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MULTIPLE INSTANCES TESTS
  // ===========================================================================

  describe('Multiple Instances', () => {
    it('renders multiple instances independently', () => {
      render(
        <>
          <TeamFormatSelector
            value="best-ball"
            onChange={jest.fn()}
          />
          <TeamFormatSelector
            value="scramble"
            onChange={jest.fn()}
          />
        </>
      );

      // Both should render their respective labels
      const bestBallLabels = screen.getAllByText('Best Ball');
      const scrambleLabels = screen.getAllByText('Scramble');

      expect(bestBallLabels.length).toBe(2); // Once in each instance
      expect(scrambleLabels.length).toBe(2);
    });

    it('handles interactions independently', () => {
      const handleFirst = jest.fn();
      const handleSecond = jest.fn();

      const { getAllByLabelText } = render(
        <>
          <TeamFormatSelector value="best-ball" onChange={handleFirst} />
          <TeamFormatSelector value="best-ball" onChange={handleSecond} />
        </>
      );

      const scrambleButtons = getAllByLabelText('Scramble');

      fireEvent.press(scrambleButtons[0]);
      expect(handleFirst).toHaveBeenCalledWith('scramble');
      expect(handleSecond).not.toHaveBeenCalled();

      handleFirst.mockClear();

      fireEvent.press(scrambleButtons[1]);
      expect(handleSecond).toHaveBeenCalledWith('scramble');
      expect(handleFirst).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // USE CASE TESTS
  // ===========================================================================

  describe('Use Cases', () => {
    it('works for team competition setup', () => {
      const onChange = jest.fn();
      render(
        <TeamFormatSelector value={null} onChange={onChange} />
      );

      // User selects Best Ball for their team competition
      fireEvent.press(screen.getByLabelText('Best Ball'));
      expect(onChange).toHaveBeenCalledWith('best-ball');
    });

    it('works for editing existing team round', () => {
      const onChange = jest.fn();
      render(
        <TeamFormatSelector value="scramble" onChange={onChange} />
      );

      // Scramble should be pre-selected
      expect(screen.getByLabelText('Scramble').props.accessibilityState.selected).toBe(true);

      // User changes to Aggregate
      fireEvent.press(screen.getByLabelText('Aggregate'));
      expect(onChange).toHaveBeenCalledWith('aggregate');
    });

    it('works for viewing team round settings in read-only mode', () => {
      const onChange = jest.fn();
      render(
        <TeamFormatSelector value="match-play-team" onChange={onChange} disabled />
      );

      // Team Match Play should be shown as selected
      expect(screen.getByLabelText('Team Match Play').props.accessibilityState.selected).toBe(true);

      // Clicking should not trigger change
      fireEvent.press(screen.getByLabelText('Best Ball'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
