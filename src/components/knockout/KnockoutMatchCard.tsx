/**
 * KnockoutMatchCard - Individual match card in the bracket
 *
 * Shows two players, their seeds, scores, and match result.
 * Supports states: pending, ready, in_progress, completed, bye.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { KnockoutMatchWithPlayers } from '@/types/database';

export interface KnockoutMatchCardProps {
  match: KnockoutMatchWithPlayers;
  currentUserId?: string;
  onPress?: (match: KnockoutMatchWithPlayers) => void;
}

function getStatusBadge(status: string, colors: ColorPalette) {
  switch (status) {
    case 'completed':
      return { label: 'Completed', bg: colors.successLight, text: colors.successDark, icon: 'check-circle' };
    case 'in_progress':
      return { label: 'In Progress', bg: colors.warningLight, text: colors.warningDark, icon: 'play-circle' };
    case 'ready':
      return { label: 'Upcoming', bg: colors.primaryLighter, text: colors.primaryDark, icon: 'clock-outline' };
    case 'bye':
      return { label: 'BYE', bg: colors.gray200, text: colors.gray700, icon: 'arrow-right-bold' };
    default:
      return { label: 'TBD', bg: colors.gray100, text: colors.gray500, icon: 'help-circle-outline' };
  }
}

export const KnockoutMatchCard = React.memo(function KnockoutMatchCard({
  match,
  currentUserId,
  onPress,
}: KnockoutMatchCardProps) {
  const colors = useThemeColors();
  const badge = getStatusBadge(match.status, colors);

  const isCompleted = match.status === 'completed';
  const isBye = match.status === 'bye';
  const isCurrentUserInMatch =
    currentUserId && (match.player1_id === currentUserId || match.player2_id === currentUserId);

  const p1IsWinner = isCompleted && match.winner_id === match.player1_id;
  const p2IsWinner = isCompleted && match.winner_id === match.player2_id;

  const renderPlayer = (
    player: { id: string; name: string; photo_url?: string | null } | null | undefined,
    seed: number | null,
    score: number | null,
    isWinner: boolean,
    isLoser: boolean
  ) => {
    const isCurrentUser = currentUserId && player?.id === currentUserId;
    const playerName = player?.name ?? 'TBD';
    const displayName = playerName.length > 16 ? playerName.slice(0, 14) + '...' : playerName;

    return (
      <View
        style={[
          styles.playerRow,
          isWinner && { backgroundColor: colors.successLight },
          isCurrentUser && !isWinner && { backgroundColor: colors.primaryLighter },
        ]}
      >
        {/* Seed badge */}
        <View style={[styles.seedBadge, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.seedText, { color: colors.gray700 }]}>
            {seed ?? '-'}
          </Text>
        </View>

        {/* Player name */}
        <Text
          style={[
            styles.playerName,
            { color: isLoser ? colors.textDisabled : colors.textPrimary },
            isWinner && styles.playerNameWinner,
          ]}
          numberOfLines={1}
        >
          {displayName}
        </Text>

        {/* Score */}
        <Text
          style={[
            styles.score,
            { color: isLoser ? colors.textDisabled : colors.textSecondary },
            isWinner && { color: colors.successDark },
          ]}
        >
          {score != null ? score : '--'}
        </Text>

        {/* Winner check */}
        {isWinner && (
          <Icon source="check-circle" size={16} color={colors.success} />
        )}
      </View>
    );
  };

  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isCurrentUserInMatch && { borderColor: colors.primary, borderWidth: 1.5 },
      ]}
    >
      {/* Player 1 */}
      {renderPlayer(
        match.player1,
        match.seed1,
        match.player1_score,
        p1IsWinner,
        isCompleted && !p1IsWinner
      )}

      {/* Divider with VS */}
      <View style={[styles.divider, { backgroundColor: colors.border }]}>
        <Text style={[styles.vsText, { color: colors.textDisabled }]}>vs</Text>
      </View>

      {/* Player 2 */}
      {renderPlayer(
        match.player2,
        match.seed2,
        match.player2_score,
        p2IsWinner,
        isCompleted && !p2IsWinner
      )}

      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
        <Icon source={badge.icon} size={12} color={badge.text} />
        <Text style={[styles.statusText, { color: badge.text }]}>
          {isCompleted && match.winner
            ? `${match.winner.name} advances`
            : isBye && match.player1
              ? `${match.player1.name} advances`
              : badge.label}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={() => onPress(match)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Match: ${match.player1?.name ?? 'TBD'} vs ${match.player2?.name ?? 'TBD'}`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  seedBadge: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seedText: {
    ...typography.captionBold,
  },
  playerName: {
    ...typography.body,
    flex: 1,
  },
  playerNameWinner: {
    fontWeight: '600',
  },
  score: {
    ...typography.bodyBold,
    minWidth: 32,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    ...typography.caption,
    position: 'absolute',
    paddingHorizontal: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  statusText: {
    ...typography.caption,
  },
});
