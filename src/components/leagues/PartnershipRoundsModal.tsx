/**
 * PartnershipRoundsModal - Bottom sheet showing a partnership's tagged rounds
 *
 * Follows the LeaguePlayerRoundsModal pattern for consistency.
 */

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { BottomSheet } from '@/components/common/BottomSheet';
import { LoadingSpinner } from '@/components/common';
import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import type { PartnershipRound, PartnershipLeaderboardEntry, DifficultyLevel } from '@/types/database';

interface PartnershipRoundsModalProps {
  visible: boolean;
  onClose: () => void;
  entry: PartnershipLeaderboardEntry | null;
  rounds: PartnershipRound[];
  isLoading: boolean;
}

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy: '#4CAF50',
  standard: '#2196F3',
  challenge: '#FF9800',
  heroic: '#F44336',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const PartnershipRoundsModal = React.memo(function PartnershipRoundsModal({
  visible,
  onClose,
  entry,
  rounds,
  isLoading,
}: PartnershipRoundsModalProps) {
  const colors = useThemeColors();

  if (!entry) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} height={0.85}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
          <View style={styles.headerAvatars}>
            <PlayerAvatar
              name={entry.player_1_name}
              photoUrl={entry.player_1_photo_url}
              size={36}
            />
            <PlayerAvatar
              name={entry.player_2_name}
              photoUrl={entry.player_2_photo_url}
              size={36}
              style={styles.avatar2}
            />
          </View>

          <Text style={[styles.partnershipName, { color: colors.textPrimary }]}>
            {entry.partnership_name ?? `${entry.player_1_name} & ${entry.player_2_name}`}
          </Text>

          <View style={styles.statsRow}>
            {entry.rounds_played > 0 && (
              <>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rank</Text>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {getOrdinalSuffix(entry.rank)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Diff</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {entry.avg_target_differential != null
                      ? (entry.avg_target_differential > 0 ? '+' : '') + entry.avg_target_differential.toFixed(1)
                      : '-'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Best</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {entry.best_differential != null
                      ? (entry.best_differential > 0 ? '+' : '') + entry.best_differential
                      : '-'}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rounds</Text>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {entry.rounds_played}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Rounds List */}
        {isLoading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <FlatList
            data={rounds}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isUnder = item.target_differential <= 0;
              const diffColor = DIFFICULTY_COLORS[item.difficulty_level];

              return (
                <View style={[styles.roundRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.diffBadge, { backgroundColor: isUnder ? colors.successBackground : colors.errorBackground }]}>
                    <Text style={[styles.diffText, { color: isUnder ? colors.success : colors.error }]}>
                      {item.target_differential > 0 ? '+' : ''}{item.target_differential}
                    </Text>
                  </View>
                  <View style={styles.roundDetails}>
                    <Text style={[styles.courseName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.course_name}
                    </Text>
                    <Text style={[styles.roundMeta, { color: colors.textSecondary }]}>
                      {formatDate(item.played_at)} · Gross {item.combined_gross} · Target {item.target_score}
                    </Text>
                  </View>
                  <View style={[styles.difficultyPill, { backgroundColor: diffColor + '20' }]}>
                    <Text style={[styles.difficultyPillText, { color: diffColor }]}>
                      {item.difficulty_level.charAt(0).toUpperCase() + item.difficulty_level.slice(1)}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No rounds tagged yet.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  headerCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerAvatars: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  avatar2: {
    marginLeft: -8,
  },
  partnershipName: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...typography.small,
    marginBottom: 2,
  },
  statValue: {
    ...typography.bodyBold,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  diffBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  roundDetails: {
    flex: 1,
  },
  courseName: {
    ...typography.bodyBold,
  },
  roundMeta: {
    ...typography.small,
    marginTop: 1,
  },
  difficultyPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  difficultyPillText: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },
});

export default PartnershipRoundsModal;
