import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { useSubMatches } from '@/hooks/rounds';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import { getTeamColorHex } from '@/utils/teamColor';
import { EmptyState } from '@/components/common/EmptyState';
import { MatchPlayMatchRow } from '@/components/rounds/MatchPlayMatchRow';
import { SubMatchNetCard, SubMatchOverallHeader } from '@/components/rounds/SubMatchNetCard';
import {
  resolveSubMatchModel,
  computeMatchPlaySubMatch,
  computeNetSubMatch,
  tallyByTeam,
  persistedMatchData,
  selectMatchSource,
  type SubMatchPlayer,
  type SubMatchSides,
  type TeamMatchLeader,
} from '@/screens/scoring/ReviewScorecardScreen/utils/subMatchLeaderboard';
import type { Hole, TeeBox, GameType, TeamFormat } from '@/types';
import type { HandicapSource } from '@/types/database/enums';

// Re-exported for backwards compatibility with existing importers of these
// pure functions from this component file; the canonical definitions now
// live in the pure `subMatchLeaderboard` util so non-React code (e.g. the
// finalize service) can reuse them without pulling in React.
export { persistedMatchData, selectMatchSource };

interface SubMatchLeaderboardTabProps {
  roundId: string;
  getStrokes: (playerId: string, holeNumber: number) => number | undefined;
  competitionId?: string | null;
  gameType: GameType;
  teamFormat?: TeamFormat | null;
  holes: Hole[];
  currentUserId?: string;
  selectedTeeData?: TeeBox | null;
  handicapSource?: HandicapSource;
  isRefreshing: boolean;
  onRefresh: () => void;
  bottomInset: number;
  scrollable?: boolean;
  /** Per-match points for the overall tally header. Defaults to flat 1 / 0.5. */
  matchPoints?: { win: number; tie: number };
}

function labelForSide(
  ids: string[],
  fallback: string,
  teamNameByPlayer: Map<string, string>
): string {
  const names = ids.map((id) => teamNameByPlayer.get(id)).filter((n): n is string => !!n);
  if (names.length === 0 || names.length !== ids.length) return fallback;
  return names.every((n) => n === names[0]) ? names[0] : fallback;
}

export function SubMatchLeaderboardTab({
  roundId,
  getStrokes,
  competitionId,
  gameType,
  teamFormat,
  holes,
  currentUserId,
  selectedTeeData,
  handicapSource,
  isRefreshing,
  onRefresh,
  bottomInset,
  scrollable = true,
  matchPoints = { win: 1, tie: 0.5 },
}: SubMatchLeaderboardTabProps) {
  const colors = useThemeColors();
  const { data: subMatches, isLoading: smLoading } = useSubMatches(roundId);
  const { teams, isLoading: teamsLoading } = useRoundTeams(competitionId ?? undefined, true, roundId);

  const { playerById, teamNameByPlayer, teamColorByPlayer } = useMemo(() => {
    const playerById = new Map<string, SubMatchPlayer>();
    const teamNameByPlayer = new Map<string, string>();
    const teamColorByPlayer = new Map<string, string>();
    teams.forEach((team, index) => {
      const hex = getTeamColorHex(team.color, index, colors);
      (team.members || []).forEach((m) => {
        if (!m.player_id) return;
        const { playingHandicap } = calculatePlayingHandicap({
          player: m.player ?? null,
          selectedTeeData: selectedTeeData ?? null,
          holes,
          handicapSource,
          gameType,
        });
        playerById.set(m.player_id, {
          id: m.player_id,
          name: m.player?.name ?? 'Unknown',
          handicap: playingHandicap,
        });
        teamNameByPlayer.set(m.player_id, team.name);
        teamColorByPlayer.set(m.player_id, hex);
      });
    });
    return { playerById, teamNameByPlayer, teamColorByPlayer };
  }, [teams, colors, selectedTeeData, holes, handicapSource, gameType]);

  const model = resolveSubMatchModel(gameType, teamFormat);

  const rows = useMemo(() => {
    const sidesFor = (aIds: string[], bIds: string[]): SubMatchSides => ({
      a: aIds.map((id) => playerById.get(id)).filter((p): p is SubMatchPlayer => !!p),
      b: bIds.map((id) => playerById.get(id)).filter((p): p is SubMatchPlayer => !!p),
    });

    if ((subMatches?.length ?? 0) > 0) {
      return (subMatches ?? []).map((sm, index) => {
        const sides = sidesFor(sm.team_a_player_ids, sm.team_b_player_ids);
        const leftColor = teamColorByPlayer.get(sm.team_a_player_ids[0]) ?? colors.success;
        const rightColor = teamColorByPlayer.get(sm.team_b_player_ids[0]) ?? colors.error;
        const leftLabel = labelForSide(sm.team_a_player_ids, 'Team A', teamNameByPlayer);
        const rightLabel = labelForSide(sm.team_b_player_ids, 'Team B', teamNameByPlayer);
        // Winning side on a forfeit: forfeit-a => side A forfeited (B wins), and vice versa.
        const forfeitWinner: 'a' | 'b' | null =
          sm.status === 'forfeited'
            ? sm.result === 'forfeit-a'
              ? 'b'
              : sm.result === 'forfeit-b'
                ? 'a'
                : null
            : null;
        return {
          key: sm.id,
          index,
          sides,
          leftColor,
          rightColor,
          leftLabel,
          rightLabel,
          // Per-match rows show the players on each side.
          leftName: sides.a.map((p) => p.name).join(' & ') || 'TBD',
          rightName: sides.b.map((p) => p.name).join(' & ') || 'TBD',
          forfeitWinner,
          persisted: persistedMatchData(sm), // <-- new
        };
      });
    }

    // No sub-matches: synthesize a single combined team-vs-team row so a
    // "single match" team match-play round renders as one row of this same
    // leaderboard (whole team A vs whole team B, scored best-ball net).
    if (model === 'match-play' && teams.length >= 2) {
      const aIds = (teams[0].members || [])
        .map((m) => m.player_id)
        .filter((id): id is string => !!id);
      const bIds = (teams[1].members || [])
        .map((m) => m.player_id)
        .filter((id): id is string => !!id);
      const sides = sidesFor(aIds, bIds);
      if (sides.a.length === 0 || sides.b.length === 0) return [];
      return [
        {
          key: 'combined',
          index: 0,
          sides,
          leftColor: teamColorByPlayer.get(aIds[0]) ?? colors.success,
          rightColor: teamColorByPlayer.get(bIds[0]) ?? colors.error,
          leftLabel: teams[0].name,
          rightLabel: teams[1].name,
          // A whole-team match shows the team names, not every member.
          leftName: teams[0].name,
          rightName: teams[1].name,
          forfeitWinner: null as 'a' | 'b' | null,
          persisted: null as ReturnType<typeof persistedMatchData>,
        },
      ];
    }

    return [];
  }, [subMatches, playerById, teamColorByPlayer, teamNameByPlayer, colors, model, teams]);

  const { leaders, content } = useMemo(() => {
    const leaders: TeamMatchLeader[] = [];
    const content = rows.map((row) => {
      const teamA = row.sides.a[0] ? teamNameByPlayer.get(row.sides.a[0].id) ?? null : null;
      const teamB = row.sides.b[0] ? teamNameByPlayer.get(row.sides.b[0].id) ?? null : null;
      // A forfeit decides the sub-match regardless of scores, so it counts
      // toward the overall tally as a win for the non-forfeiting side.
      const pushLeader = (data: { leaderSide: 'a' | 'b' | null; hasScores: boolean }) =>
        leaders.push(
          row.forfeitWinner
            ? { teamA, teamB, leaderSide: row.forfeitWinner, hasScores: true }
            : { teamA, teamB, leaderSide: data.leaderSide, hasScores: data.hasScores }
        );
      if (model === 'match-play') {
        const live = computeMatchPlaySubMatch(row.sides, holes, getStrokes);
        const data = selectMatchSource(live, row.persisted ?? null);
        pushLeader(data);
        return (
          <MatchPlayMatchRow
            key={row.key}
            leftName={row.leftName}
            rightName={row.rightName}
            leftColor={row.leftColor}
            rightColor={row.rightColor}
            data={data}
            highlightLeft={!!currentUserId && row.sides.a.some((p) => p.id === currentUserId)}
            highlightRight={!!currentUserId && row.sides.b.some((p) => p.id === currentUserId)}
            forfeitWinner={row.forfeitWinner}
            testID={`submatch-row-${row.index}`}
          />
        );
      }
      const data = computeNetSubMatch(model, row.sides, holes, getStrokes);
      pushLeader(data);
      return (
        <SubMatchNetCard
          key={row.key}
          index={row.index}
          leftLabel={row.leftLabel}
          rightLabel={row.rightLabel}
          leftColor={row.leftColor}
          rightColor={row.rightColor}
          data={data}
          forfeitWinner={row.forfeitWinner}
        />
      );
    });
    return { leaders, content };
  }, [rows, model, holes, getStrokes, currentUserId, teamNameByPlayer]);

  const isLoading = smLoading || teamsLoading;
  // The Ryder-cup tally header only makes sense across real sub-matches; a
  // single synthesized team-vs-team row is the result on its own.
  const showOverall = (subMatches?.length ?? 0) > 0 && teams.length >= 2;
  const tally = tallyByTeam(leaders, matchPoints);
  const first = rows[0];

  const body = rows.length === 0 ? (
    <EmptyState
      icon="golf"
      title="No Sub-Matches"
      message="Sub-matches will appear here once the round is split into matches."
      compact
    />
  ) : (
    <>
      {showOverall && first && (
        <SubMatchOverallHeader
          leftLabel={first.leftLabel}
          rightLabel={first.rightLabel}
          leftColor={first.leftColor}
          rightColor={first.rightColor}
          pointsA={tally.get(first.leftLabel) ?? 0}
          pointsB={tally.get(first.rightLabel) ?? 0}
        />
      )}
      <View>{content}</View>
    </>
  );

  if (!scrollable) {
    return (
      <View style={[styles.scrollContent, { paddingBottom: bottomInset }]}>{body}</View>
    );
  }

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
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
});
