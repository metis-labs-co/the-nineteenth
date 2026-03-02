/**
 * BestBallScoreView Component
 *
 * Displays all player scores for Best Ball format with highlighting.
 * Features:
 * - Shows all player scores on the current hole
 * - Highlights the best (lowest net) score on each hole
 * - Individual score entry for each player
 * - Team total display based on best ball selection
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import { getStrokesOnHole, calculateNetScore, calculateStablefordPoints } from '@/utils/scoring';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import type { TeamWithMembers } from '@/types/database.types';
import { PICKUP_SCORE } from '@/constants/scoring';

interface BestBallPlayerScore {
  player: Player;
  score: HoleScore | MultiBallHoleScore | undefined;
  netScore: number | null;
  stablefordPoints: number;
  isBest: boolean;
}

interface BestBallScoreViewProps {
  team: TeamWithMembers;
  currentHole: Hole;
  playerScores: Map<string, HoleScore | MultiBallHoleScore | undefined>;
  onScoreSelect: (playerId: string, strokes: number) => void;
  disabled?: boolean;
  /** Set of player IDs that can be edited. If undefined, all players can be edited (when not disabled). */
  editablePlayerIds?: Set<string>;
  /** Aggregation mode: 'best' (default) selects best score, 'sum' adds all scores (for Shamble) */
  aggregation?: 'best' | 'sum';
  /** Format label override (e.g., "Shamble Format") */
  formatLabel?: string;
}

const MIN_SCORE = 1;
const MAX_SCORE = 12;

export const BestBallScoreView = React.memo(function BestBallScoreView({
  team,
  currentHole,
  playerScores,
  onScoreSelect,
  disabled = false,
  editablePlayerIds,
  aggregation = 'best',
  formatLabel,
}: BestBallScoreViewProps) {
  const colors = useThemeColors();

  // Calculate scores and determine best ball
  const playerScoreData: BestBallPlayerScore[] = useMemo(() => {
    const members = team.members || [];

    // Calculate net scores for each player
    const scores: BestBallPlayerScore[] = members.map((member) => {
      const player = member.player;
      if (!player) {
        return {
          player: { id: member.player_id, name: 'Unknown', email: '', handicap: 0, createdAt: new Date(), updatedAt: new Date() },
          score: undefined,
          netScore: null,
          stablefordPoints: 0,
          isBest: false,
        };
      }

      const score = playerScores.get(player.id);
      // Narrow to single-ball score for accessing strokes
      const singleBallScore = score && isSingleBallScore(score) ? score : undefined;
      const strokes = singleBallScore?.strokes;
      const isPickedUp = strokes === PICKUP_SCORE;

      let netScore: number | null = null;
      let stablefordPoints = 0;

      if (strokes && !isPickedUp) {
        netScore = calculateNetScore(strokes, player.handicap ?? 0, currentHole);
        stablefordPoints = calculateStablefordPoints(strokes, player.handicap ?? 0, currentHole);
      }

      return {
        player: {
          id: player.id,
          name: player.name,
          email: player.email,
          handicap: player.handicap ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        score,
        netScore,
        stablefordPoints,
        isBest: false,
      };
    });

    // Only mark "best" player in 'best' aggregation mode (not 'sum' for Shamble)
    if (aggregation !== 'sum') {
      // Find the best net score (lowest)
      const validNetScores = scores.filter((s) => s.netScore !== null);
      if (validNetScores.length > 0) {
        const bestNetScore = Math.min(...validNetScores.map((s) => s.netScore!));
        // Mark the first player with the best score
        const bestPlayer = scores.find((s) => s.netScore === bestNetScore);
        if (bestPlayer) {
          bestPlayer.isBest = true;
        }
      }
    }

    return scores;
  }, [team.members, playerScores, currentHole, aggregation]);

  // Calculate team total based on aggregation mode
  const teamTotal = useMemo(() => {
    if (aggregation === 'sum') {
      // Shamble: sum all player points
      return playerScoreData.reduce((sum, p) => sum + p.stablefordPoints, 0);
    }
    // Best Ball: use best score only
    const bestScore = playerScoreData.find((p) => p.isBest);
    return bestScore?.stablefordPoints ?? 0;
  }, [playerScoreData, aggregation]);

  // Determine the format label to display
  const displayFormatLabel = formatLabel ?? (aggregation === 'sum' ? 'Team Total' : 'Best Ball Format');

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Team Header */}
      <View style={styles.header}>
        <View style={styles.teamInfo}>
          <View style={styles.teamNameRow}>
            <Icon source="account-group" size={20} color={colors.primary} />
            <Text style={[styles.teamName, { color: colors.textPrimary }]} numberOfLines={1}>
              {team.name}
            </Text>
          </View>
          <Text style={[styles.formatLabel, { color: colors.textSecondary }]}>
            {displayFormatLabel}
          </Text>
        </View>
        <View style={styles.teamTotal}>
          <Text style={[styles.teamTotalValue, { color: colors.primary }]}>{teamTotal}</Text>
          <Text style={[styles.teamTotalLabel, { color: colors.textSecondary }]}>TEAM PTS</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Player Scores */}
      {playerScoreData.map((data, index) => {
        // Player is disabled if:
        // 1. The whole component is disabled, OR
        // 2. editablePlayerIds is provided and this player is NOT in the set
        const isPlayerDisabled = disabled || (editablePlayerIds !== undefined && !editablePlayerIds.has(data.player.id));
        return (
          <BestBallPlayerRow
            key={data.player.id}
            data={data}
            currentHole={currentHole}
            onScoreSelect={onScoreSelect}
            disabled={isPlayerDisabled}
            isLast={index === playerScoreData.length - 1}
          />
        );
      })}
    </View>
  );
});

// Individual player row component
interface BestBallPlayerRowProps {
  data: BestBallPlayerScore;
  currentHole: Hole;
  onScoreSelect: (playerId: string, strokes: number) => void;
  disabled: boolean;
  isLast: boolean;
}

const BestBallPlayerRow = React.memo(function BestBallPlayerRow({
  data,
  currentHole,
  onScoreSelect,
  disabled,
  isLast,
}: BestBallPlayerRowProps) {
  const colors = useThemeColors();
  const { player, score, stablefordPoints, isBest } = data;

  // Narrow to single-ball score for accessing strokes
  const singleBallScore = score && isSingleBallScore(score) ? score : undefined;
  const selectedScore = singleBallScore?.strokes;
  const isPickedUp = selectedScore === PICKUP_SCORE;
  const strokesOnHole = getStrokesOnHole(player.handicap ?? 0, currentHole);

  const handleDecrement = useCallback(() => {
    if (!disabled) {
      if (isPickedUp) {
        onScoreSelect(player.id, currentHole.par + 2);
      } else {
        const newScore = selectedScore ? Math.max(MIN_SCORE, selectedScore - 1) : currentHole.par;
        onScoreSelect(player.id, newScore);
      }
    }
  }, [disabled, player.id, selectedScore, currentHole.par, onScoreSelect, isPickedUp]);

  const handleIncrement = useCallback(() => {
    if (!disabled && !isPickedUp) {
      const newScore = selectedScore ? Math.min(MAX_SCORE, selectedScore + 1) : currentHole.par;
      onScoreSelect(player.id, newScore);
    }
  }, [disabled, player.id, selectedScore, currentHole.par, onScoreSelect, isPickedUp]);

  const handlePickUp = useCallback(() => {
    if (!disabled) {
      onScoreSelect(player.id, PICKUP_SCORE);
    }
  }, [disabled, player.id, onScoreSelect]);

  return (
    <View
      style={[
        styles.playerRow,
        isBest && { backgroundColor: colors.successLight },
        !isLast && styles.playerRowBorder,
        !isLast && { borderBottomColor: colors.border },
      ]}
    >
      {/* Player Info */}
      <View style={styles.playerInfo}>
        <View style={styles.playerNameRow}>
          {isBest && (
            <Icon source="star" size={16} color={colors.success} />
          )}
          <Text
            style={[
              styles.playerName,
              { color: colors.textPrimary },
              isBest && { fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {player.name}
          </Text>
        </View>
        <Text style={[styles.playerHandicap, { color: colors.textSecondary }]}>
          HC: {player.handicap} • +{strokesOnHole} shot{strokesOnHole !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Score Controls (Compact) */}
      <View style={styles.compactControls}>
        {/* Pick Up Button */}
        <TouchableOpacity
          style={[
            styles.compactButton,
            { borderColor: colors.gray300, backgroundColor: colors.surface },
            isPickedUp && { backgroundColor: colors.primary, borderColor: colors.primary },
            disabled && styles.buttonDisabled,
          ]}
          onPress={handlePickUp}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityLabel="Pick up"
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
            { borderColor: colors.gray300, backgroundColor: colors.surface },
            disabled && styles.buttonDisabled,
          ]}
          onPress={handleDecrement}
          disabled={disabled || (selectedScore !== undefined && selectedScore <= MIN_SCORE)}
          activeOpacity={0.7}
          accessibilityLabel="Decrease score"
        >
          <Text style={[styles.compactButtonText, { color: colors.textPrimary }]}>−</Text>
        </TouchableOpacity>

        {/* Score Display */}
        <View style={styles.compactScoreDisplay}>
          <Text style={[styles.compactScoreText, { color: colors.textPrimary }]}>
            {isPickedUp ? 'P' : (selectedScore ?? '-')}
          </Text>
        </View>

        {/* Plus Button */}
        <TouchableOpacity
          style={[
            styles.compactButton,
            { borderColor: colors.gray300, backgroundColor: colors.surface },
            (disabled || isPickedUp) && styles.buttonDisabled,
          ]}
          onPress={handleIncrement}
          disabled={disabled || isPickedUp || (selectedScore !== undefined && selectedScore >= MAX_SCORE)}
          activeOpacity={0.7}
          accessibilityLabel="Increase score"
        >
          <Text style={[styles.compactButtonText, { color: colors.textPrimary }, isPickedUp && styles.disabledText]}>+</Text>
        </TouchableOpacity>

        {/* Points Display */}
        <View style={[styles.pointsDisplay, isBest && { backgroundColor: colors.success }]}>
          <Text
            style={[
              styles.pointsText,
              { color: isBest ? colors.white : colors.textPrimary },
            ]}
          >
            {stablefordPoints}
          </Text>
          <Text
            style={[
              styles.pointsLabel,
              { color: isBest ? colors.white : colors.textSecondary },
            ]}
          >
            {isBest ? 'BEST' : 'pts'}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
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
  teamInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  teamName: {
    ...typography.h3,
    flexShrink: 1,
  },
  formatLabel: {
    ...typography.body,
  },
  teamTotal: {
    alignItems: 'center',
  },
  teamTotalValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  teamTotalLabel: {
    ...typography.small,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.lg,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  playerRowBorder: {
    borderBottomWidth: 1,
  },
  playerInfo: {
    flex: 1,
    marginRight: spacing.md,
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
  playerHandicap: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  compactControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactButton: {
    width: 44,
    height: 44,
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
    width: 36,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactScoreText: {
    fontSize: 24,
    fontWeight: '700',
  },
  pointsDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: 44,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '700',
  },
  pointsLabel: {
    ...typography.caption,
    fontSize: 10,
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
});

export default BestBallScoreView;
