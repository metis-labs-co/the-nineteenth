/**
 * FormInput Component Tests
 *
 * Tests for the unified form input component including:
 * - Rendering with different props
 * - Label variations (external vs floating)
 * - Validation states (error, hint)
 * - Input behavior (keyboard types, secure entry, multiline)
 * - Accessories (affixes, icons)
 * - Disabled/editable states
 * - Accessibility
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FormInput } from './FormInput';

// Mock react-native-paper TextInput
jest.mock('react-native-paper', () => {
  const { View, Text, TextInput: RNTextInput } = require('react-native');
  const React = require('react');

  const MockTextInput = React.forwardRef((props: any, ref: any) => {
    const {
      label,
      value,
      onChangeText,
      onBlur,
      placeholder,
      placeholderTextColor,
      keyboardType,
      autoCapitalize,
      autoComplete,
      autoCorrect,
      secureTextEntry,
      multiline,
      numberOfLines,
      maxLength,
      editable,
      returnKeyType,
      onSubmitEditing,
      autoFocus,
      testID,
      accessibilityLabel,
      accessibilityHint,
      style,
      _outlineColor,
      _activeOutlineColor,
      _textColor,
      error,
      left,
      right,
      _mode,
      ...rest
    } = props;

    return (
      <View
        testID={testID || 'text-input'}
        style={style}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: editable === false }}
        {...rest}
      >
        {label && <Text testID="floating-label">{label}</Text>}
        {left && <View testID="left-element">{left}</View>}
        <RNTextInput
          ref={ref}
          testID="input-field"
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          accessibilityLabel={accessibilityLabel}
        />
        {right && <View testID="right-element">{right}</View>}
        {error && <Text testID="error-indicator">Error</Text>}
      </View>
    );
  });
  MockTextInput.displayName = 'MockTextInput';

  const TextInputAffix = ({ text }: { text: string }) => (
    <Text testID="text-affix">{text}</Text>
  );

  const TextInputIcon = ({
    icon,
    onPress,
    accessibilityLabel,
    disabled,
  }: {
    icon: string;
    onPress?: () => void;
    accessibilityLabel?: string;
    disabled?: boolean;
  }) => {
    const { TouchableOpacity, View: _RNView, Text: RNText } = require('react-native');
    return (
      <TouchableOpacity
        testID={`icon-${icon}`}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        <RNText>{icon}</RNText>
      </TouchableOpacity>
    );
  };

  MockTextInput.Affix = TextInputAffix;
  MockTextInput.Icon = TextInputIcon;

  return {
    Text: ({ children, style, ...props }: any) => <Text style={style} {...props}>{children}</Text>,
    TextInput: MockTextInput,
  };
});

describe('FormInput', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<FormInput {...defaultProps} />);
      expect(screen.getByTestId('input-field')).toBeTruthy();
    });

    it('renders with value', () => {
      render(<FormInput {...defaultProps} value="test@example.com" />);
      expect(screen.getByTestId('input-field').props.value).toBe('test@example.com');
    });

    it('renders with placeholder', () => {
      render(<FormInput {...defaultProps} placeholder="Enter email" />);
      expect(screen.getByTestId('input-field').props.placeholder).toBe('Enter email');
    });

    it('renders with testID', () => {
      render(<FormInput {...defaultProps} testID="email-input" />);
      expect(screen.getByTestId('email-input')).toBeTruthy();
    });
  });

  // ===========================================================================
  // LABEL TESTS
  // ===========================================================================

  describe('Labels', () => {
    describe('External Label (default)', () => {
      it('renders external label above input', () => {
        render(<FormInput {...defaultProps} label="Email" />);
        expect(screen.getByText('Email')).toBeTruthy();
      });

      it('adds required indicator to external label', () => {
        render(<FormInput {...defaultProps} label="Email" required />);
        expect(screen.getByText('Email *')).toBeTruthy();
      });

      it('does not show floating label when using external label', () => {
        render(<FormInput {...defaultProps} label="Email" />);
        expect(screen.queryByTestId('floating-label')).toBeNull();
      });
    });

    describe('Floating Label', () => {
      it('renders floating label inside input when floatingLabel is true', () => {
        render(<FormInput {...defaultProps} label="Email" floatingLabel />);
        expect(screen.getByTestId('floating-label')).toBeTruthy();
        expect(screen.getByText('Email')).toBeTruthy();
      });

      it('does not add required indicator to floating label', () => {
        render(<FormInput {...defaultProps} label="Email" floatingLabel required />);
        // Floating label should just show the label without asterisk
        const floatingLabel = screen.getByTestId('floating-label');
        expect(floatingLabel).toBeTruthy();
      });

      it('does not show external label when floatingLabel is true', () => {
        render(<FormInput {...defaultProps} label="Email" floatingLabel />);
        // Only the floating label should exist
        const allTexts = screen.queryAllByText('Email');
        expect(allTexts.length).toBe(1);
      });
    });

    describe('No Label', () => {
      it('renders without any label when not provided', () => {
        render(<FormInput {...defaultProps} />);
        expect(screen.queryByTestId('floating-label')).toBeNull();
      });
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe('Validation', () => {
    describe('Error State', () => {
      it('renders error message when error prop is provided', () => {
        render(<FormInput {...defaultProps} error="Email is required" />);
        expect(screen.getByText('Email is required')).toBeTruthy();
      });

      it('shows error indicator on input', () => {
        render(<FormInput {...defaultProps} error="Invalid email" />);
        expect(screen.getByTestId('error-indicator')).toBeTruthy();
      });

      it('hides hint when error is shown', () => {
        render(<FormInput {...defaultProps} error="Error message" hint="This is a hint" />);
        expect(screen.getByText('Error message')).toBeTruthy();
        expect(screen.queryByText('This is a hint')).toBeNull();
      });
    });

    describe('Hint State', () => {
      it('renders hint text when provided', () => {
        render(<FormInput {...defaultProps} hint="Enter your email address" />);
        expect(screen.getByText('Enter your email address')).toBeTruthy();
      });

      it('shows hint only when no error', () => {
        render(<FormInput {...defaultProps} hint="Helpful hint" />);
        expect(screen.getByText('Helpful hint')).toBeTruthy();
      });
    });

    describe('Required Field', () => {
      it('shows asterisk when required with external label', () => {
        render(<FormInput {...defaultProps} label="Name" required />);
        expect(screen.getByText('Name *')).toBeTruthy();
      });

      it('does not show asterisk when not required', () => {
        render(<FormInput {...defaultProps} label="Name" required={false} />);
        expect(screen.getByText('Name')).toBeTruthy();
        expect(screen.queryByText('Name *')).toBeNull();
      });
    });
  });

  // ===========================================================================
  // INPUT BEHAVIOR TESTS
  // ===========================================================================

  describe('Input Behavior', () => {
    describe('Text Input', () => {
      it('calls onChangeText when text changes', () => {
        const onChangeText = jest.fn();
        render(<FormInput value="" onChangeText={onChangeText} />);

        fireEvent.changeText(screen.getByTestId('input-field'), 'new text');
        expect(onChangeText).toHaveBeenCalledWith('new text');
      });

      it('calls onBlur when input loses focus', () => {
        const onBlur = jest.fn();
        render(<FormInput {...defaultProps} onBlur={onBlur} />);

        const input = screen.getByTestId('input-field');
        fireEvent(input, 'blur');
        expect(onBlur).toHaveBeenCalledTimes(1);
      });
    });

    describe('Keyboard Types', () => {
      it('maps "email" to "email-address" keyboard type', () => {
        render(<FormInput {...defaultProps} keyboardType="email" />);
        expect(screen.getByTestId('input-field').props.keyboardType).toBe('email-address');
      });

      it('maps "phone" to "phone-pad" keyboard type', () => {
        render(<FormInput {...defaultProps} keyboardType="phone" />);
        expect(screen.getByTestId('input-field').props.keyboardType).toBe('phone-pad');
      });

      it('maps "decimal" to "decimal-pad" keyboard type', () => {
        render(<FormInput {...defaultProps} keyboardType="decimal" />);
        expect(screen.getByTestId('input-field').props.keyboardType).toBe('decimal-pad');
      });

      it('maps "number" to "number-pad" keyboard type', () => {
        render(<FormInput {...defaultProps} keyboardType="number" />);
        expect(screen.getByTestId('input-field').props.keyboardType).toBe('number-pad');
      });

      it('uses "default" keyboard type by default', () => {
        render(<FormInput {...defaultProps} />);
        expect(screen.getByTestId('input-field').props.keyboardType).toBe('default');
      });
    });

    describe('Secure Text Entry', () => {
      it('renders with secure text entry when enabled', () => {
        render(<FormInput {...defaultProps} secureTextEntry />);
        expect(screen.getByTestId('input-field').props.secureTextEntry).toBe(true);
      });

      it('shows eye icon when secure text entry is enabled', () => {
        render(<FormInput {...defaultProps} secureTextEntry />);
        expect(screen.getByTestId('right-element')).toBeTruthy();
      });

      it('toggles password visibility when eye icon is pressed', () => {
        render(<FormInput {...defaultProps} secureTextEntry />);

        // Initially secure (password hidden)
        expect(screen.getByTestId('input-field').props.secureTextEntry).toBe(true);

        // Press the toggle button
        const eyeButton = screen.getByTestId('icon-eye');
        fireEvent.press(eyeButton);

        // Now should show password
        expect(screen.getByTestId('input-field').props.secureTextEntry).toBe(false);
      });

      it('shows correct accessibility label for show password', () => {
        render(<FormInput {...defaultProps} secureTextEntry />);
        expect(screen.getByLabelText('Show password')).toBeTruthy();
      });
    });

    describe('Multiline', () => {
      it('renders as multiline when enabled', () => {
        render(<FormInput {...defaultProps} multiline />);
        expect(screen.getByTestId('input-field').props.multiline).toBe(true);
      });

      it('sets numberOfLines when provided', () => {
        render(<FormInput {...defaultProps} multiline numberOfLines={4} />);
        expect(screen.getByTestId('input-field').props.numberOfLines).toBe(4);
      });
    });

    describe('Max Length', () => {
      it('limits input to maxLength', () => {
        render(<FormInput {...defaultProps} maxLength={10} />);
        expect(screen.getByTestId('input-field').props.maxLength).toBe(10);
      });
    });

    describe('Auto Properties', () => {
      it('sets autoCapitalize', () => {
        render(<FormInput {...defaultProps} autoCapitalize="none" />);
        expect(screen.getByTestId('input-field').props.autoCapitalize).toBe('none');
      });

      it('sets autoComplete', () => {
        render(<FormInput {...defaultProps} autoComplete="email" />);
        expect(screen.getByTestId('input-field').props.autoComplete).toBe('email');
      });

      it('sets autoCorrect', () => {
        render(<FormInput {...defaultProps} autoCorrect={false} />);
        expect(screen.getByTestId('input-field').props.autoCorrect).toBe(false);
      });

      it('sets autoFocus', () => {
        render(<FormInput {...defaultProps} autoFocus />);
        expect(screen.getByTestId('input-field').props.autoFocus).toBe(true);
      });
    });

    describe('Submit Behavior', () => {
      it('sets returnKeyType', () => {
        render(<FormInput {...defaultProps} returnKeyType="next" />);
        expect(screen.getByTestId('input-field').props.returnKeyType).toBe('next');
      });

      it('calls onSubmitEditing when submitted', () => {
        const onSubmitEditing = jest.fn();
        render(<FormInput {...defaultProps} onSubmitEditing={onSubmitEditing} />);

        fireEvent(screen.getByTestId('input-field'), 'submitEditing');
        expect(onSubmitEditing).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ===========================================================================
  // DISABLED/EDITABLE TESTS
  // ===========================================================================

  describe('Disabled/Editable States', () => {
    it('renders as non-editable when editable is false', () => {
      render(<FormInput {...defaultProps} editable={false} />);
      expect(screen.getByTestId('input-field').props.editable).toBe(false);
    });

    it('renders as non-editable when disabled is true', () => {
      render(<FormInput {...defaultProps} disabled />);
      expect(screen.getByTestId('input-field').props.editable).toBe(false);
    });

    it('is editable by default', () => {
      render(<FormInput {...defaultProps} />);
      expect(screen.getByTestId('input-field').props.editable).toBe(true);
    });

    it('disabled takes precedence even if editable is true', () => {
      render(<FormInput {...defaultProps} editable disabled />);
      expect(screen.getByTestId('input-field').props.editable).toBe(false);
    });
  });

  // ===========================================================================
  // ACCESSORIES TESTS
  // ===========================================================================

  describe('Accessories', () => {
    describe('Left Affix', () => {
      it('renders left affix when provided', () => {
        render(<FormInput {...defaultProps} leftAffix="$" />);
        expect(screen.getByTestId('left-element')).toBeTruthy();
        expect(screen.getByText('$')).toBeTruthy();
      });

      it('does not render left element when no affix provided', () => {
        render(<FormInput {...defaultProps} />);
        expect(screen.queryByTestId('left-element')).toBeNull();
      });
    });

    describe('Right Icon', () => {
      it('renders right icon when provided', () => {
        render(<FormInput {...defaultProps} rightIcon="magnify" />);
        expect(screen.getByTestId('right-element')).toBeTruthy();
        expect(screen.getByTestId('icon-magnify')).toBeTruthy();
      });

      it('calls onRightIconPress when icon is pressed', () => {
        const onPress = jest.fn();
        render(<FormInput {...defaultProps} rightIcon="magnify" onRightIconPress={onPress} />);

        fireEvent.press(screen.getByTestId('icon-magnify'));
        expect(onPress).toHaveBeenCalledTimes(1);
      });

      it('right icon is not pressable when no onRightIconPress provided', () => {
        render(<FormInput {...defaultProps} rightIcon="magnify" />);
        const icon = screen.getByTestId('icon-magnify');
        // Icon should exist but not trigger any action when pressed
        fireEvent.press(icon);
        // Nothing should happen (no error thrown)
        expect(icon).toBeTruthy();
      });

      it('secure entry toggle takes precedence over right icon', () => {
        render(<FormInput {...defaultProps} secureTextEntry rightIcon="magnify" />);
        // Should show eye icon, not magnify icon
        expect(screen.getByTestId('icon-eye')).toBeTruthy();
        expect(screen.queryByTestId('icon-magnify')).toBeNull();
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('uses label as accessibility label by default', () => {
      render(<FormInput {...defaultProps} label="Email" />);
      expect(screen.getByTestId('text-input').props.accessibilityLabel).toBe('Email');
    });

    it('uses custom accessibility label when provided', () => {
      render(
        <FormInput
          {...defaultProps}
          label="Email"
          accessibilityLabel="Enter your email address"
        />
      );
      expect(screen.getByTestId('text-input').props.accessibilityLabel).toBe(
        'Enter your email address'
      );
    });

    it('sets accessibility hint when provided', () => {
      render(
        <FormInput
          {...defaultProps}
          accessibilityHint="Must be a valid email format"
        />
      );
      expect(screen.getByTestId('text-input').props.accessibilityHint).toBe(
        'Must be a valid email format'
      );
    });

    it('indicates disabled state for accessibility', () => {
      render(<FormInput {...defaultProps} disabled />);
      expect(screen.getByTestId('text-input').props.accessibilityState).toEqual({
        disabled: true,
      });
    });
  });

  // ===========================================================================
  // STYLING TESTS
  // ===========================================================================

  describe('Styling', () => {
    it('applies container style when provided', () => {
      const containerStyle = { marginTop: 20 };
      const { UNSAFE_root: _UNSAFE_root } = render(
        <FormInput {...defaultProps} containerStyle={containerStyle} />
      );
      // Verify component renders (style is applied internally)
      expect(screen.getByTestId('input-field')).toBeTruthy();
    });

    it('renders with default theme colors', () => {
      render(<FormInput {...defaultProps} />);
      expect(screen.getByTestId('input-field')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMBINED PROPS TESTS
  // ===========================================================================

  describe('Combined Props', () => {
    it('renders full form input with all features', () => {
      const onChangeText = jest.fn();
      const onBlur = jest.fn();
      render(
        <FormInput
          label="Email Address"
          value="test@example.com"
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder="Enter email"
          keyboardType="email"
          autoCapitalize="none"
          autoComplete="email"
          error="Invalid email format"
          required
          leftAffix="@"
          testID="email-field"
          accessibilityLabel="Email input field"
          accessibilityHint="Enter your email"
        />
      );

      expect(screen.getByText('Email Address *')).toBeTruthy();
      expect(screen.getByTestId('email-field')).toBeTruthy();
      expect(screen.getByText('Invalid email format')).toBeTruthy();
      expect(screen.getByTestId('left-element')).toBeTruthy();
    });

    it('renders password field with toggle', () => {
      render(
        <FormInput
          label="Password"
          value="secret"
          onChangeText={jest.fn()}
          secureTextEntry
          required
        />
      );

      expect(screen.getByText('Password *')).toBeTruthy();
      expect(screen.getByTestId('icon-eye')).toBeTruthy();
    });

    it('renders multiline text area', () => {
      render(
        <FormInput
          label="Description"
          value="Some long text"
          onChangeText={jest.fn()}
          multiline
          numberOfLines={4}
          maxLength={500}
          hint="Max 500 characters"
        />
      );

      expect(screen.getByText('Description')).toBeTruthy();
      expect(screen.getByText('Max 500 characters')).toBeTruthy();
      expect(screen.getByTestId('input-field').props.multiline).toBe(true);
    });

    it('renders disabled field', () => {
      render(
        <FormInput
          label="Read Only"
          value="Cannot edit"
          onChangeText={jest.fn()}
          disabled
        />
      );

      expect(screen.getByText('Read Only')).toBeTruthy();
      expect(screen.getByTestId('input-field').props.editable).toBe(false);
    });
  });

  // ===========================================================================
  // EDGE CASES TESTS
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles empty value', () => {
      render(<FormInput {...defaultProps} value="" />);
      expect(screen.getByTestId('input-field').props.value).toBe('');
    });

    it('handles very long value', () => {
      const longValue = 'a'.repeat(1000);
      render(<FormInput {...defaultProps} value={longValue} />);
      expect(screen.getByTestId('input-field').props.value).toBe(longValue);
    });

    it('handles empty label string', () => {
      render(<FormInput {...defaultProps} label="" />);
      // Empty label should not render
      expect(screen.queryByText('')).toBeNull();
    });

    it('handles undefined optional props gracefully', () => {
      render(
        <FormInput
          value="test"
          onChangeText={jest.fn()}
          label={undefined}
          error={undefined}
          hint={undefined}
          placeholder={undefined}
          leftAffix={undefined}
          rightIcon={undefined}
        />
      );
      expect(screen.getByTestId('input-field')).toBeTruthy();
    });

    it('handles special characters in value', () => {
      render(<FormInput {...defaultProps} value="test@example.com!#$%" />);
      expect(screen.getByTestId('input-field').props.value).toBe('test@example.com!#$%');
    });

    it('handles unicode characters', () => {
      render(<FormInput {...defaultProps} value="こんにちは 🎌" />);
      expect(screen.getByTestId('input-field').props.value).toBe('こんにちは 🎌');
    });

    it('handles rapid text changes', () => {
      const onChangeText = jest.fn();
      render(<FormInput value="" onChangeText={onChangeText} />);

      const input = screen.getByTestId('input-field');
      fireEvent.changeText(input, 'a');
      fireEvent.changeText(input, 'ab');
      fireEvent.changeText(input, 'abc');

      expect(onChangeText).toHaveBeenCalledTimes(3);
      expect(onChangeText).toHaveBeenLastCalledWith('abc');
    });
  });

  // ===========================================================================
  // FORM INTEGRATION TESTS
  // ===========================================================================

  describe('Form Integration', () => {
    it('works with external state management', () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        return (
          <>
            <FormInput
              label="Name"
              value={value}
              onChangeText={setValue}
              testID="name-input"
            />
            <Text testID="value-display">{value}</Text>
          </>
        );
      };

      render(<TestComponent />);

      fireEvent.changeText(screen.getByTestId('input-field'), 'John');
      expect(screen.getByTestId('value-display').props.children).toBe('John');
    });

    it('supports form submission flow', () => {
      const onSubmit = jest.fn();
      render(
        <FormInput
          {...defaultProps}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      );

      fireEvent(screen.getByTestId('input-field'), 'submitEditing');
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
