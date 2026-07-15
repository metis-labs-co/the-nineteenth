/**
 * PlayerScoreCard - Score entry card for a single player in match play
 *
 * Styled to the Score & Round redesign (match play screen):
 * - Optional "YOU" eyebrow + tinted card for the logged-in player
 * - Player name with handicap line
 * - SHOTS stat + match status badge pill
 * - Pick Up quick action for when player gives up the hole
 * - Score stepper controls
 * - Par quick action button
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, shadows } from '@/constants/theme';
import { PICKUP_SCORE } from '@/constants/scoring';
import { ScaledText } from '@/components/common/ScaledText';
import { formatHandicapIndex } from '@/utils/displayHelpers';
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
  /** Hex colour of the tee the player is playing from (dot next to name) */
  teeDotColor?: string;
  /** True when this card belongs to the logged-in user ("YOU" eyebrow + tinted card) */
  isCurrentUser?: boolean;
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
  teeDotColor,
  isCurrentUser = false,
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
  // Manual entry tops out one below the pickup sentinel — conceding a hole is
  // the explicit Pick Up action, not the side effect of incrementing into a
  // high score. This lets players record blow-up scores above double bogey.
  const canIncrement = !isPickedUp && (currentScore === null || currentScore < PICKUP_SCORE - 1);

  const isParSelected = currentScore === par && !isPickedUp;

  return (
    <View
      style={[
        styles.card,
        isCurrentUser
          ? { backgroundColor: colors.primaryBackground, borderColor: colors.primaryLight }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Player Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.playerInfo, onPlayerPress && styles.playerInfoTappable]}
          onPress={onPlayerPress}
          disabled={!onPlayerPress}
          activeOpacity={0.7}
          accessibilityLabel={`View ${player.name}'s scorecard`}
          accessibilityRole="button"
        >
          {isCurrentUser && (
            <ScaledText category="caption" style={[styles.youEyebrow, { color: colors.primary }]}>
              YOU
            </ScaledText>
          )}
          <View style={styles.playerNameRow}>
            {teeDotColor && (
              <View
                style={[
                  styles.teeDot,
                  { backgroundColor: teeDotColor, borderColor: colors.border },
                ]}
              />
            )}
            <ScaledText category="body" style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {player.name}
            </ScaledText>
          </View>
          <ScaledText category="caption" style={[styles.handicapLabel, { color: colors.textSecondary }]}>
            {dailyHandicap != null
              ? `DHC: ${formatHandicapIndex(dailyHandicap, 0)} / ${baseLabel ?? 'HC'}: ${formatHandicapIndex(baseHandicap ?? player.handicap)}`
              : `HC: ${formatHandicapIndex(player.handicap)}`}
          </ScaledText>
        </TouchableOpacity>

        {/* Stats Display: SHOTS stat + match status badge pill */}
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

      {/* Score Controls: [PICK UP] [Stepper] [PAR] */}
      <View style={styles.controlsContainer}>
        {/* Pick Up Button */}
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            isPickedUp && { backgroundColor: colors.bogeyBackground, borderColor: colors.bogey },
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
              { color: isPickedUp ? colors.bogey : colors.textSecondary },
            ]}
          >
            P
          </ScaledText>
          <ScaledText
            category="caption"
            style={[
              styles.quickActionLabel,
              { color: isPickedUp ? colors.bogey : colors.textSecondary },
            ]}
          >
            PICK UP
          </ScaledText>
        </TouchableOpacity>

        {/* Score Stepper */}
        <View style={styles.stepperContainer}>
          {/* Minus Button */}
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
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
            <ScaledText category="critical" style={[styles.scoreDisplayText, { color: isPickedUp ? colors.bogey : getScoreColor(currentScore) }]}>
              {isPickedUp ? 'P' : (currentScore ?? '-')}
            </ScaledText>
          </View>

          {/* Plus Button */}
          <TouchableOpacity
            style={[
              styles.stepperButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
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
        <TouchableOpacity
          style={[
            styles.quickActionButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            isParSelected && { backgroundColor: colors.primaryBackground, borderColor: colors.primary },
          ]}
          onPress={onParSelect}
          activeOpacity={0.7}
          accessibilityLabel={`Set ${player.name} score to par ${par}`}
        >
          <ScaledText
            category="critical"
            style={[
              styles.quickActionText,
              { color: isParSelected ? colors.primaryDark : colors.textPrimary },
            ]}
          >
            {par}
          </ScaledText>
          <ScaledText
            category="caption"
            style={[
              styles.quickActionLabel,
              { color: isParSelected ? colors.primaryDark : colors.textSecondary },
            ]}
          >
            PAR
          </ScaledText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
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
    borderRadius: 12,
    padding: spacing.xs,
    marginLeft: -spacing.xs,
    marginTop: -spacing.xs,
  },
  youEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  handicapLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    height: 38,
    borderRadius: 12,
    minWidth: 48,
    gap: 3,
  },
  statusBadgeNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  // Quick action buttons (Pick Up, Par) — label lives inside the button
  quickActionButton: {
    width: 60,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  quickActionText: {
    fontSize: 19,
    fontWeight: '800',
  },
  quickActionLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  stepperButton: {
    width: 58,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonText: {
    fontSize: 29,
    fontWeight: '500',
  },
  scoreDisplay: {
    width: 52,
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDisplayText: {
    fontSize: 40,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});

export default PlayerScoreCard;
