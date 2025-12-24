/**
 * SegmentedButton Component Tests
 *
 * Tests for the segmented button component including:
 * - Rendering with different props
 * - Size variants (small, medium, large)
 * - Selection behavior
 * - Disabled states (entire component and individual segments)
 * - Icons in segments
 * - Accessibility
 * - User interactions
 * - Custom styles
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SegmentedButton, SegmentOption } from './SegmentedButton';

// Mock ThemeContext
const mockColors = {
  primary: '#1E7F5E',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  gray300: '#D1D5DB',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
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
    Icon: ({ source, size, color, ...props }: any) => (
      <View testID={`icon-${source}`} {...props} />
    ),
  };
});

// Default test buttons
const defaultButtons: SegmentOption<string>[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('SegmentedButton', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );
      expect(screen.getByText('Option 1')).toBeTruthy();
    });

    it('renders all button labels', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );
      expect(screen.getByText('Option 1')).toBeTruthy();
      expect(screen.getByText('Option 2')).toBeTruthy();
      expect(screen.getByText('Option 3')).toBeTruthy();
    });

    it('renders with two buttons', () => {
      const twoButtons: SegmentOption<string>[] = [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ];
      render(
        <SegmentedButton
          value="yes"
          onValueChange={mockOnValueChange}
          buttons={twoButtons}
        />
      );
      expect(screen.getByText('Yes')).toBeTruthy();
      expect(screen.getByText('No')).toBeTruthy();
    });

    it('renders with four buttons', () => {
      const fourButtons: SegmentOption<string>[] = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
        { value: 'd', label: 'D' },
      ];
      render(
        <SegmentedButton
          value="a"
          onValueChange={mockOnValueChange}
          buttons={fourButtons}
        />
      );
      expect(screen.getByText('A')).toBeTruthy();
      expect(screen.getByText('B')).toBeTruthy();
      expect(screen.getByText('C')).toBeTruthy();
      expect(screen.getByText('D')).toBeTruthy();
    });

    it('renders with long labels', () => {
      const longLabelButtons: SegmentOption<string>[] = [
        { value: 'short', label: 'Short' },
        { value: 'long', label: 'This is a very long label' },
      ];
      render(
        <SegmentedButton
          value="short"
          onValueChange={mockOnValueChange}
          buttons={longLabelButtons}
        />
      );
      expect(screen.getByText('This is a very long label')).toBeTruthy();
    });

    it('renders with numeric labels', () => {
      const numericButtons: SegmentOption<string>[] = [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ];
      render(
        <SegmentedButton
          value="1"
          onValueChange={mockOnValueChange}
          buttons={numericButtons}
        />
      );
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('renders with special characters in labels', () => {
      const specialButtons: SegmentOption<string>[] = [
        { value: 'at', label: '@Event' },
        { value: 'hash', label: '#Tag' },
      ];
      render(
        <SegmentedButton
          value="at"
          onValueChange={mockOnValueChange}
          buttons={specialButtons}
        />
      );
      expect(screen.getByText('@Event')).toBeTruthy();
      expect(screen.getByText('#Tag')).toBeTruthy();
    });
  });

  // =========================================================================
  // SIZE VARIANTS
  // =========================================================================

  describe('Size Variants', () => {
    it('renders with default size (medium) when not specified', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );
      expect(screen.getByText('Option 1')).toBeTruthy();
    });

    it('renders with small size', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          size="small"
        />
      );
      expect(screen.getByText('Option 1')).toBeTruthy();
    });

    it('renders with medium size', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          size="medium"
        />
      );
      expect(screen.getByText('Option 1')).toBeTruthy();
    });

    it('renders with large size', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          size="large"
        />
      );
      expect(screen.getByText('Option 1')).toBeTruthy();
    });

    it('renders all sizes with same content', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      sizes.forEach((size) => {
        const { unmount } = render(
          <SegmentedButton
            value="option1"
            onValueChange={mockOnValueChange}
            buttons={defaultButtons}
            size={size}
          />
        );
        expect(screen.getByText('Option 1')).toBeTruthy();
        unmount();
      });
    });
  });

  // =========================================================================
  // SELECTION BEHAVIOR
  // =========================================================================

  describe('Selection Behavior', () => {
    it('shows first option as selected when value matches', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );
      const option1 = screen.getByLabelText('Option 1, selected');
      expect(option1).toBeTruthy();
    });

    it('shows middle option as selected when value matches', () => {
      render(
        <SegmentedButton
          value="option2"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );
      const option2 = screen.getByLabelText('Option 2, selected');
      expect(option2).toBeTruthy();
    });

    it('shows last option as selected when value matches', () => {
      render(
        <SegmentedButton
          value="option3"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );
      const option3 = screen.getByLabelText('Option 3, selected');
      expect(option3).toBeTruthy();
    });

    it('marks non-selected options correctly', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );
      // Option 1 should be selected
      expect(screen.getByLabelText('Option 1, selected')).toBeTruthy();
      // Option 2 and 3 should not be selected
      expect(screen.getByLabelText('Option 2')).toBeTruthy();
      expect(screen.getByLabelText('Option 3')).toBeTruthy();
    });

    it('updates selected state when value prop changes', () => {
      const { rerender } = render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );
      expect(screen.getByLabelText('Option 1, selected')).toBeTruthy();

      rerender(
        <SegmentedButton
          value="option2"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );
      expect(screen.getByLabelText('Option 2, selected')).toBeTruthy();
      expect(screen.getByLabelText('Option 1')).toBeTruthy();
    });
  });

  // =========================================================================
  // USER INTERACTIONS
  // =========================================================================

  describe('User Interactions', () => {
    it('calls onValueChange when unselected option is pressed', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      fireEvent.press(screen.getByLabelText('Option 2'));
      expect(mockOnValueChange).toHaveBeenCalledWith('option2');
    });

    it('calls onValueChange when last option is pressed', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      fireEvent.press(screen.getByLabelText('Option 3'));
      expect(mockOnValueChange).toHaveBeenCalledWith('option3');
    });

    it('calls onValueChange when pressing selected option', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      fireEvent.press(screen.getByLabelText('Option 1, selected'));
      expect(mockOnValueChange).toHaveBeenCalledWith('option1');
    });

    it('calls onValueChange with correct value for each option', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      fireEvent.press(screen.getByLabelText('Option 2'));
      expect(mockOnValueChange).toHaveBeenCalledWith('option2');

      fireEvent.press(screen.getByLabelText('Option 3'));
      expect(mockOnValueChange).toHaveBeenCalledWith('option3');

      expect(mockOnValueChange).toHaveBeenCalledTimes(2);
    });

    it('does not call onValueChange when component is disabled', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          disabled
        />
      );

      fireEvent.press(screen.getByLabelText('Option 2'));
      expect(mockOnValueChange).not.toHaveBeenCalled();
    });

    it('does not call onValueChange when individual button is disabled', () => {
      const buttonsWithDisabled: SegmentOption<string>[] = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2', disabled: true },
        { value: 'option3', label: 'Option 3' },
      ];

      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={buttonsWithDisabled}
        />
      );

      fireEvent.press(screen.getByLabelText('Option 2'));
      expect(mockOnValueChange).not.toHaveBeenCalled();

      // Other buttons should still work
      fireEvent.press(screen.getByLabelText('Option 3'));
      expect(mockOnValueChange).toHaveBeenCalledWith('option3');
    });
  });

  // =========================================================================
  // DISABLED STATES
  // =========================================================================

  describe('Disabled States', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          disabled
        />
      );

      fireEvent.press(screen.getByLabelText('Option 1, selected'));
      fireEvent.press(screen.getByLabelText('Option 2'));
      fireEvent.press(screen.getByLabelText('Option 3'));

      expect(mockOnValueChange).not.toHaveBeenCalled();
    });

    it('disables only specific button when button.disabled is true', () => {
      const buttonsWithDisabled: SegmentOption<string>[] = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2', disabled: true },
        { value: 'option3', label: 'Option 3' },
      ];

      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={buttonsWithDisabled}
        />
      );

      // Disabled button should not work
      fireEvent.press(screen.getByLabelText('Option 2'));
      expect(mockOnValueChange).not.toHaveBeenCalled();

      // Enabled buttons should work
      fireEvent.press(screen.getByLabelText('Option 3'));
      expect(mockOnValueChange).toHaveBeenCalledWith('option3');
    });

    it('handles multiple disabled buttons', () => {
      const buttonsWithDisabled: SegmentOption<string>[] = [
        { value: 'option1', label: 'Option 1', disabled: true },
        { value: 'option2', label: 'Option 2', disabled: true },
        { value: 'option3', label: 'Option 3' },
      ];

      render(
        <SegmentedButton
          value="option3"
          onValueChange={mockOnValueChange}
          buttons={buttonsWithDisabled}
        />
      );

      fireEvent.press(screen.getByLabelText('Option 1'));
      fireEvent.press(screen.getByLabelText('Option 2'));
      expect(mockOnValueChange).not.toHaveBeenCalled();

      fireEvent.press(screen.getByLabelText('Option 3, selected'));
      expect(mockOnValueChange).toHaveBeenCalledWith('option3');
    });

    it('component disabled takes precedence over button.disabled=false', () => {
      const buttonsExplicitlyEnabled: SegmentOption<string>[] = [
        { value: 'option1', label: 'Option 1', disabled: false },
        { value: 'option2', label: 'Option 2', disabled: false },
      ];

      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={buttonsExplicitlyEnabled}
          disabled
        />
      );

      fireEvent.press(screen.getByLabelText('Option 2'));
      expect(mockOnValueChange).not.toHaveBeenCalled();
    });

    it('selected disabled button still shows as selected', () => {
      const buttonsWithDisabled: SegmentOption<string>[] = [
        { value: 'option1', label: 'Option 1', disabled: true },
        { value: 'option2', label: 'Option 2' },
      ];

      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={buttonsWithDisabled}
        />
      );

      expect(screen.getByLabelText('Option 1, selected')).toBeTruthy();
    });
  });

  // =========================================================================
  // ICONS
  // =========================================================================

  describe('Icons', () => {
    it('renders buttons with icons', () => {
      const buttonsWithIcons: SegmentOption<string>[] = [
        { value: 'event', label: 'Event', icon: 'calendar-star' },
        { value: 'league', label: 'League', icon: 'trophy-outline' },
      ];

      render(
        <SegmentedButton
          value="event"
          onValueChange={mockOnValueChange}
          buttons={buttonsWithIcons}
        />
      );

      expect(screen.getByTestId('icon-calendar-star')).toBeTruthy();
      expect(screen.getByTestId('icon-trophy-outline')).toBeTruthy();
    });

    it('renders mix of buttons with and without icons', () => {
      const mixedButtons: SegmentOption<string>[] = [
        { value: 'with', label: 'With Icon', icon: 'star' },
        { value: 'without', label: 'Without Icon' },
      ];

      render(
        <SegmentedButton
          value="with"
          onValueChange={mockOnValueChange}
          buttons={mixedButtons}
        />
      );

      expect(screen.getByTestId('icon-star')).toBeTruthy();
      expect(screen.getByText('Without Icon')).toBeTruthy();
    });

    it('renders icon-only buttons with labels', () => {
      const iconButtons: SegmentOption<string>[] = [
        { value: 'grid', label: 'Grid', icon: 'grid-view' },
        { value: 'list', label: 'List', icon: 'list-view' },
      ];

      render(
        <SegmentedButton
          value="grid"
          onValueChange={mockOnValueChange}
          buttons={iconButtons}
        />
      );

      expect(screen.getByTestId('icon-grid-view')).toBeTruthy();
      expect(screen.getByTestId('icon-list-view')).toBeTruthy();
      expect(screen.getByText('Grid')).toBeTruthy();
      expect(screen.getByText('List')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has correct accessibility role on buttons', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      const selectedButton = screen.getByLabelText('Option 1, selected');
      expect(selectedButton.props.accessibilityRole).toBe('button');
    });

    it('indicates selected state in accessibility', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      const selectedButton = screen.getByLabelText('Option 1, selected');
      expect(selectedButton.props.accessibilityState.selected).toBe(true);

      const unselectedButton = screen.getByLabelText('Option 2');
      expect(unselectedButton.props.accessibilityState.selected).toBe(false);
    });

    it('indicates disabled state in accessibility', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          disabled
        />
      );

      const button = screen.getByLabelText('Option 2');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('indicates individual button disabled state', () => {
      const buttonsWithDisabled: SegmentOption<string>[] = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2', disabled: true },
      ];

      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={buttonsWithDisabled}
        />
      );

      const enabledButton = screen.getByLabelText('Option 1, selected');
      expect(enabledButton.props.accessibilityState.disabled).toBeFalsy();

      const disabledButton = screen.getByLabelText('Option 2');
      expect(disabledButton.props.accessibilityState.disabled).toBe(true);
    });

    it('provides meaningful accessibility labels', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      expect(screen.getByLabelText('Option 1, selected')).toBeTruthy();
      expect(screen.getByLabelText('Option 2')).toBeTruthy();
      expect(screen.getByLabelText('Option 3')).toBeTruthy();
    });
  });

  // =========================================================================
  // CUSTOM STYLES
  // =========================================================================

  describe('Custom Styles', () => {
    it('applies custom style prop to container', () => {
      const { UNSAFE_root } = render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          style={{ marginTop: 20 }}
        />
      );

      // Check that the component renders with custom style
      expect(UNSAFE_root).toBeTruthy();
    });

    it('applies margin styles', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          style={{ marginHorizontal: 16, marginVertical: 8 }}
        />
      );

      expect(screen.getByText('Option 1')).toBeTruthy();
    });

    it('applies padding override styles', () => {
      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          style={{ padding: 20 }}
        />
      );

      expect(screen.getByText('Option 1')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles single button', () => {
      const singleButton: SegmentOption<string>[] = [
        { value: 'only', label: 'Only Option' },
      ];

      render(
        <SegmentedButton
          value="only"
          onValueChange={mockOnValueChange}
          buttons={singleButton}
        />
      );

      expect(screen.getByText('Only Option')).toBeTruthy();
    });

    it('handles empty label gracefully', () => {
      const emptyLabelButtons: SegmentOption<string>[] = [
        { value: 'empty', label: '' },
        { value: 'normal', label: 'Normal' },
      ];

      render(
        <SegmentedButton
          value="empty"
          onValueChange={mockOnValueChange}
          buttons={emptyLabelButtons}
        />
      );

      expect(screen.getByText('Normal')).toBeTruthy();
    });

    it('handles whitespace-only labels', () => {
      const whitespaceButtons: SegmentOption<string>[] = [
        { value: 'space', label: '   ' },
        { value: 'normal', label: 'Normal' },
      ];

      render(
        <SegmentedButton
          value="space"
          onValueChange={mockOnValueChange}
          buttons={whitespaceButtons}
        />
      );

      expect(screen.getByText('Normal')).toBeTruthy();
    });

    it('handles very long values', () => {
      const longValueButtons: SegmentOption<string>[] = [
        { value: 'very-long-value-that-should-still-work', label: 'Long Value' },
        { value: 'short', label: 'Short' },
      ];

      render(
        <SegmentedButton
          value="very-long-value-that-should-still-work"
          onValueChange={mockOnValueChange}
          buttons={longValueButtons}
        />
      );

      expect(screen.getByLabelText('Long Value, selected')).toBeTruthy();
    });

    it('handles value that does not match any button', () => {
      render(
        <SegmentedButton
          value="nonexistent"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      // All buttons should render but none should be selected
      expect(screen.getByText('Option 1')).toBeTruthy();
      expect(screen.getByText('Option 2')).toBeTruthy();
      expect(screen.getByText('Option 3')).toBeTruthy();
    });

    it('handles buttons with duplicate labels but different values', () => {
      const duplicateLabelButtons: SegmentOption<string>[] = [
        { value: 'option1', label: 'Same Label' },
        { value: 'option2', label: 'Same Label' },
      ];

      render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={duplicateLabelButtons}
        />
      );

      const buttons = screen.getAllByText('Same Label');
      expect(buttons.length).toBe(2);
    });
  });

  // =========================================================================
  // GENERIC TYPE SUPPORT
  // =========================================================================

  describe('Generic Type Support', () => {
    it('works with string literal type', () => {
      type GameType = 'stableford' | 'stroke' | 'match';
      const gameButtons: SegmentOption<GameType>[] = [
        { value: 'stableford', label: 'Stableford' },
        { value: 'stroke', label: 'Stroke Play' },
        { value: 'match', label: 'Match Play' },
      ];

      const handleChange = jest.fn<void, [GameType]>();

      render(
        <SegmentedButton<GameType>
          value="stableford"
          onValueChange={handleChange}
          buttons={gameButtons}
        />
      );

      fireEvent.press(screen.getByLabelText('Stroke Play'));
      expect(handleChange).toHaveBeenCalledWith('stroke');
    });

    it('works with enum-like values', () => {
      const enumButtons: SegmentOption<string>[] = [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'COMPLETED', label: 'Completed' },
      ];

      render(
        <SegmentedButton
          value="DRAFT"
          onValueChange={mockOnValueChange}
          buttons={enumButtons}
        />
      );

      fireEvent.press(screen.getByLabelText('Active'));
      expect(mockOnValueChange).toHaveBeenCalledWith('ACTIVE');
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('renders competition type selector', () => {
      const typeButtons: SegmentOption<string>[] = [
        { value: 'event', label: 'Event', icon: 'calendar-star' },
        { value: 'league', label: 'League', icon: 'trophy-outline' },
      ];

      render(
        <SegmentedButton
          value="event"
          onValueChange={mockOnValueChange}
          buttons={typeButtons}
        />
      );

      expect(screen.getByText('Event')).toBeTruthy();
      expect(screen.getByText('League')).toBeTruthy();
    });

    it('renders game type selector', () => {
      const gameButtons: SegmentOption<string>[] = [
        { value: 'stableford', label: 'Stableford' },
        { value: 'stroke', label: 'Stroke' },
        { value: 'match', label: 'Match' },
      ];

      render(
        <SegmentedButton
          value="stableford"
          onValueChange={mockOnValueChange}
          buttons={gameButtons}
        />
      );

      expect(screen.getByText('Stableford')).toBeTruthy();
      expect(screen.getByText('Stroke')).toBeTruthy();
      expect(screen.getByText('Match')).toBeTruthy();
    });

    it('renders view mode selector', () => {
      const viewButtons: SegmentOption<string>[] = [
        { value: 'grid', label: 'Grid', icon: 'view-grid' },
        { value: 'list', label: 'List', icon: 'view-list' },
      ];

      render(
        <SegmentedButton
          value="grid"
          onValueChange={mockOnValueChange}
          buttons={viewButtons}
        />
      );

      expect(screen.getByText('Grid')).toBeTruthy();
      expect(screen.getByText('List')).toBeTruthy();
    });

    it('renders yes/no toggle', () => {
      const yesNoButtons: SegmentOption<string>[] = [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ];

      render(
        <SegmentedButton
          value="yes"
          onValueChange={mockOnValueChange}
          buttons={yesNoButtons}
        />
      );

      expect(screen.getByLabelText('Yes, selected')).toBeTruthy();
      expect(screen.getByLabelText('No')).toBeTruthy();
    });

    it('renders scoring format selector', () => {
      const formatButtons: SegmentOption<string>[] = [
        { value: 'individual', label: 'Individual' },
        { value: 'team', label: 'Team' },
      ];

      render(
        <SegmentedButton
          value="individual"
          onValueChange={mockOnValueChange}
          buttons={formatButtons}
        />
      );

      expect(screen.getByText('Individual')).toBeTruthy();
      expect(screen.getByText('Team')).toBeTruthy();
    });

    it('renders round status selector', () => {
      const statusButtons: SegmentOption<string>[] = [
        { value: 'all', label: 'All' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'completed', label: 'Completed' },
      ];

      render(
        <SegmentedButton
          value="all"
          onValueChange={mockOnValueChange}
          buttons={statusButtons}
        />
      );

      expect(screen.getByText('All')).toBeTruthy();
      expect(screen.getByText('Upcoming')).toBeTruthy();
      expect(screen.getByText('Completed')).toBeTruthy();
    });
  });

  // =========================================================================
  // RERENDERING
  // =========================================================================

  describe('Rerendering', () => {
    it('updates when value prop changes', () => {
      const { rerender } = render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      expect(screen.getByLabelText('Option 1, selected')).toBeTruthy();

      rerender(
        <SegmentedButton
          value="option3"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      expect(screen.getByLabelText('Option 3, selected')).toBeTruthy();
      expect(screen.getByLabelText('Option 1')).toBeTruthy();
    });

    it('updates when buttons prop changes', () => {
      const { rerender } = render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
        />
      );

      expect(screen.getByText('Option 1')).toBeTruthy();

      const newButtons: SegmentOption<string>[] = [
        { value: 'new1', label: 'New 1' },
        { value: 'new2', label: 'New 2' },
      ];

      rerender(
        <SegmentedButton
          value="new1"
          onValueChange={mockOnValueChange}
          buttons={newButtons}
        />
      );

      expect(screen.getByText('New 1')).toBeTruthy();
      expect(screen.getByText('New 2')).toBeTruthy();
      expect(screen.queryByText('Option 1')).toBeNull();
    });

    it('updates when disabled prop changes', () => {
      const { rerender } = render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          disabled={false}
        />
      );

      fireEvent.press(screen.getByLabelText('Option 2'));
      expect(mockOnValueChange).toHaveBeenCalledWith('option2');

      mockOnValueChange.mockClear();

      rerender(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          disabled
        />
      );

      fireEvent.press(screen.getByLabelText('Option 2'));
      expect(mockOnValueChange).not.toHaveBeenCalled();
    });

    it('updates when size prop changes', () => {
      const { rerender } = render(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          size="small"
        />
      );

      expect(screen.getByText('Option 1')).toBeTruthy();

      rerender(
        <SegmentedButton
          value="option1"
          onValueChange={mockOnValueChange}
          buttons={defaultButtons}
          size="large"
        />
      );

      expect(screen.getByText('Option 1')).toBeTruthy();
    });
  });

  // =========================================================================
  // MULTIPLE INSTANCES
  // =========================================================================

  describe('Multiple Instances', () => {
    it('renders multiple instances independently', () => {
      render(
        <>
          <SegmentedButton
            value="option1"
            onValueChange={mockOnValueChange}
            buttons={[
              { value: 'option1', label: 'First A' },
              { value: 'option2', label: 'First B' },
            ]}
          />
          <SegmentedButton
            value="option2"
            onValueChange={mockOnValueChange}
            buttons={[
              { value: 'option1', label: 'Second A' },
              { value: 'option2', label: 'Second B' },
            ]}
          />
        </>
      );

      expect(screen.getByText('First A')).toBeTruthy();
      expect(screen.getByText('First B')).toBeTruthy();
      expect(screen.getByText('Second A')).toBeTruthy();
      expect(screen.getByText('Second B')).toBeTruthy();
    });

    it('handles interactions independently', () => {
      const handleFirst = jest.fn();
      const handleSecond = jest.fn();

      render(
        <>
          <SegmentedButton
            value="a"
            onValueChange={handleFirst}
            buttons={[
              { value: 'a', label: 'First A' },
              { value: 'b', label: 'First B' },
            ]}
          />
          <SegmentedButton
            value="a"
            onValueChange={handleSecond}
            buttons={[
              { value: 'a', label: 'Second A' },
              { value: 'b', label: 'Second B' },
            ]}
          />
        </>
      );

      fireEvent.press(screen.getByLabelText('First B'));
      expect(handleFirst).toHaveBeenCalledWith('b');
      expect(handleSecond).not.toHaveBeenCalled();

      handleFirst.mockClear();

      fireEvent.press(screen.getByLabelText('Second B'));
      expect(handleSecond).toHaveBeenCalledWith('b');
      expect(handleFirst).not.toHaveBeenCalled();
    });
  });
});
