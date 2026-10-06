/**
 * ParLeaderboardFull Component
 *
 * Full-tab leaderboard for Par game rounds. Each hole is scored +1 / 0 / -1
 * vs net par. Players sorted by total points (descending). Rendering is shared
 * via FullLeaderboardTable; the Par scoring stays here.
 */

import React, { useMemo } from 'react';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import { calculateParScore, getStrokesReceived, getEffectiveGrossStrokes } from '@/utils/scoring';
import {
  FullLeaderboardTable,
  type FullLeaderboardRow,
} from '@/components/scorecard/FullLeaderboardTable';

export interface ParLeaderboardFullProps {
  players: Player[];
  holes: Hole[];
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  currentUserId?: string;
  /**
   * Map of playerId → daily (playing) handicap for the round. When present it is
   * used as the strokes-received basis so the leaderboard's Par-game points match
   * the scorecard, which scores off the round's daily handicap
   * (`daily_handicap_used`) rather than the raw profile index. Falls back to the
   * player's raw `handicap` when a player is missing from the map.
   */
  dailyHandicaps?: Record<string, number>;
  /** When provided, each player row becomes tappable and calls this with the
   *  player's id (used to open that player's individual scorecard). */
  onPlayerPress?: (playerId: string) => void;
  testID?: string;
}

const formatPoints = (value: number): string => {
  if (value === 0) return 'E';
  return value > 0 ? `+${value}` : `${value}`;
};

export const ParLeaderboardFull = React.memo(function ParLeaderboardFull({
  players,
  getPlayerScore,
  holes,
  currentUserId,
  dailyHandicaps,
  onPlayerPress,
  testID,
}: ParLeaderboardFullProps) {
  const leaderboardData = useMemo((): FullLeaderboardRow[] => {
    const rows = players.map((player): FullLeaderboardRow => {
      // Score off the round's daily (playing) handicap — matching the scorecard.
      // Fall back to the raw profile index only when no daily handicap is known.
      const dailyHandicap = dailyHandicaps?.[player.id] ?? player.handicap ?? 0;
      let points = 0;
      let holesCompleted = 0;

      for (const hole of holes) {
        const score = getPlayerScore(player.id, hole.number);
        if (!score) continue;
        if (!isSingleBallScore(score)) continue;

        const strokesReceived = getStrokesReceived(dailyHandicap, hole.strokeIndex);
        // Pickups (>= PICKUP_SCORE) resolve to net double bogey — a loss (-1) —
        // and still count as a completed hole, matching the scorecard.
        const effectiveStrokes = getEffectiveGrossStrokes(
          score.strokes,
          hole.par,
          strokesReceived
        );
        if (effectiveStrokes === null) continue;

        points += calculateParScore(effectiveStrokes, hole.par, strokesReceived);
        holesCompleted++;
      }

      return {
        playerId: player.id,
        playerName: player.name,
        handicap: dailyHandicap,
        position: 0,
        scoreValue: points,
        holesCompleted,
        isCurrentUser: player.id === currentUserId,
      };
    });

    // Higher points = better.
    rows.sort((a, b) => b.scoreValue - a.scoreValue);

    let currentPosition = 1;
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && rows[i].scoreValue !== rows[i - 1].scoreValue) {
        currentPosition = i + 1;
      }
      rows[i].position = currentPosition;
    }

    return rows;
  }, [players, getPlayerScore, holes, currentUserId, dailyHandicaps]);

  const maxCompletedHole = useMemo(() => {
    return Math.max(...leaderboardData.map((row) => row.holesCompleted), 0);
  }, [leaderboardData]);

  return (
    <FullLeaderboardTable
      rows={leaderboardData}
      maxCompletedHole={maxCompletedHole}
      hasPlayers={players.length > 0}
      scoreHeaderLabel="Pts"
      formatScore={(row) => formatPoints(row.scoreValue)}
      scoreAccessibility={(row) => formatPoints(row.scoreValue)}
      onPlayerPress={onPlayerPress}
      testID={testID}
    />
  );
});

export default ParLeaderboardFull;
