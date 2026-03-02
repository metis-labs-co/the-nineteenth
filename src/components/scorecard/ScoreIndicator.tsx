/**
 * ScoreIndicator
 *
 * Unified score display component with two display modes:
 *
 * display="bordered" (default):
 * - Eagle or better (-2+): Double circle
 * - Birdie (-1): Single circle
 * - Par (0): No indicator
 * - Bogey (+1): Single square
 * - Double bogey (+2+): Double square
 * - Pickup (10+): Red "P"
 *
 * display="compact":
 * - Uses background colors instead of borders
 * - More space-efficient for individual scorecard views
 * - Eagle: Green background
 * - Birdie: Light green background
 * - Par: Light blue background
 * - Bogey: Light amber background
 * - Double bogey+: Light red background
 *
 * Reused by ReviewScorecardScreen, RoundScorecardTab, and other scorecard views.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { typography, borderRadius } from '@/constants/theme';
import { getScoreColor } from '@/utils/scoring';
import { getScoreBackgroundColor } from '@/utils/displayHelpers';
import { PICKUP_SCORE } from '@/constants/scoring';

// =====================================================
// TYPES
// =====================================================

export type ScoreIndicatorDisplay = 'bordered' | 'compact';
export type ScoreIndicatorSize = 'sm' | 'md' | 'lg';

export interface ScoreIndicatorProps {
  /** Strokes for the hole (undefined or 0 shows "-") */
  strokes: number | undefined;
  /** Par for the hole */
  par: number;
  /** Display mode: "bordered" uses circles/squares, "compact" uses colored backgrounds */
  display?: ScoreIndicatorDisplay;
  /** Size variant */
  size?: ScoreIndicatorSize;
}

// =====================================================
// SIZE CONFIGURATIONS
// =====================================================

// Bordered mode sizes (circles/squares with borders)
const borderedSizeConfig = {
  sm: {
    inner: 22,
    outer: 28,
    borderWidth: 1.5,
    fontSize: 12,
  },
  md: {
    inner: 28,
    outer: 34,
    borderWidth: 1.5,
    fontSize: 14,
  },
  lg: {
    inner: 32,
    outer: 40,
    borderWidth: 2,
    fontSize: 16,
  },
};

// Compact mode sizes (solid background cells)
const compactSizeConfig = {
  sm: 20,
  md: 24,
  lg: 32,
};

// =====================================================
// BORDERED DISPLAY COMPONENT
// =====================================================

interface BorderedIndicatorProps {
  strokes: number | undefined;
  par: number;
  size: ScoreIndicatorSize;
}

const BorderedIndicator = React.memo(function BorderedIndicator({
  strokes,
  par,
  size,
}: BorderedIndicatorProps) {
  const colors = useThemeColors();
  const config = borderedSizeConfig[size];

  // No score
  if (!strokes) {
    return <Text style={[styles.scoreText, { fontSize: config.fontSize }]}>-</Text>;
  }

  // Pickup: show red "P"
  if (strokes >= PICKUP_SCORE) {
    return (
      <Text style={[styles.scoreText, { fontSize: config.fontSize, color: colors.error }]}>
        P
      </Text>
    );
  }

  const diff = strokes - par;
  const scoreColor = getScoreColor(strokes, par, colors);

  // Eagle or better (-2 or less): double circle
  if (diff <= -2) {
    return (
      <View style={styles.indicatorContainer}>
        <View
          style={[
            styles.circleOuter,
            {
              width: config.outer,
              height: config.outer,
              borderRadius: config.outer / 2,
              borderWidth: config.borderWidth,
              borderColor: scoreColor,
            },
          ]}
        >
          <View
            style={[
              styles.circleInner,
              {
                width: config.inner,
                height: config.inner,
                borderRadius: config.inner / 2,
                borderWidth: config.borderWidth,
                borderColor: scoreColor,
              },
            ]}
          >
            <Text style={[styles.scoreText, { fontSize: config.fontSize, color: scoreColor }]}>
              {strokes}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Birdie (-1): circle around the number
  if (diff === -1) {
    return (
      <View style={styles.indicatorContainer}>
        <View
          style={[
            styles.circleInner,
            {
              width: config.inner,
              height: config.inner,
              borderRadius: config.inner / 2,
              borderWidth: config.borderWidth,
              borderColor: scoreColor,
            },
          ]}
        >
          <Text style={[styles.scoreText, { fontSize: config.fontSize, color: scoreColor }]}>
            {strokes}
          </Text>
        </View>
      </View>
    );
  }

  // Par (0): just the number
  if (diff === 0) {
    return (
      <Text style={[styles.scoreText, { fontSize: config.fontSize, color: scoreColor }]}>
        {strokes}
      </Text>
    );
  }

  // Bogey (+1): square around the number
  if (diff === 1) {
    return (
      <View style={styles.indicatorContainer}>
        <View
          style={[
            styles.squareInner,
            {
              width: config.inner,
              height: config.inner,
              borderWidth: config.borderWidth,
              borderColor: scoreColor,
            },
          ]}
        >
          <Text style={[styles.scoreText, { fontSize: config.fontSize, color: scoreColor }]}>
            {strokes}
          </Text>
        </View>
      </View>
    );
  }

  // Double bogey or worse (+2 or more): double square
  return (
    <View style={styles.indicatorContainer}>
      <View
        style={[
          styles.squareOuter,
          {
            width: config.outer,
            height: config.outer,
            borderWidth: config.borderWidth,
            borderColor: scoreColor,
          },
        ]}
      >
        <View
          style={[
            styles.squareInner,
            {
              width: config.inner,
              height: config.inner,
              borderWidth: config.borderWidth,
              borderColor: scoreColor,
            },
          ]}
        >
          <Text style={[styles.scoreText, { fontSize: config.fontSize, color: scoreColor }]}>
            {strokes}
          </Text>
        </View>
      </View>
    </View>
  );
});

// =====================================================
// COMPACT DISPLAY COMPONENT
// =====================================================

interface CompactIndicatorProps {
  strokes: number | undefined;
  par: number;
  size: ScoreIndicatorSize;
}

const CompactIndicator = React.memo(function CompactIndicator({
  strokes,
  par,
  size,
}: CompactIndicatorProps) {
  const colors = useThemeColors();
  const cellSize = compactSizeConfig[size];

  // No score
  if (!strokes) {
    return (
      <View style={[styles.compactCell, { width: cellSize, height: cellSize }]}>
        <Text style={[styles.compactText, { color: colors.textSecondary }]}>-</Text>
      </View>
    );
  }

  // Pickup: show red background with "P"
  if (strokes >= PICKUP_SCORE) {
    return (
      <View
        style={[
          styles.compactCell,
          { width: cellSize, height: cellSize, backgroundColor: colors.doubleBogeyBackground },
        ]}
      >
        <Text style={[styles.compactText, { color: colors.doubleBogey }]}>P</Text>
      </View>
    );
  }

  const scoreColor = getScoreColor(strokes, par, colors);
  const bgColor = getScoreBackgroundColor(strokes, par, colors);

  return (
    <View
      style={[
        styles.compactCell,
        { width: cellSize, height: cellSize },
        bgColor && { backgroundColor: bgColor },
      ]}
    >
      <Text style={[styles.compactText, { color: scoreColor }]}>{strokes}</Text>
    </View>
  );
});

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ScoreIndicator = React.memo(function ScoreIndicator({
  strokes,
  par,
  display = 'bordered',
  size = 'md',
}: ScoreIndicatorProps) {
  if (display === 'compact') {
    return <CompactIndicator strokes={strokes} par={par} size={size} />;
  }

  return <BorderedIndicator strokes={strokes} par={par} size={size} />;
});

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  // Bordered display styles
  indicatorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleOuter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  squareOuter: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  squareInner: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    ...typography.bodyBold,
  },

  // Compact display styles
  compactCell: {
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactText: {
    ...typography.small,
    fontWeight: '600',
  },
});

export default ScoreIndicator;
