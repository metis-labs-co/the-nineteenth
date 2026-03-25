/**
 * useViewRoundPlayerData - Player data transformations for ViewRoundScreen
 *
 * Converts scorecard/roundPlayer data into Player arrays and score getter
 * functions for different game formats (shamble, stroke play, match play).
 */

import { useCallback, useMemo } from 'react';
import type { HoleScore, MultiBallHoleScore, Player } from '@/types';

interface UseViewRoundPlayerDataParams {
  isShambleRound: boolean;
  isStrokePlayRound: boolean;
  isMatchPlayRound: boolean;
  scorecards: Array<{
    player_id: string;
    player?: { name?: string; handicap?: number | null; email?: string } | null;
    scores?: Record<string, HoleScore | MultiBallHoleScore>;
  }> | undefined;
  roundPlayers: Array<{
    id: string;
    name: string;
    handicap?: number | null;
    email?: string;
  }> | undefined;
}

function buildPlayersFromData(
  scorecards: UseViewRoundPlayerDataParams['scorecards'],
  roundPlayers: UseViewRoundPlayerDataParams['roundPlayers'],
): Player[] {
  if (scorecards && scorecards.length > 0) {
    return scorecards.map((sc) => ({
      id: sc.player_id,
      name: sc.player?.name || 'Unknown',
      handicap: sc.player?.handicap ?? 0,
      email: sc.player?.email || '',
    }));
  }

  if (roundPlayers && roundPlayers.length > 0) {
    return roundPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      handicap: p.handicap ?? 0,
      email: p.email || '',
    }));
  }

  return [];
}

export function useViewRoundPlayerData({
  isShambleRound,
  isStrokePlayRound,
  isMatchPlayRound,
  scorecards,
  roundPlayers,
}: UseViewRoundPlayerDataParams) {
  // Convert round players to Player type for ContributionLeaderboard (shamble)
  const shamblePlayers: Player[] = useMemo(() => {
    if (!isShambleRound) return [];
    return buildPlayersFromData(scorecards, roundPlayers);
  }, [isShambleRound, scorecards, roundPlayers]);

  // Convert round players to Player type for StrokePlayLeaderboard
  const strokePlayPlayers: Player[] = useMemo(() => {
    if (!isStrokePlayRound) return [];
    return buildPlayersFromData(scorecards, roundPlayers);
  }, [isStrokePlayRound, scorecards, roundPlayers]);

  // Get match play players for individual match play rounds
  const matchPlayPlayers = useMemo(() => {
    if (!isMatchPlayRound) return null;

    const players = scorecards?.map((sc) => ({
      id: sc.player_id,
      name: sc.player?.name || 'Unknown',
    })) || roundPlayers?.map((p) => ({
      id: p.id,
      name: p.name,
    })) || [];

    if (players.length >= 2) {
      return {
        player1: players[0],
        player2: players[1],
      };
    }

    return null;
  }, [isMatchPlayRound, scorecards, roundPlayers]);

  // Get player score from scorecards for match play scorecard table
  const getPlayerScore = useCallback((playerId: string, holeNumber: number) => {
    const scorecard = scorecards?.find((sc) => sc.player_id === playerId);
    if (!scorecard) return undefined;

    const holeScore = scorecard.scores?.[String(holeNumber)];
    if (!holeScore) return undefined;

    if ('strokes' in holeScore) {
      return holeScore.strokes;
    }

    return undefined;
  }, [scorecards]);

  // Get full hole score for shamble team scores tab
  const getShamblePlayerScore = useCallback((playerId: string, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    const scorecard = scorecards?.find((sc) => sc.player_id === playerId);
    if (!scorecard) return undefined;

    return scorecard.scores?.[String(holeNumber)];
  }, [scorecards]);

  // Get team score for shamble (uses first player's scorecard for shot contributions)
  const getShambleTeamScore = useCallback((holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    if (!scorecards || scorecards.length === 0) return undefined;

    return scorecards[0]?.scores?.[String(holeNumber)];
  }, [scorecards]);

  // Get full hole score for stroke play leaderboard
  const getStrokePlayPlayerScore = useCallback((playerId: string, holeNumber: number): HoleScore | MultiBallHoleScore | undefined => {
    const scorecard = scorecards?.find((sc) => sc.player_id === playerId);
    if (!scorecard) return undefined;

    return scorecard.scores?.[String(holeNumber)];
  }, [scorecards]);

  return {
    shamblePlayers,
    strokePlayPlayers,
    matchPlayPlayers,
    getPlayerScore,
    getShamblePlayerScore,
    getShambleTeamScore,
    getStrokePlayPlayerScore,
  };
}
