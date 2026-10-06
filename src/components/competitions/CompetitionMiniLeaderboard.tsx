/**
 * CompetitionMiniLeaderboard - Compact top-3 leaderboard for in-progress
 * competitions on the list screen. Mirrors LeagueMiniLeaderboard.
 *
 * Shows the top 3 by competition points, plus the current user's row when
 * they are outside the top 3 (so they can see where they stand at a glance).
 *
 * Renders nothing while loading or when no rounds have been played yet, so
 * the card stays compact for competitions that haven't accumulated scores.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { IconTrophy } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { Badge } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { useCompetitionLeaderboard } from '@/hooks/competitions/leaderboard';
import type { CompetitionLeaderboardEntry } from '@/hooks/competitions/leaderboard';

interface CompetitionMiniLeaderboardProps {
  competitionId: string;
  /** Max top rows to display. Defaults to 3. */
  limit?: number;
  /**
   * When true, show the team standings (filter: 'teams') instead of individual.
   * Set for fixed-team competitions. Defaults to false (individual standings).
   */
  isTeamComp?: boolean;
}

interface MiniRow {
  key: string;
  rank: number;
  name: string;
  stat: string;
  isCurrentUser: boolean;
  showSeparator?: boolean;
}

const MAX_ROWS_DEFAULT = 3;

function isCurrentUserEntry(
  entry: CompetitionLeaderboardEntry,
  currentUserId: string | undefined
): boolean {
  if (!currentUserId) return false;
  if (!entry.isTeam) return entry.participantId === currentUserId;
  return entry.teamMembers.some((m) => m.playerId === currentUserId);
}

export const CompetitionMiniLeaderboard = React.memo(
  function CompetitionMiniLeaderboard({
    competitionId,
    limit = MAX_ROWS_DEFAULT,
    isTeamComp = false,
  }: CompetitionMiniLeaderboardProps) {
    const colors = useThemeColors();
    const { user } = useAuth();
    const currentUserId = user?.id;

    // Disable auto-refresh on the list view; the detail screen will refresh.
    // Fixed-team comps show team standings; everything else shows individuals.
    const { data, isLoading } = useCompetitionLeaderboard(competitionId, {
      autoRefresh: false,
      filter: isTeamComp ? 'teams' : 'individuals',
    });

    const rows = useMemo<MiniRow[]>(() => {
      const entries = (data ?? []).filter((e) => e.roundsPlayed > 0);
      if (entries.length === 0) return [];

      const top = entries.slice(0, limit);
      const result: MiniRow[] = top.map((entry) => ({
        key: entry.participantId,
        rank: entry.position,
        name: entry.participantName,
        stat: String(entry.totalPoints),
        isCurrentUser: isCurrentUserEntry(entry, currentUserId),
      }));

      // If current user is on the leaderboard but outside the top N, append
      // their row so they can see their position.
      if (currentUserId && !result.some((r) => r.isCurrentUser)) {
        const userEntry = entries.find((e) =>
          isCurrentUserEntry(e, currentUserId)
        );
        if (userEntry) {
          result.push({
            key: userEntry.participantId,
            rank: userEntry.position,
            name: userEntry.participantName,
            stat: String(userEntry.totalPoints),
            isCurrentUser: true,
            showSeparator: true,
          });
        }
      }

      return result;
    }, [data, currentUserId, limit]);

    if (isLoading || rows.length === 0) {
      return null;
    }

    return (
      <View
        style={[styles.container, { borderTopColor: colors.borderLight }]}
        accessibilityLabel="Mini leaderboard"
      >
        {rows.map((row, index) => {
          const isFirst = row.rank === 1;
          const highlight = row.isCurrentUser
            ? withOpacity(colors.primaryLighter, 0.18)
            : isFirst
              ? withOpacity(colors.warningLight, 0.13)
              : 'transparent';

          return (
            <React.Fragment key={`${row.key}-${index}`}>
              {row.showSeparator && (
                <Text
                  style={[styles.separator, { color: colors.textTertiary }]}
                >
                  ···
                </Text>
              )}
              <View
                style={[
                  styles.row,
                  { backgroundColor: highlight },
                  index < rows.length - 1 && { marginBottom: 2 },
                ]}
              >
                <View style={styles.rankCell}>
                  {isFirst ? (
                    <IconTrophy size={14} color={colors.warning} />
                  ) : (
                    <Text
                      style={[styles.rankText, { color: colors.textSecondary }]}
                    >
                      {row.rank}
                    </Text>
                  )}
                </View>

                <View style={styles.nameCell}>
                  <Text
                    style={[
                      styles.nameText,
                      { color: colors.textPrimary },
                      row.isCurrentUser && {
                        ...typography.smallBold,
                        color: colors.primary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                  {row.isCurrentUser && (
                    <Badge label="You" variant="primary" size="sm" />
                  )}
                </View>

                <Text
                  style={[
                    styles.statText,
                    { color: colors.textPrimary },
                    row.isCurrentUser && { color: colors.primary },
                    isFirst && !row.isCurrentUser && { color: colors.warningDark },
                  ]}
                >
                  {row.stat}
                </Text>
              </View>
            </React.Fragment>
          );
        })}

        <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Pts</Text>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  rankCell: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.caption,
    fontWeight: '600',
  },
  nameCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
    flexShrink: 1,
  },
  nameText: {
    ...typography.small,
    flexShrink: 1,
  },
  statText: {
    ...typography.smallBold,
    marginLeft: spacing.sm,
    minWidth: 40,
    textAlign: 'right',
  },
  statLabel: {
    ...typography.caption,
    position: 'absolute',
    top: 0,
    right: spacing.xs,
    fontSize: 10,
    lineHeight: 12,
  },
  separator: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: 1,
    letterSpacing: 2,
  },
});
