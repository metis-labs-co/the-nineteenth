/**
 * PlayerScoreCard Component
 *
 * Displays a player's scoring interface for a single hole.
 * Features:
 * - Player name and handicap display
 * - Shots received and Stableford points indicators
 * - Pick Up quick action for when player gives up the hole
 * - Plus/Minus stepper for score entry
 * - Par quick action button
 * - Optional stats row (FIR, GIR, Putts) based on settings
 * - Large touch targets for on-course use
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useStatsVisibility } from '@/store/settingsStore';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';

import { QuickActionButton } from './QuickActionButton';
import { ScoreInputStepper } from './ScoreInputStepper';
import { StatsRow } from './StatsRow';
import { usePlayerScoreCardLogic } from './usePlayerScoreCardLogic';

interface PlayerScoreCardProps {
  player: Player;
  currentHole: Hole;
  currentScore: HoleScore | MultiBallHoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  onStatsUpdate?: (updates: Partial<HoleScore>) => void;
  onPlayerPress?: (playerId: string) => void;
  disabled?: boolean;
}

export const PlayerScoreCard = React.memo(function PlayerScoreCard({
  player,
  currentHole,
  currentScore,
  onScoreSelect,
  onStatsUpdate,
  onPlayerPress,
  disabled = false,
}: PlayerScoreCardProps) {
  const colors = useThemeColors();
  const handicap = player.handicap ?? 0;
  const { showPutts, showFairwayHit, showGreenInRegulation } = useStatsVisibility();

  // FIR only applies to par 4s and 5s
  const showFIR = showFairwayHit && currentHole.par >= 4;

  // Check if any stats are enabled
  const showStatsRow = showPutts || showFIR || showGreenInRegulation;

  // Narrow to single-ball score for accessing stats
  const singleBallScore = currentScore && isSingleBallScore(currentScore) ? currentScore : undefined;

  // Use the extracted logic hook
  const {
    selectedScore,
    isPickedUp,
    strokesOnHole,
    stablefordPoints,
    handlePickUp,
    handleDecrement,
    handleIncrement,
    handleParSelect,
    handleFairwayToggle,
    handleGIRToggle,
    handlePuttsDecrement,
    handlePuttsIncrement,
  } = usePlayerScoreCardLogic({
    handicap,
    currentHole,
    currentScore,
    onScoreSelect,
    onStatsUpdate,
    disabled,
  });

  const handlePlayerPress = useCallback(() => {
    if (onPlayerPress) {
      onPlayerPress(player.id);
    }
  }, [onPlayerPress, player.id]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceVariant }]}>
      {/* Player Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.playerInfo,
            onPlayerPress && styles.playerInfoTappable,
          ]}
          onPress={handlePlayerPress}
          disabled={!onPlayerPress}
          activeOpacity={0.7}
          accessibilityLabel={`View ${player.name}'s scorecard`}
          accessibilityRole="button"
          accessibilityHint="Opens the player's detailed scorecard"
        >
          <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>HC: {handicap}</Text>
        </TouchableOpacity>

        {/* Stats Display */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{strokesOnHole}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SHOTS</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stablefordPoints}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PTS</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score Controls */}
      <View style={styles.controlsContainer}>
        {/* Pick Up Button */}
        <QuickActionButton
          label="PICK UP"
          value="P"
          isActive={isPickedUp}
          onPress={handlePickUp}
          disabled={disabled}
          accessibilityLabel="Pick up ball"
          accessibilityHint="Marks that you picked up your ball on this hole"
        />

        {/* Score Stepper */}
        <ScoreInputStepper
          score={selectedScore}
          isPickedUp={isPickedUp}
          onDecrement={handleDecrement}
          onIncrement={handleIncrement}
          disabled={disabled}
        />

        {/* Par Button */}
        <QuickActionButton
          label="PAR"
          value={currentHole.par}
          isActive={selectedScore === currentHole.par}
          onPress={handleParSelect}
          disabled={disabled}
          accessibilityLabel={`Score par ${currentHole.par}`}
          accessibilityHint={`Sets your score to par which is ${currentHole.par}`}
        />
      </View>

      {/* Stats Row - Conditional based on settings */}
      {showStatsRow && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatsRow
            showFIR={showFIR}
            showGIR={showGreenInRegulation}
            showPutts={showPutts}
            fairwayHit={singleBallScore?.fairwayHit}
            greenInRegulation={singleBallScore?.greenInRegulation}
            putts={singleBallScore?.putts}
            onFairwayToggle={handleFairwayToggle}
            onGIRToggle={handleGIRToggle}
            onPuttsDecrement={handlePuttsDecrement}
            onPuttsIncrement={handlePuttsIncrement}
            disabled={disabled}
          />
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  playerInfoTappable: {
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginLeft: -spacing.xs,
    marginTop: -spacing.xs,
  },
  playerName: {
    ...typography.h3,
    marginBottom: spacing.xs,
    flexShrink: 1,
  },
  handicapLabel: {
    ...typography.body,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  statLabel: {
    ...typography.small,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
});

export default PlayerScoreCard;
