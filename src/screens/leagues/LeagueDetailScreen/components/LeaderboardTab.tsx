/**
 * LeaderboardTab - Leaderboard table with rankings by avg handicap differential
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScaledText } from '@/components/common/ScaledText';
import { EmptyState } from '@/components/common/EmptyState';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import type { LeagueLeaderboardEntry } from '@/types/database';
import { LeagueLeaderboardRow } from '@/components/leagues';

interface Props {
  leaderboard: { entry: LeagueLeaderboardEntry; isTied: boolean }[];
  currentUserId?: string;
  onRowPress: (entry: LeagueLeaderboardEntry) => void;
}

export default React.memo(function LeaderboardTab({
  leaderboard,
  currentUserId,
  onRowPress,
}: Props) {
  const colors = useThemeColors();

  if (leaderboard.length === 0) {
    return (
      <View style={styles.section}>
        <EmptyState
          icon="trophy-outline"
          title="No rounds tagged yet"
          message="Tag a round to appear on the leaderboard."
          compact
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={[styles.leaderboardCard, { backgroundColor: colors.surface }]}>
        {/* Table Header */}
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <ScaledText
            category="caption"
            style={[styles.tableHeaderCell, styles.positionHeaderCol, { color: colors.textSecondary }]}
          >
            #
          </ScaledText>
          <ScaledText
            category="caption"
            style={[styles.tableHeaderCell, styles.playerHeaderCol, { color: colors.textSecondary }]}
          >
            Player
          </ScaledText>
          <ScaledText
            category="caption"
            style={[styles.tableHeaderCell, styles.avgHeaderCol, { color: colors.textSecondary }]}
          >
            Avg
          </ScaledText>
          <ScaledText
            category="caption"
            style={[styles.tableHeaderCell, styles.bestHeaderCol, { color: colors.textSecondary }]}
          >
            Best
          </ScaledText>
        </View>

        {/* Rows */}
        {leaderboard.map(({ entry, isTied }, index) => (
          <LeagueLeaderboardRow
            key={entry.player_id}
            entry={entry}
            currentUserId={currentUserId}
            isTied={isTied}
            onPress={onRowPress}
            isLast={index === leaderboard.length - 1}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  leaderboardCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    ...typography.captionBold,
    textTransform: 'uppercase',
  },
  positionHeaderCol: {
    minWidth: 40,
    textAlign: 'center',
  },
  playerHeaderCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  avgHeaderCol: {
    minWidth: 50,
    textAlign: 'right',
  },
  bestHeaderCol: {
    minWidth: 50,
    textAlign: 'right',
  },
});
