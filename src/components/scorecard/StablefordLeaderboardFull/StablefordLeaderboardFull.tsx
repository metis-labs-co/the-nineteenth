/**
 * StablefordLeaderboardFull Component
 *
 * Full-tab leaderboard for Stableford rounds. Sorts players by total
 * Stableford points (descending) and displays points + thru hole. Rendering is
 * shared via FullLeaderboardTable; the Stableford scoring stays here.
 */

import React, { useMemo } from 'react';
import type { Player, Hole, HoleScore, MultiBallHoleScore } from '@/types';
import { isSingleBallScore } from '@/types/database';
import {
  getStrokesReceived,
  getEffectiveGrossStrokes,
  calculateStablefordPointsNet,
} from '@/utils/scoring';
import {
  FullLeaderboardTable,
  type FullLeaderboardRow,
} from '@/components/scorecard/FullLeaderboardTable';

export interface StablefordLeaderboardFullProps {
  players: Player[];
  holes: Hole[];
  getPlayerScore: (playerId: string, holeNumber: number) => HoleScore | MultiBallHoleScore | undefined;
  currentUserId?: string;
  /**
   * Map of playerId → daily (playing) handicap for the round. When an entry is
   * present it is used as the strokes-received basis so the leaderboard points
   * match the scorecard, which scores off the round's daily handicap
   * (`daily_handicap_used`) rather than the raw profile index. Falls back to the
   * player's raw `handicap` when a player is missing from the map.
   */
  dailyHandicaps?: Record<string, number>;
  /** When provided, each player row becomes tappable and calls this with the
   *  player's id (used to open that player's individual scorecard). */
  onPlayerPress?: (playerId: string) => void;
  testID?: string;
}

export const StablefordLeaderboardFull = React.memo(function StablefordLeaderboardFull({
  players,
  getPlayerScore,
  holes,
  currentUserId,
  dailyHandicaps,
  onPlayerPress,
  testID,
}: StablefordLeaderboardFullProps) {
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
        // Pickups (>= PICKUP_SCORE) resolve to net double bogey (0 points) and
        // still count as a completed hole — same WHS handling as the scorecard.
        const effectiveStrokes = getEffectiveGrossStrokes(
          score.strokes,
          hole.par,
          strokesReceived
        );
        if (effectiveStrokes === null) continue;

        points += calculateStablefordPointsNet(effectiveStrokes, hole.par, strokesReceived);
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
      formatScore={(row) => `${row.scoreValue}`}
      scoreAccessibility={(row) => `${row.scoreValue} points`}
      onPlayerPress={onPlayerPress}
      testID={testID}
    />
  );
});

export default StablefordLeaderboardFull;
