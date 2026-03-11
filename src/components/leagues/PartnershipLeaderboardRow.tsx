/**
 * PartnershipLeaderboardRow - Leaderboard row for partnership leagues
 *
 * Shows rank, two player avatars, partnership name, avg differential,
 * rounds played, and best differential.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import type { PartnershipLeaderboardEntry } from '@/types/database';

interface PartnershipLeaderboardRowProps {
  entry: PartnershipLeaderboardEntry;
  isCurrentUser: boolean;
  onPress?: (entry: PartnershipLeaderboardEntry) => void;
}

export const PartnershipLeaderboardRow = React.memo(function PartnershipLeaderboardRow({
  entry,
  isCurrentUser,
  onPress,
}: PartnershipLeaderboardRowProps) {
  const colors = useThemeColors();

  const isFirst = entry.rank === 1 && entry.rounds_played > 0;
  const hasRounds = entry.rounds_played > 0;

  return (
    <TouchableOpacity
      onPress={() => onPress?.(entry)}
      disabled={!onPress}
      style={[
        styles.row,
        {
          backgroundColor: isCurrentUser
            ? colors.primaryBackground
            : isFirst
              ? colors.warningBackground
              : 'transparent',
        },
      ]}
      activeOpacity={0.7}
      accessibilityLabel={`Rank ${entry.rank}, ${entry.partnership_name ?? 'Partnership'}, average ${entry.avg_target_differential?.toFixed(1) ?? '-'}`}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {isFirst && hasRounds ? (
          <Icon source="trophy" size={18} color={colors.warning} />
        ) : (
          <Text style={[styles.rank, { color: colors.textSecondary }]}>
            {hasRounds ? entry.rank : '-'}
          </Text>
        )}
      </View>

      {/* Players */}
      <View style={styles.playersContainer}>
        <View style={styles.avatarsRow}>
          <PlayerAvatar
            name={entry.player_1_name}
            photoUrl={entry.player_1_photo_url}
            size={28}
          />
          <PlayerAvatar
            name={entry.player_2_name}
            photoUrl={entry.player_2_photo_url}
            size={28}
            style={styles.avatar2}
          />
        </View>
        <View style={styles.nameContainer}>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {entry.partnership_name ?? `${entry.player_1_name} & ${entry.player_2_name}`}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {entry.rounds_played} round{entry.rounds_played !== 1 ? 's' : ''}
            {isCurrentUser ? ' · You' : ''}
          </Text>
        </View>
      </View>

      {/* Avg Differential */}
      <View style={styles.statContainer}>
        <Text style={[styles.statValue, { color: colors.textPrimary }]}>
          {hasRounds && entry.avg_target_differential != null
            ? (entry.avg_target_differential > 0 ? '+' : '') + entry.avg_target_differential.toFixed(1)
            : '-'}
        </Text>
      </View>

      {/* Best */}
      <View style={styles.statContainer}>
        <Text style={[styles.statValue, { color: colors.textSecondary }]}>
          {hasRounds && entry.best_differential != null
            ? (entry.best_differential > 0 ? '+' : '') + entry.best_differential
            : '-'}
        </Text>
      </View>

      {onPress && (
        <Icon source="chevron-right" size={16} color={colors.gray400} />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  rankContainer: {
    width: 28,
    alignItems: 'center',
  },
  rank: {
    ...typography.bodyBold,
  },
  playersContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar2: {
    marginLeft: -8,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    ...typography.smallBold,
  },
  subtitle: {
    ...typography.small,
    fontSize: 11,
  },
  statContainer: {
    width: 50,
    alignItems: 'flex-end',
  },
  statValue: {
    ...typography.smallBold,
  },
});

export default PartnershipLeaderboardRow;
