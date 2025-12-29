/**
 * MultiBallScoreInput Component
 *
 * Displays a compact scoring interface for multi-ball solo rounds.
 * Shows multiple ball score inputs stacked vertically.
 *
 * Features:
 * - Player name and handicap display
 * - Compact score row for each ball (Ball 1, Ball 2, etc.)
 * - Pick Up, Plus/Minus stepper, and Par buttons per ball
 * - Large touch targets for on-course use
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getStrokesOnHole, calculateStablefordPoints } from '@/utils/scoring';
import type { Player, Hole, HoleScore } from '@/types';
import { getBallLabel } from '@/types/multiball.types';
import type { BallCount } from '@/types/multiball.types';

interface MultiBallScoreInputProps {
  player: Player;
  currentHole: Hole;
  ballCount: BallCount;
  /** Array of scores, one per ball (index 0 = Ball 1, etc.) */
  ballScores: (HoleScore | undefined)[];
  /** Called when a ball's score changes */
  onBallScoreChange: (ballIndex: number, strokes: number) => void;
  disabled?: boolean;
}

// Pick up score - represents player giving up on the hole (no points in Stableford)
const PICKUP_SCORE = 10;
const MIN_SCORE = 1;
const MAX_SCORE = 12;

export const MultiBallScoreInput = React.memo(function MultiBallScoreInput({
  player,
  currentHole,
  ballCount,
  ballScores,
  onBallScoreChange,
  disabled = false,
}: MultiBallScoreInputProps) {
  const colors = useThemeColors();
  const handicap = player.handicap ?? 0;

  // Calculate strokes received on this hole
  const strokesOnHole = useMemo(
    () => getStrokesOnHole(handicap, currentHole),
    [handicap, currentHole]
  );

  // Calculate total Stableford points across all balls
  const totalPoints = useMemo(() => {
    return ballScores.reduce((sum, score) => {
      if (!score || score.strokes === PICKUP_SCORE) return sum;
      return sum + calculateStablefordPoints(score.strokes, handicap, currentHole);
    }, 0);
  }, [ballScores, handicap, currentHole]);

  return (
    <View style={[styles.card, { backgroundColor: colors.gray100 }]}>
      {/* Player Header */}
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>
            HC: {handicap}
          </Text>
        </View>

        {/* Stats Display */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {strokesOnHole}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SHOTS</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {totalPoints}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>TOTAL</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Ball Score Rows */}
      <View style={styles.ballsContainer}>
        {Array.from({ length: ballCount }, (_, index) => (
          <BallScoreRow
            key={index}
            ballIndex={index}
            ballLabel={getBallLabel(index)}
            currentScore={ballScores[index]}
            par={currentHole.par}
            handicap={handicap}
            hole={currentHole}
            onScoreChange={(strokes) => onBallScoreChange(index, strokes)}
            disabled={disabled}
            isLast={index === ballCount - 1}
          />
        ))}
      </View>
    </View>
  );
});

interface BallScoreRowProps {
  ballIndex: number;
  ballLabel: string;
  currentScore: HoleScore | undefined;
  par: number;
  handicap: number;
  hole: Hole;
  onScoreChange: (strokes: number) => void;
  disabled: boolean;
  isLast: boolean;
}

const BallScoreRow = React.memo(function BallScoreRow({
  ballLabel,
  currentScore,
  par,
  handicap,
  hole,
  onScoreChange,
  disabled,
  isLast,
}: BallScoreRowProps) {
  const colors = useThemeColors();

  const selectedScore = currentScore?.strokes;
  const isPickedUp = selectedScore === PICKUP_SCORE;

  // Calculate Stableford points for this ball
  const points = useMemo(() => {
    if (!selectedScore || isPickedUp) return 0;
    return calculateStablefordPoints(selectedScore, handicap, hole);
  }, [selectedScore, handicap, hole, isPickedUp]);

  // Max score before pickup is par + 2 (double bogey)
  const maxScoreBeforePickup = par + 2;

  const handlePickUp = useCallback(() => {
    if (!disabled) {
      onScoreChange(PICKUP_SCORE);
    }
  }, [disabled, onScoreChange]);

  const handleDecrement = useCallback(() => {
    if (!disabled) {
      if (isPickedUp) {
        onScoreChange(maxScoreBeforePickup);
      } else {
        const newScore = selectedScore ? Math.max(MIN_SCORE, selectedScore - 1) : par;
        onScoreChange(newScore);
      }
    }
  }, [disabled, selectedScore, par, onScoreChange, isPickedUp, maxScoreBeforePickup]);

  const handleIncrement = useCallback(() => {
    if (!disabled && !isPickedUp) {
      const newScore = selectedScore ? Math.min(MAX_SCORE, selectedScore + 1) : par;
      onScoreChange(newScore);
    }
  }, [disabled, selectedScore, par, onScoreChange, isPickedUp]);

  const handleParSelect = useCallback(() => {
    if (!disabled) {
      onScoreChange(par);
    }
  }, [disabled, par, onScoreChange]);

  return (
    <View
      style={[
        styles.ballRow,
        !isLast && styles.ballRowBorder,
        !isLast && { borderBottomColor: colors.border },
      ]}
    >
      {/* Ball Label and Points */}
      <View style={styles.ballLabelContainer}>
        <Text style={[styles.ballLabel, { color: colors.textPrimary }]}>
          {ballLabel}
        </Text>
        <Text style={[styles.ballPoints, { color: colors.textSecondary }]}>
          {points} pts
        </Text>
      </View>

      {/* Compact Score Controls */}
      <View style={styles.ballControls}>
        {/* Pick Up Button */}
        <TouchableOpacity
          style={[
            styles.compactButton,
            { borderColor: colors.gray300, backgroundColor: colors.white },
            isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary },
            disabled && styles.buttonDisabled,
          ]}
          onPress={handlePickUp}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityLabel={`Pick up ${ballLabel}`}
        >
          <Text
            style={[
              styles.compactButtonText,
              { color: colors.textPrimary },
              isPickedUp && { color: colors.white },
            ]}
          >
            P
          </Text>
        </TouchableOpacity>

        {/* Minus Button */}
        <TouchableOpacity
          style={[
            styles.compactButton,
            { borderColor: colors.gray300, backgroundColor: colors.white },
            disabled && styles.buttonDisabled,
          ]}
          onPress={handleDecrement}
          disabled={disabled || (selectedScore !== undefined && selectedScore <= MIN_SCORE)}
          activeOpacity={0.7}
          accessibilityLabel={`Decrease ${ballLabel} score`}
        >
          <Text style={[styles.compactButtonText, { color: colors.textPrimary }]}>−</Text>
        </TouchableOpacity>

        {/* Current Score Display */}
        <View style={styles.compactScoreDisplay}>
          <Text style={[styles.compactScoreText, { color: colors.textPrimary }]}>
            {isPickedUp ? 'P' : selectedScore ?? '-'}
          </Text>
        </View>

        {/* Plus Button */}
        <TouchableOpacity
          style={[
            styles.compactButton,
            { borderColor: colors.gray300, backgroundColor: colors.white },
            (disabled || isPickedUp) && styles.buttonDisabled,
          ]}
          onPress={handleIncrement}
          disabled={disabled || isPickedUp || (selectedScore !== undefined && selectedScore >= MAX_SCORE)}
          activeOpacity={0.7}
          accessibilityLabel={`Increase ${ballLabel} score`}
        >
          <Text
            style={[
              styles.compactButtonText,
              { color: colors.textPrimary },
              isPickedUp && styles.disabledText,
            ]}
          >
            +
          </Text>
        </TouchableOpacity>

        {/* Par Button */}
        <TouchableOpacity
          style={[
            styles.compactButton,
            { borderColor: colors.gray300, backgroundColor: colors.white },
            selectedScore === par && { backgroundColor: colors.primary, borderColor: colors.primary },
            disabled && styles.buttonDisabled,
          ]}
          onPress={handleParSelect}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityLabel={`Score par ${par} for ${ballLabel}`}
        >
          <Text
            style={[
              styles.compactButtonText,
              { color: colors.textPrimary },
              selectedScore === par && { color: colors.white },
            ]}
          >
            {par}
          </Text>
        </TouchableOpacity>
      </View>
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
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  statLabel: {
    ...typography.small,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
  },
  ballsContainer: {
    gap: 0,
  },
  ballRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  ballRowBorder: {
    borderBottomWidth: 1,
  },
  ballLabelContainer: {
    minWidth: 70,
  },
  ballLabel: {
    ...typography.bodyBold,
  },
  ballPoints: {
    ...typography.caption,
    marginTop: 2,
  },
  ballControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  compactScoreDisplay: {
    width: 40,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactScoreText: {
    fontSize: 28,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.4,
  },
});

export default MultiBallScoreInput;
