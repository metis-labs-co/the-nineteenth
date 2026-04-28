import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { StrokePlayLeaderboardFull } from '@/components/scorecard/StrokePlayLeaderboardFull';
import { StablefordLeaderboardFull } from '@/components/scorecard/StablefordLeaderboardFull';
import { ParLeaderboardFull } from '@/components/scorecard/ParLeaderboardFull';
import { TeamLeaderboardView } from '@/components/leaderboard/TeamLeaderboardView';
import { SegmentedButton } from '@/components/common/SegmentedButton';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { useSubMatches } from '@/hooks/rounds';
import { buildLiveTeamEntries } from '@/utils/teamScoring';
import type { Player, Hole, HoleScore, MultiBallHoleScore, GameType, TeamFormat } from '@/types';

type LeaderboardView = 'individual' | 'team';

const TEAM_STROKE_FORMATS: TeamFormat[] = ['best-ball', 'aggregate'];

interface LeaderboardTabContentProps {
  players: Player[];
  holes: Hole[];
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  currentUserId?: string;
  gameType: GameType;
  /** Round id — required when team toggle is enabled so we can fetch the
   *  team rosters via useRoundTeams. */
  roundId?: string;
  /** Competition id — passed to useRoundTeams. 'standalone' / undefined for
   *  rounds outside a competition. */
  competitionId?: string | null;
  /** Round team format. When 'best-ball' or 'aggregate' the toggle renders
   *  and the Team view is shown by default. */
  teamFormat?: TeamFormat | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
}

export function LeaderboardTabContent({
  players,
  holes,
  getPlayerScore,
  currentUserId,
  gameType,
  roundId,
  competitionId,
  teamFormat,
  isRefreshing,
  onRefresh,
  bottomInset,
}: LeaderboardTabContentProps) {
  const colors = useThemeColors();

  const showToggle =
    !!roundId && !!teamFormat && TEAM_STROKE_FORMATS.includes(teamFormat);

  // Default the team-stroke leaderboard to the Team view — it's the headline
  // result for these formats.
  const [view, setView] = useState<LeaderboardView>(showToggle ? 'team' : 'individual');

  // Fetch the team rosters when the toggle is shown. We don't use the
  // server-side round_results here — they only populate at finalization, so
  // an in-progress round would always read empty. Instead we build live
  // team standings from the same in-progress scorecards the Individual tab
  // uses.
  const { teams, isLoading: isTeamsLoading } = useRoundTeams(
    showToggle ? competitionId ?? undefined : undefined,
    showToggle,
    showToggle ? roundId : undefined
  );

  // Sub-matches are required for split rounds (Ryder-Cup-style) so each
  // sub-match's best-ball is computed independently and summed into the
  // team total. For non-split rounds the query returns empty / undefined
  // and the helper falls back to whole-team aggregation.
  const { data: subMatches } = useSubMatches(showToggle ? roundId : undefined);

  const teamEntries = useMemo(() => {
    if (!showToggle || !teamFormat || teams.length === 0) return [];
    return buildLiveTeamEntries({
      teams,
      holes,
      gameType,
      teamFormat,
      getPlayerScore,
      subMatches: subMatches ?? undefined,
    });
  }, [showToggle, teams, holes, gameType, teamFormat, getPlayerScore, subMatches]);

  const renderIndividual = () => {
    if (gameType === 'stableford') {
      return (
        <StablefordLeaderboardFull
          players={players}
          holes={holes}
          getPlayerScore={getPlayerScore}
          currentUserId={currentUserId}
          testID="stableford-leaderboard-full"
        />
      );
    }
    if (gameType === 'par') {
      return (
        <ParLeaderboardFull
          players={players}
          holes={holes}
          getPlayerScore={getPlayerScore}
          currentUserId={currentUserId}
          testID="par-leaderboard-full"
        />
      );
    }
    return (
      <StrokePlayLeaderboardFull
        players={players}
        holes={holes}
        getPlayerScore={getPlayerScore}
        currentUserId={currentUserId}
        testID="stroke-play-leaderboard-full"
      />
    );
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.textPrimary}
          colors={[colors.textPrimary]}
        />
      }
      showsVerticalScrollIndicator={true}
    >
      {showToggle && (
        <View style={styles.toggleWrapper}>
          <SegmentedButton<LeaderboardView>
            value={view}
            onValueChange={setView}
            buttons={[
              { value: 'team', label: 'Team', icon: 'account-group' },
              { value: 'individual', label: 'Individual', icon: 'account' },
            ]}
            size="small"
          />
        </View>
      )}

      {showToggle && view === 'team' ? (
        <TeamLeaderboardView
          teamEntries={teamEntries}
          teamFormat={teamFormat ?? null}
          currentUserId={currentUserId}
          isLoading={isTeamsLoading}
        />
      ) : (
        renderIndividual()
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
  toggleWrapper: {
    marginBottom: spacing.md,
  },
});
