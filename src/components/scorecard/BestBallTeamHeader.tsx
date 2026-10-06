/**
 * BestBallTeamHeader
 *
 * Header card shown above per-player Stableford score cards on best-ball
 * rounds with scoring pairs enabled. Reports the team's running stableford
 * total (best of two per hole) and which player is contributing the team's
 * best-ball points on the current hole.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { useThemeColors } from '@/context/ThemeContext';
import {
  getBestBallTeamPoints,
  getBestBallHoleContribution,
} from '@/utils/teamScoring';
import type { Hole, HoleScore, MultiBallHoleScore } from '@/types';
import type { TeamWithMembers } from '@/types/database/team.types';

interface BestBallTeamHeaderProps {
  team: TeamWithMembers;
  holes: Hole[];
  currentHole: Hole;
  getPlayerScore: (
    playerId: string,
    holeNumber: number
  ) => HoleScore | MultiBallHoleScore | undefined;
  /** Map of playerId → daily (playing) handicap so the team best-ball total
   *  matches the scorecard / team leaderboard rather than scoring off the raw
   *  profile index. */
  dailyHandicaps?: Record<string, number>;
}

export const BestBallTeamHeader = React.memo(function BestBallTeamHeader({
  team,
  holes,
  currentHole,
  getPlayerScore,
  dailyHandicaps,
}: BestBallTeamHeaderProps) {
  const colors = useThemeColors();

  const { totalPoints } = useMemo(
    () => getBestBallTeamPoints(team, holes, getPlayerScore, dailyHandicaps),
    [team, holes, getPlayerScore, dailyHandicaps]
  );

  const contribution = useMemo(
    () => getBestBallHoleContribution(team, currentHole, getPlayerScore, dailyHandicaps),
    [team, currentHole, getPlayerScore, dailyHandicaps]
  );

  const memberCount = team.members?.length ?? 0;

  return (
    <View
      style={[
        styles.container,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Icon source="account-group" size={18} color={colors.primary} />
            <Text
              style={[styles.teamName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {team.name}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Best Ball · {memberCount} {memberCount === 1 ? 'player' : 'players'}
          </Text>
        </View>
        <View style={styles.totalBlock}>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            {totalPoints}
          </Text>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            TEAM PTS
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.holeRow}>
        <Text style={[styles.holeLabel, { color: colors.textSecondary }]}>
          Hole {currentHole.number}
        </Text>
        {contribution ? (
          <View style={styles.holeContributionRow}>
            <Icon source="star" size={14} color={colors.success} />
            <Text
              style={[styles.contributionName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {contribution.playerName}
            </Text>
            <Text style={[styles.contributionPoints, { color: colors.success }]}>
              {contribution.points} pt{contribution.points === 1 ? '' : 's'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.contributionPlaceholder, { color: colors.textTertiary }]}>
            —
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  teamName: {
    ...typography.h3,
    flexShrink: 1,
  },
  subtitle: {
    ...typography.small,
  },
  totalBlock: {
    alignItems: 'center',
    minWidth: 64,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  totalLabel: {
    ...typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  holeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  holeLabel: {
    ...typography.caption,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  holeContributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  contributionName: {
    ...typography.bodyBold,
    flexShrink: 1,
  },
  contributionPoints: {
    ...typography.bodyBold,
  },
  contributionPlaceholder: {
    ...typography.body,
  },
});

export default BestBallTeamHeader;
