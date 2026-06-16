import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, borderRadius } from '@/constants/theme';

export interface OtpInputProps {
  /** Number of digit boxes (default: 6) */
  length?: number;
  /** Current value */
  value: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Called when all digits are entered */
  onComplete: (code: string) => void;
  /** Show error styling on all boxes */
  error?: boolean;
  /** Disable input */
  disabled?: boolean;
  /** Auto-focus on mount (default: true) */
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const colors = useThemeColors();
  const inputRef = useRef<TextInput>(null);
  const lastCompleteRef = useRef<string>('');

  useEffect(() => {
    if (autoFocus) {
      // Small delay to ensure the screen has mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length && value !== lastCompleteRef.current) {
      lastCompleteRef.current = value;
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
      onChange(cleaned);
    },
    [length, onChange],
  );

  const handlePress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // The capturing TextInput is visually hidden, so the OS paste menu can't be
  // summoned on it. Long-pressing the boxes pulls the code straight from the
  // clipboard (the same digit-only cleaning as typed input).
  const handlePaste = useCallback(async () => {
    if (disabled) return;
    const clip = await Clipboard.getStringAsync();
    const cleaned = clip.replace(/[^0-9]/g, '').slice(0, length);
    if (cleaned) {
      onChange(cleaned);
      inputRef.current?.focus();
    }
  }, [disabled, length, onChange]);

  const getBoxStyle = (index: number) => {
    const isFilled = index < value.length;
    const isCurrent = index === value.length;

    if (error) {
      return { borderColor: colors.error, backgroundColor: colors.surface };
    }
    if (isFilled) {
      return { borderColor: colors.primary, backgroundColor: colors.surface };
    }
    if (isCurrent) {
      return { borderColor: colors.primary, backgroundColor: colors.surface };
    }
    return { borderColor: colors.border, backgroundColor: colors.surface };
  };

  return (
    <View style={styles.container}>
      {/* Hidden TextInput that captures keyboard input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        editable={!disabled}
        style={styles.hiddenInput}
        caretHidden
        autoFocus={Platform.OS === 'android' ? autoFocus : false}
      />

      {/* Visual digit boxes */}
      <Pressable
        style={styles.boxRow}
        onPress={handlePress}
        onLongPress={handlePaste}
        accessibilityRole="none"
        accessibilityHint="Long press to paste a code from the clipboard"
      >
        {Array.from({ length }, (_, index) => (
          <View
            key={index}
            style={[styles.box, getBoxStyle(index)]}
            accessibilityLabel={`Digit ${index + 1}${index < value.length ? `: ${value[index]}` : ''}`}
          >
            {index < value.length && (
              <Text style={[styles.digit, { color: colors.textPrimary }]}>
                {value[index]}
              </Text>
            )}
          </View>
        ))}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  boxRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  },
});
