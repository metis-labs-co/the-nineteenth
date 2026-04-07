/**
 * MatchPlayScoreCell - Score display cell with result-based coloring
 *
 * Displays a player's score with visual indication of hole result:
 * - Green background: hole won
 * - Red background: hole lost
 * - Grey background: hole halved
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { typography, borderRadius } from '@/constants/theme';

// ============================================================================
// TYPES
// ============================================================================

export interface MatchPlayScoreCellProps {
  score: number | null | undefined;
  isPickup: boolean;
  result: 'won' | 'lost' | 'halved' | 'none';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const MatchPlayScoreCell = React.memo(function MatchPlayScoreCell({
  score,
  isPickup,
  result,
}: MatchPlayScoreCellProps) {
  const colors = useThemeColors();

  // Determine background and text colors based on hole result
  let backgroundColor: string;
  let textColor: string;

  switch (result) {
    case 'won':
      backgroundColor = colors.successBackground;
      textColor = colors.success;
      break;
    case 'lost':
      backgroundColor = colors.errorBackground;
      textColor = colors.error;
      break;
    case 'halved':
      backgroundColor = colors.surfaceVariant;
      textColor = colors.textSecondary;
      break;
    case 'none':
    default:
      backgroundColor = 'transparent';
      textColor = colors.textSecondary;
      break;
  }

  // Display text
  let displayText: string;
  if (score === null || score === undefined) {
    displayText = '-';
  } else if (isPickup) {
    displayText = 'P';
  } else {
    displayText = String(score);
  }

  return (
    <View style={[styles.matchPlayScoreCell, { backgroundColor }]}>
      <Text style={[styles.matchPlayScoreText, { color: textColor }]}>
        {displayText}
      </Text>
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  matchPlayScoreCell: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchPlayScoreText: {
    ...typography.small,
    fontWeight: '600',
  },
});
