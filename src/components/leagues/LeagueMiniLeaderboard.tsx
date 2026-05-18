/**
 * LeagueMiniLeaderboard - Compact top-3 leaderboard for use inside LeagueCard
 *
 * Picks the correct leaderboard source based on league_type:
 * - ongoing/season/round_limit → useLeagueLeaderboard (avg differential)
 * - eclectic                   → useEclecticLeaderboard (best gross/net)
 * - ladder                     → useLadderStandings (W-L)
 * - partnership                → usePartnershipLeaderboard (avg target diff)
 *
 * Renders nothing while loading or when there are no rounds yet, so the
 * card stays compact for empty leagues.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { IconTrophy } from '@tabler/icons-react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius } from '@/constants/theme';
import { withOpacity } from '@/constants/colors';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/hooks/useAuth';
import {
  useLeagueLeaderboard,
  useEclecticLeaderboard,
  useLadderStandings,
} from '@/hooks/useLeagues';
import { usePartnershipLeaderboard } from '@/hooks/usePartnershipLeague';
import type { League } from '@/types/database';

interface LeagueMiniLeaderboardProps {
  league: League;
  /** Max rows to display. Defaults to 3. */
  limit?: number;
}

interface MiniRow {
  key: string;
  rank: number;
  name: string;
  stat: string;
  isCurrentUser: boolean;
}

const MAX_ROWS_DEFAULT = 3;

export default React.memo(function LeagueMiniLeaderboard({
  league,
  limit = MAX_ROWS_DEFAULT,
}: LeagueMiniLeaderboardProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const currentUserId = user?.id;

  const leagueType = league.league_type;
  const isStandard =
    leagueType === 'ongoing' || leagueType === 'season' || leagueType === 'round_limit';
  const isEclectic = leagueType === 'eclectic';
  const isLadder = leagueType === 'ladder';
  const isPartnership = leagueType === 'partnership';

  // Each hook is gated on its league type — only one actually fires per card.
  const standard = useLeagueLeaderboard(league.id, isStandard);
  const eclectic = useEclecticLeaderboard(league.id, isEclectic);
  const ladder = useLadderStandings(league.id, isLadder);
  const partnership = usePartnershipLeaderboard(league.id, isPartnership);

  const isLoading =
    (isStandard && standard.isLoading) ||
    (isEclectic && eclectic.isLoading) ||
    (isLadder && ladder.isLoading) ||
    (isPartnership && partnership.isLoading);

  const { rows, statLabel } = useMemo<{ rows: MiniRow[]; statLabel: string }>(() => {
    if (isStandard) {
      const data = standard.data ?? [];
      return {
        statLabel: 'Avg',
        rows: data
          .filter((e) => e.rounds_counting > 0)
          .slice(0, limit)
          .map((e) => ({
            key: e.player_id,
            rank: e.rank,
            name: e.name,
            stat: e.avg_differential != null ? e.avg_differential.toFixed(1) : '-',
            isCurrentUser: e.player_id === currentUserId,
          })),
      };
    }
    if (isEclectic) {
      const data = eclectic.data ?? [];
      const isNet = league.eclectic_scoring === 'net';
      return {
        statLabel: isNet ? 'Net' : 'Gross',
        rows: data
          .filter((e) => e.rounds_played > 0)
          .slice(0, limit)
          .map((e) => ({
            key: e.player_id,
            rank: e.rank,
            name: e.name,
            stat: isNet
              ? e.total_best_net != null
                ? String(e.total_best_net)
                : '-'
              : String(e.total_best_gross),
            isCurrentUser: e.player_id === currentUserId,
          })),
      };
    }
    if (isLadder) {
      const data = ladder.data ?? [];
      return {
        statLabel: 'W-L',
        rows: data.slice(0, limit).map((e) => ({
          key: e.player_id,
          rank: e.ladder_position,
          name: e.name,
          stat: `${e.wins}-${e.losses}`,
          isCurrentUser: e.player_id === currentUserId,
        })),
      };
    }
    if (isPartnership) {
      const data = partnership.data ?? [];
      return {
        statLabel: 'Avg',
        rows: data
          .filter((e) => e.rounds_played > 0)
          .slice(0, limit)
          .map((e) => ({
            key: e.partnership_id,
            rank: e.rank,
            name: e.partnership_name ?? `${e.player_1_name} & ${e.player_2_name}`,
            stat:
              e.avg_target_differential != null
                ? e.avg_target_differential.toFixed(1)
                : '-',
            isCurrentUser:
              e.player_1_id === currentUserId || e.player_2_id === currentUserId,
          })),
      };
    }
    return { rows: [], statLabel: '' };
  }, [
    isStandard,
    isEclectic,
    isLadder,
    isPartnership,
    standard.data,
    eclectic.data,
    ladder.data,
    partnership.data,
    league.eclectic_scoring,
    currentUserId,
    limit,
  ]);

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
          <View
            key={row.key}
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
                <Text style={[styles.rankText, { color: colors.textSecondary }]}>
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
        );
      })}

      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{statLabel}</Text>
    </View>
  );
});

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
});
