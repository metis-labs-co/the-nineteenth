/**
 * PlayerScoreCard - Score entry card for a single player in match play
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows, layout } from '@/constants/theme';
import type { MatchPlayer } from '../types';

interface PlayerScoreCardProps {
  player: MatchPlayer;
  currentScore: number | null;
  par: number;
  isMatchComplete: boolean;
  onScoreAdjust: (delta: number) => void;
  onParSelect: () => void;
  getScoreColor: (score: number | null) => string;
}

export function PlayerScoreCard({
  player,
  currentScore,
  par,
  isMatchComplete,
  onScoreAdjust,
  onParSelect,
  getScoreColor,
}: PlayerScoreCardProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.playerCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
        {player.name}
      </Text>
      <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>HC: {player.handicap}</Text>

      {/* Score Display */}
      <View style={styles.scoreSection}>
        <Text
          style={[
            styles.scoreDisplay,
            { color: getScoreColor(currentScore) },
          ]}
        >
          {currentScore ?? '-'}
        </Text>
      </View>

      {/* Score Controls */}
      <View style={styles.scoreControls}>
        <TouchableOpacity
          style={[
            styles.scoreButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            isMatchComplete && styles.buttonDisabled,
          ]}
          onPress={() => onScoreAdjust(-1)}
          disabled={isMatchComplete}
          activeOpacity={0.7}
          accessibilityLabel={`Decrease ${player.name} score`}
        >
          <Text style={[styles.scoreButtonText, { color: colors.textPrimary }]}>−</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.parButton,
            { borderColor: colors.primary, backgroundColor: colors.surface },
            currentScore === par && { backgroundColor: colors.primary },
            isMatchComplete && styles.buttonDisabled,
          ]}
          onPress={onParSelect}
          disabled={isMatchComplete}
          activeOpacity={0.7}
          accessibilityLabel={`Set ${player.name} score to par`}
        >
          <Text
            style={[
              styles.parButtonText,
              { color: colors.primary },
              currentScore === par && { color: colors.white },
            ]}
          >
            PAR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.scoreButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            isMatchComplete && styles.buttonDisabled,
          ]}
          onPress={() => onScoreAdjust(1)}
          disabled={isMatchComplete}
          activeOpacity={0.7}
          accessibilityLabel={`Increase ${player.name} score`}
        >
          <Text style={[styles.scoreButtonText, { color: colors.textPrimary }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  playerName: {
    ...typography.h4,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  handicapLabel: {
    ...typography.small,
    marginBottom: spacing.md,
  },
  scoreSection: {
    marginBottom: spacing.lg,
  },
  scoreDisplay: {
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 72,
  },
  scoreControls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreButton: {
    width: layout.scoreButtonSize,
    height: layout.scoreButtonSize,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreButtonText: {
    fontSize: 28,
    fontWeight: '400',
  },
  parButton: {
    paddingHorizontal: spacing.md,
    height: layout.scoreButtonSize,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parButtonText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});

export default PlayerScoreCard;
