/**
 * TeamLeaderboardView — Presentational team leaderboard for best-ball /
 * aggregate team-stroke rounds.
 *
 * Renders ranked team cards with members listed underneath each card. Used
 * by both the View Round and Review Scorecard leaderboard tabs (each owns
 * its own data fetching) so the team layout stays consistent across surfaces.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { IconTrophy } from '@tabler/icons-react-native';
import { EmptyState } from '@/components/common/EmptyState';
import { GolfBallLoader } from '@/components/common';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { isTeamScore, type TeamLeaderboardEntry } from '@/hooks/rounds';
import { averageTeamHandicap } from '@/utils/teamHandicap';
import { getTeamColorHex } from '@/utils/teamColor';
import type { TeamFormat } from '@/types';

interface TeamLeaderboardViewProps {
  /** Team entries already filtered/sorted by the caller. Lower team score wins. */
  teamEntries: TeamLeaderboardEntry[];
  teamFormat: TeamFormat | null;
  currentUserId?: string;
  isLoading?: boolean;
}

export function TeamLeaderboardView({
  teamEntries,
  teamFormat,
  currentUserId,
  isLoading = false,
}: TeamLeaderboardViewProps) {
  const colors = useThemeColors();

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
        // Resolve the team's avatar palette to a hex; falls back to the
        // legacy theme cycle when no colour is stored on the team.
        const teamColorHex = getTeamColorHex(entry.teamColor, i, colors);

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
                {position === 1 ? (
                  <IconTrophy size={22} color={colors.primary} />
                ) : (
                  <Text
                    style={[styles.positionText, { color: colors.textPrimary }]}
                  >
                    {position}
                  </Text>
                )}
              </View>
              <View style={styles.teamNameBlock}>
                <View style={styles.teamNameRow}>
                  <View style={[styles.teamColorDot, { backgroundColor: teamColorHex }]} />
                  <Text
                    style={[styles.teamName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {entry.teamName}
                  </Text>
                </View>
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
                  {/* When the entry comes from the live builder, show the
                   *  per-player points/strokes contributed to the team
                   *  total. Server-derived entries (no contributedScore)
                   *  fall back to the player's handicap. */}
                  {m.contributedScore !== undefined ? (
                    <Text style={[styles.memberContribution, { color: colors.textPrimary }]}>
                      {m.contributedScore}
                    </Text>
                  ) : (
                    <Text style={[styles.memberHandicap, { color: colors.textSecondary }]}>
                      HC {m.handicap}
                    </Text>
                  )}
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
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamColorDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  teamName: {
    ...typography.bodyBold,
    flexShrink: 1,
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
  memberContribution: {
    ...typography.bodyBold,
  },
});

export default TeamLeaderboardView;
