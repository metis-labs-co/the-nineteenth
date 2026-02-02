/**
 * QuickActionButton Component
 *
 * A reusable button for quick score actions (Pick Up, Par).
 * Displays a button with label below.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  spacing,
  borderRadius,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { ScaledText } from '@/components/common/ScaledText';

interface QuickActionButtonProps {
  label: string;
  value: string | number;
  isActive: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const QuickActionButton = React.memo(function QuickActionButton({
  label,
  value,
  isActive,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: QuickActionButtonProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          { borderColor: colors.gray300, backgroundColor: colors.surface },
          isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
          disabled && styles.buttonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityRole="button"
        accessibilityHint={accessibilityHint}
      >
        <ScaledText
          category="critical"
          style={[
            styles.buttonText,
            { color: colors.textPrimary },
            isActive && { color: colors.white },
          ]}
        >
          {value}
        </ScaledText>
      </TouchableOpacity>
      <ScaledText category="caption" style={[styles.label, { color: colors.textSecondary }]}>{label}</ScaledText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 28,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});

export default QuickActionButton;
