/**
 * PartnershipLeaderboardTab - Leaderboard for partnership leagues
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { EmptyState } from '@/components/common';
import { PartnershipLeaderboardRow } from '@/components/leagues/PartnershipLeaderboardRow';
import type { PartnershipLeaderboardEntry } from '@/types/database';

interface PartnershipLeaderboardTabProps {
  leaderboard: PartnershipLeaderboardEntry[];
  currentUserId: string | undefined;
  onRowPress?: (entry: PartnershipLeaderboardEntry) => void;
}

export default function PartnershipLeaderboardTab({
  leaderboard,
  currentUserId,
  onRowPress,
}: PartnershipLeaderboardTabProps) {
  const colors = useThemeColors();

  if (!leaderboard.length) {
    return (
      <EmptyState
        icon="handshake"
        title="No Rounds Yet"
        message="Partnerships need to tag rounds to appear on the leaderboard."
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}>
        <View style={styles.headerRow}>
          <View style={styles.rankHeader}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>#</Text>
          </View>
          <View style={styles.playerHeader}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Partnership</Text>
          </View>
          <View style={styles.statHeader}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Avg</Text>
          </View>
          <View style={styles.statHeader}>
            <Text style={[styles.headerText, { color: colors.textSecondary }]}>Best</Text>
          </View>
          {onRowPress && <View style={styles.chevronSpacer} />}
        </View>

        {leaderboard.map((entry) => {
          const isCurrentUser = currentUserId
            ? entry.player_1_id === currentUserId || entry.player_2_id === currentUserId
            : false;

          return (
            <PartnershipLeaderboardRow
              key={entry.partnership_id}
              entry={entry}
              isCurrentUser={isCurrentUser}
              onPress={onRowPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  rankHeader: {
    width: 28,
    alignItems: 'center',
  },
  playerHeader: {
    flex: 1,
  },
  statHeader: {
    width: 50,
    alignItems: 'flex-end',
  },
  chevronSpacer: {
    width: 16,
  },
  headerText: {
    ...typography.small,
    fontWeight: '600',
  },
});
