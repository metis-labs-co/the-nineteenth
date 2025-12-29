/**
 * HoleNumberDisplay Component
 *
 * Displays the current hole number with "HOLE" label.
 * Optionally tappable to trigger an action (e.g., view full scorecard).
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import type { Hole } from '@/types';

export interface HoleNumberDisplayProps {
  holeNumber: Hole['number'];
  onPress?: () => void;
}

export const HoleNumberDisplay = React.memo(function HoleNumberDisplay({
  holeNumber,
  onPress,
}: HoleNumberDisplayProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={`Hole ${holeNumber}, tap to view full scorecard`}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>HOLE</Text>
      <Text style={[styles.number, { color: colors.textPrimary }]}>{holeNumber}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 56,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  number: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
});
