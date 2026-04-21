/**
 * TeamScorePanel Component
 *
 * Displays a team's score entry panel for team match play.
 * Shows:
 * - Team name and combined handicap
 * - Team's best score for the hole
 * - Individual player scores within the team
 * - Match status badge
 * - Winner indicator when team wins hole
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { MatchTeam, TeamMatchStatusDisplay } from '../types';

interface PlayerScoreRowProps {
  name: string;
  handicap: number;
  score: number | null;
  isBestScore: boolean;
  par: number;
  isMatchComplete: boolean;
  /** Handicap strokes received on the current hole (0 if none). */
  strokesReceived: number;
  /** Whether the player has picked up on the current hole. */
  isPickedUp: boolean;
  onScoreAdjust: (delta: number) => void;
  onParSelect: () => void;
  onPickUp: () => void;
  /** Label for the handicap value: 'H', 'DHC', etc. */
  handicapLabel?: string;
}

/** Max stroke-indicator dots to render inline before we stop (avoids row overflow). */
const MAX_STROKE_DOTS = 2;

function PlayerScoreRow({
  name,
  handicap,
  score,
  isBestScore,
  par,
  isMatchComplete,
  strokesReceived,
  isPickedUp,
  onScoreAdjust,
  onParSelect,
  onPickUp,
  handicapLabel = 'HC',
}: PlayerScoreRowProps) {
  const colors = useThemeColors();

  const getScoreColor = (s: number | null): string => {
    if (s === null) return colors.textSecondary;
    if (s < par) return colors.birdie;
    if (s === par) return colors.par;
    if (s === par + 1) return colors.bogey;
    return colors.doubleBogey;
  };

  const disabled = isMatchComplete;
  const canDecrement = !disabled && !isPickedUp && (score === null || score > 1);
  const canIncrement = !disabled && !isPickedUp && (score === null || score < 12);
  const canPickUp = !disabled;

  const dotCount = Math.min(strokesReceived, MAX_STROKE_DOTS);

  return (
    <View
      style={[
        styles.playerRow,
        { backgroundColor: isBestScore ? colors.surfaceVariant : colors.surface },
        isBestScore && { borderLeftWidth: 3, borderLeftColor: colors.success },
      ]}
    >
      <View style={styles.playerInfo}>
        <Text
          style={[styles.playerName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <View style={styles.handicapRow}>
          <Text style={[styles.handicapText, { color: colors.textSecondary }]}>
            {handicapLabel}: {handicap}
          </Text>
          {dotCount > 0 && (
            <View
              style={styles.strokeDots}
              accessibilityLabel={`Receives ${strokesReceived} stroke${strokesReceived === 1 ? '' : 's'} on this hole`}
            >
              {Array.from({ length: dotCount }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.strokeDot, { backgroundColor: colors.warning }]}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.playerControls}>
        {/* Pick Up Button */}
        <TouchableOpacity
          style={[
            styles.smallButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary },
            !canPickUp && styles.buttonDisabled,
          ]}
          onPress={onPickUp}
          disabled={!canPickUp}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isPickedUp ? `Clear pickup for ${name}` : `Pick up ${name}`}
        >
          <Text
            style={[
              styles.pickupButtonText,
              { color: isPickedUp ? colors.white : colors.textPrimary },
            ]}
          >
            P
          </Text>
        </TouchableOpacity>

        {/* Minus Button */}
        <TouchableOpacity
          style={[
            styles.smallButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            !canDecrement && styles.buttonDisabled,
          ]}
          onPress={() => onScoreAdjust(-1)}
          disabled={!canDecrement}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>−</Text>
        </TouchableOpacity>

        {/* Score Display */}
        <View style={styles.scoreDisplay}>
          <Text
            style={[
              styles.scoreText,
              { color: isPickedUp ? colors.textSecondary : getScoreColor(score) },
            ]}
          >
            {isPickedUp ? 'P' : (score ?? '-')}
          </Text>
        </View>

        {/* Plus Button */}
        <TouchableOpacity
          style={[
            styles.smallButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            !canIncrement && styles.buttonDisabled,
          ]}
          onPress={() => onScoreAdjust(1)}
          disabled={!canIncrement}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>+</Text>
        </TouchableOpacity>

        {/* Par Button */}
        <TouchableOpacity
          style={[
            styles.parButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            !isPickedUp && score === par && { backgroundColor: colors.primary, borderColor: colors.primary },
            disabled && styles.buttonDisabled,
          ]}
          onPress={onParSelect}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.parButtonText,
              { color: colors.textPrimary },
              !isPickedUp && score === par && { color: colors.white },
            ]}
          >
            {par}
          </Text>
        </TouchableOpacity>

        {/* Best Score Indicator */}
        {isBestScore && score !== null && !isPickedUp && (
          <View style={[styles.bestBadge, { backgroundColor: colors.success }]}>
            <Icon source="star" size={12} color={colors.white} />
          </View>
        )}
      </View>
    </View>
  );
}

export interface TeamScorePanelProps {
  team: MatchTeam;
  teamScore: number | null;
  bestPlayerId: string | null;
  par: number;
  isMatchComplete: boolean;
  isWinning: boolean;
  matchStatus?: TeamMatchStatusDisplay;
  getPlayerScore: (playerId: string) => number | null;
  getPlayerStrokesReceived: (playerId: string) => number;
  getPlayerIsPickedUp: (playerId: string) => boolean;
  onPlayerScoreAdjust: (playerId: string, delta: number) => void;
  onPlayerParSelect: (playerId: string, par: number) => void;
  onPlayerPickUp: (playerId: string) => void;
  /** Label for player handicap values: 'H' or 'DHC' */
  handicapLabel?: string;
}

export function TeamScorePanel({
  team,
  teamScore,
  bestPlayerId,
  par,
  isMatchComplete,
  isWinning,
  matchStatus,
  getPlayerScore,
  getPlayerStrokesReceived,
  getPlayerIsPickedUp,
  onPlayerScoreAdjust,
  onPlayerParSelect,
  onPlayerPickUp,
  handicapLabel = 'HC',
}: TeamScorePanelProps) {
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

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: colors.surfaceVariant },
        isWinning && { borderColor: colors.success, borderWidth: 2 },
      ]}
    >
      {/* Team Header */}
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          <Text
            style={[styles.teamName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {team.name}
          </Text>
          <Text style={[styles.teamHandicap, { color: colors.textSecondary }]}>
            Team {handicapLabel}: {team.handicap}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Team Best Score */}
          <View style={[styles.teamScoreBox, { backgroundColor: colors.surface }]}>
            <Text
              style={[
                styles.teamScoreText,
                {
                  color:
                    teamScore !== null
                      ? teamScore < par
                        ? colors.birdie
                        : teamScore === par
                          ? colors.par
                          : teamScore === par + 1
                            ? colors.bogey
                            : colors.doubleBogey
                      : colors.textSecondary,
                },
              ]}
            >
              {teamScore ?? '-'}
            </Text>
          </View>

          {/* Match Status Badge */}
          {matchStatus && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor() }]}>
              <Text style={[styles.statusBadgeText, { color: colors.white }]}>
                {matchStatus.text}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Winner Indicator */}
      {isWinning && teamScore !== null && (
        <View style={[styles.winningBanner, { backgroundColor: colors.success }]}>
          <Icon source="trophy" size={14} color={colors.white} />
          <Text style={[styles.winningText, { color: colors.white }]}>WINNING</Text>
        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Individual Player Scores */}
      <View style={styles.playersContainer}>
        {team.members.map((member) => {
          const playerScore = getPlayerScore(member.id);
          const isBest = member.id === bestPlayerId;
          return (
            <PlayerScoreRow
              key={member.id}
              name={member.name}
              handicap={member.handicap}
              score={playerScore}
              isBestScore={isBest}
              par={par}
              isMatchComplete={isMatchComplete}
              strokesReceived={getPlayerStrokesReceived(member.id)}
              isPickedUp={getPlayerIsPickedUp(member.id)}
              onScoreAdjust={(delta) => onPlayerScoreAdjust(member.id, delta)}
              onParSelect={() => onPlayerParSelect(member.id, par)}
              onPickUp={() => onPlayerPickUp(member.id)}
              handicapLabel={handicapLabel}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  teamInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  teamName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  teamHandicap: {
    ...typography.caption,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamScoreBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamScoreText: {
    fontSize: 28,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  statusBadgeText: {
    ...typography.smallBold,
    letterSpacing: 0.5,
  },
  winningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  winningText: {
    ...typography.captionBold,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
  },
  playersContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  playerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  playerName: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  handicapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  handicapText: {
    ...typography.caption,
  },
  strokeDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  strokeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pickupButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  smallButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '400',
  },
  scoreDisplay: {
    width: 36,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
  },
  parButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  parButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bestBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});

export default TeamScorePanel;
