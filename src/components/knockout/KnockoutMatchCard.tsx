/**
 * KnockoutMatchCard - Individual match card in the bracket
 *
 * Shows two players, their seeds, scores, and match result.
 * Supports states: pending, ready, in_progress, completed, bye.
 *
 * Styled per the Competition Details redesign: blue-tint seed chips,
 * winner row tint + check, centred "vs" divider chip, tinted footer strip,
 * and a distinct border + YOU pill on the current user's match.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors, type ColorPalette } from '@/context/ThemeContext';
import { spacing, borderRadius, shadows } from '@/constants/theme';
import type { KnockoutMatchWithPlayers } from '@/types/database';

export interface KnockoutMatchCardProps {
  match: KnockoutMatchWithPlayers;
  currentUserId?: string;
  onPress?: (match: KnockoutMatchWithPlayers) => void;
}

function getFooterStrip(status: string, colors: ColorPalette) {
  switch (status) {
    case 'completed':
    case 'bye':
      return { label: 'Completed', bg: colors.primaryBackground, text: colors.primaryDark };
    case 'in_progress':
      return { label: 'In progress', bg: colors.warningLight, text: colors.warningDark };
    case 'ready':
      return { label: 'Upcoming', bg: colors.infoLight, text: colors.info };
    default:
      return { label: 'TBD', bg: colors.surfaceVariant, text: colors.textSecondary };
  }
}

export const KnockoutMatchCard = React.memo(function KnockoutMatchCard({
  match,
  currentUserId,
  onPress,
}: KnockoutMatchCardProps) {
  const colors = useThemeColors();
  const footer = getFooterStrip(match.status, colors);

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
    // When a "You" pill is shown, leave more room for it by truncating earlier
    const maxNameLength = isCurrentUser ? 12 : 16;
    const displayName =
      playerName.length > maxNameLength ? playerName.slice(0, maxNameLength - 2) + '...' : playerName;

    return (
      <View
        style={[
          styles.playerRow,
          isWinner && { backgroundColor: colors.surfaceSelected },
          isCurrentUser && !isWinner && { backgroundColor: colors.primaryBackground },
        ]}
      >
        {/* Seed chip */}
        <View style={[styles.seedChip, { backgroundColor: colors.infoLight }]}>
          <Text style={[styles.seedText, { color: colors.info }]}>
            {seed ?? '-'}
          </Text>
        </View>

        {/* Player name */}
        <View style={styles.nameContainer}>
          <Text
            style={[
              styles.playerName,
              { color: isLoser ? colors.textTertiary : colors.textPrimary },
              isWinner && styles.playerNameWinner,
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {isCurrentUser && (
            <View style={[styles.youPill, { backgroundColor: colors.primary }]}>
              <Text style={[styles.youPillText, { color: colors.white }]}>YOU</Text>
            </View>
          )}
        </View>

        {/* Score */}
        <Text
          style={[
            styles.score,
            { color: isLoser ? colors.textTertiary : colors.textSecondary },
            isWinner && { color: colors.primaryDark },
          ]}
        >
          {score != null ? score : '--'}
        </Text>

        {/* Winner check */}
        {isWinner && (
          <Icon source="check" size={15} color={colors.primaryDark} />
        )}
      </View>
    );
  };

  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isCurrentUserInMatch && { borderColor: colors.info, borderWidth: 1.5 },
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
      <View style={[styles.divider, { backgroundColor: colors.borderLight }]}>
        <Text style={[styles.vsText, { color: colors.textTertiary, backgroundColor: colors.surface }]}>
          vs
        </Text>
      </View>

      {/* Player 2 */}
      {renderPlayer(
        match.player2,
        match.seed2,
        match.player2_score,
        p2IsWinner,
        isCompleted && !p2IsWinner
      )}

      {/* Footer strip */}
      <View style={[styles.footerStrip, { backgroundColor: footer.bg }]}>
        <Text style={[styles.footerText, { color: footer.text }]}>
          {isCompleted && match.winner
            ? `${match.winner.name} advances`
            : isBye && match.player1
              ? `${match.player1.name} advances`
              : footer.label}
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
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    gap: spacing.sm + 2,
  },
  seedChip: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seedText: {
    fontSize: 11,
    fontWeight: '800',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minWidth: 0,
  },
  playerName: {
    fontSize: 14.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  playerNameWinner: {
    fontWeight: '800',
  },
  youPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  youPillText: {
    fontSize: 8,
    fontWeight: '800',
  },
  score: {
    fontSize: 13,
    fontWeight: '800',
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
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 14,
    position: 'absolute',
    paddingHorizontal: spacing.sm,
  },
  footerStrip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
