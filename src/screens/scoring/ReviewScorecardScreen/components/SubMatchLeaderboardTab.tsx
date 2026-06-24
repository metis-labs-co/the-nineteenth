import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { spacing } from '@/constants/theme';
import { useSubMatches } from '@/hooks/rounds';
import { useRoundTeams } from '@/hooks/scorecard/useRoundTeams';
import { calculatePlayingHandicap } from '@/hooks/usePlayingHandicap';
import { useScorecardStore } from '@/store/scorecardStore';
import { getTeamColorHex } from '@/utils/teamColor';
import { isSingleBallScore } from '@/types/database/base';
import { EmptyState } from '@/components/common/EmptyState';
import { MatchPlayMatchRow } from '@/components/rounds/MatchPlayMatchRow';
import { SubMatchNetCard, SubMatchOverallHeader } from '@/components/rounds/SubMatchNetCard';
import {
  resolveSubMatchModel,
  computeMatchPlaySubMatch,
  computeNetSubMatch,
  tallyOverall,
  type SubMatchPlayer,
  type SubMatchSides,
  type SubMatchLeader,
} from '../utils/subMatchLeaderboard';
import type { Hole, TeeBox, GameType, TeamFormat } from '@/types';
import type { HandicapSource } from '@/types/database/enums';

interface SubMatchLeaderboardTabProps {
  roundId: string;
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
}: SubMatchLeaderboardTabProps) {
  const colors = useThemeColors();
  const getPlayerScoreFromStore = useScorecardStore((s) => s.getPlayerScore);
  const { data: subMatches, isLoading: smLoading } = useSubMatches(roundId);
  const { teams, isLoading: teamsLoading } = useRoundTeams(competitionId ?? undefined, true, roundId);

  const getStrokes = useMemo(
    () => (playerId: string, holeNumber: number): number | undefined => {
      const raw = getPlayerScoreFromStore(playerId, holeNumber);
      if (!raw) return undefined;
      return isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes;
    },
    [getPlayerScoreFromStore]
  );

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
    return (subMatches ?? []).map((sm, index) => {
      const sides: SubMatchSides = {
        a: sm.team_a_player_ids.map((id) => playerById.get(id)).filter((p): p is SubMatchPlayer => !!p),
        b: sm.team_b_player_ids.map((id) => playerById.get(id)).filter((p): p is SubMatchPlayer => !!p),
      };
      const leftColor = teamColorByPlayer.get(sm.team_a_player_ids[0]) ?? colors.success;
      const rightColor = teamColorByPlayer.get(sm.team_b_player_ids[0]) ?? colors.error;
      const leftLabel = labelForSide(sm.team_a_player_ids, 'Team A', teamNameByPlayer);
      const rightLabel = labelForSide(sm.team_b_player_ids, 'Team B', teamNameByPlayer);
      return { sm, index, sides, leftColor, rightColor, leftLabel, rightLabel };
    });
  }, [subMatches, playerById, teamColorByPlayer, teamNameByPlayer, colors]);

  const { leaders, content } = useMemo(() => {
    const leaders: SubMatchLeader[] = [];
    const content = rows.map((row) => {
      if (model === 'match-play') {
        const data = computeMatchPlaySubMatch(row.sides, holes, getStrokes);
        leaders.push({ leaderSide: data.leaderSide, hasScores: data.hasScores });
        return (
          <MatchPlayMatchRow
            key={row.sm.id}
            leftName={row.sides.a.map((p) => p.name).join(' & ') || 'TBD'}
            rightName={row.sides.b.map((p) => p.name).join(' & ') || 'TBD'}
            leftColor={row.leftColor}
            rightColor={row.rightColor}
            data={data}
            highlightLeft={!!currentUserId && row.sides.a.some((p) => p.id === currentUserId)}
            highlightRight={!!currentUserId && row.sides.b.some((p) => p.id === currentUserId)}
            testID={`submatch-row-${row.index}`}
          />
        );
      }
      const data = computeNetSubMatch(model, row.sides, holes, getStrokes);
      leaders.push({ leaderSide: data.leaderSide, hasScores: data.hasScores });
      return (
        <SubMatchNetCard
          key={row.sm.id}
          index={row.index}
          leftLabel={row.leftLabel}
          rightLabel={row.rightLabel}
          leftColor={row.leftColor}
          rightColor={row.rightColor}
          data={data}
        />
      );
    });
    return { leaders, content };
  }, [rows, model, holes, getStrokes, currentUserId]);

  const isLoading = smLoading || teamsLoading;
  const hasSubMatches = (subMatches?.length ?? 0) > 0;
  const showOverall = hasSubMatches && teams.length >= 2;
  const tally = tallyOverall(leaders);
  const first = rows[0];

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
      {!hasSubMatches ? (
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
              pointsA={tally.pointsA}
              pointsB={tally.pointsB}
            />
          )}
          <View>{content}</View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
});
