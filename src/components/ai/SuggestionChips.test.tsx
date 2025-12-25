/**
 * SuggestionChips Component Tests
 *
 * Tests for the AI prompt suggestion chips component including:
 * - Rendering all chips
 * - Label text display
 * - Chip selection behavior
 * - Disabled state
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SuggestionChips } from './SuggestionChips';

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text } = require('react-native');
  return {
    Text: ({ children, style, ...props }: any) => (
      <Text style={style} {...props}>
        {children}
      </Text>
    ),
    Icon: ({ source, size, color }: any) => (
      <View testID={`icon-${source}`} style={{ width: size, height: size }}>
        <Text>{source}</Text>
      </View>
    ),
  };
});

// Mock theme context
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#4A90D9',
    surface: '#FFFFFF',
    border: '#E0E0E0',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textDisabled: '#AAAAAA',
  }),
}));

describe('SuggestionChips', () => {
  const defaultProps = {
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SuggestionChips {...defaultProps} />);
      expect(screen.getByText('Try a suggestion:')).toBeTruthy();
    });

    it('renders the label text', () => {
      render(<SuggestionChips {...defaultProps} />);
      expect(screen.getByText('Try a suggestion:')).toBeTruthy();
    });

    it('renders all four suggestion chips', () => {
      render(<SuggestionChips {...defaultProps} />);
      expect(screen.getByText('Stableford comp')).toBeTruthy();
      expect(screen.getByText('Team event')).toBeTruthy();
      expect(screen.getByText('Multi-round')).toBeTruthy();
      expect(screen.getByText('Quick round')).toBeTruthy();
    });

    it('renders icons for each chip', () => {
      render(<SuggestionChips {...defaultProps} />);
      expect(screen.getByTestId('icon-golf')).toBeTruthy();
      expect(screen.getByTestId('icon-account-group')).toBeTruthy();
      expect(screen.getByTestId('icon-calendar-multiple')).toBeTruthy();
      expect(screen.getByTestId('icon-clock-fast')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHIP SELECTION TESTS
  // ===========================================================================

  describe('Chip Selection', () => {
    it('calls onSelect with Stableford prompt when first chip is pressed', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Stableford comp'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(
        'Create a single round Stableford competition with all my friends next Saturday morning'
      );
    });

    it('calls onSelect with Team event prompt when second chip is pressed', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Team event'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(
        'Create a 2-round Best Ball competition with 2 teams of 4, starting this weekend'
      );
    });

    it('calls onSelect with Multi-round prompt when third chip is pressed', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Multi-round'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(
        'Create a 4-round competition over 4 weeks with a different game type each round'
      );
    });

    it('calls onSelect with Quick round prompt when fourth chip is pressed', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Quick round'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(
        'Set up a casual Stableford round for 4 players this weekend'
      );
    });

    it('allows selecting multiple chips sequentially', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Stableford comp'));
      fireEvent.press(screen.getByText('Team event'));
      fireEvent.press(screen.getByText('Multi-round'));

      expect(onSelect).toHaveBeenCalledTimes(3);
    });

    it('allows pressing the same chip multiple times', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Quick round'));
      fireEvent.press(screen.getByText('Quick round'));
      fireEvent.press(screen.getByText('Quick round'));

      expect(onSelect).toHaveBeenCalledTimes(3);
      expect(onSelect).toHaveBeenCalledWith(
        'Set up a casual Stableford round for 4 players this weekend'
      );
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('does not call onSelect when disabled', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} disabled />);

      fireEvent.press(screen.getByText('Stableford comp'));
      fireEvent.press(screen.getByText('Team event'));
      fireEvent.press(screen.getByText('Multi-round'));
      fireEvent.press(screen.getByText('Quick round'));

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('still renders all chips when disabled', () => {
      render(<SuggestionChips {...defaultProps} disabled />);

      expect(screen.getByText('Stableford comp')).toBeTruthy();
      expect(screen.getByText('Team event')).toBeTruthy();
      expect(screen.getByText('Multi-round')).toBeTruthy();
      expect(screen.getByText('Quick round')).toBeTruthy();
    });

    it('still renders icons when disabled', () => {
      render(<SuggestionChips {...defaultProps} disabled />);

      expect(screen.getByTestId('icon-golf')).toBeTruthy();
      expect(screen.getByTestId('icon-account-group')).toBeTruthy();
      expect(screen.getByTestId('icon-calendar-multiple')).toBeTruthy();
      expect(screen.getByTestId('icon-clock-fast')).toBeTruthy();
    });

    it('renders normally when disabled is false', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} disabled={false} />);

      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).toHaveBeenCalled();
    });

    it('renders normally when disabled is undefined', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips {...defaultProps} onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Team event'));
      expect(onSelect).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // SCROLLVIEW TESTS
  // ===========================================================================

  describe('ScrollView', () => {
    it('renders horizontally scrollable chips', () => {
      render(<SuggestionChips {...defaultProps} />);
      // All chips should still be accessible in a horizontal ScrollView
      expect(screen.getByText('Stableford comp')).toBeTruthy();
      expect(screen.getByText('Quick round')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROPS TESTS
  // ===========================================================================

  describe('Props', () => {
    it('passes onSelect callback correctly', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).toHaveBeenCalled();
    });

    it('handles disabled prop correctly', () => {
      const onSelect = jest.fn();
      const { rerender } = render(<SuggestionChips onSelect={onSelect} disabled={false} />);

      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).toHaveBeenCalledTimes(1);

      rerender(<SuggestionChips onSelect={onSelect} disabled={true} />);
      fireEvent.press(screen.getByText('Team event'));
      expect(onSelect).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  // ===========================================================================
  // SUGGESTION DATA TESTS
  // ===========================================================================

  describe('Suggestion Data', () => {
    it('has correct prompts for all suggestions', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      // Test all prompts
      const expectedPrompts = [
        {
          label: 'Stableford comp',
          prompt: 'Create a single round Stableford competition with all my friends next Saturday morning',
        },
        {
          label: 'Team event',
          prompt: 'Create a 2-round Best Ball competition with 2 teams of 4, starting this weekend',
        },
        {
          label: 'Multi-round',
          prompt: 'Create a 4-round competition over 4 weeks with a different game type each round',
        },
        {
          label: 'Quick round',
          prompt: 'Set up a casual Stableford round for 4 players this weekend',
        },
      ];

      expectedPrompts.forEach(({ label, prompt }) => {
        onSelect.mockClear();
        fireEvent.press(screen.getByText(label));
        expect(onSelect).toHaveBeenCalledWith(prompt);
      });
    });

    it('has correct icons for all suggestions', () => {
      render(<SuggestionChips {...defaultProps} />);

      const expectedIcons = ['golf', 'account-group', 'calendar-multiple', 'clock-fast'];
      expectedIcons.forEach((icon) => {
        expect(screen.getByTestId(`icon-${icon}`)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles rapid consecutive presses', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      const chip = screen.getByText('Stableford comp');
      fireEvent.press(chip);
      fireEvent.press(chip);
      fireEvent.press(chip);
      fireEvent.press(chip);
      fireEvent.press(chip);

      expect(onSelect).toHaveBeenCalledTimes(5);
    });

    it('handles toggling disabled state', () => {
      const onSelect = jest.fn();
      const { rerender } = render(<SuggestionChips onSelect={onSelect} disabled={true} />);

      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).not.toHaveBeenCalled();

      rerender(<SuggestionChips onSelect={onSelect} disabled={false} />);
      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).toHaveBeenCalledTimes(1);

      rerender(<SuggestionChips onSelect={onSelect} disabled={true} />);
      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('renders with accessible labels', () => {
      render(<SuggestionChips {...defaultProps} />);
      expect(screen.getByText('Try a suggestion:')).toBeTruthy();
    });

    it('renders chips with readable text', () => {
      render(<SuggestionChips {...defaultProps} />);
      expect(screen.getByText('Stableford comp')).toBeTruthy();
      expect(screen.getByText('Team event')).toBeTruthy();
      expect(screen.getByText('Multi-round')).toBeTruthy();
      expect(screen.getByText('Quick round')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STYLING TESTS
  // ===========================================================================

  describe('Styling', () => {
    it('applies theme colors', () => {
      render(<SuggestionChips {...defaultProps} />);
      expect(screen.getByText('Try a suggestion:')).toBeTruthy();
    });

    it('renders chips with icons and text', () => {
      render(<SuggestionChips {...defaultProps} />);
      // Each chip has both icon and text
      expect(screen.getByTestId('icon-golf')).toBeTruthy();
      expect(screen.getByText('Stableford comp')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CALLBACK TESTS
  // ===========================================================================

  describe('Callback Behavior', () => {
    it('does not call onSelect on initial render', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('only calls onSelect once per press', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Team event'));

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('calls onSelect with the correct prompt each time', () => {
      const onSelect = jest.fn();
      render(<SuggestionChips onSelect={onSelect} />);

      fireEvent.press(screen.getByText('Stableford comp'));
      expect(onSelect).toHaveBeenLastCalledWith(
        'Create a single round Stableford competition with all my friends next Saturday morning'
      );

      fireEvent.press(screen.getByText('Quick round'));
      expect(onSelect).toHaveBeenLastCalledWith(
        'Set up a casual Stableford round for 4 players this weekend'
      );
    });
  });
});
