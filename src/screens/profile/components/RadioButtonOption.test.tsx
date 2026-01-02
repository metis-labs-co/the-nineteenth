/**
 * RadioButtonOption Component Tests
 *
 * Tests for the radio-style selection option component including:
 * - Rendering with different props
 * - Selected/unselected states
 * - Disabled state
 * - User interactions (select)
 * - Accessibility
 * - Icon and description variations
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RadioButtonOption, RadioButtonOptionProps } from './RadioButtonOption';

// Mock ThemeContext
const mockColors = {
  primary: '#3b82f6',
  surface: '#ffffff',
  border: '#e5e7eb',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textDisabled: '#9ca3af',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const { Text, View } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, ...props }: any) => (
      <View testID={`icon-${source}`} {...props} />
    ),
  };
});

describe('RadioButtonOption', () => {
  const defaultProps: RadioButtonOptionProps = {
    label: 'Test Option',
    selected: false,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<RadioButtonOption {...defaultProps} />);
      expect(screen.getByText('Test Option')).toBeTruthy();
    });

    it('renders with required props only', () => {
      render(
        <RadioButtonOption
          label="Basic Option"
          selected={false}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText('Basic Option')).toBeTruthy();
    });

    it('renders with testID', () => {
      render(<RadioButtonOption {...defaultProps} testID="radio-option" />);
      expect(screen.getByTestId('radio-option')).toBeTruthy();
    });

    it('renders long labels correctly', () => {
      const longLabel = 'This is a very long option label that should wrap';
      render(
        <RadioButtonOption
          label={longLabel}
          selected={false}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText(longLabel)).toBeTruthy();
    });

    it('renders with special characters', () => {
      render(
        <RadioButtonOption
          label="Option #1 @Special!"
          selected={false}
          onSelect={jest.fn()}
        />
      );
      expect(screen.getByText('Option #1 @Special!')).toBeTruthy();
    });
  });

  // =========================================================================
  // SELECTED STATE
  // =========================================================================

  describe('Selected State', () => {
    it('renders unselected when selected=false', () => {
      render(
        <RadioButtonOption {...defaultProps} selected={false} testID="unselected" />
      );
      const option = screen.getByTestId('unselected');
      expect(option.props.accessibilityState.selected).toBe(false);
    });

    it('renders selected when selected=true', () => {
      render(
        <RadioButtonOption {...defaultProps} selected testID="selected" />
      );
      const option = screen.getByTestId('selected');
      expect(option.props.accessibilityState.selected).toBe(true);
    });

    it('shows checkmark icon when selected', () => {
      render(<RadioButtonOption {...defaultProps} selected testID="with-check" />);
      expect(screen.getByTestId('icon-check-circle')).toBeTruthy();
    });

    it('does not show checkmark icon when unselected', () => {
      render(
        <RadioButtonOption {...defaultProps} selected={false} testID="no-check" />
      );
      expect(screen.queryByTestId('icon-check-circle')).toBeNull();
    });

    it('applies selected background color style', () => {
      render(<RadioButtonOption {...defaultProps} selected testID="selected-bg" />);
      const option = screen.getByTestId('selected-bg');
      const styles = Array.isArray(option.props.style)
        ? option.props.style
        : [option.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.backgroundColor).toBe(`${mockColors.primary}15`);
    });

    it('applies unselected background color style', () => {
      render(
        <RadioButtonOption {...defaultProps} selected={false} testID="unselected-bg" />
      );
      const option = screen.getByTestId('unselected-bg');
      const styles = Array.isArray(option.props.style)
        ? option.props.style
        : [option.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.backgroundColor).toBe(mockColors.surface);
    });

    it('applies selected border color style', () => {
      render(
        <RadioButtonOption {...defaultProps} selected testID="selected-border" />
      );
      const option = screen.getByTestId('selected-border');
      const styles = Array.isArray(option.props.style)
        ? option.props.style
        : [option.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.borderColor).toBe(mockColors.primary);
    });

    it('applies unselected border color style', () => {
      render(
        <RadioButtonOption {...defaultProps} selected={false} testID="unselected-border" />
      );
      const option = screen.getByTestId('unselected-border');
      const styles = Array.isArray(option.props.style)
        ? option.props.style
        : [option.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.borderColor).toBe(mockColors.border);
    });
  });

  // =========================================================================
  // DISABLED STATE
  // =========================================================================

  describe('Disabled State', () => {
    it('is enabled by default', () => {
      render(<RadioButtonOption {...defaultProps} testID="enabled-default" />);
      const option = screen.getByTestId('enabled-default');
      expect(option.props.accessibilityState.disabled).toBe(false);
    });

    it('is disabled when disabled=true', () => {
      render(
        <RadioButtonOption {...defaultProps} disabled testID="disabled-option" />
      );
      const option = screen.getByTestId('disabled-option');
      expect(option.props.accessibilityState.disabled).toBe(true);
    });

    it('applies disabled opacity style', () => {
      render(
        <RadioButtonOption {...defaultProps} disabled testID="disabled-opacity" />
      );
      const option = screen.getByTestId('disabled-opacity');
      const styles = Array.isArray(option.props.style)
        ? option.props.style
        : [option.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.opacity).toBe(0.5);
    });

    it('does not call onSelect when disabled', () => {
      const onSelect = jest.fn();
      render(
        <RadioButtonOption
          label="Disabled"
          selected={false}
          onSelect={onSelect}
          disabled
          testID="disabled-press"
        />
      );
      const option = screen.getByTestId('disabled-press');
      fireEvent.press(option);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('calls onSelect when not disabled', () => {
      const onSelect = jest.fn();
      render(
        <RadioButtonOption
          label="Enabled"
          selected={false}
          onSelect={onSelect}
          testID="enabled-press"
        />
      );
      const option = screen.getByTestId('enabled-press');
      fireEvent.press(option);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // WITH DESCRIPTION
  // =========================================================================

  describe('With Description', () => {
    it('renders description when provided', () => {
      render(
        <RadioButtonOption
          {...defaultProps}
          description="This is a description"
        />
      );
      expect(screen.getByText('This is a description')).toBeTruthy();
    });

    it('does not render description when not provided', () => {
      render(<RadioButtonOption {...defaultProps} />);
      expect(screen.queryByText(/description/i)).toBeNull();
    });

    it('renders long descriptions correctly', () => {
      const longDescription =
        'This is a very long description that explains the option in great detail';
      render(
        <RadioButtonOption
          {...defaultProps}
          description={longDescription}
        />
      );
      expect(screen.getByText(longDescription)).toBeTruthy();
    });
  });

  // =========================================================================
  // WITH ICON
  // =========================================================================

  describe('With Icon', () => {
    it('renders icon when provided', () => {
      render(<RadioButtonOption {...defaultProps} icon="ruler" />);
      expect(screen.getByTestId('icon-ruler')).toBeTruthy();
    });

    it('does not render icon when not provided', () => {
      render(<RadioButtonOption {...defaultProps} />);
      expect(screen.queryByTestId('icon-ruler')).toBeNull();
    });

    it('renders with both icon and description', () => {
      render(
        <RadioButtonOption
          {...defaultProps}
          icon="star"
          description="A starred option"
        />
      );
      expect(screen.getByTestId('icon-star')).toBeTruthy();
      expect(screen.getByText('A starred option')).toBeTruthy();
    });
  });

  // =========================================================================
  // INTERACTIONS
  // =========================================================================

  describe('Interactions', () => {
    it('calls onSelect when pressed', () => {
      const onSelect = jest.fn();
      render(
        <RadioButtonOption
          label="Press Me"
          selected={false}
          onSelect={onSelect}
          testID="press-option"
        />
      );
      fireEvent.press(screen.getByTestId('press-option'));
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onSelect multiple times on multiple presses', () => {
      const onSelect = jest.fn();
      render(
        <RadioButtonOption
          label="Multi Press"
          selected={false}
          onSelect={onSelect}
          testID="multi-press"
        />
      );
      const option = screen.getByTestId('multi-press');
      fireEvent.press(option);
      fireEvent.press(option);
      fireEvent.press(option);
      expect(onSelect).toHaveBeenCalledTimes(3);
    });

    it('allows toggling by parent component', () => {
      const onSelect = jest.fn();
      const { rerender } = render(
        <RadioButtonOption
          label="Toggle"
          selected={false}
          onSelect={onSelect}
          testID="toggle-option"
        />
      );

      let option = screen.getByTestId('toggle-option');
      expect(option.props.accessibilityState.selected).toBe(false);

      fireEvent.press(option);
      expect(onSelect).toHaveBeenCalled();

      // Parent updates state
      rerender(
        <RadioButtonOption
          label="Toggle"
          selected={true}
          onSelect={onSelect}
          testID="toggle-option"
        />
      );

      option = screen.getByTestId('toggle-option');
      expect(option.props.accessibilityState.selected).toBe(true);
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      render(<RadioButtonOption {...defaultProps} testID="a11y-role" />);
      const option = screen.getByTestId('a11y-role');
      expect(option.props.accessibilityRole).toBe('radio');
    });

    it('uses label as accessibility label', () => {
      render(
        <RadioButtonOption
          label="My Label"
          selected={false}
          onSelect={jest.fn()}
          testID="a11y-label"
        />
      );
      const option = screen.getByTestId('a11y-label');
      expect(option.props.accessibilityLabel).toBe('My Label');
    });

    it('combines label and description for accessibility label', () => {
      render(
        <RadioButtonOption
          label="Option"
          description="More info"
          selected={false}
          onSelect={jest.fn()}
          testID="a11y-combined"
        />
      );
      const option = screen.getByTestId('a11y-combined');
      expect(option.props.accessibilityLabel).toBe('Option, More info');
    });

    it('includes selected state in accessibility state', () => {
      render(
        <RadioButtonOption {...defaultProps} selected testID="a11y-selected" />
      );
      const option = screen.getByTestId('a11y-selected');
      expect(option.props.accessibilityState.selected).toBe(true);
    });

    it('includes disabled state in accessibility state', () => {
      render(
        <RadioButtonOption {...defaultProps} disabled testID="a11y-disabled" />
      );
      const option = screen.getByTestId('a11y-disabled');
      expect(option.props.accessibilityState.disabled).toBe(true);
    });

    it('has both selected and disabled in accessibility state', () => {
      render(
        <RadioButtonOption
          {...defaultProps}
          selected
          disabled
          testID="a11y-both"
        />
      );
      const option = screen.getByTestId('a11y-both');
      expect(option.props.accessibilityState).toEqual({
        selected: true,
        disabled: true,
      });
    });
  });

  // =========================================================================
  // COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders selected + disabled', () => {
      render(
        <RadioButtonOption
          label="Selected Disabled"
          selected
          disabled
          onSelect={jest.fn()}
          testID="selected-disabled"
        />
      );
      const option = screen.getByTestId('selected-disabled');
      expect(option.props.accessibilityState.selected).toBe(true);
      expect(option.props.accessibilityState.disabled).toBe(true);
    });

    it('renders with all props combined', () => {
      render(
        <RadioButtonOption
          label="Full Props"
          description="All props are set"
          icon="star"
          selected
          disabled={false}
          onSelect={jest.fn()}
          testID="all-props"
        />
      );
      const option = screen.getByTestId('all-props');
      expect(option).toBeTruthy();
      expect(screen.getByText('Full Props')).toBeTruthy();
      expect(screen.getByText('All props are set')).toBeTruthy();
      expect(screen.getByTestId('icon-star')).toBeTruthy();
      expect(screen.getByTestId('icon-check-circle')).toBeTruthy();
    });

    it('renders unselected with icon and description', () => {
      render(
        <RadioButtonOption
          label="Unselected"
          description="Not selected"
          icon="circle-outline"
          selected={false}
          onSelect={jest.fn()}
          testID="unselected-full"
        />
      );
      expect(screen.getByTestId('unselected-full')).toBeTruthy();
      expect(screen.queryByTestId('icon-check-circle')).toBeNull();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles undefined optional props gracefully', () => {
      render(
        <RadioButtonOption
          label="Minimal"
          selected={false}
          onSelect={jest.fn()}
          testID="minimal"
        />
      );
      expect(screen.getByTestId('minimal')).toBeTruthy();
    });

    it('handles whitespace-only description', () => {
      render(
        <RadioButtonOption
          label="Option"
          description="   "
          selected={false}
          onSelect={jest.fn()}
          testID="whitespace-desc"
        />
      );
      expect(screen.getByTestId('whitespace-desc')).toBeTruthy();
    });

    it('handles rapid toggling', () => {
      const onSelect = jest.fn();
      const { rerender } = render(
        <RadioButtonOption
          label="Rapid"
          selected={false}
          onSelect={onSelect}
          testID="rapid-toggle"
        />
      );

      const option = screen.getByTestId('rapid-toggle');

      // Simulate rapid toggling
      for (let i = 0; i < 10; i++) {
        fireEvent.press(option);
        rerender(
          <RadioButtonOption
            label="Rapid"
            selected={i % 2 === 0}
            onSelect={onSelect}
            testID="rapid-toggle"
          />
        );
      }

      expect(onSelect).toHaveBeenCalledTimes(10);
    });

    it('handles special Unicode characters', () => {
      render(
        <RadioButtonOption
          label="Ü ñ ø"
          selected={false}
          onSelect={jest.fn()}
          testID="unicode"
        />
      );
      expect(screen.getByText('Ü ñ ø')).toBeTruthy();
    });

    it('handles empty description string', () => {
      render(
        <RadioButtonOption
          label="Option"
          description=""
          selected={false}
          onSelect={jest.fn()}
          testID="empty-desc"
        />
      );
      expect(screen.getByTestId('empty-desc')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(RadioButtonOption).toBeDefined();
      expect(typeof RadioButtonOption).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const onSelect = jest.fn();
      const props: RadioButtonOptionProps = {
        label: 'Test',
        selected: true,
        onSelect,
      };

      const { rerender } = render(
        <RadioButtonOption {...props} testID="memo-test" />
      );
      expect(screen.getByTestId('memo-test')).toBeTruthy();

      rerender(<RadioButtonOption {...props} testID="memo-test" />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders distance unit option', () => {
      render(
        <RadioButtonOption
          label="Yards"
          description="Imperial measurement"
          icon="ruler"
          selected
          onSelect={jest.fn()}
          testID="distance-option"
        />
      );
      expect(screen.getByText('Yards')).toBeTruthy();
      expect(screen.getByText('Imperial measurement')).toBeTruthy();
      expect(screen.getByTestId('icon-ruler')).toBeTruthy();
    });

    it('renders inquiry type option', () => {
      render(
        <RadioButtonOption
          label="Bug Report"
          description="Report an issue"
          icon="bug"
          selected={false}
          onSelect={jest.fn()}
          testID="inquiry-option"
        />
      );
      expect(screen.getByText('Bug Report')).toBeTruthy();
      expect(screen.getByText('Report an issue')).toBeTruthy();
    });

    it('renders theme selection option', () => {
      render(
        <RadioButtonOption
          label="Dark Mode"
          description="Always use dark theme"
          icon="weather-night"
          selected
          onSelect={jest.fn()}
          testID="theme-option"
        />
      );
      expect(screen.getByText('Dark Mode')).toBeTruthy();
    });

    it('renders notification preference option', () => {
      render(
        <RadioButtonOption
          label="All Notifications"
          description="Get notified about everything"
          icon="bell"
          selected
          onSelect={jest.fn()}
          testID="notification-option"
        />
      );
      expect(screen.getByText('All Notifications')).toBeTruthy();
    });
  });

  // =========================================================================
  // MULTIPLE OPTIONS (RADIO GROUP)
  // =========================================================================

  describe('Multiple Options (Radio Group)', () => {
    it('renders multiple options with different selected states', () => {
      const onSelect = jest.fn();
      render(
        <>
          <RadioButtonOption
            label="Option 1"
            selected
            onSelect={onSelect}
            testID="option-1"
          />
          <RadioButtonOption
            label="Option 2"
            selected={false}
            onSelect={onSelect}
            testID="option-2"
          />
          <RadioButtonOption
            label="Option 3"
            selected={false}
            onSelect={onSelect}
            testID="option-3"
          />
        </>
      );

      expect(
        screen.getByTestId('option-1').props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByTestId('option-2').props.accessibilityState.selected
      ).toBe(false);
      expect(
        screen.getByTestId('option-3').props.accessibilityState.selected
      ).toBe(false);
    });

    it('simulates radio group selection', () => {
      const onSelect1 = jest.fn();
      const onSelect2 = jest.fn();
      const onSelect3 = jest.fn();

      const { rerender } = render(
        <>
          <RadioButtonOption
            label="Option 1"
            selected
            onSelect={onSelect1}
            testID="radio-1"
          />
          <RadioButtonOption
            label="Option 2"
            selected={false}
            onSelect={onSelect2}
            testID="radio-2"
          />
          <RadioButtonOption
            label="Option 3"
            selected={false}
            onSelect={onSelect3}
            testID="radio-3"
          />
        </>
      );

      // Press option 2
      fireEvent.press(screen.getByTestId('radio-2'));
      expect(onSelect2).toHaveBeenCalled();

      // Simulate parent updating selection
      rerender(
        <>
          <RadioButtonOption
            label="Option 1"
            selected={false}
            onSelect={onSelect1}
            testID="radio-1"
          />
          <RadioButtonOption
            label="Option 2"
            selected
            onSelect={onSelect2}
            testID="radio-2"
          />
          <RadioButtonOption
            label="Option 3"
            selected={false}
            onSelect={onSelect3}
            testID="radio-3"
          />
        </>
      );

      expect(
        screen.getByTestId('radio-1').props.accessibilityState.selected
      ).toBe(false);
      expect(
        screen.getByTestId('radio-2').props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByTestId('radio-3').props.accessibilityState.selected
      ).toBe(false);
    });

    it('renders mixed enabled and disabled options', () => {
      render(
        <>
          <RadioButtonOption
            label="Available"
            selected={false}
            onSelect={jest.fn()}
            testID="available"
          />
          <RadioButtonOption
            label="Locked"
            selected={false}
            onSelect={jest.fn()}
            disabled
            testID="locked"
          />
        </>
      );

      expect(
        screen.getByTestId('available').props.accessibilityState.disabled
      ).toBe(false);
      expect(
        screen.getByTestId('locked').props.accessibilityState.disabled
      ).toBe(true);
    });
  });

  // =========================================================================
  // TOUCH BEHAVIOR
  // =========================================================================

  describe('Touch Behavior', () => {
    it('responds to press events', () => {
      const onSelect = jest.fn();
      render(
        <RadioButtonOption
          label="Touch Test"
          selected={false}
          onSelect={onSelect}
          testID="touch-option"
        />
      );
      const option = screen.getByTestId('touch-option');
      fireEvent.press(option);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('is pressable and accessible as radio', () => {
      render(<RadioButtonOption {...defaultProps} testID="touchable-option" />);
      const option = screen.getByTestId('touchable-option');
      expect(option.props.accessibilityRole).toBe('radio');
    });
  });
});
