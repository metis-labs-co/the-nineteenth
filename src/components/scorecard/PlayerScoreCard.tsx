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

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Surface, Icon } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { useStatsVisibility } from '@/store/settingsStore';
import { getStrokesOnHole, calculateStablefordPoints } from '@/utils/scoring';
import type { Player, Hole, HoleScore } from '@/types';

interface PlayerScoreCardProps {
  player: Player;
  currentHole: Hole;
  currentScore: HoleScore | undefined;
  onScoreSelect: (strokes: number) => void;
  onStatsUpdate?: (updates: Partial<HoleScore>) => void;
  onPlayerPress?: (playerId: string) => void;
  disabled?: boolean;
}

// Pick up score - represents player giving up on the hole (no points in Stableford)
const PICKUP_SCORE = 10;
const MIN_SCORE = 1;
const MAX_SCORE = 12;
const MAX_PUTTS = 6;

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

  // Check if any stats are enabled
  const showStatsRow = showPutts || showFairwayHit || showGreenInRegulation;

  // FIR only applies to par 4s and 5s
  const showFIR = showFairwayHit && currentHole.par >= 4;

  // Calculate strokes received on this hole
  const strokesOnHole = useMemo(
    () => getStrokesOnHole(handicap, currentHole),
    [handicap, currentHole]
  );

  const selectedScore = currentScore?.strokes;
  const isPickedUp = selectedScore === PICKUP_SCORE;

  // Max score before pickup is par + 2 (double bogey)
  const maxScoreBeforePickup = currentHole.par + 2;

  // Calculate Stableford points for current score
  const stablefordPoints = useMemo(() => {
    if (!selectedScore || isPickedUp) return 0;
    return calculateStablefordPoints(selectedScore, handicap, currentHole);
  }, [selectedScore, handicap, currentHole, isPickedUp]);

  const handlePickUp = useCallback(() => {
    if (!disabled) {
      onScoreSelect(PICKUP_SCORE);
    }
  }, [disabled, onScoreSelect]);

  const handleDecrement = useCallback(() => {
    if (!disabled) {
      // If currently picked up, go to max score (par + 2)
      if (isPickedUp) {
        onScoreSelect(maxScoreBeforePickup);
      } else {
        const newScore = selectedScore ? Math.max(MIN_SCORE, selectedScore - 1) : currentHole.par;
        onScoreSelect(newScore);
      }
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp, maxScoreBeforePickup]);

  const handleIncrement = useCallback(() => {
    // Don't allow increment if picked up
    if (!disabled && !isPickedUp) {
      const newScore = selectedScore ? Math.min(MAX_SCORE, selectedScore + 1) : currentHole.par;
      onScoreSelect(newScore);
    }
  }, [disabled, selectedScore, currentHole.par, onScoreSelect, isPickedUp]);

  const handleParSelect = useCallback(() => {
    if (!disabled) {
      onScoreSelect(currentHole.par);
    }
  }, [disabled, currentHole.par, onScoreSelect]);

  const handlePlayerPress = useCallback(() => {
    if (onPlayerPress) {
      onPlayerPress(player.id);
    }
  }, [onPlayerPress, player.id]);

  // Stats handlers
  const handleFairwayToggle = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const newValue = currentScore?.fairwayHit === true ? false : true;
      onStatsUpdate({ fairwayHit: newValue });
    }
  }, [disabled, onStatsUpdate, currentScore?.fairwayHit]);

  const handleGIRToggle = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const newValue = currentScore?.greenInRegulation === true ? false : true;
      onStatsUpdate({ greenInRegulation: newValue });
    }
  }, [disabled, onStatsUpdate, currentScore?.greenInRegulation]);

  const handlePuttsDecrement = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const currentPutts = currentScore?.putts ?? 0;
      if (currentPutts > 0) {
        onStatsUpdate({ putts: currentPutts - 1 });
      }
    }
  }, [disabled, onStatsUpdate, currentScore?.putts]);

  const handlePuttsIncrement = useCallback(() => {
    if (!disabled && onStatsUpdate) {
      const currentPutts = currentScore?.putts ?? 0;
      if (currentPutts < MAX_PUTTS) {
        onStatsUpdate({ putts: currentPutts + 1 });
      }
    }
  }, [disabled, onStatsUpdate, currentScore?.putts]);

  return (
    <Surface style={[styles.card, { backgroundColor: colors.gray100 }]} elevation={1}>
      {/* Player Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.playerInfo,
            onPlayerPress && styles.playerInfoTappable,
            pressed && onPlayerPress && { backgroundColor: colors.gray100 },
          ]}
          onPress={handlePlayerPress}
          disabled={!onPlayerPress}
          accessibilityLabel={`View ${player.name}'s scorecard`}
          accessibilityRole="button"
          accessibilityHint="Opens the player's detailed scorecard"
        >
          <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.handicapLabel, { color: colors.textSecondary }]}>HC: {handicap}</Text>
        </Pressable>

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

      {/* Score Controls - Reordered: Pick Up, Stepper, Par */}
      <View style={styles.controlsContainer}>
        {/* Pick Up Button */}
        <View style={styles.actionButtonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary },
              pressed && styles.buttonPressed,
              disabled && styles.buttonDisabled,
            ]}
            onPress={handlePickUp}
            disabled={disabled}
            accessibilityLabel="Pick up ball"
            accessibilityRole="button"
            accessibilityHint="Marks that you picked up your ball on this hole"
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.textPrimary },
                isPickedUp && { color: colors.white },
              ]}
            >
              P
            </Text>
          </Pressable>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>PICK UP</Text>
        </View>

        {/* Score Stepper */}
        <View style={styles.stepperContainer}>
          {/* Minus Button */}
          <Pressable
            style={({ pressed }) => [
              styles.stepperButton,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              pressed && styles.buttonPressed,
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleDecrement}
            disabled={disabled || (selectedScore !== undefined && selectedScore <= MIN_SCORE)}
            accessibilityLabel="Decrease score"
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }]}>−</Text>
          </Pressable>

          {/* Current Score Display */}
          <View style={styles.scoreDisplay}>
            <Text style={[styles.scoreDisplayText, { color: colors.textPrimary }]}>
              {isPickedUp ? 'P' : (selectedScore ?? '-')}
            </Text>
          </View>

          {/* Plus Button */}
          <Pressable
            style={({ pressed }) => [
              styles.stepperButton,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              pressed && !isPickedUp && styles.buttonPressed,
              (disabled || isPickedUp) && styles.buttonDisabled,
            ]}
            onPress={handleIncrement}
            disabled={disabled || isPickedUp || (selectedScore !== undefined && selectedScore >= MAX_SCORE)}
            accessibilityLabel="Increase score"
            accessibilityRole="button"
          >
            <Text style={[styles.stepperButtonText, { color: colors.textPrimary }, isPickedUp && styles.disabledText]}>+</Text>
          </Pressable>
        </View>

        {/* Par Button */}
        <View style={styles.actionButtonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor: colors.gray300, backgroundColor: colors.white },
              selectedScore === currentHole.par && { backgroundColor: colors.primary, borderColor: colors.primary },
              pressed && styles.buttonPressed,
              disabled && styles.buttonDisabled,
            ]}
            onPress={handleParSelect}
            disabled={disabled}
            accessibilityLabel={`Score par ${currentHole.par}`}
            accessibilityRole="button"
            accessibilityHint={`Sets your score to par which is ${currentHole.par}`}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.textPrimary },
                selectedScore === currentHole.par && { color: colors.white },
              ]}
            >
              {currentHole.par}
            </Text>
          </Pressable>
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>PAR</Text>
        </View>
      </View>

      {/* Stats Row - Conditional based on settings */}
      {showStatsRow && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={[
            styles.statsRowContainer,
            // Center putts if it's the only stat shown
            showPutts && !showFIR && !showGreenInRegulation && styles.statsRowCentered,
          ]}>
            {/* FIR Toggle (only for par 4s and 5s) */}
            {showFIR && (
              <View style={styles.checkboxContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.checkbox,
                    { borderColor: colors.gray300, backgroundColor: colors.white },
                    currentScore?.fairwayHit === true && { backgroundColor: colors.success, borderColor: colors.success },
                    pressed && styles.buttonPressed,
                    disabled && styles.buttonDisabled,
                  ]}
                  onPress={handleFairwayToggle}
                  disabled={disabled}
                  accessibilityLabel="Fairway in regulation"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: currentScore?.fairwayHit === true }}
                >
                  {currentScore?.fairwayHit === true && (
                    <Icon source="check" size={24} color={colors.white} />
                  )}
                  {currentScore?.fairwayHit !== true && (
                    <Icon source="check" size={24} color={colors.gray300} />
                  )}
                </Pressable>
                <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>FIR</Text>
              </View>
            )}

            {/* GIR Toggle */}
            {showGreenInRegulation && (
              <View style={styles.checkboxContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.checkbox,
                    { borderColor: colors.gray300, backgroundColor: colors.white },
                    currentScore?.greenInRegulation === true && { backgroundColor: colors.success, borderColor: colors.success },
                    pressed && styles.buttonPressed,
                    disabled && styles.buttonDisabled,
                  ]}
                  onPress={handleGIRToggle}
                  disabled={disabled}
                  accessibilityLabel="Green in regulation"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: currentScore?.greenInRegulation === true }}
                >
                  {currentScore?.greenInRegulation === true && (
                    <Icon source="check" size={24} color={colors.white} />
                  )}
                  {currentScore?.greenInRegulation !== true && (
                    <Icon source="check" size={24} color={colors.gray300} />
                  )}
                </Pressable>
                <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>GIR</Text>
              </View>
            )}

            {/* Putts Counter */}
            {showPutts && (
              <View style={styles.puttsContainer}>
                <View style={styles.puttsStepperRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.puttsButton,
                      { borderColor: colors.gray300, backgroundColor: colors.white },
                      pressed && styles.buttonPressed,
                      (disabled || (currentScore?.putts ?? 0) <= 0) && styles.buttonDisabled,
                    ]}
                    onPress={handlePuttsDecrement}
                    disabled={disabled || (currentScore?.putts ?? 0) <= 0}
                    accessibilityLabel="Decrease putts"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.puttsButtonText, { color: colors.textPrimary }]}>−</Text>
                  </Pressable>

                  <View style={styles.puttsDisplay}>
                    <Text style={[styles.puttsDisplayText, { color: colors.textPrimary }]}>
                      {currentScore?.putts !== undefined ? currentScore.putts : '-'}
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.puttsButton,
                      { borderColor: colors.gray300, backgroundColor: colors.white },
                      pressed && styles.buttonPressed,
                      (disabled || (currentScore?.putts ?? 0) >= MAX_PUTTS) && styles.buttonDisabled,
                    ]}
                    onPress={handlePuttsIncrement}
                    disabled={disabled || (currentScore?.putts ?? 0) >= MAX_PUTTS}
                    accessibilityLabel="Increase putts"
                    accessibilityRole="button"
                  >
                    <Text style={[styles.puttsButtonText, { color: colors.textPrimary }]}>+</Text>
                  </Pressable>
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>PUTTS</Text>
              </View>
            )}
          </View>
        </>
      )}
    </Surface>
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
  actionButtonContainer: {
    alignItems: 'center',
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 28,
    fontWeight: '600',
  },
  actionLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperButton: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 32,
    fontWeight: '400',
  },
  scoreDisplay: {
    width: 56,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDisplayText: {
    fontSize: 40,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.4,
  },
  // Stats row styles
  statsRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statsRowCentered: {
    justifyContent: 'center',
  },
  checkboxContainer: {
    alignItems: 'center',
  },
  checkbox: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  puttsContainer: {
    alignItems: 'center',
  },
  puttsStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  puttsButton: {
    width: 56,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  puttsButtonText: {
    fontSize: 28,
    fontWeight: '400',
  },
  puttsDisplay: {
    width: 40,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  puttsDisplayText: {
    fontSize: 32,
    fontWeight: '700',
  },
});

export default PlayerScoreCard;
