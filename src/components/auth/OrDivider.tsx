/**
 * OrDivider - Horizontal divider with centered "or" text
 *
 * Used between social login buttons and email/password forms.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';

export function OrDivider() {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>or</Text>
      <View style={[styles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
  },
  text: {
    ...typography.body,
    paddingHorizontal: spacing.lg,
  },
});

export default OrDivider;
