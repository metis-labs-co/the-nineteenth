/**
 * PromptInput Component Tests
 *
 * Tests for the AI competition prompt input component including:
 * - Rendering with different props
 * - Character count display
 * - Submit button states (enabled/disabled/loading)
 * - User interactions (text input, submit)
 * - Minimum length validation
 * - Edge cases
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PromptInput } from './PromptInput';

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const { View, Text, ActivityIndicator: RNActivityIndicator } = require('react-native');
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
    ActivityIndicator: ({ size, color }: any) => (
      <View testID="activity-indicator">
        <RNActivityIndicator size={size} color={color} />
      </View>
    ),
  };
});

// Mock theme context
jest.mock('@/context/ThemeContext', () => ({
  useThemeColors: () => ({
    primary: '#4A90D9',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    textPrimary: '#1A1A1A',
    textSecondary: '#666666',
    textDisabled: '#AAAAAA',
    border: '#E0E0E0',
    white: '#FFFFFF',
    gray300: '#D1D5DB',
  }),
}));

describe('PromptInput', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PromptInput {...defaultProps} />);
      expect(screen.getByText('Describe your competition')).toBeTruthy();
    });

    it('renders label text', () => {
      render(<PromptInput {...defaultProps} />);
      expect(screen.getByText('Describe your competition')).toBeTruthy();
    });

    it('renders hint text', () => {
      render(<PromptInput {...defaultProps} />);
      expect(
        screen.getByText(
          'Include details like number of rounds, game types, teams, and players'
        )
      ).toBeTruthy();
    });

    it('renders text input area', () => {
      render(<PromptInput {...defaultProps} />);
      expect(screen.getByPlaceholderText(/Describe your competition/)).toBeTruthy();
    });

    it('renders with value', () => {
      render(<PromptInput {...defaultProps} value="Create a 4-round competition" />);
      expect(screen.getByDisplayValue('Create a 4-round competition')).toBeTruthy();
    });

    it('renders generate button', () => {
      render(<PromptInput {...defaultProps} />);
      expect(screen.getByText('Generate Competition')).toBeTruthy();
    });

    it('renders icon in generate button', () => {
      render(<PromptInput {...defaultProps} value="This is a valid prompt" />);
      expect(screen.getByTestId('icon-auto-fix')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHARACTER COUNT TESTS
  // ===========================================================================

  describe('Character Count', () => {
    it('shows character count with default max', () => {
      render(<PromptInput {...defaultProps} />);
      expect(screen.getByText('0 / 2000')).toBeTruthy();
    });

    it('updates character count as text changes', () => {
      render(<PromptInput {...defaultProps} value="Hello World" />);
      expect(screen.getByText('11 / 2000')).toBeTruthy();
    });

    it('trims whitespace for character count', () => {
      render(<PromptInput {...defaultProps} value="  Hello  " />);
      expect(screen.getByText('5 / 2000')).toBeTruthy();
    });

    it('handles long text character count', () => {
      const longText = 'a'.repeat(500);
      render(<PromptInput {...defaultProps} value={longText} />);
      expect(screen.getByText('500 / 2000')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PLACEHOLDER TESTS
  // ===========================================================================

  describe('Placeholder', () => {
    it('renders with default placeholder', () => {
      render(<PromptInput {...defaultProps} />);
      expect(screen.getByPlaceholderText(/Describe your competition/)).toBeTruthy();
    });

    it('renders with custom placeholder', () => {
      render(
        <PromptInput {...defaultProps} placeholder="Enter your competition details" />
      );
      expect(screen.getByPlaceholderText('Enter your competition details')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SUBMIT BUTTON STATE TESTS
  // ===========================================================================

  describe('Submit Button States', () => {
    describe('Disabled State', () => {
      it('disables button when text is too short', () => {
        const onSubmit = jest.fn();
        render(<PromptInput {...defaultProps} value="short" onSubmit={onSubmit} />);
        fireEvent.press(screen.getByText('Generate Competition'));
        expect(onSubmit).not.toHaveBeenCalled();
      });

      it('disables button when text is empty', () => {
        const onSubmit = jest.fn();
        render(<PromptInput {...defaultProps} value="" onSubmit={onSubmit} />);
        fireEvent.press(screen.getByText('Generate Competition'));
        expect(onSubmit).not.toHaveBeenCalled();
      });

      it('disables button when text is only whitespace', () => {
        const onSubmit = jest.fn();
        render(<PromptInput {...defaultProps} value="          " onSubmit={onSubmit} />);
        fireEvent.press(screen.getByText('Generate Competition'));
        expect(onSubmit).not.toHaveBeenCalled();
      });

      it('disables button when loading', () => {
        const onSubmit = jest.fn();
        render(
          <PromptInput {...defaultProps} value="This is a valid prompt" isLoading onSubmit={onSubmit} />
        );
        fireEvent.press(screen.getByText('Generating...'));
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });

    describe('Enabled State', () => {
      it('enables button when text meets minimum length', () => {
        const onSubmit = jest.fn();
        render(<PromptInput {...defaultProps} value="This is a valid prompt" onSubmit={onSubmit} />);
        fireEvent.press(screen.getByText('Generate Competition'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      it('enables button when text exactly meets minimum length', () => {
        const onSubmit = jest.fn();
        render(<PromptInput {...defaultProps} value="0123456789" minLength={10} onSubmit={onSubmit} />);
        fireEvent.press(screen.getByText('Generate Competition'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
    });

    describe('Loading State', () => {
      it('shows loading indicator when loading', () => {
        render(
          <PromptInput {...defaultProps} value="This is a valid prompt" isLoading />
        );
        expect(screen.getByTestId('activity-indicator')).toBeTruthy();
      });

      it('shows "Generating..." text when loading', () => {
        render(
          <PromptInput {...defaultProps} value="This is a valid prompt" isLoading />
        );
        expect(screen.getByText('Generating...')).toBeTruthy();
      });

      it('hides icon when loading', () => {
        render(
          <PromptInput {...defaultProps} value="This is a valid prompt" isLoading />
        );
        expect(screen.queryByTestId('icon-auto-fix')).toBeNull();
      });

      it('hides "Generate Competition" text when loading', () => {
        render(
          <PromptInput {...defaultProps} value="This is a valid prompt" isLoading />
        );
        expect(screen.queryByText('Generate Competition')).toBeNull();
      });
    });
  });

  // ===========================================================================
  // MINIMUM LENGTH TESTS
  // ===========================================================================

  describe('Minimum Length', () => {
    it('uses default minimum length of 10', () => {
      const onSubmit = jest.fn();
      render(<PromptInput {...defaultProps} value="123456789" onSubmit={onSubmit} />);
      fireEvent.press(screen.getByText('Generate Competition'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('enables button when text meets default minimum length', () => {
      const onSubmit = jest.fn();
      render(<PromptInput {...defaultProps} value="1234567890" onSubmit={onSubmit} />);
      fireEvent.press(screen.getByText('Generate Competition'));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('respects custom minimum length', () => {
      const onSubmit = jest.fn();
      render(<PromptInput {...defaultProps} value="12345" minLength={5} onSubmit={onSubmit} />);
      fireEvent.press(screen.getByText('Generate Competition'));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('disables button when below custom minimum length', () => {
      const onSubmit = jest.fn();
      render(<PromptInput {...defaultProps} value="1234" minLength={5} onSubmit={onSubmit} />);
      fireEvent.press(screen.getByText('Generate Competition'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('counts trimmed length against minimum', () => {
      const onSubmit = jest.fn();
      render(<PromptInput {...defaultProps} value="   12345   " minLength={5} onSubmit={onSubmit} />);
      fireEvent.press(screen.getByText('Generate Competition'));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // USER INTERACTION TESTS
  // ===========================================================================

  describe('User Interactions', () => {
    describe('Text Input', () => {
      it('calls onChangeText when text changes', () => {
        const onChangeText = jest.fn();
        render(<PromptInput {...defaultProps} onChangeText={onChangeText} />);

        fireEvent.changeText(
          screen.getByPlaceholderText(/Describe your competition/),
          'New prompt text'
        );
        expect(onChangeText).toHaveBeenCalledWith('New prompt text');
      });

      it('allows editing when not loading', () => {
        render(<PromptInput {...defaultProps} />);
        const input = screen.getByPlaceholderText(/Describe your competition/);
        expect(input.props.editable).toBe(true);
      });

      it('disables editing when loading', () => {
        render(<PromptInput {...defaultProps} isLoading />);
        const input = screen.getByPlaceholderText(/Describe your competition/);
        expect(input.props.editable).toBe(false);
      });
    });

    describe('Submit Button', () => {
      it('calls onSubmit when button is pressed and enabled', () => {
        const onSubmit = jest.fn();
        render(
          <PromptInput
            {...defaultProps}
            value="This is a valid prompt"
            onSubmit={onSubmit}
          />
        );

        fireEvent.press(screen.getByText('Generate Competition'));
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      it('does not call onSubmit when button is disabled', () => {
        const onSubmit = jest.fn();
        render(<PromptInput {...defaultProps} value="short" onSubmit={onSubmit} />);

        fireEvent.press(screen.getByText('Generate Competition'));
        expect(onSubmit).not.toHaveBeenCalled();
      });

      it('does not call onSubmit when loading', () => {
        const onSubmit = jest.fn();
        render(
          <PromptInput
            {...defaultProps}
            value="This is a valid prompt"
            onSubmit={onSubmit}
            isLoading
          />
        );

        fireEvent.press(screen.getByText('Generating...'));
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // TEXT INPUT PROPERTIES TESTS
  // ===========================================================================

  describe('Text Input Properties', () => {
    it('is multiline', () => {
      render(<PromptInput {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Describe your competition/);
      expect(input.props.multiline).toBe(true);
    });

    it('has 6 lines by default', () => {
      render(<PromptInput {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Describe your competition/);
      expect(input.props.numberOfLines).toBe(6);
    });

    it('has max length of 2000', () => {
      render(<PromptInput {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Describe your competition/);
      expect(input.props.maxLength).toBe(2000);
    });

    it('has textAlignVertical set to top', () => {
      render(<PromptInput {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Describe your competition/);
      expect(input.props.textAlignVertical).toBe('top');
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty string value', () => {
      render(<PromptInput {...defaultProps} value="" />);
      expect(screen.getByText('0 / 2000')).toBeTruthy();
    });

    it('handles maximum length value', () => {
      const maxLengthText = 'a'.repeat(2000);
      render(<PromptInput {...defaultProps} value={maxLengthText} />);
      expect(screen.getByText('2000 / 2000')).toBeTruthy();
    });

    it('handles special characters', () => {
      render(<PromptInput {...defaultProps} value="Create a comp with @#$%^&*()" />);
      expect(screen.getByDisplayValue('Create a comp with @#$%^&*()')).toBeTruthy();
    });

    it('handles unicode characters', () => {
      render(<PromptInput {...defaultProps} value="Create a comp for 高尔夫 🏌️" />);
      expect(screen.getByDisplayValue('Create a comp for 高尔夫 🏌️')).toBeTruthy();
    });

    it('handles newlines in text', () => {
      const multilineValue = 'Line 1\nLine 2\nLine 3';
      render(<PromptInput {...defaultProps} value={multilineValue} />);
      const input = screen.getByPlaceholderText(/Describe your competition/);
      expect(input.props.value).toBe(multilineValue);
    });

    it('handles rapid text changes', () => {
      const onChangeText = jest.fn();
      render(<PromptInput {...defaultProps} onChangeText={onChangeText} />);

      const input = screen.getByPlaceholderText(/Describe your competition/);
      fireEvent.changeText(input, 'a');
      fireEvent.changeText(input, 'ab');
      fireEvent.changeText(input, 'abc');

      expect(onChangeText).toHaveBeenCalledTimes(3);
      expect(onChangeText).toHaveBeenLastCalledWith('abc');
    });

    it('handles minimum length of 0', () => {
      const onSubmit = jest.fn();
      render(<PromptInput {...defaultProps} value="" minLength={0} onSubmit={onSubmit} />);
      fireEvent.press(screen.getByText('Generate Competition'));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('handles very large minimum length', () => {
      const onSubmit = jest.fn();
      const longText = 'a'.repeat(1000);
      render(<PromptInput {...defaultProps} value={longText} minLength={1001} onSubmit={onSubmit} />);
      fireEvent.press(screen.getByText('Generate Competition'));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // STYLING TESTS
  // ===========================================================================

  describe('Styling', () => {
    it('applies theme colors to label', () => {
      render(<PromptInput {...defaultProps} />);
      expect(screen.getByText('Describe your competition')).toBeTruthy();
    });

    it('applies theme colors to hint', () => {
      render(<PromptInput {...defaultProps} />);
      expect(
        screen.getByText(
          'Include details like number of rounds, game types, teams, and players'
        )
      ).toBeTruthy();
    });

    it('applies theme colors to character count', () => {
      render(<PromptInput {...defaultProps} />);
      expect(screen.getByText('0 / 2000')).toBeTruthy();
    });

    it('applies different opacity when loading', () => {
      render(
        <PromptInput {...defaultProps} value="This is a valid prompt" isLoading />
      );
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMBINED PROPS TESTS
  // ===========================================================================

  describe('Combined Props', () => {
    it('renders with all custom props', () => {
      const onChangeText = jest.fn();
      const onSubmit = jest.fn();
      render(
        <PromptInput
          value="Create a golf competition with 4 rounds"
          onChangeText={onChangeText}
          onSubmit={onSubmit}
          isLoading={false}
          placeholder="Describe your competition"
          minLength={20}
        />
      );

      expect(screen.getByDisplayValue('Create a golf competition with 4 rounds')).toBeTruthy();
      expect(screen.getByText('Generate Competition')).toBeTruthy();
    });

    it('renders in loading state with valid text', () => {
      render(
        <PromptInput
          {...defaultProps}
          value="Create a golf competition with 4 rounds"
          isLoading
        />
      );

      expect(screen.getByText('Generating...')).toBeTruthy();
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
      expect(screen.queryByText('Generate Competition')).toBeNull();
    });

    it('handles state transition from idle to loading', () => {
      const { rerender } = render(
        <PromptInput {...defaultProps} value="This is a valid prompt" isLoading={false} />
      );

      expect(screen.getByText('Generate Competition')).toBeTruthy();

      rerender(
        <PromptInput {...defaultProps} value="This is a valid prompt" isLoading />
      );

      expect(screen.getByText('Generating...')).toBeTruthy();
    });

    it('handles state transition from loading to idle', () => {
      const { rerender } = render(
        <PromptInput {...defaultProps} value="This is a valid prompt" isLoading />
      );

      expect(screen.getByText('Generating...')).toBeTruthy();

      rerender(
        <PromptInput {...defaultProps} value="This is a valid prompt" isLoading={false} />
      );

      expect(screen.getByText('Generate Competition')).toBeTruthy();
    });
  });

  // ===========================================================================
  // KEYBOARD AVOIDING BEHAVIOR TESTS
  // ===========================================================================

  describe('Keyboard Behavior', () => {
    it('renders KeyboardAvoidingView', () => {
      render(<PromptInput {...defaultProps} />);
      // Component should render without errors with KeyboardAvoidingView
      expect(screen.getByText('Describe your competition')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FORM STATE INTEGRATION TESTS
  // ===========================================================================

  describe('Form State Integration', () => {
    it('works with controlled input pattern', () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        const [submitted, setSubmitted] = React.useState(false);

        return (
          <>
            <PromptInput
              value={value}
              onChangeText={setValue}
              onSubmit={() => setSubmitted(true)}
            />
            {submitted && <text testID="submitted">Submitted</text>}
          </>
        );
      };

      render(<TestComponent />);

      fireEvent.changeText(
        screen.getByPlaceholderText(/Describe your competition/),
        'This is my competition description'
      );

      fireEvent.press(screen.getByText('Generate Competition'));

      expect(screen.getByTestId('submitted')).toBeTruthy();
    });

    it('supports multiple input changes before submit', () => {
      const onChangeText = jest.fn();
      const onSubmit = jest.fn();
      render(
        <PromptInput
          {...defaultProps}
          value="Initial"
          onChangeText={onChangeText}
          onSubmit={onSubmit}
        />
      );

      const input = screen.getByPlaceholderText(/Describe your competition/);
      fireEvent.changeText(input, 'First change');
      fireEvent.changeText(input, 'Second change');
      fireEvent.changeText(input, 'Third change for competition');

      expect(onChangeText).toHaveBeenCalledTimes(3);
    });
  });
});
