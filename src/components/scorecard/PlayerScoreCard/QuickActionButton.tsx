/**
 * QuickActionButton Component
 *
 * A reusable button for quick score actions (Pick Up, Par).
 * Displays the value with its label stacked inside the button
 * (Score & Round redesign — 60x62 rounded-14 tile).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
  /**
   * Palette used for the active state:
   * - 'primary' (default): green tint — used for the PAR button.
   * - 'bogey': bogey (orange) tint — used for the PICK UP button.
   */
  activePalette?: 'primary' | 'bogey';
}

export const QuickActionButton = React.memo(function QuickActionButton({
  label,
  value,
  isActive,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  activePalette = 'primary',
}: QuickActionButtonProps) {
  const colors = useThemeColors();

  const activeStyles =
    activePalette === 'bogey'
      ? {
          backgroundColor: colors.bogeyBackground,
          borderColor: colors.bogey,
          textColor: colors.bogey,
        }
      : {
          backgroundColor: colors.primaryBackground,
          borderColor: colors.primary,
          textColor: colors.primaryDark,
        };

  const textColor = isActive ? activeStyles.textColor : colors.textSecondary;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          { borderColor: colors.border, backgroundColor: colors.surfaceVariant },
          isActive && {
            backgroundColor: activeStyles.backgroundColor,
            borderColor: activeStyles.borderColor,
          },
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
          style={[styles.buttonText, { color: textColor }]}
        >
          {value}
        </ScaledText>
        <ScaledText category="caption" style={[styles.label, { color: textColor }]}>
          {label}
        </ScaledText>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 60,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  buttonText: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 22,
  },
  label: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
    lineHeight: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});

export default QuickActionButton;
