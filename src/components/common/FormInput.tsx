/**
 * FormInput - Unified form input component
 *
 * A reusable text input component that wraps React Native Paper's TextInput
 * with consistent styling, labels, error handling, and theme support.
 *
 * @example
 * // Basic usage with external label (default)
 * <FormInput
 *   label="Email"
 *   value={email}
 *   onChangeText={setEmail}
 *   keyboardType="email"
 *   error={emailError}
 *   required
 * />
 *
 * @example
 * // With floating label (Paper's built-in label inside input)
 * <FormInput
 *   label="Email"
 *   floatingLabel
 *   value={email}
 *   onChangeText={setEmail}
 *   keyboardType="email"
 *   error={emailError}
 * />
 *
 * @example
 * // With React Hook Form
 * <Controller
 *   control={control}
 *   name="email"
 *   render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
 *     <FormInput
 *       label="Email"
 *       value={value}
 *       onChangeText={onChange}
 *       onBlur={onBlur}
 *       keyboardType="email"
 *       error={error?.message}
 *       required
 *     />
 *   )}
 * />
 */

import React, { useState } from 'react';
import { View, StyleSheet, type TextInputProps as RNTextInputProps } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';

// Simplified keyboard type mapping
const KEYBOARD_TYPE_MAP = {
  default: 'default',
  email: 'email-address',
  phone: 'phone-pad',
  decimal: 'decimal-pad',
  number: 'number-pad',
} as const;

type KeyboardTypeShorthand = keyof typeof KEYBOARD_TYPE_MAP;

export interface FormInputProps {
  // Core props
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  placeholder?: string;

  // Label style
  floatingLabel?: boolean; // Use Paper's built-in floating label instead of external label

  // Validation
  error?: string;
  hint?: string;
  required?: boolean;

  // Input behavior
  keyboardType?: KeyboardTypeShorthand;
  autoCapitalize?: RNTextInputProps['autoCapitalize'];
  autoComplete?: RNTextInputProps['autoComplete'];
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  disabled?: boolean;

  // Accessories
  leftAffix?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;

  // Advanced
  returnKeyType?: RNTextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  testID?: string;

  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;

  // Style override (use sparingly)
  containerStyle?: object;
}

export function FormInput({
  // Core
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,

  // Label style
  floatingLabel = false,

  // Validation
  error,
  hint,
  required = false,

  // Input behavior
  keyboardType = 'default',
  autoCapitalize,
  autoComplete,
  autoCorrect,
  secureTextEntry: secureTextEntryProp = false,
  multiline = false,
  numberOfLines,
  maxLength,
  editable = true,
  disabled = false,

  // Accessories
  leftAffix,
  rightIcon,
  onRightIconPress,

  // Advanced
  returnKeyType,
  onSubmitEditing,
  autoFocus = false,
  testID,

  // Accessibility
  accessibilityLabel,
  accessibilityHint,

  // Style
  containerStyle,
}: FormInputProps) {
  const colors = useThemeColors();
  const [secureTextEntry, setSecureTextEntry] = useState(secureTextEntryProp);

  const hasError = !!error;
  const isDisabled = disabled || !editable;

  // Determine background color
  const backgroundColor = isDisabled ? colors.surfaceVariant : colors.surface;

  // Determine outline colors
  const outlineColor = hasError ? colors.error : colors.border;
  const activeOutlineColor = hasError ? colors.error : colors.primary;

  // Build left element
  const leftElement = leftAffix ? <TextInput.Affix text={leftAffix} /> : undefined;

  // Build right element - password toggle takes precedence
  let rightElement;
  if (secureTextEntryProp) {
    rightElement = (
      <TextInput.Icon
        icon={secureTextEntry ? 'eye' : 'eye-off'}
        onPress={() => setSecureTextEntry(!secureTextEntry)}
        accessibilityLabel={secureTextEntry ? 'Show password' : 'Hide password'}
      />
    );
  } else if (rightIcon) {
    rightElement = (
      <TextInput.Icon
        icon={rightIcon}
        onPress={onRightIconPress}
        disabled={!onRightIconPress}
      />
    );
  }

  // Build the external label text with required indicator
  const externalLabelText = label && !floatingLabel ? `${label}${required ? ' *' : ''}` : undefined;

  // Build the floating label text (Paper's built-in label)
  const floatingLabelText = label && floatingLabel ? label : undefined;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* External Label (above input) */}
      {externalLabelText && (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {externalLabelText}
        </Text>
      )}

      {/* Input */}
      <TextInput
        mode="outlined"
        label={floatingLabelText}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={KEYBOARD_TYPE_MAP[keyboardType]}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        editable={editable && !disabled}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoFocus={autoFocus}
        testID={testID}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
        style={[styles.input, { backgroundColor }]}
        outlineColor={isDisabled ? colors.border : outlineColor}
        activeOutlineColor={activeOutlineColor}
        textColor={isDisabled ? colors.textDisabled : colors.textPrimary}
        error={hasError}
        left={leftElement}
        right={rightElement}
      />

      {/* Error message */}
      {hasError && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}

      {/* Hint text (only shown when no error) */}
      {!hasError && hint && (
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.smallBold,
    marginBottom: spacing.xs,
  },
  input: {
    // Let Paper handle most styling
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

export default FormInput;
