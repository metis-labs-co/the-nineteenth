import React, { useCallback } from 'react';
import { useRoundDetails, useRoundScorecards } from '@/hooks/rounds';
import { isSingleBallScore } from '@/types/database/base';
import { SubMatchLeaderboardTab } from './SubMatchLeaderboardTab';
import type { GameType, TeamFormat } from '@/types';

interface RoundSubMatchLeaderboardProps {
  roundId: string;
  competitionId?: string | null;
  currentUserId?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  bottomInset?: number;
}

/**
 * Self-contained live sub-match leaderboard for a round. Sources holes / tee /
 * handicap source / game type from `useRoundDetails`, and per-hole strokes from
 * the round's server scorecards (`useRoundScorecards`). Drop it in anywhere with
 * a round id — used by the ViewRound Leaderboard tab and the competition
 * per-round leaderboard for split alt-shot rounds.
 */
export function RoundSubMatchLeaderboard({
  roundId,
  competitionId,
  currentUserId,
  isRefreshing = false,
  onRefresh,
  bottomInset = 0,
}: RoundSubMatchLeaderboardProps) {
  const { data: round } = useRoundDetails(roundId);
  const { data: scorecards } = useRoundScorecards(roundId);

  const getStrokes = useCallback(
    (playerId: string, hole: number): number | undefined => {
      const sc = scorecards?.find((s) => s.player_id === playerId);
      const raw = sc?.scores?.[String(hole)];
      if (!raw) return undefined;
      return isSingleBallScore(raw) ? raw.strokes : raw.balls?.[0]?.strokes;
    },
    [scorecards]
  );

  return (
    <SubMatchLeaderboardTab
      roundId={roundId}
      getStrokes={getStrokes}
      competitionId={competitionId}
      gameType={(round?.game_type ?? 'alt-shot') as GameType}
      teamFormat={(round?.team_format ?? null) as TeamFormat | null}
      holes={round?.course?.holes ?? []}
      currentUserId={currentUserId}
      selectedTeeData={round?.selected_tee ?? null}
      handicapSource={round?.handicap_source ?? undefined}
      isRefreshing={isRefreshing}
      onRefresh={onRefresh ?? (() => {})}
      bottomInset={bottomInset}
      scrollable={false}
    />
  );
}
