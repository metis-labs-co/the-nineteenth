/**
 * LeaguePlayerRoundsModal - Bottom sheet showing a player's tagged rounds
 *
 * Follows PointsBreakdownModal pattern:
 * - Header summary card with player name, rank, avg diff, rounds counting
 * - Tagged rounds list with course, date, gross score, differential
 * - Each round is tappable -> navigates to PlayerScorecard
 * - Info card explaining the scoring system
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, Divider } from 'react-native-paper';
import { IconChevronRight } from '@tabler/icons-react-native';
import { BottomSheet } from '@/components/common/BottomSheet';
import { EmptyState, LoadingSpinner } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { DifferentialBadge } from './DifferentialBadge';
import type { LeagueRoundDetail } from '@/types/database';

export interface LeaguePlayerRoundsModalProps {
  visible: boolean;
  onClose: () => void;
  playerName: string;
  rank: number;
  avgDifferential: number | null;
  bestDifferential: number | null;
  roundsPlayed: number;
  roundsCounting: number;
  rounds: LeagueRoundDetail[] | undefined;
  isLoading: boolean;
  onRoundPress: (scorecardId: string, roundId: string, playerId: string) => void;
  playerId: string;
}

function getOrdinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function LeaguePlayerRoundsModal({
  visible,
  onClose,
  playerName,
  rank,
  avgDifferential,
  bestDifferential: _bestDifferential,
  roundsPlayed,
  roundsCounting,
  rounds,
  isLoading,
  onRoundPress,
  playerId,
}: LeaguePlayerRoundsModalProps) {
  const colors = useThemeColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      height={0.85}
      title="Player Rounds"
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryHeader}>
            <Icon source="account" size={24} color={colors.primary} />
            <Text style={[styles.playerName, { color: colors.textPrimary }]}>
              {playerName}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {rank}{getOrdinalSuffix(rank)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Rank
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {avgDifferential != null ? avgDifferential.toFixed(1) : '-'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Avg Diff
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {roundsCounting}/{roundsPlayed}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Counting
              </Text>
            </View>
          </View>
        </View>

        {/* Tagged Rounds Section */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Tagged Rounds
        </Text>

        {isLoading ? (
          <LoadingSpinner />
        ) : !rounds || rounds.length === 0 ? (
          <EmptyState
            title="No rounds tagged yet"
            message=""
            icon="golf"
            compact
          />
        ) : (
          <View style={[styles.roundsContainer, { backgroundColor: colors.surface }]}>
            {rounds.map((round, index) => {
              const isLast = index === rounds.length - 1;

              return (
                <View key={round.id}>
                  <TouchableOpacity
                    style={styles.roundRow}
                    onPress={() => onRoundPress(round.scorecard_id, round.round_id, playerId)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${round.course_name}, ${formatDate(round.date_played)}, Gross ${round.total_gross}, Differential ${round.handicap_differential.toFixed(1)}`}
                    accessibilityHint="Tap to view scorecard"
                  >
                    <View style={styles.roundInfo}>
                      <Text style={[styles.roundDate, { color: colors.textPrimary }]}>
                        {formatDate(round.date_played)}
                      </Text>
                      <Text
                        style={[styles.courseName, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {round.course_name}
                      </Text>
                      {(round.course_rating_used != null || round.slope_rating_used != null) && (
                        <Text style={[styles.ratingText, { color: colors.textTertiary }]}>
                          CR {round.course_rating_used?.toFixed(1) ?? '-'} / Slope {round.slope_rating_used ?? '-'}
                        </Text>
                      )}
                    </View>

                    <View style={styles.roundScores}>
                      <Text style={[styles.grossScore, { color: colors.textPrimary }]}>
                        {round.total_gross}
                      </Text>
                      <DifferentialBadge value={round.handicap_differential} />
                    </View>

                    <IconChevronRight size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                  {!isLast && (
                    <Divider style={[styles.divider, { backgroundColor: colors.gray100 }]} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.gray100 }]}>
          <Icon source="information-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            League rankings use the best 8 handicap differentials from the last 20 tagged rounds. Lower average differential = higher ranking.
          </Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // Summary Card
  summaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  playerName: {
    ...typography.h3,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.h2,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  // Section
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
  },
  // Rounds Container
  roundsContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  roundInfo: {
    flex: 1,
  },
  roundDate: {
    ...typography.bodyBold,
  },
  courseName: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  ratingText: {
    ...typography.caption,
    marginTop: 2,
  },
  roundScores: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  grossScore: {
    ...typography.h4,
  },
  divider: {
    marginHorizontal: spacing.md,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoText: {
    ...typography.small,
    flex: 1,
  },
});
