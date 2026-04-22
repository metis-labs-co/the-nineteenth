/**
 * MatchScorecardTabContent - Team match play scorecard tab content
 *
 * Renders `TeamMatchPlayScorecardTable` for the Review Scorecard screen when
 * the round is `match-play-team`. Fetches team data via `useRoundTeams`
 * (which handles both competition teams and standalone `team_config`),
 * computes each member's playing handicap for consistency with the live
 * scoring screen, and reads gross scores from the scorecard store.
 */

import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing, typography } from '@/constants/theme';
import { useIsSocial } from '@/context/SubscriptionContext';
import { useScorecardStore } from '@/store/scorecardStore';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import { TeamMatchPlayScorecardTable } from '@/components/scorecard/TeamMatchPlayScorecardTable';
import { toMatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';
import { isSingleBallScore } from '@/types/database/base';
import type { Hole, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database/enums';
import type { RoundWithCourse } from '@/hooks/useRoundDetails';

interface MatchScorecardTabContentProps {
  roundId: string | undefined;
  holes: Hole[];
  roundDetails: RoundWithCourse | undefined;
  selectedTeeData?: TeeBox | null;
  handicapSource?: HandicapSource;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function MatchScorecardTabContent({
  roundId,
  holes,
  roundDetails,
  selectedTeeData,
  handicapSource,
  isRefreshing,
  onRefresh,
  bottomInset,
}: MatchScorecardTabContentProps) {
  const colors = useThemeColors();
  const isSocial = useIsSocial();
  const getPlayerScoreFromStore = useScorecardStore((s) => s.getPlayerScore);

  const competitionId = roundDetails?.competition_id ?? undefined;
  const { teams: teamsData, isLoading } = useRoundTeams(
    competitionId,
    true,
    roundId
  );

  // Compute playing handicap per member (matches the live scoring screen so the
  // scorecard uses the same net calculations).
  const handicapMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const team of teamsData) {
      for (const member of team.members || []) {
        if (member.player_id && !map.has(member.player_id)) {
          const { playingHandicap } = calculatePlayingHandicap({
            player: member.player ?? null,
            selectedTeeData: selectedTeeData ?? null,
            holes,
            handicapSource,
            gameType: 'match-play',
            applyDailyHandicap: isSocial,
          });
          map.set(member.player_id, playingHandicap);
        }
      }
    }
    return map;
  }, [teamsData, selectedTeeData, holes, handicapSource, isSocial]);

  const team1 = useMemo(
    () => (teamsData[0] ? toMatchTeam(teamsData[0], handicapMap) : null),
    [teamsData, handicapMap]
  );
  const team2 = useMemo(
    () => (teamsData[1] ? toMatchTeam(teamsData[1], handicapMap) : null),
    [teamsData, handicapMap]
  );

  // Adapter: TeamMatchPlayScorecardTable expects number | undefined grosses.
  const getPlayerScore = useMemo(
    () => (playerId: string, holeNumber: number): number | undefined => {
      const raw = getPlayerScoreFromStore(playerId, holeNumber);
      if (!raw) return undefined;
      if (isSingleBallScore(raw)) return raw.strokes;
      return raw.balls?.[0]?.strokes;
    },
    [getPlayerScoreFromStore]
  );

  const hasTeams = team1 !== null && team2 !== null;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing || isLoading}
          onRefresh={onRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
        />
      }
      showsVerticalScrollIndicator
    >
      {hasTeams ? (
        <TeamMatchPlayScorecardTable
          holes={holes}
          team1={team1!}
          team2={team2!}
          getPlayerScore={getPlayerScore}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {isLoading ? 'Loading match scorecard…' : 'Teams not available for this match.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
});
