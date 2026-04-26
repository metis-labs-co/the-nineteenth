/**
 * TeamLeaderboardTab — Team rankings for best-ball / aggregate team stroke rounds.
 *
 * Lives alongside (not replacing) the individual Leaderboard tab:
 *   - Individual leaderboard shows every player's score
 *   - Team leaderboard shows teams ranked by their team score
 *
 * Sorts ascending (lower score = better) because best-ball / aggregate are
 * stroke-based. Match-play team rounds use the Match tab instead; scramble
 * and shamble have their own dedicated tabs.
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { EmptyState } from '@/components/common/EmptyState';
import { GolfBallLoader } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useRoundLeaderboard, isTeamEntry, isTeamScore } from '@/hooks/rounds';
import { averageTeamHandicap } from '@/utils/teamHandicap';
import type { TeamFormat } from '@/types';

interface TeamLeaderboardTabProps {
  roundId: string;
  teamFormat: TeamFormat | null;
  currentUserId?: string;
}

export function TeamLeaderboardTab({
  roundId,
  teamFormat,
  currentUserId,
}: TeamLeaderboardTabProps) {
  const colors = useThemeColors();
  const { data, isLoading } = useRoundLeaderboard(roundId);

  // Extract team entries, sort ascending by team score (stroke convention).
  const teamEntries = useMemo(() => {
    if (!data?.entries) return [];
    return data.entries
      .filter(isTeamEntry)
      .filter((e) => isTeamScore(e.scoreData))
      .slice()
      .sort((a, b) => {
        const aScore = isTeamScore(a.scoreData) ? a.scoreData.teamScore : 0;
        const bScore = isTeamScore(b.scoreData) ? b.scoreData.teamScore : 0;
        return aScore - bScore;
      });
  }, [data?.entries]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <GolfBallLoader size="md" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading teams…
        </Text>
      </View>
    );
  }

  if (teamEntries.length === 0) {
    return (
      <EmptyState
        icon="account-group"
        title="No Team Scores Yet"
        message="Team standings will appear here once scores are submitted."
        compact
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Icon source="trophy-outline" size={16} color={colors.primary} />
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
          {teamFormat === 'best-ball'
            ? 'Best-ball · lowest team score wins'
            : 'Aggregate · combined net strokes'}
        </Text>
      </View>

      {teamEntries.map((entry, i) => {
        const position = i + 1;
        const teamScore = isTeamScore(entry.scoreData) ? entry.scoreData.teamScore : 0;
        const hasCurrentUser = currentUserId
          ? entry.members.some((m) => m.playerId === currentUserId)
          : false;

        return (
          <View
            key={entry.teamId}
            style={[
              styles.card,
              shadows.sm,
              {
                backgroundColor: colors.surface,
                borderColor: hasCurrentUser ? colors.primary : colors.border,
                borderWidth: hasCurrentUser ? 2 : 1,
              },
            ]}
          >
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.positionBlock}>
                <Text
                  style={[
                    styles.positionText,
                    { color: position === 1 ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {position === 1 ? '🏆' : position}
                </Text>
              </View>
              <View style={styles.teamNameBlock}>
                <Text
                  style={[styles.teamName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {entry.teamName}
                </Text>
                <Text style={[styles.teamSubLabel, { color: colors.textSecondary }]}>
                  {entry.members.length} {entry.members.length === 1 ? 'player' : 'players'} · HC {averageTeamHandicap(entry.members).toFixed(1)}
                </Text>
              </View>
              <View style={styles.scoreBlock}>
                <Text style={[styles.scoreValue, { color: colors.textPrimary }]}>
                  {teamScore}
                </Text>
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                  net
                </Text>
              </View>
            </View>

            <View style={styles.membersBody}>
              {entry.members.map((m) => (
                <View key={m.playerId} style={styles.memberRow}>
                  <Text
                    style={[
                      styles.memberName,
                      {
                        color:
                          m.playerId === currentUserId
                            ? colors.primary
                            : colors.textPrimary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {m.playerName}
                  </Text>
                  <Text style={[styles.memberHandicap, { color: colors.textSecondary }]}>
                    HC {m.handicap}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  headerLabel: {
    ...typography.caption,
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  positionBlock: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionText: {
    ...typography.h3,
  },
  teamNameBlock: {
    flex: 1,
  },
  teamName: {
    ...typography.bodyBold,
  },
  teamSubLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  scoreBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scoreValue: {
    ...typography.h2,
  },
  scoreLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membersBody: {
    paddingVertical: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  memberName: {
    ...typography.body,
    flex: 1,
  },
  memberHandicap: {
    ...typography.caption,
  },
});

export default TeamLeaderboardTab;
