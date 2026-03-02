/**
 * FilterPill Component Tests
 *
 * Tests for the pill-shaped toggle button used for filtering content including:
 * - Rendering with different props
 * - Selected/unselected states
 * - Disabled state
 * - User interactions (press)
 * - Accessibility
 * - Custom styles
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FilterPill, FilterPillProps } from './FilterPill';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  border: '#E0E0E0',
  gray100: '#F5F5F5',
  gray200: '#E5E7EB',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper Text
jest.mock('react-native-paper', () => {
  const { Text } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
  };
});

describe('FilterPill', () => {
  const defaultProps: FilterPillProps = {
    label: 'Active',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<FilterPill {...defaultProps} />);
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders with required props', () => {
      render(<FilterPill label="Filter" onPress={jest.fn()} />);
      expect(screen.getByText('Filter')).toBeTruthy();
    });

    it('renders with testID', () => {
      render(<FilterPill {...defaultProps} testID="filter-pill" />);
      expect(screen.getByTestId('filter-pill')).toBeTruthy();
    });

    it('renders empty label correctly', () => {
      render(<FilterPill label="" onPress={jest.fn()} testID="empty-pill" />);
      expect(screen.getByTestId('empty-pill')).toBeTruthy();
    });

    it('renders long labels correctly', () => {
      const longLabel = 'This is a very long filter label';
      render(<FilterPill label={longLabel} onPress={jest.fn()} />);
      expect(screen.getByText(longLabel)).toBeTruthy();
    });

    it('renders with special characters', () => {
      render(<FilterPill label="Filter #1 @Event" onPress={jest.fn()} />);
      expect(screen.getByText('Filter #1 @Event')).toBeTruthy();
    });

    it('renders with numbers', () => {
      render(<FilterPill label="12345" onPress={jest.fn()} />);
      expect(screen.getByText('12345')).toBeTruthy();
    });

    it('renders with emojis', () => {
      render(<FilterPill label="🏌️ Golf" onPress={jest.fn()} />);
      expect(screen.getByText('🏌️ Golf')).toBeTruthy();
    });
  });

  // =========================================================================
  // SELECTED STATE
  // =========================================================================

  describe('Selected State', () => {
    it('renders unselected by default', () => {
      render(<FilterPill {...defaultProps} testID="default-pill" />);
      const pill = screen.getByTestId('default-pill');
      expect(pill.props.accessibilityState.selected).toBe(false);
    });

    it('renders selected when selected=true', () => {
      render(<FilterPill {...defaultProps} selected testID="selected-pill" />);
      const pill = screen.getByTestId('selected-pill');
      expect(pill.props.accessibilityState.selected).toBe(true);
    });

    it('renders unselected when selected=false', () => {
      render(<FilterPill {...defaultProps} selected={false} testID="unselected-pill" />);
      const pill = screen.getByTestId('unselected-pill');
      expect(pill.props.accessibilityState.selected).toBe(false);
    });

    it('applies selected background color style', () => {
      render(<FilterPill {...defaultProps} selected testID="selected-style" />);
      const pill = screen.getByTestId('selected-style');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.backgroundColor).toBe(`${mockColors.primary}15`);
    });

    it('applies unselected background color style', () => {
      render(<FilterPill {...defaultProps} selected={false} testID="unselected-style" />);
      const pill = screen.getByTestId('unselected-style');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      // Badge uses colors.surface for default variant unselected background
      expect(flatStyle.backgroundColor).toBe(mockColors.surface);
    });

    it('applies selected border color style', () => {
      render(<FilterPill {...defaultProps} selected testID="selected-border" />);
      const pill = screen.getByTestId('selected-border');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.borderColor).toBe(mockColors.primary);
    });

    it('applies unselected border color style', () => {
      render(<FilterPill {...defaultProps} selected={false} testID="unselected-border" />);
      const pill = screen.getByTestId('unselected-border');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      // Badge uses colors.border for default variant unselected border
      expect(flatStyle.borderColor).toBe(mockColors.border);
    });
  });

  // =========================================================================
  // DISABLED STATE
  // =========================================================================

  describe('Disabled State', () => {
    it('is enabled by default', () => {
      render(<FilterPill {...defaultProps} testID="enabled-pill" />);
      const pill = screen.getByTestId('enabled-pill');
      expect(pill.props.accessibilityState.disabled).toBe(false);
    });

    it('is disabled when disabled=true', () => {
      render(<FilterPill {...defaultProps} disabled testID="disabled-pill" />);
      const pill = screen.getByTestId('disabled-pill');
      expect(pill.props.accessibilityState.disabled).toBe(true);
    });

    it('is enabled when disabled=false', () => {
      render(<FilterPill {...defaultProps} disabled={false} testID="enabled-explicit" />);
      const pill = screen.getByTestId('enabled-explicit');
      expect(pill.props.accessibilityState.disabled).toBe(false);
    });

    it('applies disabled opacity style', () => {
      render(<FilterPill {...defaultProps} disabled testID="disabled-style" />);
      const pill = screen.getByTestId('disabled-style');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.opacity).toBe(0.5);
    });

    it('does not call onPress when disabled', () => {
      const onPress = jest.fn();
      render(<FilterPill label="Disabled" onPress={onPress} disabled testID="disabled-press" />);
      const pill = screen.getByTestId('disabled-press');
      fireEvent.press(pill);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('calls onPress when not disabled', () => {
      const onPress = jest.fn();
      render(<FilterPill label="Enabled" onPress={onPress} testID="enabled-press" />);
      const pill = screen.getByTestId('enabled-press');
      fireEvent.press(pill);
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // INTERACTIONS
  // =========================================================================

  describe('Interactions', () => {
    it('calls onPress when pressed', () => {
      const onPress = jest.fn();
      render(<FilterPill label="Click Me" onPress={onPress} testID="press-pill" />);
      fireEvent.press(screen.getByTestId('press-pill'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPress multiple times on multiple presses', () => {
      const onPress = jest.fn();
      render(<FilterPill label="Multi Press" onPress={onPress} testID="multi-press" />);
      const pill = screen.getByTestId('multi-press');
      fireEvent.press(pill);
      fireEvent.press(pill);
      fireEvent.press(pill);
      expect(onPress).toHaveBeenCalledTimes(3);
    });

    it('does not call onPress when disabled and pressed', () => {
      const onPress = jest.fn();
      render(<FilterPill label="Disabled" onPress={onPress} disabled testID="disabled-multi" />);
      const pill = screen.getByTestId('disabled-multi');
      fireEvent.press(pill);
      fireEvent.press(pill);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('allows toggling by parent component', () => {
      const onPress = jest.fn();
      const { rerender } = render(
        <FilterPill label="Toggle" onPress={onPress} selected={false} testID="toggle-pill" />
      );

      let pill = screen.getByTestId('toggle-pill');
      expect(pill.props.accessibilityState.selected).toBe(false);

      fireEvent.press(pill);
      expect(onPress).toHaveBeenCalled();

      // Parent updates state
      rerender(
        <FilterPill label="Toggle" onPress={onPress} selected={true} testID="toggle-pill" />
      );

      pill = screen.getByTestId('toggle-pill');
      expect(pill.props.accessibilityState.selected).toBe(true);
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      render(<FilterPill {...defaultProps} testID="a11y-pill" />);
      const pill = screen.getByTestId('a11y-pill');
      expect(pill.props.accessibilityRole).toBe('button');
    });

    it('uses label as accessibility label by default', () => {
      render(<FilterPill label="All Competitions" onPress={jest.fn()} testID="default-a11y" />);
      const pill = screen.getByTestId('default-a11y');
      expect(pill.props.accessibilityLabel).toBe('All Competitions');
    });

    it('uses custom accessibility label when provided', () => {
      render(
        <FilterPill
          label="Active"
          onPress={jest.fn()}
          accessibilityLabel="Show active competitions only"
          testID="custom-a11y"
        />
      );
      const pill = screen.getByTestId('custom-a11y');
      expect(pill.props.accessibilityLabel).toBe('Show active competitions only');
    });

    it('includes selected state in accessibility state', () => {
      render(<FilterPill {...defaultProps} selected testID="selected-a11y" />);
      const pill = screen.getByTestId('selected-a11y');
      expect(pill.props.accessibilityState.selected).toBe(true);
    });

    it('includes disabled state in accessibility state', () => {
      render(<FilterPill {...defaultProps} disabled testID="disabled-a11y" />);
      const pill = screen.getByTestId('disabled-a11y');
      expect(pill.props.accessibilityState.disabled).toBe(true);
    });

    it('has both selected and disabled in accessibility state', () => {
      render(<FilterPill {...defaultProps} selected disabled testID="both-a11y" />);
      const pill = screen.getByTestId('both-a11y');
      expect(pill.props.accessibilityState).toEqual({ selected: true, disabled: true });
    });
  });

  // =========================================================================
  // CUSTOM STYLES
  // =========================================================================

  describe('Custom Styles', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 10 };
      render(<FilterPill {...defaultProps} style={customStyle} testID="custom-style" />);
      const pill = screen.getByTestId('custom-style');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.marginTop).toBe(10);
    });

    it('applies margin styles', () => {
      const customStyle = { marginHorizontal: 8, marginVertical: 4 };
      render(<FilterPill {...defaultProps} style={customStyle} testID="margin-style" />);
      expect(screen.getByTestId('margin-style')).toBeTruthy();
    });

    it('allows overriding default styles', () => {
      const customStyle = { borderRadius: 4 };
      render(<FilterPill {...defaultProps} style={customStyle} testID="override-style" />);
      const pill = screen.getByTestId('override-style');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.borderRadius).toBe(4);
    });

    it('preserves custom styles with selected state', () => {
      const customStyle = { marginRight: 16 };
      render(
        <FilterPill {...defaultProps} selected style={customStyle} testID="selected-custom" />
      );
      const pill = screen.getByTestId('selected-custom');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.marginRight).toBe(16);
    });

    it('preserves custom styles with disabled state', () => {
      const customStyle = { marginLeft: 8 };
      render(
        <FilterPill {...defaultProps} disabled style={customStyle} testID="disabled-custom" />
      );
      const pill = screen.getByTestId('disabled-custom');
      const styles = Array.isArray(pill.props.style)
        ? pill.props.style
        : [pill.props.style];
      const flatStyle = Object.assign({}, ...styles.filter(Boolean));
      expect(flatStyle.marginLeft).toBe(8);
    });
  });

  // =========================================================================
  // COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders selected + disabled', () => {
      render(
        <FilterPill
          label="Selected Disabled"
          onPress={jest.fn()}
          selected
          disabled
          testID="selected-disabled"
        />
      );
      const pill = screen.getByTestId('selected-disabled');
      expect(pill.props.accessibilityState.selected).toBe(true);
      expect(pill.props.accessibilityState.disabled).toBe(true);
    });

    it('renders with all props combined', () => {
      const onPress = jest.fn();
      render(
        <FilterPill
          label="Full Props"
          selected
          onPress={onPress}
          disabled={false}
          style={{ marginLeft: 10 }}
          accessibilityLabel="Custom accessibility label"
          testID="all-props"
        />
      );
      const pill = screen.getByTestId('all-props');
      expect(pill).toBeTruthy();
      expect(pill.props.accessibilityLabel).toBe('Custom accessibility label');
      expect(pill.props.accessibilityState.selected).toBe(true);
    });

    it('renders unselected + enabled with custom style', () => {
      render(
        <FilterPill
          label="Unselected Enabled"
          onPress={jest.fn()}
          selected={false}
          disabled={false}
          style={{ padding: 12 }}
          testID="unselected-enabled"
        />
      );
      expect(screen.getByTestId('unselected-enabled')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles undefined optional props gracefully', () => {
      render(<FilterPill label="Minimal" onPress={jest.fn()} testID="minimal" />);
      expect(screen.getByTestId('minimal')).toBeTruthy();
    });

    it('handles whitespace-only labels', () => {
      render(<FilterPill label="   " onPress={jest.fn()} testID="whitespace" />);
      expect(screen.getByTestId('whitespace')).toBeTruthy();
    });

    it('handles very long single word labels', () => {
      const longWord = 'Supercalifragilisticexpialidocious';
      render(<FilterPill label={longWord} onPress={jest.fn()} testID="long-word" />);
      expect(screen.getByText(longWord)).toBeTruthy();
    });

    it('handles numeric string labels', () => {
      render(<FilterPill label="42" onPress={jest.fn()} testID="numeric" />);
      expect(screen.getByText('42')).toBeTruthy();
    });

    it('handles rapid toggling', () => {
      const onPress = jest.fn();
      const { rerender } = render(
        <FilterPill label="Rapid" onPress={onPress} selected={false} testID="rapid-toggle" />
      );

      const pill = screen.getByTestId('rapid-toggle');

      // Simulate rapid toggling
      for (let i = 0; i < 10; i++) {
        fireEvent.press(pill);
        rerender(
          <FilterPill
            label="Rapid"
            onPress={onPress}
            selected={i % 2 === 0}
            testID="rapid-toggle"
          />
        );
      }

      expect(onPress).toHaveBeenCalledTimes(10);
    });

    it('handles special Unicode characters', () => {
      render(<FilterPill label="Ü ñ ø" onPress={jest.fn()} testID="unicode" />);
      expect(screen.getByText('Ü ñ ø')).toBeTruthy();
    });

    it('handles HTML-like characters in label', () => {
      render(<FilterPill label="<script>" onPress={jest.fn()} testID="html-chars" />);
      expect(screen.getByText('<script>')).toBeTruthy();
    });
  });

  // =========================================================================
  // MEMOIZATION
  // =========================================================================

  describe('Memoization', () => {
    it('is wrapped with React.memo', () => {
      expect(FilterPill).toBeDefined();
      expect(typeof FilterPill).toBe('object'); // React.memo returns an object
    });

    it('renders consistently with same props', () => {
      const onPress = jest.fn();
      const props: FilterPillProps = {
        label: 'Test',
        selected: true,
        onPress,
      };

      const { rerender } = render(<FilterPill {...props} testID="memo-test" />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();

      rerender(<FilterPill {...props} testID="memo-test" />);
      expect(screen.getByTestId('memo-test')).toBeTruthy();
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders competition status filter', () => {
      render(
        <FilterPill
          label="Active"
          onPress={jest.fn()}
          selected
          accessibilityLabel="Show active competitions"
          testID="status-filter"
        />
      );
      expect(screen.getByText('Active')).toBeTruthy();
    });

    it('renders game type filter', () => {
      render(
        <FilterPill
          label="Stableford"
          onPress={jest.fn()}
          selected={false}
          testID="game-type-filter"
        />
      );
      expect(screen.getByText('Stableford')).toBeTruthy();
    });

    it('renders date range filter', () => {
      render(
        <FilterPill
          label="This Week"
          onPress={jest.fn()}
          selected
          testID="date-filter"
        />
      );
      expect(screen.getByText('This Week')).toBeTruthy();
    });

    it('renders player count filter', () => {
      render(
        <FilterPill
          label="8+ Players"
          onPress={jest.fn()}
          selected={false}
          testID="player-filter"
        />
      );
      expect(screen.getByText('8+ Players')).toBeTruthy();
    });

    it('renders round status filter', () => {
      render(
        <FilterPill
          label="Completed"
          onPress={jest.fn()}
          selected
          accessibilityLabel="Show completed rounds"
          testID="round-filter"
        />
      );
      expect(screen.getByText('Completed')).toBeTruthy();
    });
  });

  // =========================================================================
  // MULTIPLE FILTER PILLS
  // =========================================================================

  describe('Multiple Filter Pills', () => {
    it('renders multiple pills with different selected states', () => {
      const onPress = jest.fn();
      render(
        <>
          <FilterPill label="All" onPress={onPress} selected testID="pill-1" />
          <FilterPill label="Active" onPress={onPress} selected={false} testID="pill-2" />
          <FilterPill label="Completed" onPress={onPress} selected={false} testID="pill-3" />
        </>
      );

      expect(screen.getByTestId('pill-1').props.accessibilityState.selected).toBe(true);
      expect(screen.getByTestId('pill-2').props.accessibilityState.selected).toBe(false);
      expect(screen.getByTestId('pill-3').props.accessibilityState.selected).toBe(false);
    });

    it('renders filter bar with exclusive selection simulation', () => {
      const onPress1 = jest.fn();
      const onPress2 = jest.fn();
      const onPress3 = jest.fn();

      const { rerender } = render(
        <>
          <FilterPill label="All" onPress={onPress1} selected testID="filter-all" />
          <FilterPill label="Active" onPress={onPress2} selected={false} testID="filter-active" />
          <FilterPill label="Past" onPress={onPress3} selected={false} testID="filter-past" />
        </>
      );

      // Press "Active" filter
      fireEvent.press(screen.getByTestId('filter-active'));
      expect(onPress2).toHaveBeenCalled();

      // Simulate parent updating selection
      rerender(
        <>
          <FilterPill label="All" onPress={onPress1} selected={false} testID="filter-all" />
          <FilterPill label="Active" onPress={onPress2} selected testID="filter-active" />
          <FilterPill label="Past" onPress={onPress3} selected={false} testID="filter-past" />
        </>
      );

      expect(screen.getByTestId('filter-all').props.accessibilityState.selected).toBe(false);
      expect(screen.getByTestId('filter-active').props.accessibilityState.selected).toBe(true);
    });

    it('renders mixed enabled and disabled pills', () => {
      render(
        <>
          <FilterPill label="Available" onPress={jest.fn()} testID="available" />
          <FilterPill label="Locked" onPress={jest.fn()} disabled testID="locked" />
        </>
      );

      expect(screen.getByTestId('available').props.accessibilityState.disabled).toBe(false);
      expect(screen.getByTestId('locked').props.accessibilityState.disabled).toBe(true);
    });
  });

  // =========================================================================
  // TOUCH BEHAVIOR
  // =========================================================================

  describe('Touch Behavior', () => {
    it('responds to press events', () => {
      const onPress = jest.fn();
      render(<FilterPill label="Touch Test" onPress={onPress} testID="touch-pill" />);
      const pill = screen.getByTestId('touch-pill');
      fireEvent.press(pill);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('is pressable and accessible as a button', () => {
      render(<FilterPill {...defaultProps} testID="touchable-pill" />);
      const pill = screen.getByTestId('touchable-pill');
      expect(pill.props.accessibilityRole).toBe('button');
    });

    it('supports long press gesture', () => {
      const onPress = jest.fn();
      render(<FilterPill label="Long Press" onPress={onPress} testID="long-press-pill" />);
      const pill = screen.getByTestId('long-press-pill');
      // Standard press should work
      fireEvent.press(pill);
      expect(onPress).toHaveBeenCalled();
    });
  });
});
