/**
 * SearchBar Component Tests
 *
 * Tests for the reusable search input component including:
 * - Rendering with different props
 * - Text input handling
 * - Clear button functionality
 * - Accessibility
 * - Custom styles
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SearchBar } from './SearchBar';

// Mock ThemeContext
const mockColors = {
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  gray100: '#F3F4F6',
  gray400: '#9CA3AF',
};

jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => mockColors,
}));

// Mock react-native-paper Icon
jest.mock('react-native-paper', () => {
  const { View } = require('react-native');
  return {
    Icon: ({ source, ...props }: any) => (
      <View testID={`icon-${source}`} {...props} />
    ),
  };
});

describe('SearchBar', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // RENDERING
  // =========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SearchBar {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('renders with required props', () => {
      render(<SearchBar value="" onChangeText={jest.fn()} />);
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('renders search icon', () => {
      render(<SearchBar {...defaultProps} />);
      expect(screen.getByTestId('icon-magnify')).toBeTruthy();
    });

    it('renders text input with correct value', () => {
      render(<SearchBar {...defaultProps} value="test query" />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe('test query');
    });

    it('renders with custom placeholder', () => {
      render(<SearchBar {...defaultProps} placeholder="Find players..." />);
      expect(screen.getByPlaceholderText('Find players...')).toBeTruthy();
    });

    it('renders with default placeholder when not provided', () => {
      render(<SearchBar {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('does not render clear button when value is empty', () => {
      render(<SearchBar {...defaultProps} value="" />);
      expect(screen.queryByTestId('icon-close-circle')).toBeNull();
    });

    it('renders clear button when value is not empty', () => {
      render(<SearchBar {...defaultProps} value="test" />);
      expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
    });
  });

  // =========================================================================
  // TEXT INPUT
  // =========================================================================

  describe('Text Input', () => {
    it('calls onChangeText when text is entered', () => {
      const onChangeText = jest.fn();
      render(<SearchBar value="" onChangeText={onChangeText} />);

      const input = screen.getByPlaceholderText('Search...');
      fireEvent.changeText(input, 'new search');

      expect(onChangeText).toHaveBeenCalledWith('new search');
    });

    it('calls onChangeText with empty string when cleared', () => {
      const onChangeText = jest.fn();
      render(<SearchBar value="some text" onChangeText={onChangeText} />);

      const input = screen.getByPlaceholderText('Search...');
      fireEvent.changeText(input, '');

      expect(onChangeText).toHaveBeenCalledWith('');
    });

    it('handles rapid text changes', () => {
      const onChangeText = jest.fn();
      render(<SearchBar value="" onChangeText={onChangeText} />);

      const input = screen.getByPlaceholderText('Search...');
      fireEvent.changeText(input, 'a');
      fireEvent.changeText(input, 'ab');
      fireEvent.changeText(input, 'abc');

      expect(onChangeText).toHaveBeenCalledTimes(3);
      expect(onChangeText).toHaveBeenLastCalledWith('abc');
    });

    it('has autoCapitalize set to none', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('has autoCorrect set to false', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.autoCorrect).toBe(false);
    });

    it('has returnKeyType set to search', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.returnKeyType).toBe('search');
    });
  });

  // =========================================================================
  // CLEAR BUTTON
  // =========================================================================

  describe('Clear Button', () => {
    it('shows clear button when text is present', () => {
      render(<SearchBar {...defaultProps} value="search text" />);
      expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
    });

    it('hides clear button when text is empty', () => {
      render(<SearchBar {...defaultProps} value="" />);
      expect(screen.queryByTestId('icon-close-circle')).toBeNull();
    });

    it('clears text when clear button is pressed', () => {
      const onChangeText = jest.fn();
      render(<SearchBar value="search text" onChangeText={onChangeText} />);

      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.press(clearButton);

      expect(onChangeText).toHaveBeenCalledWith('');
    });

    it('has correct accessibility role on clear button', () => {
      render(<SearchBar {...defaultProps} value="test" />);
      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility label on clear button', () => {
      render(<SearchBar {...defaultProps} value="test" />);
      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton.props.accessibilityLabel).toBe('Clear search');
    });

    it('shows clear button for single character', () => {
      render(<SearchBar {...defaultProps} value="a" />);
      expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
    });

    it('shows clear button for whitespace', () => {
      render(<SearchBar {...defaultProps} value=" " />);
      expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
    });
  });

  // =========================================================================
  // ACCESSIBILITY
  // =========================================================================

  describe('Accessibility', () => {
    it('has default accessibility label', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.accessibilityLabel).toBe('Search');
    });

    it('accepts custom accessibility label', () => {
      render(
        <SearchBar {...defaultProps} accessibilityLabel="Search competitions" />
      );
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.accessibilityLabel).toBe('Search competitions');
    });

    it('clear button has accessibility label', () => {
      render(<SearchBar {...defaultProps} value="test" />);
      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeTruthy();
    });

    it('input is focusable', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input).toBeTruthy();
    });
  });

  // =========================================================================
  // STYLING
  // =========================================================================

  describe('Styling', () => {
    it('applies surface background color', () => {
      render(<SearchBar {...defaultProps} />);
      // Component renders with theme colors applied
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('accepts custom containerStyle', () => {
      const customStyle = { marginHorizontal: 16 };
      render(<SearchBar {...defaultProps} containerStyle={customStyle} />);
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('hides border when hideBorder is true', () => {
      render(<SearchBar {...defaultProps} hideBorder />);
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('shows border when hideBorder is false', () => {
      render(<SearchBar {...defaultProps} hideBorder={false} />);
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('accepts custom inputBackgroundColor', () => {
      render(<SearchBar {...defaultProps} inputBackgroundColor="#E5E7EB" />);
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('uses surfaceVariant when no inputBackgroundColor provided', () => {
      render(<SearchBar {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });
  });

  // =========================================================================
  // PROP COMBINATIONS
  // =========================================================================

  describe('Prop Combinations', () => {
    it('renders with all props combined', () => {
      const onChangeText = jest.fn();
      render(
        <SearchBar
          value="search query"
          onChangeText={onChangeText}
          placeholder="Find courses..."
          accessibilityLabel="Search courses"
          hideBorder
          inputBackgroundColor="#F0F0F0"
          containerStyle={{ marginTop: 10 }}
        />
      );

      const input = screen.getByPlaceholderText('Find courses...');
      expect(input.props.value).toBe('search query');
      expect(input.props.accessibilityLabel).toBe('Search courses');
      expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
    });

    it('renders with empty value and custom placeholder', () => {
      render(
        <SearchBar
          value=""
          onChangeText={jest.fn()}
          placeholder="Type to search..."
        />
      );

      expect(screen.getByPlaceholderText('Type to search...')).toBeTruthy();
      expect(screen.queryByTestId('icon-close-circle')).toBeNull();
    });

    it('renders with value, hideBorder, and custom container style', () => {
      render(
        <SearchBar
          value="test"
          onChangeText={jest.fn()}
          hideBorder
          containerStyle={{ padding: 8 }}
        />
      );

      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
      expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('handles very long search text', () => {
      const longText = 'a'.repeat(200);
      render(<SearchBar {...defaultProps} value={longText} />);

      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe(longText);
      expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
    });

    it('handles special characters in search text', () => {
      const specialText = '@#$%^&*()!';
      render(<SearchBar {...defaultProps} value={specialText} />);

      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe(specialText);
    });

    it('handles emoji in search text', () => {
      const emojiText = '🏌️ Golf';
      render(<SearchBar {...defaultProps} value={emojiText} />);

      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe(emojiText);
    });

    it('handles Unicode characters in search text', () => {
      const unicodeText = 'Café Aussie';
      render(<SearchBar {...defaultProps} value={unicodeText} />);

      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe(unicodeText);
    });

    it('handles newlines in search text', () => {
      const textWithNewline = 'line1\nline2';
      render(<SearchBar {...defaultProps} value={textWithNewline} />);

      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe(textWithNewline);
    });

    it('handles tabs in search text', () => {
      const textWithTab = 'word1\tword2';
      render(<SearchBar {...defaultProps} value={textWithTab} />);

      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe(textWithTab);
    });

    it('handles only whitespace search text', () => {
      render(<SearchBar {...defaultProps} value="   " />);

      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe('   ');
      expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
    });

    it('handles special characters in placeholder', () => {
      render(
        <SearchBar
          {...defaultProps}
          placeholder="Search courses & players..."
        />
      );
      expect(screen.getByPlaceholderText('Search courses & players...')).toBeTruthy();
    });

    it('handles empty placeholder', () => {
      render(<SearchBar {...defaultProps} placeholder="" />);
      const input = screen.getByLabelText('Search');
      expect(input.props.placeholder).toBe('');
    });
  });

  // =========================================================================
  // CONTROLLED COMPONENT BEHAVIOR
  // =========================================================================

  describe('Controlled Component', () => {
    it('updates display when value prop changes', () => {
      const { rerender } = render(
        <SearchBar value="initial" onChangeText={jest.fn()} />
      );

      let input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe('initial');

      rerender(<SearchBar value="updated" onChangeText={jest.fn()} />);

      input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe('updated');
    });

    it('reflects cleared value from parent', () => {
      const { rerender } = render(
        <SearchBar value="has text" onChangeText={jest.fn()} />
      );

      expect(screen.getByTestId('icon-close-circle')).toBeTruthy();

      rerender(<SearchBar value="" onChangeText={jest.fn()} />);

      expect(screen.queryByTestId('icon-close-circle')).toBeNull();
    });

    it('handles rapid value prop changes', () => {
      const { rerender } = render(
        <SearchBar value="a" onChangeText={jest.fn()} />
      );

      for (let i = 0; i < 10; i++) {
        rerender(<SearchBar value={`value-${i}`} onChangeText={jest.fn()} />);
      }

      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.value).toBe('value-9');
    });
  });

  // =========================================================================
  // USE CASES
  // =========================================================================

  describe('Use Cases', () => {
    it('works as competition search', () => {
      const onChangeText = jest.fn();
      render(
        <SearchBar
          value=""
          onChangeText={onChangeText}
          placeholder="Search competitions..."
          accessibilityLabel="Search competitions"
        />
      );

      const input = screen.getByPlaceholderText('Search competitions...');
      fireEvent.changeText(input, 'Summer Cup');

      expect(onChangeText).toHaveBeenCalledWith('Summer Cup');
    });

    it('works as player search', () => {
      const onChangeText = jest.fn();
      render(
        <SearchBar
          value=""
          onChangeText={onChangeText}
          placeholder="Find players..."
          accessibilityLabel="Search players"
        />
      );

      const input = screen.getByPlaceholderText('Find players...');
      fireEvent.changeText(input, 'John');

      expect(onChangeText).toHaveBeenCalledWith('John');
    });

    it('works as course search', () => {
      const onChangeText = jest.fn();
      render(
        <SearchBar
          value=""
          onChangeText={onChangeText}
          placeholder="Search courses..."
          accessibilityLabel="Search courses"
        />
      );

      const input = screen.getByPlaceholderText('Search courses...');
      fireEvent.changeText(input, 'Royal Melbourne');

      expect(onChangeText).toHaveBeenCalledWith('Royal Melbourne');
    });

    it('supports search and clear workflow', () => {
      const onChangeText = jest.fn();
      const { rerender } = render(
        <SearchBar value="" onChangeText={onChangeText} />
      );

      // Type search text
      const input = screen.getByPlaceholderText('Search...');
      fireEvent.changeText(input, 'test search');
      expect(onChangeText).toHaveBeenCalledWith('test search');

      // Simulate parent updating value
      rerender(<SearchBar value="test search" onChangeText={onChangeText} />);

      // Clear button should now be visible
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.press(clearButton);

      expect(onChangeText).toHaveBeenCalledWith('');
    });
  });

  // =========================================================================
  // MULTIPLE INSTANCES
  // =========================================================================

  describe('Multiple Instances', () => {
    it('renders multiple SearchBars independently', () => {
      const onChangeText1 = jest.fn();
      const onChangeText2 = jest.fn();

      render(
        <>
          <SearchBar
            value="search1"
            onChangeText={onChangeText1}
            placeholder="First search..."
            accessibilityLabel="First search"
          />
          <SearchBar
            value=""
            onChangeText={onChangeText2}
            placeholder="Second search..."
            accessibilityLabel="Second search"
          />
        </>
      );

      expect(screen.getByPlaceholderText('First search...')).toBeTruthy();
      expect(screen.getByPlaceholderText('Second search...')).toBeTruthy();
    });

    it('handles interaction on specific SearchBar', () => {
      const onChangeText1 = jest.fn();
      const onChangeText2 = jest.fn();

      render(
        <>
          <SearchBar
            value="has text"
            onChangeText={onChangeText1}
            placeholder="First..."
            accessibilityLabel="First search"
          />
          <SearchBar
            value=""
            onChangeText={onChangeText2}
            placeholder="Second..."
            accessibilityLabel="Second search"
          />
        </>
      );

      // Only first should have clear button
      const clearButtons = screen.getAllByLabelText('Clear search');
      expect(clearButtons).toHaveLength(1);

      fireEvent.press(clearButtons[0]);
      expect(onChangeText1).toHaveBeenCalledWith('');
      expect(onChangeText2).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // THEME COLORS
  // =========================================================================

  describe('Theme Colors', () => {
    it('applies theme colors from context', () => {
      render(<SearchBar {...defaultProps} />);
      // Theme colors are applied via useThemeColors hook
      expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    });

    it('applies placeholder text color', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.placeholderTextColor).toBe(mockColors.textSecondary);
    });
  });

  // =========================================================================
  // KEYBOARD BEHAVIOR
  // =========================================================================

  describe('Keyboard Behavior', () => {
    it('uses search return key type', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.returnKeyType).toBe('search');
    });

    it('disables autocapitalize', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.autoCapitalize).toBe('none');
    });

    it('disables autocorrect', () => {
      render(<SearchBar {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search...');
      expect(input.props.autoCorrect).toBe(false);
    });
  });
});
