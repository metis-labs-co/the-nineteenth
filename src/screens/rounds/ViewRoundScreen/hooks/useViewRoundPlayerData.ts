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
  isStablefordRound: boolean;
  isParRound: boolean;
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
  // Use round_players as the canonical roster so the leaderboard always shows
  // every participant, even before their scorecard has been pushed to Supabase.
  // Fall back to scorecards-only if round_players is unavailable (defensive,
  // shouldn't happen for competition rounds in practice).
  const scorecardByPlayerId = new Map<string, NonNullable<UseViewRoundPlayerDataParams['scorecards']>[number]>();
  for (const sc of scorecards ?? []) {
    scorecardByPlayerId.set(sc.player_id, sc);
  }

  if (roundPlayers && roundPlayers.length > 0) {
    return roundPlayers.map((p) => {
      const sc = scorecardByPlayerId.get(p.id);
      return {
        // Prefer scorecard.player fields where available (more authoritative —
        // includes handicap derived at scoring time), otherwise round_player.
        id: p.id,
        name: sc?.player?.name || p.name,
        handicap: sc?.player?.handicap ?? p.handicap ?? 0,
        email: sc?.player?.email || p.email || '',
      };
    });
  }

  if (scorecards && scorecards.length > 0) {
    return scorecards.map((sc) => ({
      id: sc.player_id,
      name: sc.player?.name || 'Unknown',
      handicap: sc.player?.handicap ?? 0,
      email: sc.player?.email || '',
    }));
  }

  return [];
}

export function useViewRoundPlayerData({
  isShambleRound,
  isStrokePlayRound,
  isStablefordRound,
  isParRound,
  isMatchPlayRound,
  scorecards,
  roundPlayers,
}: UseViewRoundPlayerDataParams) {
  // Convert round players to Player type for ContributionLeaderboard (shamble)
  const shamblePlayers: Player[] = useMemo(() => {
    if (!isShambleRound) return [];
    return buildPlayersFromData(scorecards, roundPlayers);
  }, [isShambleRound, scorecards, roundPlayers]);

  // Convert round players to Player type for the format-aware leaderboard
  // (stroke / stableford / par all share the same Player[] shape).
  const leaderboardPlayers: Player[] = useMemo(() => {
    if (!isStrokePlayRound && !isStablefordRound && !isParRound) return [];
    return buildPlayersFromData(scorecards, roundPlayers);
  }, [isStrokePlayRound, isStablefordRound, isParRound, scorecards, roundPlayers]);

  // Backwards-compatible alias — older callers still reference strokePlayPlayers.
  const strokePlayPlayers: Player[] = leaderboardPlayers;

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
    leaderboardPlayers,
    strokePlayPlayers,
    matchPlayPlayers,
    getPlayerScore,
    getShamblePlayerScore,
    getShambleTeamScore,
    getStrokePlayPlayerScore,
  };
}
