/**
 * EclecticLeaderboardTab - Eclectic-specific leaderboard showing composite scores
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { EmptyState } from '@/components/common/EmptyState';
import type { EclecticLeaderboardEntry, EclecticScoring } from '@/types/database';

interface EclecticLeaderboardTabProps {
  leaderboard: EclecticLeaderboardEntry[];
  currentUserId: string | undefined;
  scoring: EclecticScoring;
  onRowPress?: (entry: EclecticLeaderboardEntry) => void;
}

export default function EclecticLeaderboardTab({
  leaderboard,
  currentUserId,
  scoring,
  onRowPress,
}: EclecticLeaderboardTabProps) {
  const colors = useThemeColors();

  if (leaderboard.length === 0) {
    return (
      <EmptyState
        title="No scores recorded yet"
        message="Tag a round from this course to start building your eclectic scorecard"
        icon="star-shooting"
        compact
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <View style={styles.rankCell}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>#</Text>
        </View>
        <View style={styles.nameCell}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Player</Text>
        </View>
        <View style={styles.holesCell}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Holes</Text>
        </View>
        <View style={styles.scoreColumn}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>
            {scoring === 'net' ? 'Net' : 'Gross'}
          </Text>
        </View>
        <View style={styles.roundsCell}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Rnds</Text>
        </View>
      </View>

      {/* Rows */}
      {leaderboard.map((entry) => {
        const isCurrentUser = entry.player_id === currentUserId;
        const displayScore = scoring === 'net' && entry.total_best_net != null
          ? entry.total_best_net
          : entry.total_best_gross;

        return (
          <TouchableOpacity
            key={entry.player_id}
            onPress={() => onRowPress?.(entry)}
            disabled={!onRowPress}
            style={[
              styles.row,
              {
                backgroundColor: isCurrentUser ? colors.primaryBackground : 'transparent',
                borderBottomColor: colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.rankCell}>
              {entry.rank === 1 ? (
                <Icon source="trophy" size={18} color={colors.warning} />
              ) : (
                <Text style={[styles.rankText, { color: colors.textSecondary }]}>
                  {entry.rank}
                </Text>
              )}
            </View>

            <View style={styles.nameCell}>
              <Text style={[styles.nameText, { color: colors.textPrimary }]} numberOfLines={1}>
                {entry.name}
                {isCurrentUser && (
                  <Text style={{ color: colors.primary }}> (You)</Text>
                )}
              </Text>
            </View>

            <View style={styles.holesCell}>
              <Text style={[
                styles.holesText,
                { color: entry.holes_completed === 18 ? colors.success : colors.textSecondary },
              ]}>
                {entry.holes_completed}/18
              </Text>
            </View>

            <View style={styles.scoreColumn}>
              <Text style={[styles.scoreText, { color: colors.textPrimary }]}>
                {entry.holes_completed === 18 ? displayScore : '—'}
              </Text>
            </View>

            <View style={styles.roundsCell}>
              <Text style={[styles.roundsText, { color: colors.textSecondary }]}>
                {entry.rounds_played}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerText: {
    ...typography.smallBold,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  rankCell: {
    width: 32,
    alignItems: 'center',
  },
  nameCell: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  holesCell: {
    width: 48,
    alignItems: 'center',
  },
  scoreColumn: {
    width: 48,
    alignItems: 'center',
  },
  roundsCell: {
    width: 36,
    alignItems: 'center',
  },
  rankText: {
    ...typography.bodyBold,
  },
  nameText: {
    ...typography.body,
  },
  holesText: {
    ...typography.small,
  },
  scoreText: {
    ...typography.bodyBold,
  },
  roundsText: {
    ...typography.small,
  },
});
