/**
 * CompactScoreIndicator
 *
 * A compact score display that uses background colors instead of borders
 * for a more space-efficient display. Used in individual scorecard views.
 *
 * Colors:
 * - Eagle or better: Green background
 * - Birdie: Light green background
 * - Par: Light blue background
 * - Bogey: Light amber background
 * - Double bogey+: Light red background
 * - Pickup: Red background with "P"
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { typography, borderRadius } from '@/constants/theme';
import { getScoreColor } from '@/utils/scoring';
import { getScoreBackgroundColor } from '@/utils/displayHelpers';
import { PICKUP_SCORE } from '@/utils/scorecardLayout';

// =====================================================
// TYPES
// =====================================================

export interface CompactScoreIndicatorProps {
  /** Strokes for the hole (undefined or 0 shows "-") */
  strokes: number | undefined;
  /** Par for the hole */
  par: number;
  /** Optional size in pixels (default: 24) */
  size?: number;
}

// =====================================================
// COMPONENT
// =====================================================

export const CompactScoreIndicator = React.memo(function CompactScoreIndicator({
  strokes,
  par,
  size = 24,
}: CompactScoreIndicatorProps) {
  const colors = useThemeColors();

  // No score
  if (!strokes) {
    return (
      <View style={[styles.cell, { width: size, height: size }]}>
        <Text style={[styles.text, { color: colors.textSecondary }]}>-</Text>
      </View>
    );
  }

  // Pickup: show red background with "P"
  if (strokes >= PICKUP_SCORE) {
    return (
      <View
        style={[
          styles.cell,
          { width: size, height: size, backgroundColor: colors.doubleBogeyBackground },
        ]}
      >
        <Text style={[styles.text, { color: colors.doubleBogey }]}>P</Text>
      </View>
    );
  }

  const scoreColor = getScoreColor(strokes, par);
  const bgColor = getScoreBackgroundColor(strokes, par, colors);

  return (
    <View
      style={[styles.cell, { width: size, height: size }, bgColor && { backgroundColor: bgColor }]}
    >
      <Text style={[styles.text, { color: scoreColor }]}>{strokes}</Text>
    </View>
  );
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  cell: {
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.small,
    fontWeight: '600',
  },
});

export default CompactScoreIndicator;
