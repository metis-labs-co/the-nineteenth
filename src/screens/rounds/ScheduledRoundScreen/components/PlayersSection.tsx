/**
 * PlayersSection — list of round players with name, handicap, and invitation status
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { ScheduledRoundPlayer } from '@/hooks/rounds/scheduledRounds';
import type { RoundInvitationStatus } from '@/types/database/enums';

interface PlayerRowProps {
  player: ScheduledRoundPlayer;
  isMe: boolean;
}

function statusColors(status: RoundInvitationStatus, colors: ReturnType<typeof useThemeColors>) {
  switch (status) {
    case 'accepted':
      return { bg: colors.successLight, text: colors.success, label: 'Accepted' };
    case 'declined':
      return { bg: colors.errorLight, text: colors.error, label: 'Declined' };
    case 'pending':
    default:
      return { bg: colors.warningLight, text: colors.warningDark, label: 'Pending' };
  }
}

function PlayerRow({ player, isMe }: PlayerRowProps) {
  const colors = useThemeColors();
  const name = player.player?.name ?? 'Unknown Player';
  const handicap = player.player?.handicap;
  const status = player.invitation_status;
  const sc = statusColors(status, colors);
  const isDeclined = status === 'declined';

  return (
    <View style={[styles.playerRow, { borderBottomColor: colors.border }]}>
      {/* Avatar circle */}
      <View style={[styles.avatar, { backgroundColor: isMe ? colors.primary : colors.surfaceVariant }]}>
        <Text style={[styles.avatarText, { color: isMe ? colors.white : colors.textSecondary }]}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Name + handicap */}
      <View style={styles.nameBlock}>
        <Text
          style={[
            styles.playerName,
            { color: isDeclined ? colors.textDisabled : colors.textPrimary },
            isDeclined && styles.strikethrough,
          ]}
          numberOfLines={1}
        >
          {name}
          {isMe ? ' (you)' : ''}
        </Text>
        {handicap != null && (
          <Text style={[styles.handicap, { color: colors.textSecondary }]}>
            HCP {handicap}
          </Text>
        )}
      </View>

      {/* Status pill */}
      <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
        {status === 'accepted' ? (
          <Icon source="check" size={12} color={sc.text} />
        ) : status === 'pending' ? (
          <Icon source="clock-outline" size={12} color={sc.text} />
        ) : (
          <Icon source="close" size={12} color={sc.text} />
        )}
        <Text style={[styles.statusLabel, { color: sc.text }]}>{sc.label}</Text>
      </View>
    </View>
  );
}

interface PlayersSectionProps {
  players: ScheduledRoundPlayer[];
  myPlayerId: string;
}

export function PlayersSection({ players, myPlayerId }: PlayersSectionProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, shadows.sm, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        PLAYERS ({players.length})
      </Text>
      {players.map((p) => (
        <PlayerRow key={p.player_id} player={p} isMe={p.player_id === myPlayerId} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...typography.smallBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    ...typography.bodyBold,
  },
  nameBlock: {
    flex: 1,
  },
  playerName: {
    ...typography.body,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  handicap: {
    ...typography.caption,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
});
