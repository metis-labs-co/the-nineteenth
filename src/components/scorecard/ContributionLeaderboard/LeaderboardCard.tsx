/**
 * LeaderboardCard Component
 *
 * Renders a generic leaderboard card with ranked entries and progress bars.
 * Used for overall contributions, drives, approaches, and putts categories.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import type { LeaderboardEntry } from './useContributionData';

interface LeaderboardCardProps {
  title: string;
  icon: string;
  iconColor: string;
  entries: LeaderboardEntry[];
}

export const LeaderboardCard = React.memo(function LeaderboardCard({
  title,
  icon,
  iconColor,
  entries,
}: LeaderboardCardProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <Icon source={icon} size={20} color={iconColor} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {entries.length > 0 ? (
        entries.map((entry, index) => (
          <View key={entry.playerId} style={styles.entryRow}>
            <View style={styles.entryRank}>
              <Text
                style={[
                  styles.rankText,
                  { color: index === 0 ? colors.primary : colors.textSecondary },
                ]}
              >
                {index + 1}
              </Text>
            </View>
            <View style={styles.entryInfo}>
              <Text style={[styles.entryName, { color: colors.textPrimary }]} numberOfLines={1}>
                {entry.playerName}
              </Text>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.gray200 },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: iconColor,
                      width: `${entry.percentage}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.entryCount}>
              <Text style={[styles.countText, { color: colors.textPrimary }]}>
                {entry.count}
              </Text>
              <Text style={[styles.percentText, { color: colors.textSecondary }]}>
                {entry.percentage.toFixed(0)}%
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No data yet
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.bodyBold,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  entryRank: {
    width: 24,
    alignItems: 'center',
  },
  rankText: {
    ...typography.bodyBold,
  },
  entryInfo: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  entryName: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  entryCount: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  countText: {
    ...typography.bodyBold,
  },
  percentText: {
    ...typography.caption,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
