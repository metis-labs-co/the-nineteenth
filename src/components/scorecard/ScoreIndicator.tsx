/**
 * ScoreIndicator
 *
 * Displays a score with visual indicators based on performance relative to par:
 * - Eagle or better (-2+): Double circle
 * - Birdie (-1): Single circle
 * - Par (0): No indicator
 * - Bogey (+1): Single square
 * - Double bogey (+2+): Double square
 * - Pickup (10+): Red "P"
 *
 * Reused by ReviewScorecardScreen and RoundScorecardTab for consistent display.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { typography } from '@/constants/theme';
import { getScoreColor } from '@/utils/scoring';
import { PICKUP_SCORE } from '@/utils/scorecardLayout';

// =====================================================
// TYPES
// =====================================================

export interface ScoreIndicatorProps {
  /** Strokes for the hole (undefined or 0 shows "-") */
  strokes: number | undefined;
  /** Par for the hole */
  par: number;
  /** Optional size variant */
  size?: 'small' | 'medium' | 'large';
}

// =====================================================
// SIZE CONFIGURATIONS
// =====================================================

const sizeConfig = {
  small: {
    inner: 22,
    outer: 28,
    borderWidth: 1.5,
    fontSize: 12,
  },
  medium: {
    inner: 28,
    outer: 34,
    borderWidth: 1.5,
    fontSize: 14,
  },
  large: {
    inner: 32,
    outer: 40,
    borderWidth: 2,
    fontSize: 16,
  },
};

// =====================================================
// COMPONENT
// =====================================================

export const ScoreIndicator = React.memo(function ScoreIndicator({
  strokes,
  par,
  size = 'medium',
}: ScoreIndicatorProps) {
  const colors = useThemeColors();
  const config = sizeConfig[size];

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
  const scoreColor = getScoreColor(strokes, par);

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
// STYLES
// =====================================================

const styles = StyleSheet.create({
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
});

export default ScoreIndicator;
