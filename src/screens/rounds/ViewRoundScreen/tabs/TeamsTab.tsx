/**
 * TeamsTab — unified team view for all team-format rounds.
 *
 * Always shows the team roster (who's on which team, team handicap aggregate).
 * For team stroke rounds (best-ball / aggregate) the stroke-based team
 * leaderboard is appended below. For team match-play rounds the Ryder
 * Cup points standings are appended instead so every team-format round
 * has a team leaderboard in one place.
 *
 * Replaces the old `teamLeaderboard` tab and the roster block that used
 * to sit on the Details tab — both surfaces collapsed into one.
 */

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import { TeamsSection } from '@/components/rounds/ViewRound/RoundDetailsTab/components';
import { useSubMatches } from '@/hooks/rounds';
import { TeamLeaderboardTab } from './TeamLeaderboardTab';
import type { TeamFormat } from '@/types';

interface TeamsTabProps {
  roundId: string;
  competitionId: string | null;
  /** True for team-stroke formats (best-ball, aggregate). Drives whether
   *  the stroke-based team leaderboard is appended under the roster. */
  isTeamStrokeRound: boolean;
  /** True for team match-play formats. Drives whether the Ryder Cup
   *  points leaderboard is appended under the roster. */
  isTeamMatchPlayRound: boolean;
  teamFormat: TeamFormat | null;
  currentUserId?: string;
}

export function TeamsTab({
  roundId,
  competitionId,
  isTeamStrokeRound,
  isTeamMatchPlayRound,
  teamFormat,
  currentUserId,
}: TeamsTabProps) {
  const colors = useThemeColors();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TeamsSection
        roundId={roundId}
        competitionId={competitionId}
        cardBackground={colors.surface}
        currentUserId={currentUserId}
      />
      {isTeamStrokeRound && (
        <View style={styles.leaderboardWrapper}>
          <TeamLeaderboardTab
            roundId={roundId}
            teamFormat={teamFormat}
            currentUserId={currentUserId}
          />
        </View>
      )}
      {isTeamMatchPlayRound && (
        <View style={styles.leaderboardWrapper}>
          <TeamMatchPointsLeaderboard roundId={roundId} />
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Ryder-Cup-style team leaderboard for team match-play rounds.
 *
 * Aggregates sub-match results (1 pt win, 0.5 halved, 0 loss) into team
 * totals and shows Team A vs Team B with completion progress. Only
 * renders when the round has at least one sub-match — a combined team
 * match play round without sub-matches still shows the per-match result
 * on the MatchTab, so duplicating it here would be noise.
 */
function TeamMatchPointsLeaderboard({ roundId }: { roundId: string }) {
  const colors = useThemeColors();
  const { data: subMatches } = useSubMatches(roundId);

  const { teamAPoints, teamBPoints, completed, total } = useMemo(() => {
    const list = subMatches || [];
    let a = 0;
    let b = 0;
    let done = 0;
    list.forEach((sm) => {
      if (sm.status === 'completed' || sm.status === 'forfeited') {
        done += 1;
        if (sm.result === 'a-wins' || sm.result === 'forfeit-b') a += 1;
        else if (sm.result === 'b-wins' || sm.result === 'forfeit-a') b += 1;
        else if (sm.result === 'halved') {
          a += 0.5;
          b += 0.5;
        }
      }
    });
    return { teamAPoints: a, teamBPoints: b, completed: done, total: list.length };
  }, [subMatches]);

  if (total === 0) return null;

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <Icon source="trophy-variant" size={16} color={colors.primary} />
        <Text style={[styles.cardHeaderText, { color: colors.textSecondary }]}>
          Ryder Cup Points · {completed}/{total} sub-matches complete
        </Text>
      </View>
      <View style={styles.row}>
        <View style={styles.side}>
          <View style={[styles.sideDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.sideLabel, { color: colors.textSecondary }]}>Team A</Text>
          <Text style={[styles.sidePoints, { color: colors.textPrimary }]}>
            {formatPoints(teamAPoints)}
          </Text>
        </View>
        <Text style={[styles.dash, { color: colors.textSecondary }]}>–</Text>
        <View style={styles.side}>
          <Text style={[styles.sidePoints, { color: colors.textPrimary }]}>
            {formatPoints(teamBPoints)}
          </Text>
          <Text style={[styles.sideLabel, { color: colors.textSecondary }]}>Team B</Text>
          <View style={[styles.sideDot, { backgroundColor: colors.error }]} />
        </View>
      </View>
    </View>
  );
}

function formatPoints(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  leaderboardWrapper: {
    marginTop: spacing.md,
  },

  // Ryder Cup points card
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardHeaderText: {
    ...typography.caption,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sideDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
  sideLabel: {
    ...typography.captionBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sidePoints: {
    ...typography.h2,
  },
  dash: {
    ...typography.h3,
  },
});

export default TeamsTab;
