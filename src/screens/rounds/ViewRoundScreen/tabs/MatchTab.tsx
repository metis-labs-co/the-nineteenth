/**
 * MatchTab - Match play tab content (individual and team)
 *
 * For split team rounds (Ryder Cup style), the tab leads with a team point
 * aggregate sourced from the `sub_matches` table — 1 point per sub-match
 * won, 0.5 halved, 0 loss. The existing best-ball leaderboard below is
 * suppressed for split rounds because its meaning changes per-sub-match.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { MatchPlayLeaderboard } from '@/components/leaderboard/MatchPlayLeaderboard';
import { MatchPlayScorecardTable } from '@/components/scorecard/MatchPlayScorecardTable';
import { EmptyState } from '@/components/common/EmptyState';
import { useThemeColors } from '@/context/ThemeContext';
import { useSubMatches } from '@/hooks/rounds';
import { spacing, typography, borderRadius, shadows } from '@/constants/theme';
import type { Hole } from '@/types';
import type { RoundLeaderboardResponse } from '@/hooks/useRoundLeaderboard';

interface MatchPlayPlayer {
  id: string;
  name: string;
}

interface MatchTabProps {
  isMatchPlayRound: boolean;
  isTeamMatchPlayRound: boolean;
  matchPlayPlayers: { player1: MatchPlayPlayer; player2: MatchPlayPlayer } | null;
  holes: Hole[] | null;
  getPlayerScore: (playerId: string, holeNumber: number) => number | undefined;
  matchPlayData: RoundLeaderboardResponse | undefined;
  currentUserId: string | undefined;
  roundStatus: string;
  isTeamRound: boolean;
  /** True when the team round is split into Ryder-Cup-style sub-matches. */
  isSplitRound?: boolean;
  /** Required to fetch sub-match data for split rounds. */
  roundId?: string;
}

export function MatchTab({
  isMatchPlayRound,
  isTeamMatchPlayRound: _isTeamMatchPlayRound,
  matchPlayPlayers,
  holes,
  getPlayerScore,
  matchPlayData,
  currentUserId,
  roundStatus,
  isTeamRound,
  isSplitRound = false,
  roundId,
}: MatchTabProps) {
  const colors = useThemeColors();

  const hasRyderCup = isSplitRound && !!roundId;
  const hasScorecard = isMatchPlayRound && !!matchPlayPlayers && !!holes;
  const hasLeaderboard =
    !isSplitRound && !!matchPlayData && matchPlayData.entries.length > 0;
  const isNotStarted = roundStatus === 'upcoming';

  // When the round hasn't produced match data yet (typical for rounds
  // that haven't started), show a clear empty state instead of a blank
  // tab. Covers both "match play with no scores yet" and the legacy
  // non-match-play case.
  const isEmpty = !hasRyderCup && !hasScorecard && !hasLeaderboard;

  return (
    <View style={styles.matchTabContent}>
      {/* Split-round Ryder-Cup aggregate header */}
      {hasRyderCup && <RyderCupAggregate roundId={roundId!} />}

      {/* Individual Match Play Scorecard */}
      {hasScorecard && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Match Scorecard
          </Text>
          <MatchPlayScorecardTable
            holes={holes!}
            player1={matchPlayPlayers!.player1}
            player2={matchPlayPlayers!.player2}
            getPlayerScore={getPlayerScore}
          />
        </>
      )}

      {/* Match Play Results — hidden for split rounds (the SubMatches tab
          shows per-sub-match detail and the aggregate above replaces the
          best-ball leaderboard's role as the round summary). */}
      {hasLeaderboard && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.lg }]}>
            Match Results
          </Text>
          <MatchPlayLeaderboard
            entries={matchPlayData!.entries}
            currentUserId={currentUserId}
            roundStatus={roundStatus}
            isTeamRound={isTeamRound}
          />
        </>
      )}

      {/* Empty state when nothing else rendered */}
      {isEmpty && (
        <EmptyState
          icon={isMatchPlayRound ? 'sword-cross' : 'golf'}
          title={
            isMatchPlayRound
              ? isNotStarted
                ? 'Match Not Started'
                : 'No Match Data Yet'
              : 'No Match Data'
          }
          message={
            isMatchPlayRound
              ? 'Match results will appear here once scoring begins.'
              : 'No match data available yet.'
          }
          compact
        />
      )}
    </View>
  );
}

function RyderCupAggregate({ roundId }: { roundId: string }) {
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
        styles.aggregateCard,
        shadows.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.aggregateHeader}>
        <Icon source="trophy-variant" size={16} color={colors.primary} />
        <Text style={[styles.aggregateLabel, { color: colors.textSecondary }]}>
          Ryder Cup Points · {completed}/{total} sub-matches complete
        </Text>
      </View>
      <View style={styles.aggregateRow}>
        <View style={styles.aggregateSide}>
          <View style={[styles.sideDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.sideLabel, { color: colors.textSecondary }]}>Team A</Text>
          <Text style={[styles.sidePoints, { color: colors.textPrimary }]}>
            {formatPoints(teamAPoints)}
          </Text>
        </View>
        <Text style={[styles.dash, { color: colors.textSecondary }]}>–</Text>
        <View style={styles.aggregateSide}>
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
  matchTabContent: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  aggregateCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  aggregateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  aggregateLabel: {
    ...typography.caption,
    letterSpacing: 0.3,
  },
  aggregateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  aggregateSide: {
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
