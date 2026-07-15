// src/components/common/SectionLabel.tsx
import React from 'react';
import { StyleSheet, StyleProp, TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';

export interface SectionLabelProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Small uppercase, letter-spaced section label ("MANAGE", "SCORING & FORMAT")
 * used between card groups in the Competition Details redesign.
 */
export function SectionLabel({ children, style }: SectionLabelProps) {
  const colors = useThemeColors();

  return (
    <Text
      accessibilityRole="header"
      style={[styles.label, { color: colors.textSecondary }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginHorizontal: 2,
    marginBottom: spacing.sm + 1,
    marginTop: 2,
  },
});

export default SectionLabel;
