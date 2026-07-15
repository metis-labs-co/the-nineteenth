/**
 * TeamScorePanel Component
 *
 * Displays a team's score entry panel for team match play.
 * Shows:
 * - Team name (with team color dot) and combined handicap
 * - Team's best score for the hole
 * - Individual player scores within the team
 * - Match status badge
 * - Winner indicator when team wins hole
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, shadows } from '@/constants/theme';
import { PICKUP_SCORE } from '@/constants/scoring';
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
  // Manual entry tops out one below the pickup sentinel; conceding is the
  // explicit Pick Up action, so blow-up scores above double bogey are allowed.
  const canIncrement =
    !disabled && !isPickedUp && (score === null || score < PICKUP_SCORE - 1);
  const canPickUp = !disabled;

  const dotCount = Math.min(strokesReceived, MAX_STROKE_DOTS);

  return (
    <View
      style={[
        styles.playerRow,
        { backgroundColor: isBestScore ? colors.primaryBackground : colors.surfaceVariant },
        isBestScore && { borderLeftWidth: 3, borderLeftColor: colors.success },
      ]}
    >
      {/* Player info line */}
      <View style={styles.playerInfo}>
        <View style={styles.playerNameRow}>
          <Text
            style={[styles.playerName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {/* Best Score Indicator */}
          {isBestScore && score !== null && !isPickedUp && (
            <View style={[styles.bestBadge, { backgroundColor: colors.success }]}>
              <Icon source="star" size={12} color={colors.white} />
            </View>
          )}
        </View>
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

      {/* Score action row */}
      <View style={styles.playerControls}>
        {/* Pick Up Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
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
          <Text
            style={[
              styles.actionButtonCaption,
              { color: isPickedUp ? colors.white : colors.textSecondary },
            ]}
          >
            PICK UP
          </Text>
        </TouchableOpacity>

        <View style={styles.stepperGroup}>
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
              styles.stepperButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
              !canIncrement && styles.buttonDisabled,
            ]}
            onPress={() => onScoreAdjust(1)}
            disabled={!canIncrement}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Par Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
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
          <Text
            style={[
              styles.actionButtonCaption,
              { color: colors.textSecondary },
              !isPickedUp && score === par && { color: colors.white },
            ]}
          >
            PAR
          </Text>
        </TouchableOpacity>
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
  /** Accent color for the team dot next to the name (defaults to primary). */
  teamColor?: string;
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
  teamColor,
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
        { backgroundColor: colors.surface, borderColor: colors.border },
        isWinning && { borderColor: colors.success, borderWidth: 2 },
      ]}
    >
      {/* Team Header */}
      <View style={styles.teamHeader}>
        <View style={styles.teamInfo}>
          <View style={styles.teamNameRow}>
            <View
              style={[styles.teamColorDot, { backgroundColor: teamColor ?? colors.primary }]}
            />
            <Text
              style={[styles.teamName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {team.name}
            </Text>
          </View>
          <Text style={[styles.teamHandicap, { color: colors.textSecondary }]}>
            Team {handicapLabel}: {team.handicap}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {/* Team Best Score */}
          <View style={styles.teamScoreStat}>
            <View style={[styles.teamScoreBox, { backgroundColor: colors.surfaceVariant }]}>
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
            <Text style={[styles.teamScoreCaption, { color: colors.textSecondary }]}>
              BEST
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
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: spacing.md,
  },
  teamInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  teamColorDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  teamHandicap: {
    ...typography.caption,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  teamScoreStat: {
    alignItems: 'center',
  },
  teamScoreBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamScoreText: {
    fontSize: 24,
    fontWeight: '800',
  },
  teamScoreCaption: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 3,
  },
  statusBadge: {
    minWidth: 44,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  winningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 5,
    marginHorizontal: 15,
    borderRadius: 9,
    marginBottom: spacing.sm,
  },
  winningText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    marginHorizontal: 15,
  },
  playersContainer: {
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  playerRow: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  playerInfo: {
    marginBottom: spacing.sm,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  playerName: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  handicapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
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
    fontSize: 19,
    fontWeight: '800',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  actionButton: {
    width: 60,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  actionButtonCaption: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepperButton: {
    width: 58,
    height: 62,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 29,
    fontWeight: '500',
  },
  scoreDisplay: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
  },
  parButtonText: {
    fontSize: 19,
    fontWeight: '800',
  },
  bestBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});

export default TeamScorePanel;
