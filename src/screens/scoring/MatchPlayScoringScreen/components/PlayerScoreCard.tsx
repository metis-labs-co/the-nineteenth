/**
 * PlayerScoreCard - Score entry card for a single player in match play
 *
 * Styled to match the regular scorecard entry PlayerScoreCard pattern:
 * - Player name with handicap
 * - Match status badge
 * - Pick Up quick action for when player gives up the hole
 * - Score stepper controls
 * - Par quick action button
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { ScaledText } from '@/components/common/ScaledText';
import type { MatchPlayer, PlayerMatchStatus } from '../types';

interface PlayerScoreCardProps {
  player: MatchPlayer;
  currentScore: number | null;
  isPickedUp: boolean;
  par: number;
  isMatchComplete: boolean;
  /** Match status from this player's perspective */
  matchStatus?: PlayerMatchStatus;
  /** Number of handicap strokes received on this hole (0 if none) */
  strokesReceived?: number;
  onScoreAdjust: (delta: number) => void;
  onParSelect: () => void;
  onPickUp: () => void;
  getScoreColor: (score: number | null) => string;
  onPlayerPress?: () => void;
  /** Rounded daily handicap value (null if not applied) */
  dailyHandicap?: number | null;
  /** Raw decimal base handicap value */
  baseHandicap?: number;
  /** Label for base value: 'HC' or 'SHC' */
  baseLabel?: string;
}

export function PlayerScoreCard({
  player,
  currentScore,
  isPickedUp,
  par,
  isMatchComplete: _isMatchComplete,
  matchStatus,
  strokesReceived = 0,
  onScoreAdjust,
  onParSelect,
  onPickUp,
  getScoreColor,
  onPlayerPress,
  dailyHandicap,
  baseHandicap,
  baseLabel,
}: PlayerScoreCardProps) {
  const colors = useThemeColors();

  // Get badge color based on match status type
  const getStatusBadgeColor = () => {
    if (!matchStatus) return colors.surfaceVariant;
    switch (matchStatus.type) {
      case 'up':
      case 'win':
        return colors.success;
      case 'down':
      case 'loss':
        return colors.error;
      case 'square':
      case 'halved':
      default:
        return colors.warning;
    }
  };

  // Score entry is only disabled after submission, not when match is complete
  // This allows users to edit scores until they explicitly submit
  const canDecrement = !isPickedUp && (currentScore === null || currentScore > 1);
  const canIncrement = !isPickedUp && (currentScore === null || currentScore < 12);

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceVariant }]}>
      {/* Player Header - matches regular PlayerScoreCard */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.playerInfo, onPlayerPress && styles.playerInfoTappable]}
          onPress={onPlayerPress}
          disabled={!onPlayerPress}
          activeOpacity={0.7}
          accessibilityLabel={`View ${player.name}'s scorecard`}
          accessibilityRole="button"
        >
          <ScaledText category="body" style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
            {player.name}
          </ScaledText>
          <ScaledText category="caption" style={[styles.handicapLabel, { color: colors.textSecondary }]}>
            {dailyHandicap != null
              ? `DHC: ${dailyHandicap} / ${baseLabel ?? 'HC'}: ${baseHandicap ?? player.handicap}`
              : `HC: ${player.handicap}`}
          </ScaledText>
        </TouchableOpacity>

        {/* Stats Display - matches Stableford PlayerScoreCard */}
        <View style={styles.statsContainer}>
          {/* Shots received on this hole */}
          <View style={styles.statItem}>
            <ScaledText category="critical" style={[styles.statValue, { color: colors.textPrimary }]}>
              {strokesReceived > 0 ? `+${strokesReceived}` : '-'}
            </ScaledText>
            <ScaledText category="caption" style={[styles.statLabel, { color: colors.textSecondary }]}>SHOTS</ScaledText>
          </View>

          {/* Match Status Display */}
          {matchStatus && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor() }]}>
              {matchStatus.type === 'up' && (
                <>
                  <Icon source="arrow-up-bold" size={16} color={colors.white} />
                  <ScaledText category="critical" style={[styles.statusBadgeNumber, { color: colors.white }]}>
                    {matchStatus.holesUpDown}
                  </ScaledText>
                </>
              )}
              {matchStatus.type === 'down' && (
                <>
                  <Icon source="arrow-down-bold" size={16} color={colors.white} />
                  <ScaledText category="critical" style={[styles.statusBadgeNumber, { color: colors.white }]}>
                    {Math.abs(matchStatus.holesUpDown)}
                  </ScaledText>
                </>
              )}
              {(matchStatus.type === 'square' || matchStatus.type === 'halved') && (
                <>
                  <Icon source="equal" size={16} color={colors.white} />
                  <ScaledText category="critical" style={[styles.statusBadgeText, { color: colors.white }]}>AS</ScaledText>
                </>
              )}
              {matchStatus.type === 'win' && (
                <>
                  <Icon source="trophy" size={16} color={colors.white} />
                  <ScaledText category="critical" style={[styles.statusBadgeText, { color: colors.white }]}>WIN</ScaledText>
                </>
              )}
              {matchStatus.type === 'loss' && (
                <ScaledText category="critical" style={[styles.statusBadgeText, { color: colors.white }]}>LOSS</ScaledText>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Score Controls - matches regular PlayerScoreCard layout: [PICK UP] [Stepper] [PAR] */}
      <View style={styles.controlsContainer}>
        {/* Pick Up Button */}
        <View style={styles.quickActionContainer}>
          <TouchableOpacity
            style={[
              styles.quickActionButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={onPickUp}
            activeOpacity={0.7}
            accessibilityLabel="Pick up ball"
            accessibilityHint="Marks that you picked up your ball on this hole"
          >
            <ScaledText
              category="critical"
              style={[
                styles.quickActionText,
                { color: colors.textPrimary },
                isPickedUp && { color: colors.white },
              ]}
            >
              P
            </ScaledText>
          </TouchableOpacity>
          <ScaledText category="caption" style={[styles.quickActionLabel, { color: colors.textSecondary }]}>PICK UP</ScaledText>
        </View>

        {/* Score Stepper */}
        <View style={styles.stepperContainer}>
          {/* Minus Button */}
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              !canDecrement && styles.buttonDisabled,
            ]}
            onPress={() => onScoreAdjust(-1)}
            disabled={!canDecrement}
            activeOpacity={0.7}
            accessibilityLabel={`Decrease ${player.name} score`}
            accessibilityRole="button"
          >
            <ScaledText category="critical" style={[styles.stepperButtonText, { color: colors.textPrimary }]}>−</ScaledText>
          </TouchableOpacity>

          {/* Current Score Display */}
          <View style={styles.scoreDisplay}>
            <ScaledText category="critical" style={[styles.scoreDisplayText, { color: isPickedUp ? colors.textSecondary : getScoreColor(currentScore) }]}>
              {isPickedUp ? 'P' : (currentScore ?? '-')}
            </ScaledText>
          </View>

          {/* Plus Button */}
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              !canIncrement && styles.buttonDisabled,
            ]}
            onPress={() => onScoreAdjust(1)}
            disabled={!canIncrement}
            activeOpacity={0.7}
            accessibilityLabel={`Increase ${player.name} score`}
            accessibilityRole="button"
          >
            <ScaledText category="critical" style={[styles.stepperButtonText, { color: colors.textPrimary }]}>+</ScaledText>
          </TouchableOpacity>
        </View>

        {/* Par Button */}
        <View style={styles.quickActionContainer}>
          <TouchableOpacity
            style={[
              styles.quickActionButton,
              { borderColor: colors.gray300, backgroundColor: colors.surface },
              currentScore === par && !isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={onParSelect}
            activeOpacity={0.7}
            accessibilityLabel={`Set ${player.name} score to par ${par}`}
          >
            <ScaledText
              category="critical"
              style={[
                styles.quickActionText,
                { color: colors.textPrimary },
                currentScore === par && !isPickedUp && { color: colors.white },
              ]}
            >
              {par}
            </ScaledText>
          </TouchableOpacity>
          <ScaledText category="caption" style={[styles.quickActionLabel, { color: colors.textSecondary }]}>PAR</ScaledText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: 48,
    gap: 2,
  },
  statusBadgeNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadgeText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
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
  // Quick action buttons (Pick Up, Par)
  quickActionContainer: {
    alignItems: 'center',
  },
  quickActionButton: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 28,
    fontWeight: '600',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  // Stepper
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
  buttonDisabled: {
    opacity: 0.4,
  },
});

export default PlayerScoreCard;
