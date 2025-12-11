/**
 * FormInput - Standardized form input component
 *
 * Provides consistent form input styling across the application with:
 * - Label with optional required indicator
 * - TextInput with standard styling
 * - Error message display
 * - Optional hint text
 * - Support for various input types
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { TextInput, Text, HelperText } from 'react-native-paper';
import type { TextInputProps } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export interface FormInputProps extends Omit<TextInputProps, 'mode' | 'error'> {
  /** Field label displayed above input */
  label: string;
  /** Whether field is required (shows asterisk) */
  required?: boolean;
  /** Error message to display below input */
  error?: string;
  /** Hint text displayed below input (shown when no error) */
  hint?: string;
  /** Container style override */
  containerStyle?: ViewStyle;
  /** Label style override */
  labelStyle?: TextStyle;
  /** Whether to show the label above input (vs inline) */
  showLabel?: boolean;
}

/**
 * FormInput component for standardized form fields
 *
 * @example
 * ```tsx
 * // Basic usage
 * <FormInput
 *   label="Email"
 *   value={email}
 *   onChangeText={setEmail}
 *   keyboardType="email-address"
 *   required
 * />
 *
 * // With error
 * <FormInput
 *   label="Password"
 *   value={password}
 *   onChangeText={setPassword}
 *   secureTextEntry
 *   error={errors.password?.message}
 * />
 *
 * // With hint
 * <FormInput
 *   label="Handicap"
 *   value={handicap}
 *   onChangeText={setHandicap}
 *   keyboardType="decimal-pad"
 *   hint="Enter a value between 0 and 54"
 * />
 * ```
 */
export function FormInput({
  label,
  required = false,
  error,
  hint,
  containerStyle,
  labelStyle,
  showLabel = true,
  disabled,
  ...textInputProps
}: FormInputProps) {
  const colors = useThemeColors();
  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {showLabel && (
        <Text style={[styles.label, { color: colors.textPrimary }, labelStyle]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}

      {/* Input */}
      <TextInput
        mode="outlined"
        label={!showLabel ? label : undefined}
        disabled={disabled}
        style={[
          styles.input,
          { backgroundColor: colors.surface },
          disabled && { backgroundColor: colors.gray100 },
        ]}
        outlineColor={hasError ? colors.error : colors.gray300}
        activeOutlineColor={hasError ? colors.error : colors.primary}
        error={hasError}
        textColor={colors.textPrimary}
        accessibilityLabel={`${label} input`}
        {...textInputProps}
      />

      {/* Error or Hint */}
      {hasError ? (
        <HelperText type="error" visible={hasError} style={[styles.errorText, { color: colors.error }]}>
          {error}
        </HelperText>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

/**
 * FormInputPassword - Password variant with visibility toggle
 */
export function FormInputPassword({
  label = 'Password',
  ...props
}: Omit<FormInputProps, 'secureTextEntry'>) {
  const [secureTextEntry, setSecureTextEntry] = React.useState(true);

  return (
    <FormInput
      label={label}
      secureTextEntry={secureTextEntry}
      right={
        <TextInput.Icon
          icon={secureTextEntry ? 'eye' : 'eye-off'}
          onPress={() => setSecureTextEntry(!secureTextEntry)}
          accessibilityLabel={secureTextEntry ? 'Show password' : 'Hide password'}
        />
      }
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  input: {
    // backgroundColor set dynamically
  },
  errorText: {
    ...typography.caption,
    paddingHorizontal: 0,
    marginTop: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

export default FormInput;
