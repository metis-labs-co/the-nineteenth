/**
 * MatchPlayLeaderboardTab - Team match play leaderboard tab content
 *
 * Derives match play entries from live team data + the scorecard store so the
 * leaderboard updates mid-round (the server-side `round_results` table is
 * only populated after submission). Feeds those entries into the shared
 * `MatchPlayLeaderboard` card view.
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
import { MatchPlayLeaderboard } from '@/components/leaderboard/MatchPlayLeaderboard';
import { calculateTeamMatchData } from '@/components/scorecard/TeamMatchPlayScorecardTable/utils';
import { toMatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';
import { isSingleBallScore } from '@/types/database/base';
import type {
  TeamLeaderboardEntry,
  MatchPlayScoreData,
} from '@/utils/roundLeaderboardFormatters';
import type { MatchTeam } from '@/screens/scoring/TeamMatchPlayScoringScreen/types';
import type { Hole, TeeBox } from '@/types';
import type { HandicapSource } from '@/types/database/enums';
import type { RoundWithCourse } from '@/hooks/useRoundDetails';

interface MatchPlayLeaderboardTabProps {
  roundId: string | undefined;
  holes: Hole[];
  roundDetails: RoundWithCourse | undefined;
  selectedTeeData?: TeeBox | null;
  handicapSource?: HandicapSource;
  currentUserId: string | undefined;
  roundStatus?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

/**
 * Build the per-team match play leaderboard entry from computed match data.
 */
function buildTeamEntry(
  team: MatchTeam,
  opponent: MatchTeam,
  perspective: 'player1' | 'player2',
  calc: ReturnType<typeof calculateTeamMatchData>
): TeamLeaderboardEntry {
  let holesWon = 0;
  let holesLost = 0;
  let holesHalved = 0;
  for (const key of Object.keys(calc.holeResults)) {
    const winner = calc.holeResults[Number(key)].winner;
    if (!winner) continue;
    if (winner === 'halved') {
      holesHalved += 1;
    } else if (winner === perspective) {
      holesWon += 1;
    } else {
      holesLost += 1;
    }
  }

  const status = calc.finalStatus;
  const isComplete = status.status === 'complete';

  let matchResult: MatchPlayScoreData['matchResult'];
  let holesUpDown: string;

  if (isComplete) {
    if (status.winner === 'halved') {
      matchResult = 'halved';
      holesUpDown = 'A/S';
    } else {
      matchResult = status.winner === perspective ? 'win' : 'loss';
      holesUpDown = status.margin;
    }
  } else {
    // In progress — leave matchResult undefined so the shared leaderboard
    // helpers show "X UP with N to play" / "All Square" text.
    const diff = holesWon - holesLost;
    if (diff > 0) {
      holesUpDown = `${diff} UP`;
    } else if (diff < 0) {
      holesUpDown = `${Math.abs(diff)} DN`;
    } else {
      holesUpDown = 'A/S';
    }
  }

  const scoreData: MatchPlayScoreData = {
    type: 'match-play',
    matchResult,
    holesUpDown,
    opponentId: opponent.id,
    opponentName: opponent.name,
    holesWon,
    holesLost,
    holesHalved,
  };

  return {
    isTeamResult: true,
    position: 0,
    competitionPoints: 0,
    bypassed: false,
    teamId: team.id,
    teamName: team.name,
    members: team.members.map((m) => ({
      playerId: m.id,
      playerName: m.name,
      handicap: m.handicap,
    })),
    scoreData,
  };
}

export function MatchPlayLeaderboardTab({
  roundId,
  holes,
  roundDetails,
  selectedTeeData,
  handicapSource,
  currentUserId,
  roundStatus = 'in-progress',
  isRefreshing,
  onRefresh,
  bottomInset,
}: MatchPlayLeaderboardTabProps) {
  const colors = useThemeColors();
  const isSocial = useIsSocial();
  const getPlayerScoreFromStore = useScorecardStore((s) => s.getPlayerScore);

  const competitionId = roundDetails?.competition_id ?? undefined;
  const { teams: teamsData, isLoading } = useRoundTeams(
    competitionId,
    true,
    roundId
  );

  // Playing handicap per member — matches the live scoring screen so net
  // calculations stay consistent across tabs.
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

  const getPlayerScore = useMemo(
    () => (playerId: string, holeNumber: number): number | undefined => {
      const raw = getPlayerScoreFromStore(playerId, holeNumber);
      if (!raw) return undefined;
      if (isSingleBallScore(raw)) return raw.strokes;
      return raw.balls?.[0]?.strokes;
    },
    [getPlayerScoreFromStore]
  );

  const entries = useMemo(() => {
    if (!team1 || !team2) return [];
    const calc = calculateTeamMatchData(holes, team1, team2, getPlayerScore);
    return [
      buildTeamEntry(team1, team2, 'player1', calc),
      buildTeamEntry(team2, team1, 'player2', calc),
    ];
  }, [team1, team2, holes, getPlayerScore]);

  const hasEntries = entries.length > 0;

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
      {hasEntries ? (
        <MatchPlayLeaderboard
          entries={entries}
          currentUserId={currentUserId}
          roundStatus={roundStatus}
          isTeamRound
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {isLoading ? 'Loading match…' : 'Teams not available for this match.'}
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
